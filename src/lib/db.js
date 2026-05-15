import { openDB } from 'idb'
import { validateBackup } from './validate'
import { SCHEMES } from './schemes'
import { seedLibraryRooms } from './seedTemplates'
import { listEntries } from '../catalog'

const DB_NAME = 'parliament'
const DB_VERSION = 5

// Built-in library author shape, per refactor/parliament_v2_design_decisions.md §6.5
// canonical metadata. Used to seed every Parliament-shipped library row.
const BUILTIN_AUTHOR = Object.freeze({
  name: 'Parliament',
  handle: 'parliament',
  verified: true,
})

let dbInstance = null

export async function initDB() {
  if (dbInstance) return dbInstance

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    async upgrade(db, oldVersion, newVersion, transaction) {
      // ── v1 stores (created on fresh install or upgrade from nothing) ──
      if (oldVersion < 1) {
        const convStore = db.createObjectStore('conversations', { keyPath: 'id' })
        convStore.createIndex('updatedAt', 'updatedAt')

        const msgStore = db.createObjectStore('messages', { keyPath: 'id' })
        msgStore.createIndex('conversationId', 'conversationId')

        const hlStore = db.createObjectStore('highlights', { keyPath: 'id' })
        hlStore.createIndex('conversationId', 'conversationId')

        const noteStore = db.createObjectStore('notes', { keyPath: 'id' })
        noteStore.createIndex('conversationId', 'conversationId')

        const favStore = db.createObjectStore('favorites', { keyPath: 'id' })
        favStore.createIndex('conversationId', 'conversationId')

        const pinStore = db.createObjectStore('pins', { keyPath: 'id' })
        pinStore.createIndex('targetConversationId', 'targetConversationId')

        db.createObjectStore('settings', { keyPath: 'key' })
      }

      // ── v2 stores: Pelican file staging ───────────────────────────────
      if (oldVersion < 2) {
        // (migration block preserved for existing installs upgrading through v2)
        // File metadata: one record per uploaded file
        const fileStore = db.createObjectStore('files', { keyPath: 'id' })
        fileStore.createIndex('conversationId', 'conversationId')

        // File data: compressed raw bytes, keyed by fileId (one record per file)
        // Stored separately to avoid loading binary blobs when listing file metadata
        db.createObjectStore('file_data', { keyPath: 'fileId' })
      }

      // ── v3 stores: Secretarybird document state ────────────────────────
      if (oldVersion < 3) {
        // One document record per conversation — stores paragraphs with tracked
        // changes, suggestion states, and user replies to Claude comments.
        db.createObjectStore('sbrd_documents', { keyPath: 'conversationId' })
      }

      // ── v4 stores: V2 catalog + mode files ────────────────────────────
      // This is the foundation layer for the V2 refactor (PR-1 of Phase 1).
      // No code consumes these stores yet; they are populated incrementally
      // by later PRs. See refactor/data-migration.md for the canonical schema.
      if (oldVersion < 4) {
        // Mode files: one row per mode. Either scope='room' (a user-built room)
        // or scope='homepage' (the single homepage mode per user).
        const modesStore = db.createObjectStore('modes', { keyPath: 'id' })
        modesStore.createIndex('scope', 'scope')

        // Library tables — catalog entries the user can install, browse,
        // and (for layouts/rooms/resources) see "coming soon" placeholders for.
        const layoutsStore = db.createObjectStore('libraryLayouts', { keyPath: 'id' })
        layoutsStore.createIndex('status', 'status')

        const roomsStore = db.createObjectStore('libraryRooms', { keyPath: 'id' })
        roomsStore.createIndex('status', 'status')

        const componentsStore = db.createObjectStore('libraryComponents', { keyPath: 'id' })
        componentsStore.createIndex('tier', 'tier')

        db.createObjectStore('librarySchemes', { keyPath: 'id' })

        const resourcesStore = db.createObjectStore('libraryResources', { keyPath: 'id' })
        resourcesStore.createIndex('status', 'status')
        resourcesStore.createIndex('format', 'format')

        // Add `room: null` field to every existing conversation. Filled in
        // by PR-10a's one-time migration that maps `createdInMode` → room.
        // Awaiting the for-await loop keeps the version-change transaction
        // alive across each cursor.update() call.
        const convStore2 = transaction.objectStore('conversations')
        for await (const cursor of convStore2) {
          if (cursor.value.room === undefined) {
            await cursor.update({ ...cursor.value, room: null })
          }
        }
      }

      // ── v5: library canonical metadata (PR-14) ────────────────────────
      // Backfill `author` and `installedCount` on every library record so
      // the homepage library section can render the canonical card shape
      // (per refactor/parliament_v2_design_decisions.md §6.5). Built-in
      // rows get author=Parliament, installedCount=0; the post-migration
      // seed top-up may further refine specific rows.
      if (oldVersion < 5) {
        for (const storeName of ['libraryRooms', 'libraryLayouts', 'libraryComponents', 'librarySchemes']) {
          const store = transaction.objectStore(storeName)
          for await (const cursor of store) {
            const v = cursor.value
            if (v.author && v.installedCount !== undefined) continue
            await cursor.update({
              ...v,
              author: v.author || { ...BUILTIN_AUTHOR },
              installedCount: typeof v.installedCount === 'number' ? v.installedCount : 0,
            })
          }
        }
      }
    }
  })

  // Post-migration seeding. Idempotent — only seeds when stores are empty.
  // Runs every initDB() call; the empty-check makes it cheap on subsequent calls.
  await seedLibraryDefaults(dbInstance)

  return dbInstance
}

// ─── Library seeding (v4 placeholders) ───────────────────

/**
 * Run all v4 post-migration seeds. Each seed is independently idempotent
 * (guarded by its own empty-table check) so adding one in a later PR
 * doesn't require the others to re-run.
 */
async function seedLibraryDefaults(db) {
  await seedLibraryLayouts(db)
  await seedLibrarySchemes(db)
  await seedLibraryRooms(db)
  await seedLibraryComponents(db)
  await seedHomepageMode(db)
}

/**
 * Seed `libraryComponents` from the in-memory catalog manifest registry
 * (src/catalog/index.js). Each registered component becomes one library
 * row with the canonical metadata shape (author, installedCount, plus
 * displayName/description/tier/slotTargets straight from the manifest).
 *
 * Idempotent at the per-component level: only inserts a row if no record
 * with that ref id exists yet. Adding a new catalog entry later won't
 * re-seed existing rows.
 */
async function seedLibraryComponents(db) {
  const now = new Date().toISOString()
  const entries = listEntries()
  for (const e of entries) {
    const id = `${e.name}@${e.version}`
    const existing = await db.get('libraryComponents', id)
    if (existing) continue
    await db.put('libraryComponents', {
      id,
      name: e.name,
      version: e.version,
      displayName: e.displayName || e.name,
      description: e.description || '',
      tier: e.tier,
      slotTargets: e.slotTargets || [],
      author: { ...BUILTIN_AUTHOR },
      installedCount: 0,
      seedVersion: 1,
      createdAt: now,
    })
  }
}

/**
 * Seed `libraryLayouts` with placeholder entries: 5 available + 2 coming-soon.
 * Real layout details (slot inventory, render fns) land in PR-3 and PR-9.
 * Idempotent: only seeds when the table is empty.
 */
async function seedLibraryLayouts(db) {
  const existingLayouts = await db.count('libraryLayouts')
  if (existingLayouts > 0) return

  const now = new Date().toISOString()
  const builtinFields = { author: { ...BUILTIN_AUTHOR }, installedCount: 0 }
  const placeholders = [
    // ── Available layouts (5) ──
    {
      id: 'three-panel@1.0',
      displayName: 'Three-panel',
      version: '1.0.0',
      status: 'available',
      scopes: ['room'],
      description: 'Dual sidebars and a center message area. Optimal for desktop knowledge work where lots of metadata is visible at once.',
      slots: [], // Filled in by PR-3
      seedVersion: 1,
      createdAt: now,
    },
    {
      id: 'canvas-centric@1.0',
      displayName: 'Canvas-centric',
      version: '1.0.0',
      status: 'available',
      scopes: ['room'],
      description: 'A center artifact (chart, table) flanked by a left rail and a chat panel. For working with data and files.',
      slots: [],
      seedVersion: 1,
      createdAt: now,
    },
    {
      id: 'document-centric@1.0',
      displayName: 'Document-centric',
      version: '1.0.0',
      status: 'available',
      scopes: ['room'],
      description: 'An editable document body with margin gutters for comments and analysis. For writing and editing.',
      slots: [],
      seedVersion: 1,
      createdAt: now,
    },
    {
      id: 'single-column-with-sheet@1.0',
      displayName: 'Single column with sheet',
      version: '1.0.0',
      status: 'available',
      scopes: ['room'],
      description: 'A single scrolling column with a slide-up sheet for secondary controls. Optimized for mobile and touch.',
      slots: [],
      seedVersion: 1,
      createdAt: now,
    },
    {
      id: 'stacked-sections@1.0',
      displayName: 'Stacked sections',
      version: '1.0.0',
      status: 'available',
      scopes: ['homepage'],
      description: 'Vertically stacked, reorderable sections. The homepage layout.',
      slots: [],
      seedVersion: 1,
      createdAt: now,
    },

    // ── Coming-soon layouts (2) ──
    {
      id: 'reading-pane@1.0',
      displayName: 'Reading pane',
      version: '1.0.0',
      status: 'coming-soon',
      scopes: ['room'],
      description: 'Right-heavy annotation layout. Narrow nav, full-width reading area, wide annotation panel. Optimal for deep reading and annotation across long conversations.',
      slots: [],
      seedVersion: 1,
      createdAt: now,
    },
    {
      id: 'split-view@1.0',
      displayName: 'Split view',
      version: '1.0.0',
      status: 'coming-soon',
      scopes: ['room'],
      description: 'Two equal panes side by side for collaboration. Compare conversations or pair a conversation with a document.',
      slots: [],
      seedVersion: 1,
      createdAt: now,
    },
  ]

  const tx = db.transaction('libraryLayouts', 'readwrite')
  for (const entry of placeholders) {
    await tx.store.put({ ...entry, ...builtinFields })
  }
  await tx.done
}

/**
 * Seed `librarySchemes` with all six V2 schemes plus their full token
 * snapshots (PR-4b). Idempotent at the per-scheme level — each scheme is
 * only inserted if a record with its id doesn't already exist, so adding
 * a seventh scheme later won't re-seed the existing six.
 *
 * The embedded `variants` snapshot mirrors the CSS in src/index.css. Both
 * are dual-maintained for now; future PRs may auto-generate the CSS from
 * this snapshot. The runtime source-of-truth for visual rendering is the
 * CSS — this snapshot exists for the editor / wizard scheme picker (PR-8 /
 * PR-9) to read and to keep imported backups self-contained.
 */
async function seedLibrarySchemes(db) {
  const now = new Date().toISOString()

  for (const scheme of SCHEMES) {
    const existing = await db.get('librarySchemes', scheme.id)
    if (existing) continue
    await db.put('librarySchemes', {
      id: scheme.id,
      displayName: scheme.displayName,
      version: '1.0.0',
      description: scheme.description,
      defaultVariant: scheme.defaultVariant,
      variants: scheme.variants,
      author: { ...BUILTIN_AUTHOR },
      installedCount: 0,
      seedVersion: 2,
      createdAt: now,
    })
  }
}

/**
 * Seed the single homepage mode (one record per user, scope='homepage').
 * The component list is empty at PR-1 — PR-6 fills it with the homepage
 * components (blueprint, chats, library, favorites). The record exists
 * from v4 so the homepage route in PR-6 can resolve a real mode rather
 * than a hand-built fallback.
 * Idempotent: only seeds when no homepage mode already exists.
 *
 * Constants below mirror src/lib/modes.js — keep in sync if either changes.
 */
// PR-6: the homepage mode now ships with four default sections —
// Blueprint, Chats, Library, Favorites. The seed populates them when
// it creates `home_default`, AND tops up the components array if an
// existing `home_default` (from a fresh PR-1 install) still has empty
// components. Once PR-8's editor lets users edit the homepage, the
// top-up condition becomes irrelevant — by then every saved homepage
// has at least one component the user added.
const HOMEPAGE_DEFAULT_COMPONENTS = [
  {
    id: 'home-section-blueprint',
    ref: 'blueprint@^1.0',
    slot: 'section-slot',
    order: 0,
    essential: true,
    config: {
      section: { title: 'Your rooms', meta: 'Hover a chat row to spotlight its room' },
    },
  },
  {
    id: 'home-section-chats',
    ref: 'chats@^1.0',
    slot: 'section-slot',
    order: 1,
    essential: true,
    config: {
      section: { title: 'Chats', meta: 'Browse your history across rooms' },
      defaultView: 'summary',
      publishHoverEvents: true,
    },
  },
  {
    id: 'home-section-library',
    ref: 'library@^1.0',
    slot: 'section-slot',
    order: 2,
    essential: false,
    config: {
      section: { title: 'Library', meta: 'Rooms, parts, and guides' },
      defaultTab: 'rooms',
    },
  },
  {
    id: 'home-section-favorites',
    ref: 'favorites@^1.0',
    slot: 'section-slot',
    order: 3,
    essential: false,
    config: {
      section: { title: 'Favorites', meta: 'Saved snippets across conversations' },
    },
  },
]

async function seedHomepageMode(db) {
  const existing = await db.getAllFromIndex('modes', 'scope', 'homepage')
  const now = new Date().toISOString()

  if (existing.length === 0) {
    await db.put('modes', {
      id: 'home_default',
      schema: 'parliament-mode/1.0',
      parliamentVersion: '0.5.0',
      scope: 'homepage',
      meta: {
        name: 'The Study',
        description: 'Your default landing surface. Four sections out of the box.',
        created: now,
        modified: now,
      },
      layout: { ref: 'stacked-sections@^1.0' },
      scheme: { ref: 'parliament@^1.0' },
      components: HOMEPAGE_DEFAULT_COMPONENTS,
      pipelines: [],
      requestedPermissions: [],
      buildIntent: null,
    })
    return
  }

  // Top-up: a home_default record from PR-1 has empty `components`. Fill
  // it in so the new homepage has its four default sections without
  // requiring users to clear their browser data. Untouched if the user
  // (or a later PR) populated components already.
  const home = existing.find(m => m.id === 'home_default') || existing[0]
  if (Array.isArray(home.components) && home.components.length === 0) {
    await db.put('modes', {
      ...home,
      components: HOMEPAGE_DEFAULT_COMPONENTS,
      parliamentVersion: '0.5.0',
      meta: { ...(home.meta || {}), modified: now },
    })
  }

  // PR-19e: rename the default homepage name from "Home" to "The Study".
  // Only triggers when the current meta.name exactly matches the prior
  // seed value, so user-renamed homepages are left alone.
  const refreshed = (await db.getAllFromIndex('modes', 'scope', 'homepage'))
    .find(m => m.id === 'home_default') || home
  if (refreshed.meta?.name === 'Home') {
    await db.put('modes', {
      ...refreshed,
      meta: { ...(refreshed.meta || {}), name: 'The Study', modified: now },
    })
  }
}

// ─── ID Generation ───────────────────────────────────────

function generateId() {
  return crypto.randomUUID()
}

// UTF-8-accurate byte size of a string. Used to keep per-conversation
// storageBytes in sync as messages are added, edited, and deleted.
function byteSize(str) {
  if (!str) return 0
  return new Blob([String(str)]).size
}

// ─── Conversations ───────────────────────────────────────

export async function createConversation({ title = 'New Conversation', model = 'claude-sonnet', parentId = null, branchPoint = null, createdInMode = null, room = null } = {}) {
  const db = await initDB()
  const now = new Date().toISOString()
  const conversation = {
    id: generateId(),
    title,
    model,
    parentId,
    branchPoint,
    createdInMode,
    // PR-10a.7: explicit `room` so V2 callers (notably the Compressed
    // Summary branch path) can inherit the source's room mode and keep
    // the new conversation routing through <RoomShell> instead of
    // falling back to Albatross. Defaults to null for parity with
    // pre-V2 callers.
    room,
    pinned: false,
    storageBytes: 0,
    createdAt: now,
    updatedAt: now,
  }
  await db.put('conversations', conversation)
  return conversation
}

export async function getConversation(id) {
  const db = await initDB()
  return db.get('conversations', id)
}

export async function listConversations() {
  const db = await initDB()
  const all = await db.getAll('conversations')
  return all.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
}

export async function updateConversation(id, updates) {
  const db = await initDB()
  const existing = await db.get('conversations', id)
  if (!existing) throw new Error(`Conversation not found: ${id}`)
  const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() }
  await db.put('conversations', updated)
  return updated
}

export async function deleteConversation(id) {
  const db = await initDB()

  // Delete all related data
  const stores = ['messages', 'highlights', 'notes', 'favorites']
  for (const storeName of stores) {
    const items = await db.getAllFromIndex(storeName, 'conversationId', id)
    const tx = db.transaction(storeName, 'readwrite')
    for (const item of items) {
      await tx.store.delete(item.id)
    }
    await tx.done
  }

  // Delete pins where this conversation is the target
  const pins = await db.getAllFromIndex('pins', 'targetConversationId', id)
  const pinTx = db.transaction('pins', 'readwrite')
  for (const pin of pins) {
    await pinTx.store.delete(pin.id)
  }
  await pinTx.done

  // Delete Pelican staged files and their data
  const files = await db.getAllFromIndex('files', 'conversationId', id)
  const fileTx = db.transaction(['files', 'file_data'], 'readwrite')
  for (const file of files) {
    fileTx.objectStore('files').delete(file.id)
    fileTx.objectStore('file_data').delete(file.id)
  }
  await fileTx.done

  // Delete Secretarybird document if present
  await db.delete('sbrd_documents', id)

  await db.delete('conversations', id)
}

// ─── Branching ───────────────────────────────────────────

/**
 * Create a branch from an existing conversation at a specific message.
 * Copies all messages up to and including the branch point message
 * into a new conversation linked to the parent via parentId.
 *
 * @param {string} sourceConversationId - The conversation to branch from
 * @param {string} branchAtMessageId - The message ID to branch at (inclusive)
 * @param {object} options - Optional overrides: { title, model }
 * @returns {object} The new branch conversation record
 */
export async function createBranch(sourceConversationId, branchAtMessageId, options = {}) {
  const db = await initDB()

  // Get source conversation for defaults
  const source = await db.get('conversations', sourceConversationId)
  if (!source) throw new Error(`Source conversation not found: ${sourceConversationId}`)

  // Get all messages from source, sorted chronologically
  const allMessages = await db.getAllFromIndex('messages', 'conversationId', sourceConversationId)
  allMessages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

  // Find the branch point index
  const branchIdx = allMessages.findIndex(m => m.id === branchAtMessageId)
  if (branchIdx === -1) throw new Error(`Branch point message not found: ${branchAtMessageId}`)

  // Messages to copy: everything up to and including the branch point
  const messagesToCopy = allMessages.slice(0, branchIdx + 1)

  // Backfill familyId on the source if missing, so parent + branches share it
  const familyId = source.familyId || source.id
  if (!source.familyId) {
    await db.put('conversations', { ...source, familyId })
  }

  // Create the branch conversation
  const now = new Date().toISOString()
  const branchConv = {
    id: generateId(),
    title: options.title || `Branch: ${source.title}`,
    model: options.model || source.model,
    parentId: sourceConversationId,
    parentTitle: source.title,
    familyId,
    branchPoint: branchAtMessageId,
    // PR-10a.7: inherit the source's `room` so the new conversation
    // routes through <RoomShell> like its parent. Pre-V2 sources have
    // room: null and the new branch follows them — Albatross fallback
    // stays consistent with the source's render path.
    room: source.room ?? null,
    pinned: false,
    storageBytes: 0,
    createdAt: now,
    updatedAt: now,
  }
  await db.put('conversations', branchConv)

  // Copy messages into the new conversation in a single transaction
  const tx = db.transaction('messages', 'readwrite')
  let totalBytes = 0
  for (const msg of messagesToCopy) {
    const newMsg = {
      id: generateId(),
      conversationId: branchConv.id,
      role: msg.role,
      content: msg.content,
      tokenCount: msg.tokenCount || 0,
      incomplete: false,
      createdAt: msg.createdAt, // preserve original timestamps for ordering
    }
    await tx.store.put(newMsg)
    totalBytes += byteSize(msg.content)
  }
  await tx.done

  // Update storage estimate on the branch
  await db.put('conversations', { ...branchConv, storageBytes: totalBytes })
  branchConv.storageBytes = totalBytes

  return branchConv
}

/**
 * Get all branches for a given parent conversation.
 * Returns them sorted by updatedAt descending.
 */
export async function getBranches(parentConversationId) {
  const db = await initDB()
  const all = await db.getAll('conversations')
  return all
    .filter(c => c.parentId === parentConversationId)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
}

// ─── Messages ────────────────────────────────────────────

export async function addMessage({ conversationId, role, content, tokenCount = 0, incomplete = false, attachmentMeta }) {
  const db = await initDB()
  const message = {
    id: generateId(),
    conversationId,
    role,
    content,
    tokenCount,
    incomplete,
    createdAt: new Date().toISOString(),
    // PR-18e: optional. Array of `{ id, name, category, mimeType, size }`
    // descriptors stamped onto user messages so MessageCard can render
    // chips in history. Base64 payloads are NOT persisted — chips are
    // memory aids only. Old messages have this undefined, which the
    // renderer treats as "no attachments." No schema migration needed.
    ...(Array.isArray(attachmentMeta) && attachmentMeta.length > 0
      ? { attachmentMeta }
      : {}),
  }
  await db.put('messages', message)

  // Touch updatedAt and grow storageBytes by the new message's content size
  const conv = await db.get('conversations', conversationId)
  if (conv) {
    await db.put('conversations', {
      ...conv,
      updatedAt: message.createdAt,
      storageBytes: (conv.storageBytes || 0) + byteSize(content),
    })
  }

  return message
}

export async function getMessages(conversationId) {
  const db = await initDB()
  const messages = await db.getAllFromIndex('messages', 'conversationId', conversationId)
  return messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
}

export async function updateMessage(id, updates) {
  const db = await initDB()
  const existing = await db.get('messages', id)
  if (!existing) throw new Error(`Message not found: ${id}`)
  const updated = { ...existing, ...updates }
  await db.put('messages', updated)

  // If content changed, apply the delta to the conversation's storageBytes
  if ('content' in updates) {
    const delta = byteSize(updated.content) - byteSize(existing.content)
    if (delta !== 0) {
      const conv = await db.get('conversations', existing.conversationId)
      if (conv) {
        await db.put('conversations', {
          ...conv,
          storageBytes: Math.max(0, (conv.storageBytes || 0) + delta),
        })
      }
    }
  }

  return updated
}

export async function deleteMessage(id) {
  const db = await initDB()
  const existing = await db.get('messages', id)
  await db.delete('messages', id)
  if (existing) {
    const conv = await db.get('conversations', existing.conversationId)
    if (conv) {
      await db.put('conversations', {
        ...conv,
        storageBytes: Math.max(0, (conv.storageBytes || 0) - byteSize(existing.content)),
      })
    }
  }
}

// ─── Highlights ──────────────────────────────────────────

export async function addHighlight({ conversationId, messageId, text, color = '#B8A070' }) {
  const db = await initDB()
  const highlight = {
    id: generateId(),
    conversationId,
    messageId,
    text,
    color,
    createdAt: new Date().toISOString(),
  }
  await db.put('highlights', highlight)
  return highlight
}

export async function getHighlights(conversationId) {
  const db = await initDB()
  return db.getAllFromIndex('highlights', 'conversationId', conversationId)
}

export async function deleteHighlight(id) {
  const db = await initDB()
  await db.delete('highlights', id)
}

// ─── Notes ───────────────────────────────────────────────

export async function addNote({ conversationId, messageId, text }) {
  const db = await initDB()
  const note = {
    id: generateId(),
    conversationId,
    messageId,
    text,
    createdAt: new Date().toISOString(),
  }
  await db.put('notes', note)
  return note
}

export async function getNotes(conversationId) {
  const db = await initDB()
  return db.getAllFromIndex('notes', 'conversationId', conversationId)
}

export async function updateNote(id, text) {
  const db = await initDB()
  const existing = await db.get('notes', id)
  if (!existing) throw new Error(`Note not found: ${id}`)
  const updated = { ...existing, text }
  await db.put('notes', updated)
  return updated
}

export async function deleteNote(id) {
  const db = await initDB()
  await db.delete('notes', id)
}

// ─── Favorites ───────────────────────────────────────────

export async function addFavorite({ conversationId, messageId }) {
  const db = await initDB()
  const favorite = {
    id: generateId(),
    conversationId,
    messageId,
    createdAt: new Date().toISOString(),
  }
  await db.put('favorites', favorite)
  return favorite
}

export async function getFavorites(conversationId) {
  const db = await initDB()
  return db.getAllFromIndex('favorites', 'conversationId', conversationId)
}

export async function deleteFavorite(id) {
  const db = await initDB()
  await db.delete('favorites', id)
}

// ─── Pins (branch transfer references) ──────────────────

export async function addPin({ targetConversationId, sourceConversationId, sourceMessageId, content }) {
  const db = await initDB()
  const pin = {
    id: generateId(),
    targetConversationId,
    sourceConversationId,
    sourceMessageId,
    content,
    createdAt: new Date().toISOString(),
  }
  await db.put('pins', pin)
  return pin
}

export async function getPins(targetConversationId) {
  const db = await initDB()
  return db.getAllFromIndex('pins', 'targetConversationId', targetConversationId)
}

export async function deletePin(id) {
  const db = await initDB()
  await db.delete('pins', id)
}

// ─── Settings ────────────────────────────────────────────

export async function getSetting(key) {
  const db = await initDB()
  const entry = await db.get('settings', key)
  return entry ? entry.value : null
}

export async function setSetting(key, value) {
  const db = await initDB()
  await db.put('settings', { key, value })
}

// ─── Pelican Files ───────────────────────────────────────

/**
 * Add a staged file record + its compressed raw data.
 * @param {object} meta  - { conversationId, name, type, rows, cols, sizeBytes }
 * @param {ArrayBuffer} compressedData - gzip-compressed file bytes
 */
export async function addFile(meta, compressedData) {
  const db = await initDB()
  const file = {
    id: generateId(),
    conversationId: meta.conversationId,
    name: meta.name,
    type: meta.type,
    rows: meta.rows,
    cols: meta.cols,
    sizeBytes: meta.sizeBytes,
    inContext: true,
    uploadedAt: new Date().toISOString(),
  }
  const tx = db.transaction(['files', 'file_data'], 'readwrite')
  tx.objectStore('files').put(file)
  tx.objectStore('file_data').put({ fileId: file.id, data: compressedData })
  await tx.done
  return file
}

export async function listFiles(conversationId) {
  const db = await initDB()
  const files = await db.getAllFromIndex('files', 'conversationId', conversationId)
  return files.sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt))
}

export async function getFileData(fileId) {
  const db = await initDB()
  return db.get('file_data', fileId)
}

export async function updateFile(id, updates) {
  const db = await initDB()
  const existing = await db.get('files', id)
  if (!existing) throw new Error(`File not found: ${id}`)
  const updated = { ...existing, ...updates }
  await db.put('files', updated)
  return updated
}

export async function deleteFile(id) {
  const db = await initDB()
  const tx = db.transaction(['files', 'file_data'], 'readwrite')
  tx.objectStore('files').delete(id)
  tx.objectStore('file_data').delete(id)
  await tx.done
}

// ─── Secretarybird Documents ─────────────────────────────

/**
 * Load the document state for a Secretarybird conversation.
 * Returns null if no document has been saved yet.
 *
 * @param {string} conversationId
 * @returns {object|null} { conversationId, paragraphs, suggestionStates, submittedReplies, updatedAt }
 */
export async function getSbrdDocument(conversationId) {
  const db = await initDB()
  return db.get('sbrd_documents', conversationId)
}

/**
 * Persist the full document state for a Secretarybird conversation.
 * Performs an upsert — safe to call on first save or any subsequent save.
 *
 * @param {string} conversationId
 * @param {{ paragraphs, suggestionStates, submittedReplies }} data
 */
export async function saveSbrdDocument(conversationId, { paragraphs, suggestionStates, submittedReplies }) {
  const db = await initDB()
  await db.put('sbrd_documents', {
    conversationId,
    paragraphs,
    suggestionStates,
    submittedReplies,
    updatedAt: new Date().toISOString(),
  })
}

// ─── Storage Monitoring ──────────────────────────────────

export async function getStorageEstimate() {
  if (navigator.storage && navigator.storage.estimate) {
    const { usage, quota } = await navigator.storage.estimate()
    return { usage, quota }
  }
  return { usage: 0, quota: 0 }
}

// ─── Startup Integrity Check ─────────────────────────────

export async function runIntegrityCheck() {
  const db = await initDB()
  const conversations = await db.getAll('conversations')

  for (const conv of conversations) {
    const messages = await db.getAllFromIndex('messages', 'conversationId', conv.id)
    if (messages.length === 0) {
      // Don't delete Secretarybird conversations — they store content in
      // sbrd_documents rather than the messages store.
      const sbrdDoc = await db.get('sbrd_documents', conv.id)
      if (!sbrdDoc) {
        await deleteConversation(conv.id)
      }
    }
  }
  // Messages with incomplete: true are intentionally left as-is.
  // They render in ghost text state with Continue/dismiss options.
}

// ─── Export / Import ─────────────────────────────────────

export async function exportAllData() {
  const db = await initDB()
  return {
    conversations: await db.getAll('conversations'),
    messages: await db.getAll('messages'),
    highlights: await db.getAll('highlights'),
    notes: await db.getAll('notes'),
    favorites: await db.getAll('favorites'),
    pins: await db.getAll('pins'),
    settings: await db.getAll('settings'),
    sbrd_documents: await db.getAll('sbrd_documents'),
    exportedAt: new Date().toISOString(),
    version: 1,
  }
}

export async function importData(data) {
  // Validate before touching IndexedDB
  const check = validateBackup(data)
  if (!check.valid) throw new Error(check.error)

  const db = await initDB()
  const stores = ['conversations', 'messages', 'highlights', 'notes', 'favorites', 'pins', 'settings', 'sbrd_documents']
  let imported = 0

  for (const storeName of stores) {
    if (!data[storeName]) continue
    const tx = db.transaction(storeName, 'readwrite')
    for (const item of data[storeName]) {
      const existing = await tx.store.get(item.id || item.key)
      if (!existing) {
        await tx.store.put(item)
        imported++
      }
    }
    await tx.done
  }

  return { imported }
}

// ─── Danger Zone ─────────────────────────────────────────

export async function clearAllData() {
  const db = await initDB()
  // Intentionally excludes the 'parliament-keystore' IndexedDB (separate database).
  // That database holds the non-extractable AES key used to encrypt the API key at rest.
  // Clearing it would make any stored encrypted API key permanently unreadable.
  const stores = ['conversations', 'messages', 'highlights', 'notes', 'favorites', 'pins', 'settings', 'files', 'file_data', 'sbrd_documents']
  for (const storeName of stores) {
    await db.clear(storeName)
  }
}
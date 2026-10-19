import { openDB } from 'idb'
import { validateBackup } from './validate'
import { SCHEMES } from './schemes'
import { seedLibraryRooms } from './seedTemplates'
import { listEntries } from '../catalog'
import { V6_NEW_STORES } from './migrations/v6Upgrade'
import { DB_NAME, DB_VERSION, DRAFT_DB_VERSION, TRIAL_DB_NAME, BUILTIN_AUTHOR, upgradeSchema } from './schema'
import {
  createChat, updateChat, removeChat, createBranchChat,
  addMessageRecord, updateMessageRecord, removeMessage,
  addNumbered, updateNumbered, removeNumbered,
  addFavoriteRecord, removeFavoriteRecord, saveDocument,
} from './records'

export { DB_NAME, DB_VERSION, DRAFT_DB_VERSION, TRIAL_DB_NAME } from './schema'

// Dev only: /dev/migration can open the app on the trial copy of the upgrade
// for one tab, so today's screens can be tried on version 6 data. The flag
// lives in sessionStorage, so it ends with the tab; production never reads it.
export const TRIAL_FLAG = 'parliament-dev-db'

export function isTrialDb() {
  if (!import.meta.env.DEV) return false
  try {
    return sessionStorage.getItem(TRIAL_FLAG) === 'trial'
  } catch {
    return false
  }
}

let dbInstance = null

// Database connection state, for DbStateNotice. 'superseded': another tab
// upgraded the schema and this tab must reload. 'blocked': this tab's
// upgrade is waiting for an older tab to close.
export const DB_STATE_EVENT = 'parliament-db-state'

function announceDbState(state) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DB_STATE_EVENT, { detail: state }))
  }
}


export async function initDB() {
  if (dbInstance) return dbInstance

  const trial = isTrialDb()
  dbInstance = await openDB(trial ? TRIAL_DB_NAME : DB_NAME, trial ? DRAFT_DB_VERSION : DB_VERSION, {
    upgrade: upgradeSchema,

    // Another tab is opening a newer schema. Close this connection so its
    // upgrade can run, and tell the page, which can no longer write.
    blocking(currentVersion, blockedVersion, event) {
      // The raw IDBDatabase is event.target; closing it lets the upgrade proceed.
      event.target.close()
      dbInstance = null
      announceDbState('superseded')
    },

    // This tab wants a newer schema but an older tab still holds the
    // database open. The upgrade waits until that tab closes or reloads.
    blocked() {
      announceDbState('blocked')
    },
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
      description: 'A center canvas (chart, table, dashboard) flanked by a sidebar and a chat panel. For working with data and files.',
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
      description: 'An editable document with margin notes for comments and analysis alongside the draft. For writing and editing.',
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
  // At version 6 the chat gets its number and docket here (records.js).
  return createChat(db, conversation)
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
  return updateChat(await initDB(), id, updates)
}

export async function deleteConversation(id) {
  // The chat, its messages, notes, highlights, favourites, the pinned
  // references kept in it, its files and its document, in one transaction.
  return removeChat(await initDB(), id)
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
  return createBranchChat(await initDB(), {
    sourceId: sourceConversationId,
    branchAtMessageId,
    title: options.title,
    model: options.model,
    newId: generateId,
    now: new Date().toISOString(),
  })
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
  // Touches the chat's updatedAt and size in the same transaction.
  return addMessageRecord(db, message)
}

export async function getMessages(conversationId) {
  const db = await initDB()
  const messages = await db.getAllFromIndex('messages', 'conversationId', conversationId)
  return messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
}

export async function updateMessage(id, updates) {
  return updateMessageRecord(await initDB(), id, updates)
}

export async function deleteMessage(id) {
  return removeMessage(await initDB(), id)
}

// ─── Highlights ──────────────────────────────────────────

export async function addHighlight({ conversationId, messageId, text, color = '#B8A070' }) {
  const db = await initDB()
  return addNumbered(db, 'highlights', {
    id: generateId(),
    conversationId,
    messageId,
    text,
    color,
    createdAt: new Date().toISOString(),
  })
}

export async function getHighlights(conversationId) {
  const db = await initDB()
  return db.getAllFromIndex('highlights', 'conversationId', conversationId)
}

export async function deleteHighlight(id) {
  return removeNumbered(await initDB(), 'highlights', id)
}

// ─── Notes ───────────────────────────────────────────────

export async function addNote({ conversationId, messageId, text }) {
  const db = await initDB()
  return addNumbered(db, 'notes', {
    id: generateId(),
    conversationId,
    messageId,
    text,
    createdAt: new Date().toISOString(),
  })
}

export async function getNotes(conversationId) {
  const db = await initDB()
  return db.getAllFromIndex('notes', 'conversationId', conversationId)
}

export async function updateNote(id, text) {
  return updateNumbered(await initDB(), 'notes', id, { text })
}

export async function deleteNote(id) {
  return removeNumbered(await initDB(), 'notes', id)
}

// ─── Favorites ───────────────────────────────────────────

export async function addFavorite({ conversationId, messageId }) {
  const db = await initDB()
  return addFavoriteRecord(db, {
    id: generateId(),
    conversationId,
    messageId,
    createdAt: new Date().toISOString(),
  })
}

export async function getFavorites(conversationId) {
  const db = await initDB()
  return db.getAllFromIndex('favorites', 'conversationId', conversationId)
}

export async function deleteFavorite(id) {
  return removeFavoriteRecord(await initDB(), id)
}

// ─── Pins (branch transfer references) ──────────────────

export async function addPin({ targetConversationId, sourceConversationId, sourceMessageId, content }) {
  const db = await initDB()
  return addNumbered(db, 'pins', {
    id: generateId(),
    targetConversationId,
    sourceConversationId,
    sourceMessageId,
    content,
    createdAt: new Date().toISOString(),
  })
}

export async function getPins(targetConversationId) {
  const db = await initDB()
  return db.getAllFromIndex('pins', 'targetConversationId', targetConversationId)
}

export async function deletePin(id) {
  return removeNumbered(await initDB(), 'pins', id)
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
  return saveDocument(await initDB(), conversationId, { paragraphs, suggestionStates, submittedReplies })
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

// An empty chat younger than this is left alone: another tab may have just
// made it, or it was opened a moment ago and is about to be used.
const EMPTY_CHAT_GRACE_MS = 24 * 60 * 60 * 1000

export async function runIntegrityCheck() {
  const db = await initDB()
  const conversations = await db.getAll('conversations')
  const now = Date.now()

  for (const conv of conversations) {
    const created = Date.parse(conv.createdAt)
    if (!Number.isFinite(created) || now - created < EMPTY_CHAT_GRACE_MS) continue
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
    // Key by each store's own keyPath: sbrd_documents is keyed on
    // conversationId, settings on key, everything else on id.
    const keyPath = tx.store.keyPath
    for (const item of data[storeName]) {
      const existing = await tx.store.get(item[keyPath])
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
  const stores = ['conversations', 'messages', 'highlights', 'notes', 'favorites', 'pins', 'settings', 'files', 'file_data', 'sbrd_documents',
    // Version 6 lists, where they exist. The counter goes too, so numbering starts again at 201.
    ...Object.keys(V6_NEW_STORES).filter((name) => db.objectStoreNames.contains(name))]
  for (const storeName of stores) {
    await db.clear(storeName)
  }
}

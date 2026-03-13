import { openDB } from 'idb'
import { validateBackup } from './validate'

const DB_NAME = 'project-apollo'
const DB_VERSION = 1

let dbInstance = null

export async function initDB() {
  if (dbInstance) return dbInstance

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('conversations')) {
        const convStore = db.createObjectStore('conversations', { keyPath: 'id' })
        convStore.createIndex('updatedAt', 'updatedAt')
      }

      if (!db.objectStoreNames.contains('messages')) {
        const msgStore = db.createObjectStore('messages', { keyPath: 'id' })
        msgStore.createIndex('conversationId', 'conversationId')
      }

      if (!db.objectStoreNames.contains('highlights')) {
        const hlStore = db.createObjectStore('highlights', { keyPath: 'id' })
        hlStore.createIndex('conversationId', 'conversationId')
      }

      if (!db.objectStoreNames.contains('notes')) {
        const noteStore = db.createObjectStore('notes', { keyPath: 'id' })
        noteStore.createIndex('conversationId', 'conversationId')
      }

      if (!db.objectStoreNames.contains('favorites')) {
        const favStore = db.createObjectStore('favorites', { keyPath: 'id' })
        favStore.createIndex('conversationId', 'conversationId')
      }

      if (!db.objectStoreNames.contains('pins')) {
        const pinStore = db.createObjectStore('pins', { keyPath: 'id' })
        pinStore.createIndex('targetConversationId', 'targetConversationId')
      }

      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' })
      }
    }
  })

  return dbInstance
}

// ─── ID Generation ───────────────────────────────────────

function generateId() {
  return crypto.randomUUID()
}

// ─── Conversations ───────────────────────────────────────

export async function createConversation({ title = 'New Conversation', model = 'claude-sonnet', parentId = null, branchPoint = null } = {}) {
  const db = await initDB()
  const now = new Date().toISOString()
  const conversation = {
    id: generateId(),
    title,
    model,
    parentId,
    branchPoint,
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

  // Create the branch conversation
  const now = new Date().toISOString()
  const branchConv = {
    id: generateId(),
    title: options.title || `Branch: ${source.title}`,
    model: options.model || source.model,
    parentId: sourceConversationId,
    branchPoint: branchAtMessageId,
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
    totalBytes += (msg.content?.length || 0) * 2 // rough byte estimate
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

export async function addMessage({ conversationId, role, content, tokenCount = 0, incomplete = false }) {
  const db = await initDB()
  const message = {
    id: generateId(),
    conversationId,
    role,
    content,
    tokenCount,
    incomplete,
    createdAt: new Date().toISOString(),
  }
  await db.put('messages', message)

  // Touch the conversation's updatedAt
  const conv = await db.get('conversations', conversationId)
  if (conv) {
    await db.put('conversations', { ...conv, updatedAt: message.createdAt })
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
  return updated
}

export async function deleteMessage(id) {
  const db = await initDB()
  await db.delete('messages', id)
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
      await deleteConversation(conv.id)
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
    exportedAt: new Date().toISOString(),
    version: 1,
  }
}

export async function importData(data) {
  // Validate before touching IndexedDB
  const check = validateBackup(data)
  if (!check.valid) throw new Error(check.error)

  const db = await initDB()
  const stores = ['conversations', 'messages', 'highlights', 'notes', 'favorites', 'pins', 'settings']
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
  const stores = ['conversations', 'messages', 'highlights', 'notes', 'favorites', 'pins', 'settings']
  for (const storeName of stores) {
    await db.clear(storeName)
  }
}
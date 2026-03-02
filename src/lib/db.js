import { openDB } from 'idb'

const DB_NAME = 'project-apollo'
const DB_VERSION = 1

// Initialize the database with all object stores
export async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Conversations
      if (!db.objectStoreNames.contains('conversations')) {
        const convStore = db.createObjectStore('conversations', { keyPath: 'id' })
        convStore.createIndex('updatedAt', 'updatedAt')
      }

      // Messages
      if (!db.objectStoreNames.contains('messages')) {
        const msgStore = db.createObjectStore('messages', { keyPath: 'id' })
        msgStore.createIndex('conversationId', 'conversationId')
      }

      // Highlights
      if (!db.objectStoreNames.contains('highlights')) {
        const hlStore = db.createObjectStore('highlights', { keyPath: 'id' })
        hlStore.createIndex('conversationId', 'conversationId')
      }

      // Notes
      if (!db.objectStoreNames.contains('notes')) {
        const noteStore = db.createObjectStore('notes', { keyPath: 'id' })
        noteStore.createIndex('conversationId', 'conversationId')
      }

      // Favorites
      if (!db.objectStoreNames.contains('favorites')) {
        const favStore = db.createObjectStore('favorites', { keyPath: 'id' })
        favStore.createIndex('conversationId', 'conversationId')
      }

      // Pinned references (from branch transfers)
      if (!db.objectStoreNames.contains('pins')) {
        const pinStore = db.createObjectStore('pins', { keyPath: 'id' })
        pinStore.createIndex('targetConversationId', 'targetConversationId')
      }

      // Settings (key-value)
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' })
      }
    }
  })
}

// ─── Conversations ───────────────────────────────────────

export async function createConversation(conversation) {
  // TODO: implement
}

export async function getConversation(id) {
  // TODO: implement
}

export async function listConversations() {
  // TODO: implement — return sorted by updatedAt desc
}

export async function updateConversation(id, updates) {
  // TODO: implement
}

export async function deleteConversation(id) {
  // TODO: implement — also delete related messages, highlights, notes, favorites, pins
}

// ─── Messages ────────────────────────────────────────────

export async function addMessage(message) {
  // TODO: implement
}

export async function getMessages(conversationId) {
  // TODO: implement — return sorted by createdAt asc
}

export async function deleteMessage(id) {
  // TODO: implement
}

// ─── Highlights ──────────────────────────────────────────

export async function addHighlight(highlight) {
  // TODO: implement
}

export async function getHighlights(conversationId) {
  // TODO: implement
}

export async function deleteHighlight(id) {
  // TODO: implement
}

// ─── Notes ───────────────────────────────────────────────

export async function addNote(note) {
  // TODO: implement
}

export async function getNotes(conversationId) {
  // TODO: implement
}

export async function deleteNote(id) {
  // TODO: implement
}

// ─── Favorites ───────────────────────────────────────────

export async function addFavorite(favorite) {
  // TODO: implement
}

export async function getFavorites(conversationId) {
  // TODO: implement
}

export async function deleteFavorite(id) {
  // TODO: implement
}

// ─── Pins (branch transfer references) ──────────────────

export async function addPin(pin) {
  // TODO: implement
}

export async function getPins(targetConversationId) {
  // TODO: implement
}

export async function deletePin(id) {
  // TODO: implement
}

// ─── Settings ────────────────────────────────────────────

export async function getSetting(key) {
  // TODO: implement — return value or null
}

export async function setSetting(key, value) {
  // TODO: implement
}

// ─── Danger Zone ─────────────────────────────────────────

export async function clearAllData() {
  // TODO: implement — delete all object stores' contents
}
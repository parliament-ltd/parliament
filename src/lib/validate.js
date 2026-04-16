// ─── Parliament Backup Schema Validation ─────────────────────
// Validates imported backup data before writing to IndexedDB.
// Returns { valid: true } or { valid: false, error: string }.

const MAX_STRING_LENGTH = 1_000_000  // 1 MB per field
const MAX_IMPORT_ITEMS  = 50_000     // across all stores

function isString(v, maxLen = MAX_STRING_LENGTH) {
  return typeof v === 'string' && v.length <= maxLen
}

function isStringOrNull(v, maxLen = MAX_STRING_LENGTH) {
  return v === null || v === undefined || isString(v, maxLen)
}

function isISODate(v) {
  if (typeof v !== 'string') return false
  const d = new Date(v)
  return !isNaN(d.getTime())
}

function isBoolean(v)  { return typeof v === 'boolean' }
function isNumber(v)   { return typeof v === 'number' && isFinite(v) }

// UUID-ish check — must be a non-empty string (loose, for forward-compat)
function isId(v)       { return typeof v === 'string' && v.length > 0 && v.length <= 128 }

// ─── Per-store validators ────────────────────────────────

function validateConversation(item) {
  if (!isId(item.id))                          return 'conversation.id invalid'
  if (!isString(item.title, 1000))             return 'conversation.title invalid'
  if (!isString(item.model, 200))              return 'conversation.model invalid'
  if (!isStringOrNull(item.parentId, 128))     return 'conversation.parentId invalid'
  if (!isStringOrNull(item.branchPoint, 128))  return 'conversation.branchPoint invalid'
  if (!isBoolean(item.pinned))                 return 'conversation.pinned must be boolean'
  if (!isNumber(item.storageBytes))            return 'conversation.storageBytes must be a number'
  if (!isISODate(item.createdAt))              return 'conversation.createdAt invalid date'
  if (!isISODate(item.updatedAt))              return 'conversation.updatedAt invalid date'
  return null
}

function validateMessage(item) {
  if (!isId(item.id))                          return 'message.id invalid'
  if (!isId(item.conversationId))              return 'message.conversationId invalid'
  if (item.role !== 'user' && item.role !== 'assistant') return 'message.role must be user or assistant'
  if (!isString(item.content))                 return 'message.content invalid or too large'
  if (!isNumber(item.tokenCount))              return 'message.tokenCount must be a number'
  if (!isBoolean(item.incomplete))             return 'message.incomplete must be boolean'
  if (!isISODate(item.createdAt))              return 'message.createdAt invalid date'
  return null
}

function validateHighlight(item) {
  if (!isId(item.id))                          return 'highlight.id invalid'
  if (!isId(item.conversationId))              return 'highlight.conversationId invalid'
  if (!isId(item.messageId))                   return 'highlight.messageId invalid'
  if (!isString(item.text, 50_000))            return 'highlight.text invalid or too large'
  if (!isString(item.color, 50))               return 'highlight.color invalid'
  if (!isISODate(item.createdAt))              return 'highlight.createdAt invalid date'
  return null
}

function validateNote(item) {
  if (!isId(item.id))                          return 'note.id invalid'
  if (!isId(item.conversationId))              return 'note.conversationId invalid'
  if (!isStringOrNull(item.messageId, 128))    return 'note.messageId invalid'
  if (!isString(item.text, 100_000))           return 'note.text invalid or too large'
  if (!isISODate(item.createdAt))              return 'note.createdAt invalid date'
  return null
}

function validateFavorite(item) {
  if (!isId(item.id))                          return 'favorite.id invalid'
  if (!isId(item.conversationId))              return 'favorite.conversationId invalid'
  if (!isId(item.messageId))                   return 'favorite.messageId invalid'
  if (!isISODate(item.createdAt))              return 'favorite.createdAt invalid date'
  return null
}

function validatePin(item) {
  if (!isId(item.id))                                  return 'pin.id invalid'
  if (!isId(item.targetConversationId))                return 'pin.targetConversationId invalid'
  if (!isId(item.sourceConversationId))                return 'pin.sourceConversationId invalid'
  if (!isId(item.sourceMessageId))                     return 'pin.sourceMessageId invalid'
  if (!isString(item.content))                         return 'pin.content invalid or too large'
  if (!isISODate(item.createdAt))                      return 'pin.createdAt invalid date'
  return null
}

function validateSetting(item) {
  if (!isString(item.key, 200))  return 'setting.key invalid'
  // value is intentionally unrestricted — settings are internal app state
  return null
}

const VALIDATORS = {
  conversations: validateConversation,
  messages:      validateMessage,
  highlights:    validateHighlight,
  notes:         validateNote,
  favorites:     validateFavorite,
  pins:          validatePin,
  settings:      validateSetting,
}

// ─── Top-level export ────────────────────────────────────

/**
 * Validate a parsed Parliament backup object.
 * Returns { valid: true } or { valid: false, error: string }.
 */
export function validateBackup(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, error: 'Backup must be a JSON object.' }
  }

  if (!Array.isArray(data.conversations)) {
    return { valid: false, error: 'Missing or invalid conversations list.' }
  }

  // Total item count guard (DOS protection)
  let totalItems = 0
  for (const storeName of Object.keys(VALIDATORS)) {
    const arr = data[storeName]
    if (arr !== undefined && arr !== null) {
      if (!Array.isArray(arr)) {
        return { valid: false, error: `${storeName} must be an array.` }
      }
      totalItems += arr.length
    }
  }
  if (totalItems > MAX_IMPORT_ITEMS) {
    return { valid: false, error: `Backup is too large (${totalItems} items, max ${MAX_IMPORT_ITEMS}).` }
  }

  // Per-item validation + duplicate-id detection per store
  const idSets = {}
  for (const [storeName, validate] of Object.entries(VALIDATORS)) {
    const arr = data[storeName]
    if (!arr) continue
    const seen = new Set()
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i]
      if (!item || typeof item !== 'object') {
        return { valid: false, error: `${storeName}[${i}] is not an object.` }
      }
      const err = validate(item)
      if (err) {
        return { valid: false, error: `Invalid backup data: ${err} (item ${i} in ${storeName}).` }
      }
      const key = item.id ?? item.key
      if (key !== undefined) {
        if (seen.has(key)) {
          return { valid: false, error: `Duplicate id '${key}' in ${storeName}.` }
        }
        seen.add(key)
      }
    }
    idSets[storeName] = seen
  }

  // Cross-reference checks: branch parents must resolve, and messages/notes/
  // highlights/favorites/pins must reference conversations (and messages)
  // that exist in this backup.
  const convIds = idSets.conversations || new Set()
  const msgIds  = idSets.messages      || new Set()

  for (let i = 0; i < data.conversations.length; i++) {
    const c = data.conversations[i]
    if (c.parentId && !convIds.has(c.parentId)) {
      return { valid: false, error: `conversations[${i}].parentId references unknown conversation '${c.parentId}'.` }
    }
    if (c.parentId === c.id) {
      return { valid: false, error: `conversations[${i}] has parentId equal to its own id (circular).` }
    }
  }

  // Detect cycles in the parent chain (A → B → A, etc.) via iterative walk.
  for (const c of data.conversations) {
    if (!c.parentId) continue
    const visited = new Set([c.id])
    let cursor = c.parentId
    let steps = 0
    while (cursor && steps < data.conversations.length + 1) {
      if (visited.has(cursor)) {
        return { valid: false, error: `Circular parent chain detected at conversation '${c.id}'.` }
      }
      visited.add(cursor)
      const parent = data.conversations.find(x => x.id === cursor)
      cursor = parent ? parent.parentId : null
      steps++
    }
  }

  const refChecks = [
    { store: 'messages',   field: 'conversationId', target: convIds, targetName: 'conversations' },
    { store: 'highlights', field: 'conversationId', target: convIds, targetName: 'conversations' },
    { store: 'highlights', field: 'messageId',      target: msgIds,  targetName: 'messages' },
    { store: 'notes',      field: 'conversationId', target: convIds, targetName: 'conversations' },
    { store: 'favorites',  field: 'conversationId', target: convIds, targetName: 'conversations' },
    { store: 'favorites',  field: 'messageId',      target: msgIds,  targetName: 'messages' },
    { store: 'pins',       field: 'targetConversationId', target: convIds, targetName: 'conversations' },
    { store: 'pins',       field: 'sourceConversationId', target: convIds, targetName: 'conversations' },
    { store: 'pins',       field: 'sourceMessageId',      target: msgIds,  targetName: 'messages' },
  ]
  for (const { store, field, target, targetName } of refChecks) {
    const arr = data[store]
    if (!Array.isArray(arr)) continue
    for (let i = 0; i < arr.length; i++) {
      const val = arr[i][field]
      if (val !== null && val !== undefined && !target.has(val)) {
        return { valid: false, error: `${store}[${i}].${field} references unknown ${targetName} id '${val}'.` }
      }
    }
  }

  return { valid: true }
}

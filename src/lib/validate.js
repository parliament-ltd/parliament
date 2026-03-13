// ─── Apollo Backup Schema Validation ─────────────────────
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
 * Validate a parsed Apollo backup object.
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

  // Per-item validation
  for (const [storeName, validate] of Object.entries(VALIDATORS)) {
    const arr = data[storeName]
    if (!arr) continue
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i]
      if (!item || typeof item !== 'object') {
        return { valid: false, error: `${storeName}[${i}] is not an object.` }
      }
      const err = validate(item)
      if (err) {
        return { valid: false, error: `Invalid backup data: ${err} (item ${i} in ${storeName}).` }
      }
    }
  }

  return { valid: true }
}

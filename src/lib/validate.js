// ─── Parliament Backup Schema Validation ─────────────────────
// Validates imported backup data before writing to IndexedDB.
// Returns { valid: true } or { valid: false, error: string }.

import { isTranslation, isAsked } from './translations'

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

// Fields every numbered kind may carry (stage 6, piece 3; C143 (h)): pinned,
// archived, tags and the tags the person added. Optional; older records have
// some or none of them.
const TAGS_MAX = 200
const isTagList = (v) => Array.isArray(v) && v.length <= TAGS_MAX && v.every((t) => typeof t === 'string' && t.length > 0 && t.length <= 100)
// A list of numbers, as a note's quotes are.
const isNumList = (v) => Array.isArray(v) && v.length <= 1000 && v.every((n) => Number.isInteger(n) && n > 0)

function rowFields(item, kind) {
  // The number of the chat a kept marking came from, when that chat was erased (C137 (c)).
  if (item.erasedFrom != null && !(Number.isInteger(item.erasedFrom) && item.erasedFrom > 0)) return `${kind}.erasedFrom must be a number`

  if (item.pinned !== undefined && !isBoolean(item.pinned))     return `${kind}.pinned must be boolean`
  if (item.archived !== undefined && !isBoolean(item.archived)) return `${kind}.archived must be boolean`
  if (item.tags !== undefined && !isTagList(item.tags))         return `${kind}.tags invalid`
  if (item.tagsMine !== undefined && !isTagList(item.tagsMine)) return `${kind}.tagsMine invalid`
  return null
}

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
  // V2: optional `room` field pointing at a mode in the `modes` table.
  // Older records (pre-v4) may lack the field entirely — accept as null/undefined.
  if (item.room !== undefined && !isStringOrNull(item.room, 128)) {
    return 'conversation.room invalid'
  }
  // Who answers in the chat, an id from the list of models and sources
  // (stage 7; C150). Optional; null or missing means the default answers.
  // A model on this computer keeps its Ollama name: ollama:hf.co/org/model:q4.
  if (item.answerer != null && !(typeof item.answerer === 'string' && /^[a-z0-9][a-z0-9._:/-]{0,119}$/.test(item.answerer))) {
    return 'conversation.answerer invalid'
  }
  // The frameworks on the chat, in order: a built-in's id or own:<id> (C164).
  if (item.frameworks != null && !isFrameworkIds(item.frameworks)) return 'conversation.frameworks invalid'
  return rowFields(item, 'conversation')
}

// Frameworks (stage 7; C164): ids, and on a reply the name one of the
// person's own had.
const FRAMEWORK_ID = /^(own:[A-Za-z0-9_-]{1,128}|[a-z]{1,20})$/
const isFrameworkIds = (v) => Array.isArray(v) && v.length <= 10 && v.every((id) => typeof id === 'string' && FRAMEWORK_ID.test(id))
const isFrameworkRecord = (v) => Array.isArray(v) && v.length <= 10 && v.every((f) => f && typeof f === 'object' && !Array.isArray(f)
  && typeof f.id === 'string' && FRAMEWORK_ID.test(f.id) && (f.name == null || (typeof f.name === 'string' && f.name.length <= 60)))

// Where an answer from a source came from: short strings only, links to https.
function isSourceNote(s) {
  if (typeof s !== 'object' || Array.isArray(s)) return false
  const text = (v, max) => v == null || (typeof v === 'string' && v.length <= max)
  const link = (v) => v == null || (typeof v === 'string' && v.length <= 2000 && v.startsWith('https://'))
  return typeof s.id === 'string' && /^[a-z]{1,40}$/.test(s.id)
    && text(s.name, 100) && text(s.title, 300) && link(s.url) && text(s.revision, 40) && text(s.revisedAt, 40) && text(s.lang, 10)
    && (s.found == null || typeof s.found === 'boolean')
    && (s.licence == null || (typeof s.licence === 'object' && text(s.licence.name, 100) && link(s.licence.url)))
    // A list of results (Hacker News, OpenAlex; stage 7, C156): short text
    // and web links only, and a few facts as short text.
    && (s.shape == null || s.shape === 'list')
    && (s.items == null || (Array.isArray(s.items) && s.items.length <= 10 && s.items.every((it) => it && typeof it === 'object' && !Array.isArray(it)
      && typeof it.title === 'string' && it.title.length <= 301 && link(it.url) && link(it.discussion) && text(it.date, 41) && text(it.text, 2001)
      && (it.facts == null || (typeof it.facts === 'object' && !Array.isArray(it.facts) && Object.keys(it.facts).length <= 10
        && Object.entries(it.facts).every(([k, v]) => /^[a-z]{1,20}$/.test(k) && typeof v === 'string' && v.length <= 201))))))
}

const STOP_REASONS = new Set(['left', 'limit', 'error'])

const isGroup = (g) => Boolean(g) && typeof g === 'object' && !Array.isArray(g) && isId(g.id)
  && Array.isArray(g.chats) && g.chats.length >= 1 && g.chats.length <= 10 && g.chats.every(isId)
const isCitations = (v) => Array.isArray(v) && v.length <= 20 && v.every((c) => c && typeof c === 'object' && !Array.isArray(c)
  && typeof c.url === 'string' && c.url.length <= 2000 && c.url.startsWith('https://')
  && (c.title == null || (typeof c.title === 'string' && c.title.length <= 300))
  && Array.isArray(c.quoted) && c.quoted.length <= 3 && c.quoted.every((q) => typeof q === 'string' && q.length <= 300))

function validateMessage(item) {
  if (!isId(item.id))                          return 'message.id invalid'
  if (!isId(item.conversationId))              return 'message.conversationId invalid'
  if (item.role !== 'user' && item.role !== 'assistant') return 'message.role must be user or assistant'
  if (!isString(item.content))                 return 'message.content invalid or too large'
  if (!isNumber(item.tokenCount))              return 'message.tokenCount must be a number'
  if (!isBoolean(item.incomplete))             return 'message.incomplete must be boolean'
  if (!isISODate(item.createdAt))              return 'message.createdAt invalid date'
  // Why a reply stopped short: its chat was left (C109), it reached the
  // length allowed for one reply, or an error broke it off (stage 4).
  if (item.stopReason != null && !STOP_REASONS.has(item.stopReason)) return 'message.stopReason invalid'
  // Stage 4: an answer from a source says where it came from.
  if (item.source != null && !isSourceNote(item.source)) return 'message.source invalid'
  if (item.frameworks != null && !isFrameworkRecord(item.frameworks)) return 'message.frameworks invalid'
  // What a model thought before answering, kept as text, and for how long (C165).
  if (item.thinking != null && !(typeof item.thinking === 'string' && item.thinking.length <= 20_000)) return 'message.thinking invalid'
  if (item.thinkingMs != null && !(Number.isFinite(item.thinkingMs) && item.thinkingMs >= 0)) return 'message.thinkingMs invalid'
  // An answer from a source translated on request, and a question translated before it went (C166).
  if (item.translation != null && !isTranslation(item.translation)) return 'message.translation invalid'
  if (item.asked != null && !isAsked(item.asked)) return 'message.asked invalid'
  // The sources a reply cited from a web search (C167): web addresses and short text only.
  if (item.citations != null && !isCitations(item.citations)) return 'message.citations invalid'
  // A branch's copy keeps the message it came from; a prompt to several, its branches (C172).
  if (item.from != null && !isId(item.from)) return 'message.from invalid'
  if (item.group != null && !isGroup(item.group)) return 'message.group invalid'
  // Stage 6: the model a reply came from, and the tokens it took (C132 (h)).
  if (item.model != null && !isString(item.model, 200)) return 'message.model invalid'
  if (item.usage != null && !isUsage(item.usage)) return 'message.usage invalid'
  return null
}

const TOKENS = (n) => Number.isInteger(n) && n >= 0 && n <= 100_000_000
function isUsage(u) {
  return u !== null && typeof u === 'object' && !Array.isArray(u) && TOKENS(u.input) && TOKENS(u.output)
    && Object.keys(u).every((k) => k === 'input' || k === 'output')
}

// A keyword or quote kept when its chat was erased has no chat or message
// of its own, and carries the number it came from instead (C137 (c)).
const detached = (item, ...refs) => Number.isInteger(item.erasedFrom) && refs.every((r) => r == null)

function validateHighlight(item) {
  if (!isId(item.id))                          return 'highlight.id invalid'
  const kept = detached(item, item.conversationId, item.messageId)
  if (!kept && !isId(item.conversationId))     return 'highlight.conversationId invalid'
  if (!kept && !isId(item.messageId))          return 'highlight.messageId invalid'
  if (!isString(item.text, 50_000))            return 'highlight.text invalid or too large'
  if (!isString(item.color, 50))               return 'highlight.color invalid'
  if (!isISODate(item.createdAt))              return 'highlight.createdAt invalid date'
  return rowFields(item, 'highlight')
}

function validateNote(item) {
  if (!isId(item.id))                          return 'note.id invalid'
  // A note in no chat stands on its own, like the one the scratchpad becomes.
  if (!isStringOrNull(item.conversationId, 128)) return 'note.conversationId invalid'
  if (!isStringOrNull(item.messageId, 128))    return 'note.messageId invalid'
  if (!isString(item.text, 100_000))           return 'note.text invalid or too large'
  if (!isISODate(item.createdAt))              return 'note.createdAt invalid date'
  // The numbers a note quotes, and a summary's numbers, day and model (C145).
  if (item.quotes !== undefined && !isNumList(item.quotes)) return 'note.quotes must be a list of numbers'
  if (item.summary !== undefined && item.summary !== null) {
    const s = item.summary
    if (typeof s !== 'object' || !isNumList(s.from) || !isISODate(s.at) || !isStringOrNull(s.model ?? null, 200)) return 'note.summary invalid'
  }
  return rowFields(item, 'note')
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
  const kept = detached(item, item.targetConversationId)
  if (!kept && !isId(item.targetConversationId))       return 'pin.targetConversationId invalid'
  if (!isStringOrNull(item.sourceConversationId, 128) || (!kept && !isId(item.sourceConversationId))) return 'pin.sourceConversationId invalid'
  if (!isStringOrNull(item.sourceMessageId, 128) || (!kept && !isId(item.sourceMessageId)))           return 'pin.sourceMessageId invalid'
  if (!isString(item.content))                         return 'pin.content invalid or too large'
  if (!isISODate(item.createdAt))                      return 'pin.createdAt invalid date'
  return rowFields(item, 'pin')
}

function validateSetting(item) {
  if (!isString(item.key, 200))  return 'setting.key invalid'
  // value is intentionally unrestricted — settings are internal app state
  return null
}

// ─── File / file_data validators ─────────────────────────
// V2 closes the V1 gap by including `files` and `file_data` in backups
// (see refactor/phase-1-pr-plan.md PR-7). Validators are kept light:
// the binary data field is opaque (ArrayBuffer or Uint8Array), and only
// presence is checked.

function isBinary(v) {
  return v instanceof ArrayBuffer || ArrayBuffer.isView(v)
}

function validateFile(item) {
  if (!isId(item.id))                 return 'file.id invalid'
  if (!isId(item.conversationId))     return 'file.conversationId invalid'
  if (!isString(item.name, 500))      return 'file.name invalid'
  if (!isString(item.type, 200))      return 'file.type invalid'
  if (!isNumber(item.sizeBytes))      return 'file.sizeBytes must be a number'
  if (!isISODate(item.uploadedAt))    return 'file.uploadedAt invalid date'
  return null
}

function validateFileData(item) {
  if (!isId(item.fileId))             return 'file_data.fileId invalid'
  if (!isBinary(item.data))           return 'file_data.data must be binary'
  return null
}

// ─── V1 store validator (pre-V2 gap closed in PR-1) ──────

function validateSbrdDocument(item) {
  if (!isId(item.conversationId))     return 'sbrd_document.conversationId invalid'
  if (!Array.isArray(item.paragraphs)) return 'sbrd_document.paragraphs must be an array'
  // suggestionStates and submittedReplies are component-internal shapes;
  // we don't deeply validate them here — they're owned by document-canvas@1.0
  // and treated as opaque.
  if (item.suggestionStates !== undefined && typeof item.suggestionStates !== 'object') {
    return 'sbrd_document.suggestionStates must be an object'
  }
  if (item.submittedReplies !== undefined && typeof item.submittedReplies !== 'object') {
    return 'sbrd_document.submittedReplies must be an object'
  }
  if (!isISODate(item.updatedAt))     return 'sbrd_document.updatedAt invalid date'
  return null
}

// ─── V2 catalog and mode validators (added in PR-1) ─────

const STATUS_VALUES = ['available', 'beta', 'coming-soon']
const MODE_SCOPES = ['room', 'homepage']

function validateMode(item) {
  if (!isId(item.id))                      return 'mode.id invalid'
  if (!isString(item.schema, 200))         return 'mode.schema invalid'
  if (!MODE_SCOPES.includes(item.scope))   return 'mode.scope must be room or homepage'
  if (!Array.isArray(item.components))     return 'mode.components must be an array'
  if (item.pipelines !== undefined && !Array.isArray(item.pipelines)) {
    return 'mode.pipelines must be an array if present'
  }
  // meta, layout, scheme are objects validated downstream by component
  // resolvers; we keep validation shallow here so future schema additions
  // don't require touching this validator.
  if (item.meta && typeof item.meta !== 'object')   return 'mode.meta must be an object'
  if (item.layout && typeof item.layout !== 'object') return 'mode.layout must be an object'
  if (item.scheme && typeof item.scheme !== 'object') return 'mode.scheme must be an object'
  // PR-27: optional layoutConfig holds per-layout opt-in metadata
  // (e.g. panelButtons). Absence = layout uses its defaults. We accept
  // any object shape so future layout-config fields don't churn this.
  if (item.layoutConfig && typeof item.layoutConfig !== 'object') {
    return 'mode.layoutConfig must be an object'
  }
  return null
}

function validateLibraryLayout(item) {
  if (!isId(item.id))                       return 'libraryLayout.id invalid'
  if (!isString(item.displayName, 200))     return 'libraryLayout.displayName invalid'
  if (!isString(item.version, 50))          return 'libraryLayout.version invalid'
  if (!STATUS_VALUES.includes(item.status)) return `libraryLayout.status must be one of ${STATUS_VALUES.join(', ')}`
  if (!Array.isArray(item.scopes))          return 'libraryLayout.scopes must be an array'
  return null
}

function validateLibraryRoom(item) {
  if (!isId(item.id))                       return 'libraryRoom.id invalid'
  if (!isString(item.displayName, 200))     return 'libraryRoom.displayName invalid'
  if (!STATUS_VALUES.includes(item.status)) return `libraryRoom.status must be one of ${STATUS_VALUES.join(', ')}`
  return null
}

function validateLibraryComponent(item) {
  if (!isId(item.id))                       return 'libraryComponent.id invalid'
  if (!isString(item.displayName, 200))     return 'libraryComponent.displayName invalid'
  if (!isString(item.version, 50))          return 'libraryComponent.version invalid'
  if (!isString(item.tier, 50))             return 'libraryComponent.tier invalid'
  return null
}

function validateLibraryScheme(item) {
  if (!isId(item.id))                       return 'libraryScheme.id invalid'
  if (!isString(item.displayName, 200))     return 'libraryScheme.displayName invalid'
  if (!isString(item.version, 50))          return 'libraryScheme.version invalid'
  return null
}

function validateLibraryResource(item) {
  if (!isId(item.id))                       return 'libraryResource.id invalid'
  if (!isString(item.displayName, 200))     return 'libraryResource.displayName invalid'
  if (!STATUS_VALUES.includes(item.status)) return `libraryResource.status must be one of ${STATUS_VALUES.join(', ')}`
  if (!isString(item.format, 50))           return 'libraryResource.format invalid'
  return null
}

// ─── Version 6 lists (C93) ───────────────────────────────

function validateDocket(item) {
  if (!isId(item.id))                       return 'docket.id invalid'
  if (item.num !== undefined && !isNumber(item.num)) return 'docket.num must be a number'
  if (!Array.isArray(item.branches))        return 'docket.branches must be an array'
  if (!Array.isArray(item.order))           return 'docket.order must be an array'
  return rowFields(item, 'docket')
}

function validateRun(item) {
  if (!isId(item.id))                       return 'run.id invalid'
  if (!isId(item.docketId))                 return 'run.docketId invalid'
  if (!item.branches || typeof item.branches !== 'object' || Array.isArray(item.branches)) return 'run.branches must be an object'
  return null
}

function validateCollection(item) {
  if (!isId(item.id))                       return 'collection.id invalid'
  if (!Array.isArray(item.items))           return 'collection.items must be an array'
  if (item.order !== undefined && !(Array.isArray(item.order) && item.order.every((k) => isString(k, 300)))) return 'collection.order must be a list of keys'
  return null
}

function validateCollab(item) {
  if (!isId(item.id))                       return 'collab.id invalid'
  if (!isString(item.instruction, 100_000)) return 'collab.instruction invalid'
  return null
}

const VALIDATORS = {
  conversations:     validateConversation,
  messages:          validateMessage,
  highlights:        validateHighlight,
  notes:             validateNote,
  favorites:         validateFavorite,
  pins:              validatePin,
  settings:          validateSetting,
  sbrd_documents:    validateSbrdDocument,
  files:             validateFile,
  file_data:         validateFileData,
  modes:             validateMode,
  libraryLayouts:    validateLibraryLayout,
  libraryRooms:      validateLibraryRoom,
  libraryComponents: validateLibraryComponent,
  librarySchemes:    validateLibraryScheme,
  libraryResources:  validateLibraryResource,
  dockets:           validateDocket,
  runs:              validateRun,
  collections:       validateCollection,
  collabs:           validateCollab,
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

  // A branch whose parent chat was deleted is kept: the app makes such
  // branches itself, and the planner gives each a docket of its own.
  for (let i = 0; i < data.conversations.length; i++) {
    const c = data.conversations[i]
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

  // file_data references files by fileId. Build a file-id set for the
  // cross-ref check; the existing idSets pass already collected `files`
  // by id (since file records have an `id` keyPath) so we can reuse that.
  const fileIds = idSets.files || new Set()

  const refChecks = [
    { store: 'messages',   field: 'conversationId', target: convIds, targetName: 'conversations' },
    { store: 'highlights', field: 'conversationId', target: convIds, targetName: 'conversations' },
    { store: 'highlights', field: 'messageId',      target: msgIds,  targetName: 'messages' },
    { store: 'notes',      field: 'conversationId', target: convIds, targetName: 'conversations' },
    { store: 'favorites',  field: 'conversationId', target: convIds, targetName: 'conversations' },
    { store: 'favorites',  field: 'messageId',      target: msgIds,  targetName: 'messages' },
    { store: 'pins',       field: 'targetConversationId', target: convIds, targetName: 'conversations' },
    // A pinned reference is a copy, so its source may be gone; only the chat it is kept in must exist.
    { store: 'sbrd_documents', field: 'conversationId',   target: convIds, targetName: 'conversations' },
    { store: 'files',      field: 'conversationId', target: convIds, targetName: 'conversations' },
    { store: 'file_data',  field: 'fileId',         target: fileIds, targetName: 'files' },
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

  // A chat whose room was deleted is kept: deleteMode leaves such chats, and
  // they open with a placeholder (C93, 19 October).

  return { valid: true }
}

// What a backup may hold, and what a restore may accept (C93, audit T6).
//
// One allowlist for both directions. A record leaving in a backup, or coming
// in from one, is rebuilt from its known fields only; anything else on it is
// dropped. Only settings named here travel, and the saved key never does.
// The file is data: nothing in it is trusted because it is there.
//
// Kept free of app imports so it can be tested in Node.

// ── Records ─────────────────────────────────────────────

// Fields each kind of record may carry. Room files (modes) and library
// entries are checked by validate.js and kept whole: their shape belongs to
// the catalogue, which reads them as data.
export const FIELDS = Object.freeze({
  conversations: ['id', 'title', 'model', 'parentId', 'parentTitle', 'branchPoint', 'familyId', 'createdInMode', 'room',
    'pinned', 'storageBytes', 'createdAt', 'updatedAt', 'tags', 'tagsBy', 'aiSummary',
    'num', 'docketId', 'branch', 'run', 'restoredFrom', 'archived', 'tagsMine'],
  // model and usage: what a reply was made with and its tokens (C132 (h), stage 6).
  messages: ['id', 'conversationId', 'role', 'content', 'tokenCount', 'incomplete', 'createdAt', 'attachmentMeta', 'stopReason', 'source', 'model', 'usage'],
  notes: ['id', 'conversationId', 'messageId', 'text', 'createdAt', 'num', 'pinned', 'tags', 'fromScratchpad', 'restoredFrom', 'archived', 'tagsMine'],
  highlights: ['id', 'conversationId', 'messageId', 'text', 'color', 'createdAt', 'num', 'kind', 'pinned', 'tags', 'restoredFrom', 'archived', 'tagsMine'],
  favorites: ['id', 'conversationId', 'messageId', 'createdAt'],
  pins: ['id', 'targetConversationId', 'sourceConversationId', 'sourceMessageId', 'content', 'createdAt', 'num', 'kind', 'restoredFrom', 'pinned', 'tags', 'archived', 'tagsMine'],
  files: ['id', 'conversationId', 'name', 'type', 'rows', 'cols', 'sizeBytes', 'inContext', 'uploadedAt'],
  file_data: ['fileId', 'data'],
  sbrd_documents: ['conversationId', 'paragraphs', 'suggestionStates', 'submittedReplies', 'updatedAt'],
  // Version 6.
  dockets: ['id', 'num', 'title', 'createdAt', 'updatedAt', 'pinned', 'tags', 'archived', 'branches', 'order', 'nextLetter', 'restoredFrom', 'tagsMine'],
  runs: ['id', 'docketId', 'n', 'createdAt', 'cost', 'branches'],
  collections: ['id', 'name', 'builtIn', 'description', 'items', 'headings', 'pinned', 'createdAt', 'updatedAt', 'fromFavorites'],
  collabs: ['id', 'name', 'instruction', 'builtIn', 'on', 'fromPersona', 'createdAt'],
})

/** The record with only its known fields, or the record itself for kinds kept whole. */
export function rebuildRecord(store, record) {
  const fields = FIELDS[store]
  if (!fields || !record || typeof record !== 'object') return record
  const out = {}
  for (const f of fields) if (record[f] !== undefined) out[f] = record[f]
  return out
}

// ── Settings ────────────────────────────────────────────

const str = (max) => (v) => typeof v === 'string' && v.length <= max
const strOrNull = (max) => (v) => v === null || str(max)(v)
const num = (lo, hi) => (v) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi
const bool = (v) => typeof v === 'boolean'
const either = (...checks) => (v) => checks.some((c) => c(v))
const ID = /^[A-Za-z0-9_-]{1,128}$/
const idList = (v) => Array.isArray(v) && v.length <= 10_000 && v.every((x) => typeof x === 'string' && ID.test(x))
const plainObject = (maxChars) => (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && JSON.stringify(v).length <= maxChars

// Settings a backup carries, each with the values it may hold. Left out on
// purpose: the saved key (never), the browser's fingerprint and its log of
// backups (they describe this browser), and the markers old upgrades left
// (they describe this database, and their guards work without them).
const SETTINGS = Object.freeze({
  storageMode: either(str(20)),
  defaultModel: str(200),
  theme: str(20),
  fontSize: str(20),
  contextThreshold: num(0, 100),
  autoCompress: str(20),
  summaryDepth: str(20),
  budgetAlert: num(0, 1_000_000),
  budgetEnabled: bool,
  backupReminder: str(20),
  lastBackup: either(strOrNull(40), num(0, Number.MAX_SAFE_INTEGER)),
  spendingLimitDismissed: bool,
  chosenHomeRoomId: strOrNull(128),
  'scratchpad-text': str(1_000_000),
  parrotPersonas: either(str(1_000_000), (v) => Array.isArray(v) && JSON.stringify(v).length <= 1_000_000),
  accountCreatedAt: either(str(40), num(0, Number.MAX_SAFE_INTEGER)),
  backupBannerDismissedAt: either(strOrNull(40), num(0, Number.MAX_SAFE_INTEGER)),
  installPromptDismissed: either(bool, str(40), num(0, Number.MAX_SAFE_INTEGER)),
  finishRepliesOnLeave: bool, // C109
  describeNewChats: bool, // C62
})

// Settings named after something. `chat` names the chat in the key, so a
// restore that gives the chat a new id renames the setting with it.
const PATTERNS = Object.freeze([
  { re: /^tourCompleted_[A-Za-z]{1,40}$/, check: either(bool, str(40), num(0, Number.MAX_SAFE_INTEGER)) },
  // Secretarybird's Ripple: the chats a document carries edits to, by id.
  { re: /^sbrd-ripple-scope-([A-Za-z0-9_-]{1,128})$/, check: idList, chat: true, idsInValue: true },
  // Its last scan: when, how many, and what it found, by document title.
  { re: /^sbrd-ripple-manifest-([A-Za-z0-9_-]{1,128})$/, check: plainObject(1_000_000), chat: true },
])

/** How a setting may travel: null if it may not, else { chatId, idsInValue }. */
export function settingRule(key) {
  if (typeof key !== 'string') return null
  if (Object.hasOwn(SETTINGS, key)) return { check: SETTINGS[key], chatId: null, idsInValue: false }
  for (const p of PATTERNS) {
    const m = key.match(p.re)
    if (m) return { check: p.check, chatId: p.chat ? m[1] : null, idsInValue: Boolean(p.idsInValue) }
  }
  return null
}

/** True if this setting, with this value, may be in a backup or come in from one. */
export function settingAllowed(entry) {
  const rule = entry && settingRule(entry.key)
  return Boolean(rule && rule.check(entry.value))
}

/**
 * The setting with any chat it names renamed, for a restore that gave
 * chats new ids. `conv(id)` returns the id a chat has now.
 */
export function renameSettingChats(entry, conv) {
  const rule = settingRule(entry.key)
  if (!rule?.chatId) return entry
  const key = entry.key.slice(0, entry.key.length - rule.chatId.length) + conv(rule.chatId)
  const value = rule.idsInValue ? entry.value.map(conv) : entry.value
  return { key, value }
}

// ── A whole file ────────────────────────────────────────

/**
 * Flattened backup contents, cleaned for a restore: records rebuilt from
 * their known fields, settings kept only if allowed, and records pointing at
 * a chat or message that is not in the file left out and counted. The app
 * itself leaves such records behind (a favourite of a deleted message), so
 * they are no reason to refuse a whole file. A branch whose parent is gone,
 * and a chat whose room is gone, are kept as they are.
 */
export function cleanFlat(flat) {
  const out = {}
  for (const [store, records] of Object.entries(flat)) {
    out[store] = Array.isArray(records) ? records.map((r) => rebuildRecord(store, r)) : records
  }
  const dropped = { settings: 0, notes: 0, highlights: 0, favorites: 0, pins: 0, documents: 0, files: 0, messages: 0 }

  const settings = out.settings || []
  out.settings = settings.filter(settingAllowed)
  dropped.settings = settings.length - out.settings.length

  const chats = new Set((out.conversations || []).map((c) => c.id))
  const messages = new Set()
  const keep = (store, test) => {
    const before = out[store] || []
    out[store] = before.filter(test)
    return before.length - out[store].length
  }
  dropped.messages = keep('messages', (m) => chats.has(m.conversationId) && (messages.add(m.id), true))
  const onMessage = (a) => chats.has(a.conversationId) && (a.messageId == null || messages.has(a.messageId))
  // A note in no chat stands on its own (the scratchpad's, and free notes later).
  dropped.notes = keep('notes', (a) => (a.conversationId == null && a.messageId == null) || onMessage(a))
  dropped.highlights = keep('highlights', onMessage)
  dropped.favorites = keep('favorites', onMessage)
  // A pinned reference is a copy: its source may be gone, its chat may not.
  dropped.pins = keep('pins', (p) => chats.has(p.targetConversationId))
  dropped.documents = keep('sbrd_documents', (d) => chats.has(d.conversationId))
  dropped.files = keep('files', (f) => chats.has(f.conversationId))
  const files = new Set((out.files || []).map((f) => f.id))
  keep('file_data', (fd) => files.has(fd.fileId))
  return { flat: out, dropped }
}

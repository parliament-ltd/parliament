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
    'num', 'docketId', 'branch', 'run', 'restoredFrom', 'archived', 'tagsMine',
    // answerer: who answers in the chat, when someone chose (stage 7; C150).
    // frameworks: the standing instructions on the chat, in order (C164).
    'answerer', 'frameworks'],
  // model and usage: what a reply was made with and its tokens (C132 (h), stage 6).
  // frameworks: what a reply was written under (stage 7; C164).
  // thinking, thinkingMs: what a model thought before answering, and for how long (C165).
  // translation, asked: an answer from a source translated on request, and a
  // question translated before it went to a source (stage 7, piece 6; C166).
  messages: ['id', 'conversationId', 'role', 'content', 'tokenCount', 'incomplete', 'createdAt', 'attachmentMeta', 'stopReason', 'source', 'model', 'usage', 'frameworks', 'thinking', 'thinkingMs', 'translation', 'asked',
    // citations: the sources a reply cited from a web search (piece 7; C167).
    // from: the message a branch's copy came from; group: the branches a
    // prompt to several went to (stage 8; C172). summary: the chat a branch's
    // summary summarizes and the last message it read (C175).
    // included: answers from sources brought into a prompt (C176).
    // step: the planned step a run sent this message for (stage 10; C196 (j)).
    // blocks: a reply's editable form once it is edited in place (stage 11; C212 (b)).
    // told: what the model was told of the person's edits, with this prompt (C216 (c)).
    'citations', 'from', 'group', 'summary', 'included', 'step', 'blocks', 'told'],
  // quotes: the numbers a note quotes beneath it; summary: a dated summary
  // note's numbers, day and model (stage 6, piece 7; C145 (e), (g)).
  notes: ['id', 'conversationId', 'messageId', 'text', 'createdAt', 'num', 'pinned', 'tags', 'fromScratchpad', 'restoredFrom', 'archived', 'tagsMine', 'erasedFrom', 'quotes', 'summary'],
  highlights: ['id', 'conversationId', 'messageId', 'text', 'color', 'createdAt', 'num', 'kind', 'pinned', 'tags', 'restoredFrom', 'archived', 'tagsMine', 'erasedFrom'],
  favorites: ['id', 'conversationId', 'messageId', 'createdAt'],
  pins: ['id', 'targetConversationId', 'sourceConversationId', 'sourceMessageId', 'content', 'createdAt', 'num', 'kind', 'restoredFrom', 'pinned', 'tags', 'archived', 'tagsMine', 'erasedFrom'],
  // Edits in a reply or a prompt, and asks: each with its chat (stage 11; C212 (c), (d)).
  edits: ['id', 'edit', 'num', 'conversationId', 'messageId', 'part', 'struck', 'added', 'places', 'held', 'sent', 'createdAt', 'updatedAt', 'restoredFrom'],
  asks: ['id', 'edit', 'num', 'conversationId', 'messageId', 'part', 'places', 'question', 'answer', 'state', 'held', 'sent', 'createdAt', 'updatedAt', 'restoredFrom'],
  files: ['id', 'conversationId', 'name', 'type', 'rows', 'cols', 'sizeBytes', 'inContext', 'uploadedAt'],
  file_data: ['fileId', 'data'],
  sbrd_documents: ['conversationId', 'paragraphs', 'suggestionStates', 'submittedReplies', 'updatedAt'],
  // Version 6.
  dockets: ['id', 'num', 'title', 'createdAt', 'updatedAt', 'pinned', 'tags', 'archived', 'branches', 'order', 'nextLetter', 'restoredFrom', 'tagsMine'],
  runs: ['id', 'docketId', 'n', 'createdAt', 'cost', 'branches'],
  // order: the cards and headings in the person's own order (C144 (j)).
  collections: ['id', 'name', 'builtIn', 'description', 'items', 'headings', 'order', 'pinned', 'createdAt', 'updatedAt', 'fromFavorites'],
  collabs: ['id', 'name', 'instruction', 'builtIn', 'on', 'fromPersona', 'createdAt'],
})

/** The record with only its known fields, or the record itself for kinds kept whole. */
export function rebuildRecord(store, record) {
  const fields = FIELDS[store]
  if (!fields || !record || typeof record !== 'object') return record
  const out = {}
  for (const f of fields) if (record[f] !== undefined) out[f] = record[f]
  // A run's branches and steps hold only what they are known to hold (C196).
  if (store === 'runs' && out.branches && typeof out.branches === 'object' && !Array.isArray(out.branches)) {
    out.branches = Object.fromEntries(Object.entries(out.branches).map(([letter, b]) => [letter, cleanRunBranch(b)]))
  }
  return out
}

const RUN_BRANCH_FIELDS = ['status', 'room', 'chatId', 'steps']
const STEP_FIELDS = ['id', 'status', 'model', 'room', 'messageId', 'prompt', 'condition', 'addedAt', 'ended', 'tokens', 'cost', 'group']
function pick(record, fields) {
  const out = {}
  for (const f of fields) if (record?.[f] !== undefined) out[f] = record[f]
  return out
}
function cleanRunBranch(b) {
  if (!b || typeof b !== 'object') return b
  const out = pick(b, RUN_BRANCH_FIELDS)
  if (Array.isArray(out.steps)) out.steps = out.steps.map((s) => pick(s, STEP_FIELDS))
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
  runWarn: (v) => v === null || v === 0.5 || v === 1 || v === 5, // C203
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
  // Where Mistral processes prompts: the person's choice, kept like their
  // model (stage 7, piece 3; C159).
  mistralRegion: (v) => v === 'global' || v === 'eu' || v === 'us',
  thinking: bool, // C165
  markup: (v) => v === 'on' || v === 'off', // stage 11, piece 1
  // The reply language, a tag or 'off'; the helper, a model's id; whether
  // questions to sources that read only English are translated first (C166).
  replyLanguage: (v) => v === null || typeof v === 'string' && /^(off|[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})?)$/.test(v),
  interfaceLanguage: (v) => v === null || typeof v === 'string' && /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})?$/.test(v),
  helper: (v) => v === null || typeof v === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/.test(v),
  translateQueries: bool,
  // The privacy filter (C167).
  privacyFilter: (v) => v === 'off' || v === 'patterns' || v === 'names',
  // The room a new chat starts in, a library template's id (stage 9; C181).
  newChatRoom: (v) => v === null || typeof v === 'string' && /^[A-Za-z0-9][A-Za-z0-9._@-]{0,127}$/.test(v),
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
  const dropped = { settings: 0, notes: 0, highlights: 0, favorites: 0, pins: 0, documents: 0, files: 0, messages: 0, edits: 0 }

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
  // A keyword or quote kept when its chat was erased stands on its own (C137 (c)).
  const detached = (a) => Number.isInteger(a.erasedFrom) && a.conversationId == null && a.messageId == null
  dropped.highlights = keep('highlights', (a) => detached(a) || onMessage(a))
  dropped.favorites = keep('favorites', onMessage)
  // A pinned reference is a copy: its source may be gone, its chat may not.
  dropped.pins = keep('pins', (p) => chats.has(p.targetConversationId) || (Number.isInteger(p.erasedFrom) && p.targetConversationId == null))
  dropped.documents = keep('sbrd_documents', (d) => chats.has(d.conversationId))
  dropped.files = keep('files', (f) => chats.has(f.conversationId))
  // An edit or an ask means nothing without its reply (C212 (f)), and its
  // mark there is found by its id: both are needed.
  const onReply = (e) => chats.has(e.conversationId) && messages.has(e.messageId)
  const markId = (e) => (typeof e.edit === 'string' && e.edit.length > 0 && e.edit.length <= 64) || Number.isInteger(e.edit)
  dropped.edits = keep('edits', (e) => onReply(e) && markId(e)) + keep('asks', onReply)
  const files = new Set((out.files || []).map((f) => f.id))
  keep('file_data', (fd) => files.has(fd.fileId))
  return { flat: out, dropped }
}

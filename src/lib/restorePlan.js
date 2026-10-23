// Restore planning: decides what a restore writes, without touching IndexedDB.
//
// Kept pure so it can be tested. backupData.js reads what already exists,
// calls planRestore() inside the restore's one transaction, and writes what
// comes back (C93, ruled 19 October).
//
// Merge, per chat:
//   new   its id is not here: it comes in as it is.
//   same  its id is here with the same content (title, messages in order,
//         document text): it is skipped, with everything that is its own.
//         Dates, sizes, numbers and fields the app keeps for itself are not
//         compared, so a chat only opened since the backup counts as same.
//   copy  its id is here with different content: it comes in under a new
//         id, titled "… (from backup)" while today's screens show only the
//         title, with `restoredFrom` for the new screens. Its messages,
//         files and document follow it, and every record pointing at it is
//         rewritten:
//           conversations  parentId, familyId (a chat id), branchPoint (a message id)
//           messages       from (the message a copy came from), group.chats (chat ids),
//                          summary.of (a chat id), summary.upTo and included[].from (message ids)
//           notes, highlights, favorites  conversationId, messageId
//           pins           targetConversationId, sourceConversationId, sourceMessageId
//           files          conversationId; file_data follows the file id
//           sbrd_documents conversationId (its key)
//           settings       a chat named in the key, and chat ids in its value
// A note, term, quote or favourite whose id is here: skipped if the same,
// a copy under a new id if not.
//
// Numbers: unless a "replace" restore keeps the file's own (keepNumbers),
// records come in without their docket fields, and records.js gives them
// new numbers and dockets in the same transaction. A number they had is
// kept in restoredFrom.num, for "restored, was 207".

import { renameSettingChats } from './backupSchema'

const DOCKET_FIELDS = ['num', 'docketId', 'branch', 'run']
// Shown in today's screens beside a copy's title, until the Almanac shows
// restoredFrom as marginalia (stage 6). chatTitles.js leaves it out of names.
export const COPY_SUFFIX = ' (from backup)'

const byTime = (a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0)

/** What a person sees of a chat, for telling a changed one from an identical one. */
export function chatSignature(chat, messages = [], document = null) {
  return JSON.stringify({
    title: chat.title ?? '',
    pinned: Boolean(chat.pinned),
    messages: [...messages].sort(byTime).map((m) => [m.role, m.content]),
    document: document ? { p: document.paragraphs ?? [], r: document.submittedReplies ?? {} } : null,
  })
}

const SIGNATURES = {
  notes: (r) => JSON.stringify([r.text, r.messageId ?? null]),
  highlights: (r) => JSON.stringify([r.text, r.color, r.messageId]),
  favorites: (r) => JSON.stringify([r.messageId]),
  pins: (r) => JSON.stringify([r.content, r.sourceMessageId]),
}

/**
 * @param {object} flat  cleaned contents (backupSchema.cleanFlat)
 * @param {object} opts
 * @param {'merge'|'replace'} opts.strategy
 * @param {object} [opts.existing]  what is here already, for a merge:
 *   chats: Map id -> { chat, messages, document } for chats whose id is in the file
 *   notes, highlights, favorites, pins: Map id -> record, for ids in the file
 *   messages, files, modes, collabs: Set of ids;  settings: Set of keys
 *   library: { [store]: Set of ids }
 * @param {boolean} [opts.keepNumbers]  keep the file's numbers and dockets (a replace of version 6 data)
 * @param {() => string} [opts.newId]
 * @param {string} [opts.now]
 */
export function planRestore(flat, {
  strategy = 'merge', existing = {}, keepNumbers = false,
  newId = () => crypto.randomUUID(), now = new Date().toISOString(),
} = {}) {
  const merge = strategy === 'merge'
  const chatsHere = existing.chats || new Map()
  const setOf = (name) => (merge && existing[name]) || new Set()
  const mapOf = (name) => (merge && existing[name]) || new Map()

  const messagesByChat = new Map()
  for (const m of flat.messages || []) {
    if (!messagesByChat.has(m.conversationId)) messagesByChat.set(m.conversationId, [])
    messagesByChat.get(m.conversationId).push(m)
  }
  const docByChat = new Map((flat.sbrd_documents || []).map((d) => [d.conversationId, d]))

  // ── Decide each chat ──
  const decision = new Map() // chat id -> 'new' | 'same' | 'copy'
  const renamedConvIds = new Map()
  for (const c of flat.conversations || []) {
    const here = merge ? chatsHere.get(c.id) : null
    if (!here) decision.set(c.id, 'new')
    else if (chatSignature(c, messagesByChat.get(c.id), docByChat.get(c.id)) === chatSignature(here.chat, here.messages, here.document)) decision.set(c.id, 'same')
    else {
      decision.set(c.id, 'copy')
      renamedConvIds.set(c.id, newId())
    }
  }
  const renamedMsgIds = new Map()
  const renamedFileIds = new Map()
  for (const m of flat.messages || []) if (renamedConvIds.has(m.conversationId)) renamedMsgIds.set(m.id, newId())
  for (const f of flat.files || []) if (renamedConvIds.has(f.conversationId)) renamedFileIds.set(f.id, newId())

  const conv = (id) => (id == null ? id : renamedConvIds.get(id) || id)
  const msg = (id) => (id == null ? id : renamedMsgIds.get(id) || id)
  const restoredFrom = (r) => ({ at: now, ...(Number.isInteger(r.num) ? { num: r.num } : {}) })
  // Docket fields come off unless the file's numbers are kept; a number they
  // had is remembered.
  const renumber = (out, original, isCopy) => {
    if (keepNumbers && !isCopy) return out
    for (const f of DOCKET_FIELDS) delete out[f]
    if (isCopy || Number.isInteger(original.num)) out.restoredFrom = restoredFrom(original)
    return out
  }

  const writes = {
    conversations: [], messages: [], notes: [], highlights: [], favorites: [], pins: [],
    sbrd_documents: [], files: [], file_data: [], settings: [], modes: [],
    libraryLayouts: [], libraryRooms: [], libraryComponents: [], librarySchemes: [], libraryResources: [],
    dockets: [], runs: [], collections: [], collabs: [],
  }
  const summary = {
    chats: { added: 0, copied: 0, skipped: 0 },
    messages: { added: 0, skipped: 0 },
    annotations: { added: 0, copied: 0, skipped: 0 },
    documents: { added: 0, skipped: 0 },
    files: { added: 0, skipped: 0 },
    rooms: { added: 0, skipped: 0 },
    homepage: { added: 0, skipped: 0 },
    library: { added: 0, skipped: 0 },
    preferences: { added: 0, skipped: 0 },
    collabs: { added: 0, skipped: 0 },
  }

  // ── Chats, messages, documents, files ──
  for (const c of flat.conversations || []) {
    const d = decision.get(c.id)
    if (d === 'same') {
      summary.chats.skipped++
      continue
    }
    const out = { ...c, id: conv(c.id) }
    if ('parentId' in c) out.parentId = conv(c.parentId)
    if ('familyId' in c) out.familyId = conv(c.familyId)
    if ('branchPoint' in c) out.branchPoint = msg(c.branchPoint)
    if (d === 'copy') out.title = `${c.title || ''}${COPY_SUFFIX}`
    writes.conversations.push(renumber(out, c, d === 'copy'))
    summary.chats[d === 'copy' ? 'copied' : 'added']++
  }

  const messagesHere = setOf('messages')
  for (const m of flat.messages || []) {
    const d = decision.get(m.conversationId)
    const id = msg(m.id)
    if (d === 'same' || (d === 'new' && messagesHere.has(id))) {
      summary.messages.skipped++
      continue
    }
    writes.messages.push({
      ...m, id, conversationId: conv(m.conversationId),
      // A branch's copy and a prompt to several point at other records (C172).
      ...(m.from ? { from: msg(m.from) } : {}),
      ...(m.group ? { group: { ...m.group, chats: (m.group.chats ?? []).map(conv) } } : {}),
      // A summary points at the chat it summarizes and the message it read to (C175).
      ...(m.summary ? { summary: { of: conv(m.summary.of), upTo: msg(m.summary.upTo) } } : {}),
      // An answer brought into a prompt keeps the message it came from (C176).
      ...(Array.isArray(m.included) ? { included: m.included.map((i) => ({ ...i, from: msg(i.from) })) } : {}),
    })
    summary.messages.added++
  }

  for (const doc of flat.sbrd_documents || []) {
    if (decision.get(doc.conversationId) === 'same') {
      summary.documents.skipped++
      continue
    }
    writes.sbrd_documents.push({ ...doc, conversationId: conv(doc.conversationId) })
    summary.documents.added++
  }

  const filesHere = setOf('files')
  const filesWritten = new Set()
  for (const f of flat.files || []) {
    const d = decision.get(f.conversationId)
    const id = renamedFileIds.get(f.id) || f.id
    if (d === 'same' || (d === 'new' && filesHere.has(id))) {
      summary.files.skipped++
      continue
    }
    writes.files.push({ ...f, id, conversationId: conv(f.conversationId) })
    filesWritten.add(id)
    summary.files.added++
  }
  for (const fd of flat.file_data || []) {
    const fileId = renamedFileIds.get(fd.fileId) || fd.fileId
    if (filesWritten.has(fileId)) writes.file_data.push({ ...fd, fileId })
  }

  // ── Notes, terms (highlights), favourites, quotes (pins) ──
  for (const store of ['notes', 'highlights', 'favorites', 'pins']) {
    const here = mapOf(store)
    const chatField = store === 'pins' ? 'targetConversationId' : 'conversationId'
    for (const a of flat[store] || []) {
      const out = store === 'pins'
        ? { ...a, targetConversationId: conv(a.targetConversationId), sourceConversationId: conv(a.sourceConversationId), sourceMessageId: msg(a.sourceMessageId) }
        : { ...a, conversationId: conv(a.conversationId), messageId: msg(a.messageId) }
      const chatCopied = renamedConvIds.has(a[chatField])
      const existing = here.get(a.id)
      if (!chatCopied && existing && SIGNATURES[store](existing) === SIGNATURES[store](out)) {
        summary.annotations.skipped++
        continue
      }
      const isCopy = chatCopied || Boolean(existing)
      if (isCopy) out.id = newId()
      writes[store].push(store === 'favorites' ? out : renumber(out, a, isCopy))
      summary.annotations[isCopy ? 'copied' : 'added']++
    }
  }

  // ── Settings: only allowed ones reach here (cleanFlat) ──
  const settingsHere = setOf('settings')
  for (const s of flat.settings || []) {
    const out = renameSettingChats(s, conv)
    if (settingsHere.has(out.key)) {
      summary.preferences.skipped++
      continue
    }
    writes.settings.push(out)
    summary.preferences.added++
  }

  // ── Rooms and the library: an id that is here already is kept ──
  const modesHere = setOf('modes')
  for (const m of flat.modes || []) {
    const bucket = m.scope === 'homepage' ? summary.homepage : summary.rooms
    if (modesHere.has(m.id)) {
      bucket.skipped++
      continue
    }
    writes.modes.push(m)
    bucket.added++
  }
  const library = (merge && existing.library) || {}
  for (const store of ['libraryLayouts', 'libraryRooms', 'libraryComponents', 'librarySchemes', 'libraryResources']) {
    const here = library[store] || new Set()
    for (const it of flat[store] || []) {
      if (here.has(it.id)) {
        summary.library.skipped++
        continue
      }
      writes[store].push(it)
      summary.library.added++
    }
  }

  // ── Version 6 lists ──
  // Collabs come in switched off: standing instructions from a file are
  // shown before they are applied (refactor-plan.md, stage 7).
  const collabsHere = setOf('collabs')
  for (const c of flat.collabs || []) {
    if (collabsHere.has(c.id)) {
      summary.collabs.skipped++
      continue
    }
    writes.collabs.push({ ...c, on: false })
    summary.collabs.added++
  }
  if (keepNumbers) {
    writes.dockets = [...(flat.dockets || [])]
    writes.runs = [...(flat.runs || [])]
    writes.collections = [...(flat.collections || [])]
  }

  return { writes, summary, renamedConvIds, renamedMsgIds, decision }
}

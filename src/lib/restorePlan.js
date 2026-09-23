// Restore planning: decides what a restore writes, without touching IndexedDB.
//
// Kept pure so it can be tested. restoreContents() in backup.js reads the ids
// that already exist, calls planRestore(), and writes what comes back.
//
// Merge collisions: a restored conversation whose id already exists is kept
// as a copy under a new id, titled "(from backup)". Its messages and files get
// new ids too. Every record that points at a renamed conversation or message
// is rewritten to follow it:
//   conversations  parentId, familyId (a conversation id), branchPoint (a message id)
//   notes, highlights, favorites  conversationId, messageId
//   pins           targetConversationId, sourceConversationId, sourceMessageId
//   files          conversationId; file_data follows the file id
//   sbrd_documents conversationId (its key)

const EMPTY = Object.freeze(new Set())

/**
 * @param {object} flat      output of contentsToFlatStores()
 * @param {object} opts
 * @param {'merge'|'replace'} opts.strategy
 * @param {object} opts.existing  Sets of ids already in the database, keyed by
 *   store: conversations, messages, notes, highlights, favorites, pins, files.
 *   Ignored for 'replace'.
 * @param {() => string} [opts.newId]  id generator, injectable for tests
 * @returns {{ writes: object, skipped: object, renamedConvIds: Map, renamedMsgIds: Map }}
 */
export function planRestore(flat, { strategy = 'merge', existing = {}, newId = () => crypto.randomUUID() } = {}) {
  const merge = strategy === 'merge'
  const has = (store, id) => merge && (existing[store] || EMPTY).has(id)

  const renamedConvIds = new Map()
  const renamedMsgIds = new Map()
  const renamedFileIds = new Map()

  for (const c of flat.conversations || []) {
    if (has('conversations', c.id)) renamedConvIds.set(c.id, newId())
  }
  for (const m of flat.messages || []) {
    if (renamedConvIds.has(m.conversationId)) renamedMsgIds.set(m.id, newId())
  }
  for (const f of flat.files || []) {
    if (renamedConvIds.has(f.conversationId)) renamedFileIds.set(f.id, newId())
  }

  const conv = (id) => (id == null ? id : renamedConvIds.get(id) || id)
  const msg = (id) => (id == null ? id : renamedMsgIds.get(id) || id)

  const writes = {
    conversations: [], messages: [], notes: [], highlights: [], favorites: [],
    pins: [], sbrd_documents: [], files: [], file_data: [],
  }
  const skipped = { messages: 0, annotations: 0, files: 0 }

  for (const c of flat.conversations || []) {
    const out = { ...c }
    if (renamedConvIds.has(c.id)) {
      out.id = renamedConvIds.get(c.id)
      out.title = `${c.title || 'Conversation'} (from backup)`
    }
    if ('parentId' in c) out.parentId = conv(c.parentId)
    if ('familyId' in c) out.familyId = conv(c.familyId)
    if ('branchPoint' in c) out.branchPoint = msg(c.branchPoint)
    writes.conversations.push(out)
  }

  for (const m of flat.messages || []) {
    const out = { ...m, id: msg(m.id), conversationId: conv(m.conversationId) }
    if (has('messages', out.id)) { skipped.messages++; continue }
    writes.messages.push(out)
  }

  // Notes, highlights and favorites all hang off one message in one conversation.
  for (const store of ['notes', 'highlights', 'favorites']) {
    for (const a of flat[store] || []) {
      const out = { ...a, conversationId: conv(a.conversationId), messageId: msg(a.messageId) }
      if (renamedConvIds.has(a.conversationId)) out.id = newId()
      if (has(store, out.id)) { skipped.annotations++; continue }
      writes[store].push(out)
    }
  }

  for (const p of flat.pins || []) {
    const out = {
      ...p,
      targetConversationId: conv(p.targetConversationId),
      sourceConversationId: conv(p.sourceConversationId),
      sourceMessageId: msg(p.sourceMessageId),
    }
    if (renamedConvIds.has(p.targetConversationId)) out.id = newId()
    if (has('pins', out.id)) { skipped.annotations++; continue }
    writes.pins.push(out)
  }

  for (const doc of flat.sbrd_documents || []) {
    writes.sbrd_documents.push({ ...doc, conversationId: conv(doc.conversationId) })
  }

  for (const f of flat.files || []) {
    const out = { ...f, id: renamedFileIds.get(f.id) || f.id, conversationId: conv(f.conversationId) }
    if (has('files', out.id)) { skipped.files++; continue }
    writes.files.push(out)
  }
  for (const fd of flat.file_data || []) {
    writes.file_data.push({ ...fd, fileId: renamedFileIds.get(fd.fileId) || fd.fileId })
  }

  return { writes, skipped, renamedConvIds, renamedMsgIds }
}

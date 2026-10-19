// One write path for records (refactor-plan.md, stage 2).
//
// db.js's functions for chats, messages, notes, markings, favourites, pinned
// references and documents write through here, so today's screens use it
// without knowing. Each write is one transaction. At version 6 the same
// transaction also keeps numbers, dockets, steps and the Favorites
// collection true (recordsModel.js); at version 5 a write is what it always
// was.
//
// Each change is announced once it is stored: in this tab as a window event,
// and to other tabs over the bus (bus.js). An announcement carries a kind, an
// operation, an id and a number, never content.

import { FIRST_NUM } from './addresses'
import { openBus } from './bus'
import { stepsFromTurns, forkStep, collabsFromPersonas } from './migrations/v6Plan'
import { newDocket, addBranch, removeBranch, renameInDocket, withSteps, favoritesWith, favoritesWithout } from './recordsModel'

export const RECORDS_EVENT = 'parliament-records'

/** True once the database has been upgraded to version 6. */
export function isV6(db) {
  return db.objectStoreNames.contains('counters')
}

const DOCKET_STORES = ['counters', 'dockets', 'runs']

// ── Announcing ──────────────────────────────────────────

let bus = null
function getBus() {
  if (!bus) bus = openBus()
  return bus
}

/** Tell this tab and the others what was stored. Each change: { kind, op, id, num }. */
export function announce(changes) {
  for (const { kind, op, id, num } of changes) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(RECORDS_EVENT, { detail: { kind, op, id, num } }))
    }
    getBus().post({ type: 'changed', kind, op, id, num })
  }
}

/** Calls fn({ kind, op, id, num, fromOtherTab }) for every change, here or in another tab. */
export function onRecordsChanged(fn) {
  const here = (e) => fn({ ...e.detail, fromOtherTab: false })
  if (typeof window !== 'undefined') window.addEventListener(RECORDS_EVENT, here)
  const off = getBus().on((s) => {
    if (s.type === 'changed') fn({ kind: s.kind, op: s.op, id: s.id, num: s.num, fromOtherTab: true })
  })
  return () => {
    if (typeof window !== 'undefined') window.removeEventListener(RECORDS_EVENT, here)
    off()
  }
}

// ── Transactions ────────────────────────────────────────

// Runs fn(tx) in one readwrite transaction, then announces what it returned
// in `changes`. If fn throws, the transaction is abandoned and nothing is
// stored or announced.
async function write(db, stores, fn) {
  const tx = db.transaction(stores, 'readwrite')
  const done = tx.done
  let out
  try {
    out = await fn(tx)
    await done
  } catch (err) {
    try {
      tx.abort()
    } catch { /* already finished */ }
    await done.catch(() => {})
    throw err
  }
  announce(out.changes || [])
  return out.result
}

// The next number from the one counter, inside the caller's transaction.
async function takeNum(tx) {
  const store = tx.objectStore('counters')
  const counter = (await store.get('num')) || { name: 'num', next: FIRST_NUM }
  await store.put({ ...counter, next: counter.next + 1 })
  return counter.next
}

async function runOf(tx, chat) {
  const runs = await tx.objectStore('runs').index('docketId').getAll(chat.docketId)
  return runs.find((r) => r.n === (chat.run || 1)) || null
}

const byTime = (a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0)

// Brings the chat's steps up to date from its messages, in the same transaction.
async function refreshSteps(tx, chat, changes) {
  if (!chat?.docketId || !chat.branch) return
  const run = await runOf(tx, chat)
  const current = run?.branches?.[chat.branch]
  if (!current) return
  const msgs = (await tx.objectStore('messages').index('conversationId').getAll(chat.id)).sort(byTime)
  const next = withSteps(current, stepsFromTurns(chat, msgs))
  if (JSON.stringify(next) === JSON.stringify(current)) return
  await tx.objectStore('runs').put({ ...run, branches: { ...run.branches, [chat.branch]: next } })
  changes.push({ kind: 'run', op: 'updated', id: run.id })
}

// Files a new chat in a docket: as the next letter of the chat it was made
// from, or as branch a of a docket of its own.
async function fileInDocket(tx, conversation, { parent = null, copiedMessages = null, allParentMessages = null }) {
  const now = conversation.createdAt
  const changes = []
  if (parent?.docketId) {
    const docket = await tx.objectStore('dockets').get(parent.docketId)
    const run = docket ? await runOf(tx, parent) : null
    if (docket && run) {
      const num = await takeNum(tx)
      const chat = { ...conversation, num, docketId: docket.id, run: run.n }
      const steps = copiedMessages ? stepsFromTurns(chat, copiedMessages) : []
      const step = allParentMessages ? forkStep(chat, allParentMessages) : null
      const added = addBranch(docket, run, { chat, forkedFrom: { chatNum: parent.num ?? null, step }, steps, now })
      chat.branch = added.letter
      await tx.objectStore('dockets').put(added.docket)
      await tx.objectStore('runs').put(added.run)
      changes.push({ kind: 'docket', op: 'updated', id: docket.id, num: docket.num })
      return { chat, changes }
    }
  }
  const docketNum = await takeNum(tx)
  const num = await takeNum(tx)
  const draft = { ...conversation, num, branch: 'a', run: 1 }
  const { docket, run } = newDocket({ id: crypto.randomUUID(), runId: crypto.randomUUID(), num: docketNum, chat: draft, now })
  if (copiedMessages) run.branches.a = withSteps(run.branches.a, stepsFromTurns(draft, copiedMessages))
  await tx.objectStore('dockets').put(docket)
  await tx.objectStore('runs').put(run)
  changes.push({ kind: 'docket', op: 'created', id: docket.id, num: docket.num })
  return { chat: { ...draft, docketId: docket.id }, changes }
}

// ── Chats ───────────────────────────────────────────────

/** Store a new chat. With a parentId it joins that chat's docket. */
export async function createChat(db, conversation) {
  if (!isV6(db)) {
    return write(db, ['conversations'], async (tx) => {
      await tx.objectStore('conversations').put(conversation)
      return { result: conversation, changes: [{ kind: 'chat', op: 'created', id: conversation.id }] }
    })
  }
  return write(db, ['conversations', ...DOCKET_STORES], async (tx) => {
    const parent = conversation.parentId ? await tx.objectStore('conversations').get(conversation.parentId) : null
    const { chat, changes } = await fileInDocket(tx, conversation, { parent })
    await tx.objectStore('conversations').put(chat)
    return { result: chat, changes: [{ kind: 'chat', op: 'created', id: chat.id, num: chat.num }, ...changes] }
  })
}

/**
 * Fork a chat at a message: the new chat holds copies of every message up to
 * and including it. One transaction, so no tab can see the chat without its
 * messages (found 15 October).
 */
export async function createBranchChat(db, { sourceId, branchAtMessageId, title, model, newId, now }) {
  const v6 = isV6(db)
  return write(db, ['conversations', 'messages', ...(v6 ? DOCKET_STORES : [])], async (tx) => {
    const convs = tx.objectStore('conversations')
    const msgStore = tx.objectStore('messages')
    const source = await convs.get(sourceId)
    if (!source) throw new Error(`Source conversation not found: ${sourceId}`)
    const all = (await msgStore.index('conversationId').getAll(sourceId)).sort(byTime)
    const at = all.findIndex((m) => m.id === branchAtMessageId)
    if (at === -1) throw new Error(`Branch point message not found: ${branchAtMessageId}`)

    // The parent and its branches share a familyId.
    const familyId = source.familyId || source.id
    if (!source.familyId) await convs.put({ ...source, familyId })

    let branch = {
      id: newId(),
      title: title || `Branch: ${source.title}`,
      model: model || source.model,
      parentId: sourceId,
      parentTitle: source.title,
      familyId,
      branchPoint: branchAtMessageId,
      room: source.room ?? null,
      pinned: false,
      storageBytes: 0,
      createdAt: now,
      updatedAt: now,
    }
    const copies = all.slice(0, at + 1).map((m) => ({
      id: newId(),
      conversationId: branch.id,
      role: m.role,
      content: m.content,
      tokenCount: m.tokenCount || 0,
      incomplete: false,
      createdAt: m.createdAt, // the original times keep the order
    }))
    for (const m of copies) await msgStore.put(m)
    branch.storageBytes = copies.reduce((n, m) => n + byteSize(m.content), 0)

    let changes = []
    if (v6) ({ chat: branch, changes } = await fileInDocket(tx, branch, { parent: source, copiedMessages: copies, allParentMessages: all }))
    await convs.put(branch)
    return { result: branch, changes: [{ kind: 'chat', op: 'created', id: branch.id, num: branch.num }, ...changes] }
  })
}

/** Change fields on a chat. At version 6 a rename reaches its docket, and tags are marked as the model's. */
export async function updateChat(db, id, updates) {
  const v6 = isV6(db)
  return write(db, ['conversations', ...(v6 ? ['dockets'] : [])], async (tx) => {
    const existing = await tx.objectStore('conversations').get(id)
    if (!existing) throw new Error(`Conversation not found: ${id}`)
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() }
    const changes = [{ kind: 'chat', op: 'updated', id, num: existing.num }]
    if (v6) {
      // Every tag on a chat is written by the model's tagging call.
      if ('tags' in updates && !('tagsBy' in updates)) updated.tagsBy = 'model'
      if ('title' in updates && existing.docketId) {
        const docket = await tx.objectStore('dockets').get(existing.docketId)
        const renamed = docket && renameInDocket(docket, existing.branch, existing, updated, updated.updatedAt)
        if (renamed) {
          await tx.objectStore('dockets').put(renamed)
          changes.push({ kind: 'docket', op: 'updated', id: renamed.id, num: renamed.num })
        }
      }
    }
    await tx.objectStore('conversations').put(updated)
    return { result: updated, changes }
  })
}

/** Remove a chat and everything that belongs to it. At version 6 its branch leaves its docket. */
export async function removeChat(db, id) {
  const v6 = isV6(db)
  const stores = ['conversations', 'messages', 'highlights', 'notes', 'favorites', 'pins', 'files', 'file_data', 'sbrd_documents',
    ...(v6 ? ['dockets', 'runs', 'collections'] : [])]
  return write(db, stores, async (tx) => {
    const chat = await tx.objectStore('conversations').get(id)
    const changes = [{ kind: 'chat', op: 'removed', id, num: chat?.num }]
    for (const name of ['messages', 'highlights', 'notes', 'favorites']) {
      const store = tx.objectStore(name)
      for (const key of await store.index('conversationId').getAllKeys(id)) await store.delete(key)
    }
    // Pinned references kept in this chat. Ones taken from it stay, as copies.
    const pins = tx.objectStore('pins')
    for (const key of await pins.index('targetConversationId').getAllKeys(id)) await pins.delete(key)
    const files = tx.objectStore('files')
    for (const key of await files.index('conversationId').getAllKeys(id)) {
      await files.delete(key)
      await tx.objectStore('file_data').delete(key)
    }
    await tx.objectStore('sbrd_documents').delete(id)
    await tx.objectStore('conversations').delete(id)

    if (v6 && chat?.docketId) {
      const now = new Date().toISOString()
      const docket = await tx.objectStore('dockets').get(chat.docketId)
      if (docket) {
        const runs = await tx.objectStore('runs').index('docketId').getAll(docket.id)
        const left = removeBranch(docket, runs, chat.branch, now)
        if (left.docket) {
          await tx.objectStore('dockets').put(left.docket)
          for (const r of left.runs) await tx.objectStore('runs').put(r)
          changes.push({ kind: 'docket', op: 'updated', id: docket.id, num: docket.num })
        } else {
          await tx.objectStore('dockets').delete(docket.id)
          for (const runId of left.removeRunIds) await tx.objectStore('runs').delete(runId)
          changes.push({ kind: 'docket', op: 'removed', id: docket.id, num: docket.num })
        }
      }
      const fav = await tx.objectStore('collections').index('builtIn').get('favorites')
      const trimmed = favoritesWithout(fav, { conversationId: id }, now)
      if (trimmed) {
        await tx.objectStore('collections').put(trimmed)
        changes.push({ kind: 'collection', op: 'updated', id: trimmed.id })
      }
    }
    return { result: undefined, changes }
  })
}

// ── Messages ────────────────────────────────────────────

/** Store a message and touch its chat. At version 6 the chat's steps follow. */
export async function addMessageRecord(db, message) {
  const v6 = isV6(db)
  return write(db, ['messages', 'conversations', ...(v6 ? ['runs'] : [])], async (tx) => {
    await tx.objectStore('messages').put(message)
    const changes = [{ kind: 'message', op: 'created', id: message.id }]
    const conv = await tx.objectStore('conversations').get(message.conversationId)
    if (conv) {
      const touched = { ...conv, updatedAt: message.createdAt, storageBytes: (conv.storageBytes || 0) + byteSize(message.content) }
      await tx.objectStore('conversations').put(touched)
      changes.push({ kind: 'chat', op: 'updated', id: conv.id, num: conv.num })
      if (v6) await refreshSteps(tx, touched, changes)
    }
    return { result: message, changes }
  })
}

/**
 * Change a message. Its chat's size follows its content; at version 6 the
 * steps follow when it becomes complete or cut off. While a reply streams it
 * is saved every few seconds, so this does nothing more than it must.
 */
export async function updateMessageRecord(db, id, updates) {
  const v6 = isV6(db)
  return write(db, ['messages', 'conversations', ...(v6 ? ['runs'] : [])], async (tx) => {
    const existing = await tx.objectStore('messages').get(id)
    if (!existing) throw new Error(`Message not found: ${id}`)
    const updated = { ...existing, ...updates }
    await tx.objectStore('messages').put(updated)
    const changes = [{ kind: 'message', op: 'updated', id }]
    const contentChanged = 'content' in updates && byteSize(updated.content) !== byteSize(existing.content)
    const stateChanged = v6 && Boolean(existing.incomplete) !== Boolean(updated.incomplete)
    if (contentChanged || stateChanged) {
      const conv = await tx.objectStore('conversations').get(existing.conversationId)
      if (conv && contentChanged) {
        const delta = byteSize(updated.content) - byteSize(existing.content)
        await tx.objectStore('conversations').put({ ...conv, storageBytes: Math.max(0, (conv.storageBytes || 0) + delta) })
      }
      if (conv && stateChanged) await refreshSteps(tx, conv, changes)
    }
    return { result: updated, changes }
  })
}

/** Remove a message. At version 6 the chat's steps follow. */
export async function removeMessage(db, id) {
  const v6 = isV6(db)
  return write(db, ['messages', 'conversations', ...(v6 ? ['runs'] : [])], async (tx) => {
    const existing = await tx.objectStore('messages').get(id)
    await tx.objectStore('messages').delete(id)
    const changes = [{ kind: 'message', op: 'removed', id }]
    if (existing) {
      const conv = await tx.objectStore('conversations').get(existing.conversationId)
      if (conv) {
        await tx.objectStore('conversations').put({ ...conv, storageBytes: Math.max(0, (conv.storageBytes || 0) - byteSize(existing.content)) })
        if (v6) await refreshSteps(tx, conv, changes)
      }
    }
    return { result: undefined, changes }
  })
}

// ── Notes, terms, quotes ────────────────────────────────

// At version 6 each takes a number, and the fields every numbered kind has.
const NUMBERED = {
  notes: { kind: 'note', fields: { pinned: false, tags: [] } },
  highlights: { kind: 'term', fields: { kind: 'term', pinned: false, tags: [] } }, // today's highlights are terms (C57)
  pins: { kind: 'quote', fields: { kind: 'quote' } }, // pinned references are quotes (A23)
}

/** Store a new note, term (today's highlight) or quote (a pinned reference). */
export async function addNumbered(db, storeName, record) {
  const { kind, fields } = NUMBERED[storeName]
  if (!isV6(db)) {
    return write(db, [storeName], async (tx) => {
      await tx.objectStore(storeName).put(record)
      return { result: record, changes: [{ kind, op: 'created', id: record.id }] }
    })
  }
  return write(db, [storeName, 'counters'], async (tx) => {
    const stored = { ...record, ...fields, num: await takeNum(tx) }
    await tx.objectStore(storeName).put(stored)
    return { result: stored, changes: [{ kind, op: 'created', id: stored.id, num: stored.num }] }
  })
}

/** Replace fields on a note, term or quote. */
export async function updateNumbered(db, storeName, id, updates) {
  const { kind } = NUMBERED[storeName]
  return write(db, [storeName], async (tx) => {
    const existing = await tx.objectStore(storeName).get(id)
    if (!existing) throw new Error(`Not found: ${id}`)
    const updated = { ...existing, ...updates }
    await tx.objectStore(storeName).put(updated)
    return { result: updated, changes: [{ kind, op: 'updated', id, num: existing.num }] }
  })
}

/** Remove a note, term or quote. Its number is not reissued. */
export async function removeNumbered(db, storeName, id) {
  const { kind } = NUMBERED[storeName]
  return write(db, [storeName], async (tx) => {
    const existing = await tx.objectStore(storeName).get(id)
    await tx.objectStore(storeName).delete(id)
    return { result: undefined, changes: [{ kind, op: 'removed', id, num: existing?.num }] }
  })
}

// ── Favourites ──────────────────────────────────────────

/** Store a favourite. At version 6 it also joins the Favorites collection. */
export async function addFavoriteRecord(db, favorite) {
  const v6 = isV6(db)
  return write(db, ['favorites', ...(v6 ? ['collections'] : [])], async (tx) => {
    await tx.objectStore('favorites').put(favorite)
    const changes = [{ kind: 'favorite', op: 'created', id: favorite.id }]
    if (v6) {
      const before = await tx.objectStore('collections').index('builtIn').get('favorites')
      const after = favoritesWith(before, favorite, { id: crypto.randomUUID(), now: favorite.createdAt })
      if (after !== before) {
        await tx.objectStore('collections').put(after)
        changes.push({ kind: 'collection', op: before ? 'updated' : 'created', id: after.id })
      }
    }
    return { result: favorite, changes }
  })
}

/** Remove a favourite, and at version 6 its place in the Favorites collection. */
export async function removeFavoriteRecord(db, id) {
  const v6 = isV6(db)
  return write(db, ['favorites', ...(v6 ? ['collections'] : [])], async (tx) => {
    await tx.objectStore('favorites').delete(id)
    const changes = [{ kind: 'favorite', op: 'removed', id }]
    if (v6) {
      const fav = await tx.objectStore('collections').index('builtIn').get('favorites')
      const trimmed = favoritesWithout(fav, { favoriteIds: [id] }, new Date().toISOString())
      if (trimmed) {
        await tx.objectStore('collections').put(trimmed)
        changes.push({ kind: 'collection', op: 'updated', id: trimmed.id })
      }
    }
    return { result: undefined, changes }
  })
}

// ── Documents ───────────────────────────────────────────

/**
 * Save a Secretarybird document. Writes nothing when the content is what is
 * already stored, so opening a document no longer rewrites it with a new
 * date (found 16 October). The editor never passes suggestionStates, which
 * older documents carry; what is stored is kept rather than dropped.
 * Returns whether it wrote.
 */
export async function saveDocument(db, conversationId, { paragraphs, suggestionStates, submittedReplies }) {
  return write(db, ['sbrd_documents'], async (tx) => {
    const store = tx.objectStore('sbrd_documents')
    const stored = await store.get(conversationId)
    const states = suggestionStates !== undefined ? suggestionStates : stored?.suggestionStates
    const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
    if (stored && same(stored.paragraphs, paragraphs) && same(stored.suggestionStates, states) && same(stored.submittedReplies, submittedReplies)) {
      return { result: false, changes: [] }
    }
    await store.put({
      conversationId, paragraphs, submittedReplies, updatedAt: new Date().toISOString(),
      ...(states !== undefined ? { suggestionStates: states } : {}),
    })
    return { result: true, changes: [{ kind: 'document', op: stored ? 'updated' : 'created', id: conversationId }] }
  })
}

// ── Restore ─────────────────────────────────────────────

/**
 * Inside a restore's transaction, once what came in is written without
 * docket fields (restorePlan.js): numbers, dockets, steps and the Favorites
 * collection for it, by the same rules as a live write (C93). Records are
 * taken in the order they were made, so numbers follow creation, as in the
 * upgrade; a fork finds its parent whether that came in too or was here.
 * Personas and scratchpad text this restore wrote become collabs (switched
 * off) and a note, and a room made from a built-in template records it, as
 * the upgrade does. Returns the changes to announce.
 */
export async function fileRestored(tx, writes, { now, newId }) {
  const changes = []
  const convs = tx.objectStore('conversations')
  const msgsByChat = new Map()
  for (const m of writes.messages) {
    if (!msgsByChat.has(m.conversationId)) msgsByChat.set(m.conversationId, [])
    msgsByChat.get(m.conversationId).push(m)
  }
  for (const list of msgsByChat.values()) list.sort(byTime)

  const items = [
    ...writes.conversations.map((record) => ({ store: 'conversations', record, tie: 1 })),
    ...['notes', 'highlights', 'pins'].flatMap((store) => writes[store].map((record) => ({ store, record, tie: 2 }))),
  ].sort((a, b) => byTime(a.record, b.record) || a.tie - b.tie)

  for (const { store, record } of items) {
    if (store === 'conversations') {
      const parent = record.parentId ? await convs.get(record.parentId) : null
      const allParentMessages = parent ? (await tx.objectStore('messages').index('conversationId').getAll(parent.id)).sort(byTime) : null
      const filed = await fileInDocket(tx, record, { parent, copiedMessages: msgsByChat.get(record.id) || [], allParentMessages })
      const chat = filed.chat
      if (Array.isArray(chat.tags) && chat.tags.length && !chat.tagsBy) chat.tagsBy = 'model'
      await convs.put(chat)
      changes.push(...filed.changes)
    } else {
      // What a numbered kind carries, where the restored record has nothing of its own.
      const stored = { ...NUMBERED[store].fields, ...record, num: await takeNum(tx) }
      await tx.objectStore(store).put(stored)
    }
  }

  if (writes.favorites.length) {
    let collection = await tx.objectStore('collections').index('builtIn').get('favorites')
    for (const fav of [...writes.favorites].sort(byTime)) collection = favoritesWith(collection, fav, { id: newId(), now })
    await tx.objectStore('collections').put(collection)
    changes.push({ kind: 'collection', op: 'updated', id: collection.id })
  }

  const personas = writes.settings.find((s) => s.key === 'parrotPersonas')
  if (personas) {
    const here = await tx.objectStore('collabs').getAll()
    const { collabs } = collabsFromPersonas([personas], { newId, now })
    for (const c of collabs) {
      if (c.fromPersona != null && here.some((h) => h.fromPersona === c.fromPersona)) continue
      await tx.objectStore('collabs').put(c)
    }
  }
  const scratch = writes.settings.find((s) => s.key === 'scratchpad-text')
  if (typeof scratch?.value === 'string' && scratch.value.trim()) {
    await tx.objectStore('notes').put({
      id: newId(), conversationId: null, messageId: null, text: scratch.value,
      pinned: false, tags: [], fromScratchpad: true, createdAt: now, num: await takeNum(tx),
    })
  }

  const rooms = writes.modes.filter((m) => m.scope === 'room' && !m.meta?.template)
  if (rooms.length) {
    const templates = new Map((await tx.objectStore('libraryRooms').getAll())
      .filter((t) => t?.author?.handle === 'parliament' && t.displayName)
      .map((t) => [t.displayName, t.id]))
    for (const m of rooms) {
      if (templates.has(m.meta?.name)) await tx.objectStore('modes').put({ ...m, meta: { ...m.meta, template: templates.get(m.meta.name) } })
    }
  }
  return changes
}

// UTF-8-accurate byte size of a string. Keeps each chat's storageBytes in
// step as messages are added, edited and removed.
function byteSize(str) {
  if (!str) return 0
  return new Blob([String(str)]).size
}

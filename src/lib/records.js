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
import { tabBus } from './bus'
import { stepsFromTurns, storedSteps, forkStep, collabsFromPersonas } from './migrations/v6Plan'
import { newDocket, addBranch, removeBranch, renameInDocket, withSteps, favoritesWith, favoritesWithout, startedCount, runFromRun, emptyPlan, plannedBranch } from './recordsModel'
import { STATUS, branchStatus, plannedStep, isFixed, CONDITIONS, ENDED } from './docketModel'

export const RECORDS_EVENT = 'parliament-records'

/** True once the database has been upgraded to version 6. */
export function isV6(db) {
  return db.objectStoreNames.contains('counters')
}

const DOCKET_STORES = ['counters', 'dockets', 'runs']

// ── Announcing ──────────────────────────────────────────

const getBus = () => tabBus()

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
  // With the lock on a transaction is staged, and fails with StagedConflict
  // when something it read changed before it could write (sealedDb.js); the
  // change is then worked out again from what is stored now.
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await writeOnce(db, stores, fn)
    } catch (err) {
      if (err?.name !== 'StagedConflict' || attempt >= 4) throw err
    }
  }
}

async function writeOnce(db, stores, fn) {
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
      const steps = copiedMessages ? storedSteps(stepsFromTurns(chat, copiedMessages)) : []
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
export async function createBranchChat(db, { sourceId, branchAtMessageId, title, model, answerer = null, frameworks = null, newId, now }) {
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
      // Who answers it and its frameworks, when a prompt to several made
      // it (stage 8; C172 (a)).
      ...(answerer ? { answerer } : {}),
      ...(Array.isArray(frameworks) && frameworks.length ? { frameworks } : {}),
      pinned: false,
      storageBytes: 0,
      createdAt: now,
      updatedAt: now,
    }
    // Whole copies: an answer from a source stays one, with its note, so it
    // is never sent to a model as the model's own words (C115); each keeps
    // the message it was copied from (C172 (a)).
    const copies = all.slice(0, at + 1).map((m) => ({
      ...m,
      id: newId(),
      conversationId: branch.id,
      tokenCount: m.tokenCount || 0,
      incomplete: Boolean(m.incomplete),
      createdAt: m.createdAt, // the original times keep the order
      from: m.id,
    }))
    for (const m of copies) await msgStore.put(m)
    branch.storageBytes = copies.reduce((n, m) => n + byteSize(m.content), 0)

    let changes = []
    if (v6) ({ chat: branch, changes } = await fileInDocket(tx, branch, { parent: source, copiedMessages: copies, allParentMessages: all }))
    await convs.put(branch)
    return { result: branch, changes: [{ kind: 'chat', op: 'created', id: branch.id, num: branch.num }, ...changes] }
  })
}

/**
 * open:203b summary (stage 8, piece 4; C175): a new branch of a chat's plan,
 * the next letter, that starts from a summary of the chat instead of copies
 * of its messages. Its one message is the summary, kept as the helper wrote
 * it, with `summary`: the chat it summarizes and the last message it read.
 * One transaction, so no tab sees the branch without it.
 */
export async function createSummaryChat(db, { sourceId, text, by, title, model, answerer = null, frameworks = null, newId, now }) {
  const v6 = isV6(db)
  return write(db, ['conversations', 'messages', ...(v6 ? DOCKET_STORES : [])], async (tx) => {
    const convs = tx.objectStore('conversations')
    const msgStore = tx.objectStore('messages')
    const source = await convs.get(sourceId)
    if (!source) throw new Error(`Source conversation not found: ${sourceId}`)
    const all = (await msgStore.index('conversationId').getAll(sourceId)).sort(byTime)
    const upTo = all[all.length - 1]
    if (!upTo) throw new Error(`Nothing to summarize in ${sourceId}`)

    const familyId = source.familyId || source.id
    if (!source.familyId) await convs.put({ ...source, familyId })

    let branch = {
      id: newId(),
      title: title || source.title,
      model: model || source.model,
      parentId: sourceId,
      parentTitle: source.title,
      familyId,
      branchPoint: upTo.id,
      room: source.room ?? null,
      ...(answerer ? { answerer } : {}),
      ...(Array.isArray(frameworks) && frameworks.length ? { frameworks } : {}),
      pinned: false,
      storageBytes: 0,
      createdAt: now,
      updatedAt: now,
    }
    const summary = {
      id: newId(),
      conversationId: branch.id,
      role: 'assistant',
      content: text,
      tokenCount: 0,
      incomplete: false,
      createdAt: now,
      ...(by ? { model: by } : {}),
      summary: { of: sourceId, upTo: upTo.id },
    }
    await msgStore.put(summary)
    branch.storageBytes = byteSize(summary.content)

    let changes = []
    if (v6) ({ chat: branch, changes } = await fileInDocket(tx, branch, { parent: source, copiedMessages: [], allParentMessages: all }))
    await convs.put(branch)
    return { result: branch, changes: [{ kind: 'chat', op: 'created', id: branch.id, num: branch.num }, ...changes] }
  })
}

/**
 * again:203a (stage 8, piece 5; C177): a prompt asked again as a new branch
 * joins the branches it went to, so each room showing one of them shows the
 * new reply among the tabs. The prompt `first` and every prompt of its group
 * (the same group id, in the chats the group names) take the group given.
 * One transaction. Returns the messages changed.
 */
export async function setPromptGroup(db, { first, group }) {
  return write(db, ['messages'], async (tx) => {
    const store = tx.objectStore('messages')
    const prompt = await store.get(first)
    if (!prompt) throw new Error(`Message not found: ${first}`)
    const oldId = prompt.group?.id ?? null
    const changed = []
    for (const chatId of group.chats) {
      for (const m of await store.index('conversationId').getAll(chatId)) {
        if (m.role !== 'user' || !(m.id === first || (oldId && m.group?.id === oldId))) continue
        const next = { ...m, group }
        await store.put(next)
        changed.push(next)
      }
    }
    return { result: changed, changes: changed.map((m) => ({ kind: 'message', op: 'updated', id: m.id })) }
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
      // Every tag on a chat is written by the model's tagging call. The
      // person's own tags stay (C136, C143 (e)).
      if ('tags' in updates && !('tagsBy' in updates)) updated.tagsBy = 'model'
      if ('tags' in updates && !('tagsMine' in updates) && Array.isArray(existing.tagsMine) && existing.tagsMine.length) {
        const tags = Array.isArray(updated.tags) ? [...updated.tags] : []
        for (const t of existing.tagsMine) if (!tags.some((x) => x.toLocaleLowerCase() === t.toLocaleLowerCase())) tags.push(t)
        updated.tags = tags
      }
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

const CHAT_STORES = ['conversations', 'messages', 'highlights', 'notes', 'favorites', 'pins', 'files', 'file_data', 'sbrd_documents']

// Inside a transaction: a chat and everything that is its own. Its notes,
// keywords and quotes go with it, or with keepMarks stay as items of their
// own: detached from it, their words kept, and marked with the number it
// had (erase:, C137 (c)). Returns the changes to announce.
async function removeChatIn(tx, id, { v6, keepMarks = false, now = new Date().toISOString() }) {
  const chat = await tx.objectStore('conversations').get(id)
  const changes = [{ kind: 'chat', op: 'removed', id, num: chat?.num }]
  const erasedFrom = Number.isInteger(chat?.num) ? chat.num : null
  for (const name of ['messages', 'favorites']) {
    const store = tx.objectStore(name)
    for (const key of await store.index('conversationId').getAllKeys(id)) await store.delete(key)
  }
  for (const [name, kind] of [['highlights', 'term'], ['notes', 'note']]) {
    const store = tx.objectStore(name)
    for (const record of await store.index('conversationId').getAll(id)) {
      if (!keepMarks) { await store.delete(record.id); continue }
      await store.put({ ...record, conversationId: null, messageId: null, erasedFrom })
      changes.push({ kind, op: 'updated', id: record.id, num: record.num })
    }
  }
  // Pinned references (quotes) kept in this chat. Ones taken from it into
  // another chat stay there, as copies.
  const pins = tx.objectStore('pins')
  for (const p of await pins.index('targetConversationId').getAll(id)) {
    if (!keepMarks) { await pins.delete(p.id); continue }
    const fromHere = p.sourceConversationId === id
    await pins.put({
      ...p, targetConversationId: null, erasedFrom,
      sourceConversationId: fromHere ? null : p.sourceConversationId, sourceMessageId: fromHere ? null : p.sourceMessageId,
    })
    changes.push({ kind: 'quote', op: 'updated', id: p.id, num: p.num })
  }
  const files = tx.objectStore('files')
  for (const key of await files.index('conversationId').getAllKeys(id)) {
    await files.delete(key)
    await tx.objectStore('file_data').delete(key)
  }
  await tx.objectStore('sbrd_documents').delete(id)
  await tx.objectStore('conversations').delete(id)

  // Edits and asks mean nothing without their reply: they go with the chat,
  // even when its notes stay (C212 (f)).
  if (v6) {
    for (const [name, kind] of [['edits', 'edit'], ['asks', 'ask']]) {
      const store = tx.objectStore(name)
      for (const record of await store.index('conversationId').getAll(id)) {
        await store.delete(record.id)
        changes.push({ kind, op: 'removed', id: record.id, num: record.num })
      }
    }
  }

  if (v6 && chat?.docketId) {
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
  return changes
}

/** Remove a chat and everything that belongs to it. At version 6 its branch leaves its docket. */
export async function removeChat(db, id) {
  const v6 = isV6(db)
  const stores = [...CHAT_STORES, ...(v6 ? ['dockets', 'runs', 'collections', 'edits', 'asks'] : [])]
  return write(db, stores, async (tx) => ({ result: undefined, changes: await removeChatIn(tx, id, { v6 }) }))
}

const MARK_KINDS = Object.freeze({ notes: 'note', highlights: 'term', pins: 'quote' })

/**
 * erase: (C137), in one transaction or not at all. Chats go with their
 * messages, files and documents; their notes, keywords and quotes stay as
 * items of their own unless keepMarks is false. A plan goes with its last
 * chat. Notes, keywords and quotes named go too. If anything named is gone
 * already, nothing is erased and Changed says which.
 * @param {import('idb').IDBPDatabase} db
 * @param {{ chats?: Array<{ id: string, num?: number }>, marks?: Array<{ store: string, id: string, num?: number }>, keepMarks?: boolean }} what
 */
export async function eraseRecords(db, { chats = [], marks = [], keepMarks = true }) {
  if (!isV6(db)) throw new Error('erase: needs version 6')
  for (const m of marks) if (!MARK_KINDS[m.store]) throw new Error(`Not a marking's store: ${m.store}`)
  return write(db, [...CHAT_STORES, 'dockets', 'runs', 'collections', 'edits', 'asks'], async (tx) => {
    const missing = []
    for (const c of chats) if (!(await tx.objectStore('conversations').get(c.id))) missing.push(c.num ?? c.id)
    for (const m of marks) if (!(await tx.objectStore(m.store).get(m.id))) missing.push(m.num ?? m.id)
    if (missing.length) throw new Changed(missing)
    const now = new Date().toISOString()
    const changes = []
    for (const c of chats) changes.push(...await removeChatIn(tx, c.id, { v6: true, keepMarks, now }))
    for (const m of marks) {
      const store = tx.objectStore(m.store)
      const record = await store.get(m.id) // gone already when its chat took it
      if (!record) continue
      await store.delete(m.id)
      changes.push({ kind: MARK_KINDS[m.store], op: 'removed', id: m.id, num: record.num })
    }
    return { result: { chats: chats.length, marks: marks.length }, changes }
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
  return write(db, ['messages', 'conversations', ...(v6 ? ['runs', 'edits', 'asks'] : [])], async (tx) => {
    const existing = await tx.objectStore('messages').get(id)
    await tx.objectStore('messages').delete(id)
    const changes = [{ kind: 'message', op: 'removed', id }]
    if (existing) {
      const conv = await tx.objectStore('conversations').get(existing.conversationId)
      if (conv) {
        await tx.objectStore('conversations').put({ ...conv, storageBytes: Math.max(0, (conv.storageBytes || 0) - byteSize(existing.content) - blocksSize(existing.blocks)) })
        if (v6) await refreshSteps(tx, conv, changes)
      }
      // Its edits and asks go with it (C212 (f)).
      if (v6) {
        for (const [name, kind] of [['edits', 'edit'], ['asks', 'ask']]) {
          const store = tx.objectStore(name)
          for (const record of await store.index('conversationId').getAll(existing.conversationId)) {
            if (record.messageId !== id) continue
            await store.delete(record.id)
            changes.push({ kind, op: 'removed', id: record.id, num: record.num })
          }
        }
      }
    }
    return { result: undefined, changes }
  })
}

const blocksSize = (blocks) => (Array.isArray(blocks) ? byteSize(JSON.stringify(blocks)) : 0)

/**
 * Save a reply's editable form and keep its edits in step (C212 (b), (c)),
 * in one transaction. Each edit is a record keyed by its message and its id
 * (the id its marks carry), so a reply copied with a new message id keeps its
 * own records apart. A new edit takes its number from the shared counter
 * (C56); one that is no longer in the reply (taken back whole) is removed,
 * and its number is not used again.
 * @param {import('idb').IDBPDatabase} db
 * @param {string} messageId
 * @param {{ blocks: object[], edits: Map<string|number, { struck: string, added: string, places: object[] }>, part?: 'reply'|'prompt', now?: string }} saved
 * @returns {Promise<{ created: number, updated: number, removed: number }>}
 */
export async function saveEditedMessage(db, messageId, { blocks, edits, part = 'reply', now = new Date().toISOString() }) {
  if (!isV6(db)) throw new Error('Editing needs the version 6 database.')
  return write(db, ['messages', 'conversations', 'edits', 'counters'], async (tx) => {
    const message = await tx.objectStore('messages').get(messageId)
    if (!message) throw new Error(`Message not found: ${messageId}`)
    const changes = [{ kind: 'message', op: 'updated', id: messageId }]
    const delta = blocksSize(blocks) - blocksSize(message.blocks)
    await tx.objectStore('messages').put({ ...message, blocks })
    if (delta) {
      const conv = await tx.objectStore('conversations').get(message.conversationId)
      if (conv) await tx.objectStore('conversations').put({ ...conv, storageBytes: Math.max(0, (conv.storageBytes || 0) + delta) })
    }

    const store = tx.objectStore('edits')
    const mine = (await store.index('conversationId').getAll(message.conversationId)).filter((r) => r.messageId === messageId)
    const byEdit = new Map(mine.map((r) => [r.edit, r]))
    const counts = { created: 0, updated: 0, removed: 0 }
    for (const [edit, said] of edits) {
      const had = byEdit.get(edit)
      byEdit.delete(edit)
      if (had) {
        if (had.struck === said.struck && had.added === said.added && JSON.stringify(had.places) === JSON.stringify(said.places)) continue
        await store.put({ ...had, struck: said.struck, added: said.added, places: said.places, updatedAt: now })
        changes.push({ kind: 'edit', op: 'updated', id: had.id, num: had.num })
        counts.updated += 1
        continue
      }
      const record = {
        id: `${messageId}:${edit}`, edit, num: await takeNum(tx),
        conversationId: message.conversationId, messageId, part,
        struck: said.struck, added: said.added, places: said.places,
        held: false, sent: null, createdAt: now, updatedAt: now,
      }
      await store.put(record)
      changes.push({ kind: 'edit', op: 'created', id: record.id, num: record.num })
      counts.created += 1
    }
    for (const gone of byEdit.values()) {
      await store.delete(gone.id)
      changes.push({ kind: 'edit', op: 'removed', id: gone.id, num: gone.num })
      counts.removed += 1
    }
    return { result: counts, changes }
  })
}

// ── Row verbs (stage 6, piece 3; C143) ──────────────────

// The stores a numbered row lives in, and the kind each announces.
const ROW_STORES = Object.freeze({ conversations: 'chat', dockets: 'docket', notes: 'note', highlights: 'term', pins: 'quote' })

/** A field as the row verbs read it: missing means false, empty or ''. */
export function rowField(record, key) {
  if (key === 'pinned' || key === 'archived') return Boolean(record?.[key])
  if (key === 'tags' || key === 'tagsMine') return Array.isArray(record?.[key]) ? [...record[key]] : []
  if (key === 'title') return typeof record?.title === 'string' ? record.title : ''
  return record?.[key] ?? null
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

/** Something a change expected had changed meanwhile, so nothing was written. */
export class Changed extends Error {
  constructor(nums) {
    super(`Changed since: ${nums.join(', ')}`)
    this.name = 'Changed'
    this.nums = nums
  }
}

/**
 * Changes fields on numbered records, all in one transaction or none:
 * pins, archive, tags and names (C143). Each change says the fields it
 * expects to find; if any record has changed since, nothing is written and
 * Changed is thrown. A chat's "last active" time stays as it was (C143 (b));
 * a chat's new title reaches its plan, as updateChat's does.
 * Undo is the same call with before and after swapped.
 * @param {import('idb').IDBPDatabase} db
 * @param {Array<{ store: string, id: string, num?: number, set: object, expect: object }>} changes
 * @returns {Promise<Array<{ store: string, id: string, num?: number, before: object, after: object }>>}
 */
export async function changeRecords(db, changes) {
  if (!changes.length) return []
  for (const c of changes) if (!ROW_STORES[c.store]) throw new Error(`Not a row's store: ${c.store}`)
  const stores = [...new Set([...changes.map((c) => c.store), 'dockets'])]
  return write(db, stores, async (tx) => {
    const found = []
    const moved = []
    for (const c of changes) {
      const record = await tx.objectStore(c.store).get(c.id)
      if (!record || Object.entries(c.expect ?? {}).some(([k, v]) => !same(rowField(record, k), v))) moved.push(c.num ?? c.id)
      found.push(record)
    }
    if (moved.length) throw new Changed(moved)
    const done = []
    const announced = []
    for (const [i, c] of changes.entries()) {
      const record = found[i]
      const before = Object.fromEntries(Object.keys(c.set).map((k) => [k, rowField(record, k)]))
      const next = { ...record, ...c.set }
      await tx.objectStore(c.store).put(next)
      announced.push({ kind: ROW_STORES[c.store], op: 'updated', id: c.id, num: record.num })
      done.push({ store: c.store, id: c.id, num: record.num, before, after: { ...c.set } })
      if (c.store === 'conversations' && 'title' in c.set && record.docketId) {
        const docket = await tx.objectStore('dockets').get(record.docketId)
        const renamed = docket && renameInDocket(docket, record.branch, record, next, docket.updatedAt)
        if (renamed) {
          await tx.objectStore('dockets').put(renamed)
          announced.push({ kind: 'docket', op: 'updated', id: renamed.id, num: renamed.num })
        }
      }
    }
    return { result: done, changes: announced }
  })
}

// ── Notes, terms, quotes ────────────────────────────────

// At version 6 each takes a number, and the fields every numbered kind has.
const NUMBERED = {
  notes: { kind: 'note', fields: { pinned: false, tags: [] } },
  highlights: { kind: 'term', fields: { kind: 'term', pinned: false, tags: [] } }, // today's highlights are terms (C57)
  pins: { kind: 'quote', fields: { kind: 'quote' } }, // pinned references are quotes (A23)
  // Written by saveEditedMessage, numbered here only when restored (C212).
  edits: { kind: 'edit', fields: { part: 'reply', held: false, sent: null } },
  asks: { kind: 'ask', fields: { part: 'reply', held: false, sent: null } },
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
  // Plans that hold steps of their own come in whole, numbered here, with
  // new ids (stage 10; C196 (i)); their chats are filled in below.
  const planIds = new Map()
  for (const p of writes.plans || []) {
    const id = newId()
    const num = await takeNum(tx)
    planIds.set(p.docket.id, id)
    const { num: before, ...docket } = p.docket
    await tx.objectStore('dockets').put({ ...docket, id, num, updatedAt: now, restoredFrom: { at: now, ...(Number.isInteger(before) ? { num: before } : {}) } })
    for (const r of p.runs) await tx.objectStore('runs').put({ ...r, id: newId(), docketId: id })
    changes.push({ kind: 'docket', op: 'created', id, num })
  }
  const msgsByChat = new Map()
  for (const m of writes.messages) {
    if (!msgsByChat.has(m.conversationId)) msgsByChat.set(m.conversationId, [])
    msgsByChat.get(m.conversationId).push(m)
  }
  for (const list of msgsByChat.values()) list.sort(byTime)

  const items = [
    ...writes.conversations.map((record) => ({ store: 'conversations', record, tie: 1 })),
    ...['notes', 'highlights', 'pins'].flatMap((store) => writes[store].map((record) => ({ store, record, tie: 2 }))),
    // Edits and asks, numbered after the chat they belong to (stage 11; C212 (g)).
    ...['edits', 'asks'].flatMap((store) => (writes[store] ?? []).map((record) => ({ store, record, tie: 3 }))),
  ].sort((a, b) => byTime(a.record, b.record) || a.tie - b.tie)

  for (const item of items) {
    const { store } = item
    let { record } = item
    if (store === 'conversations' && record.planOf && planIds.has(record.planOf)) {
      const { planOf, ...chat } = record
      await convs.put({ ...chat, num: await takeNum(tx), docketId: planIds.get(planOf) })
      continue
    }
    if (store === 'conversations') {
      // A plan not brought in whole: filed from its chats, as before.
      record = { ...record }
      delete record.planOf
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

// ── Notes of their own (stage 6, piece 7; C145 (e), (g)) ──

/**
 * A note written in the Collection or the bar, with no chat: in the person's
 * words, quoting some numbers beneath it, or a dated summary of them.
 * @param {{ id: string, text: string, quotes?: number[], summary?: { from: number[], at: string, model: string|null }|null, now: string }} note
 * @returns {Promise<object>} the note as stored, with its number
 */
export async function addOwnNote(db, { id, text, quotes = [], summary = null, now }) {
  const record = { id, conversationId: null, messageId: null, text, quotes, createdAt: now }
  if (summary) record.summary = summary
  return addNumbered(db, 'notes', record)
}

/**
 * Takes back a note addOwnNote made, for undo:. If it has changed since
 * (its words, its tags), nothing is removed and Changed is thrown.
 */
export async function removeOwnNote(db, { id, num, text }) {
  return write(db, ['notes'], async (tx) => {
    const store = tx.objectStore('notes')
    const now = await store.get(id)
    if (!now) return { result: null, changes: [] }
    if (now.num !== num || now.text !== text || (now.tags ?? []).length) throw new Changed([num])
    await store.delete(id)
    return { result: null, changes: [{ kind: 'note', op: 'removed', id, num }] }
  })
}

// ── Plans ahead of a run (stage 10, piece 1; C196) ──────
//
// A plan's steps can be written before anything runs; a run can be made from
// the one before (new:run) and a plan from nothing (new:plan). A step that
// has started is fixed: these change only steps planned ahead.

/** Why a change to a plan was refused. code: noPlan, noRun, noBranch, noStep, fixed, running, ran. */
export class PlanError extends Error {
  constructor(code) {
    super(code)
    this.name = 'PlanError'
    this.code = code
  }
}

const latestRun = (runs) => runs.reduce((a, r) => (!a || r.n > a.n ? r : a), null)

async function planAt(tx, docketId, n) {
  const docket = await tx.objectStore('dockets').get(docketId)
  if (!docket) throw new PlanError('noPlan')
  const runs = await tx.objectStore('runs').index('docketId').getAll(docketId)
  const run = n == null ? latestRun(runs) : runs.find((r) => r.n === n)
  if (!run) throw new PlanError('noRun')
  return { docket, run, runs }
}

async function keepRunBranch(tx, docket, run, letter, branch, now, changes) {
  const nextRun = { ...run, branches: { ...run.branches, [letter]: { ...branch, status: branchStatus(branch.steps) } } }
  const nextDocket = { ...docket, updatedAt: now }
  await tx.objectStore('runs').put(nextRun)
  await tx.objectStore('dockets').put(nextDocket)
  changes.push({ kind: 'run', op: 'updated', id: run.id }, { kind: 'docket', op: 'updated', id: docket.id, num: docket.num })
  return backOf({ dockets: [[docket, nextDocket]], runs: [[run, nextRun]] })
}

// What a change to a plan was, for undo: each record before and after it
// (null before: it was made; null after: it went).
const backOf = ({ dockets = [], runs = [] }) => {
  const pair = ([before, after]) => ({ id: (before ?? after).id, before: before ?? null, after: after ?? null })
  return { dockets: dockets.map(pair), runs: runs.map(pair) }
}
// The same record, whatever order its fields were read back in.
const sameRecord = (a, b) => JSON.stringify(a, sorted) === JSON.stringify(b, sorted)
function sorted(key, value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.keys(value).sort().map((k) => [k, value[k]]))
    : value
}

/**
 * undo: of a change to a plan: each record as it was before, if it is still
 * as the change left it; a record the change made goes. Changed otherwise,
 * and nothing is written.
 * @param {{ dockets: Array<{ id, before, after }>, runs: Array<{ id, before, after }> }} back
 */
export async function putPlanBack(db, back) {
  return write(db, ['dockets', 'runs'], async (tx) => {
    const moved = []
    const plan = back.dockets?.[0]
    const planNum = (plan?.after ?? plan?.before)?.num ?? null
    for (const store of ['dockets', 'runs']) {
      for (const r of back[store] ?? []) {
        const now = await tx.objectStore(store).get(r.id)
        if (!sameRecord(now ?? null, r.after ?? null)) moved.push(planNum ?? r.id)
      }
    }
    if (moved.length) throw new Changed([...new Set(moved)])
    const changes = []
    for (const store of ['dockets', 'runs']) {
      for (const r of back[store] ?? []) {
        if (r.before) await tx.objectStore(store).put(r.before)
        else await tx.objectStore(store).delete(r.id)
        const kind = store === 'dockets' ? 'docket' : 'run'
        const op = !r.before ? 'removed' : r.after ? 'updated' : 'created'
        changes.push({ kind, op, id: r.id, ...(kind === 'docket' ? { num: (r.before ?? r.after).num } : {}) })
      }
    }
    return { result: null, changes }
  })
}

/**
 * A step planned ahead in one branch of a run (new:step), after the first
 * `after` steps or at the end; never before a step that has started.
 */
export async function planStep(db, { docketId, n = null, letter, prompt, model = null, room = null, condition = null, group = null, after = null, newId = () => crypto.randomUUID(), now = new Date().toISOString() }) {
  return write(db, ['dockets', 'runs'], async (tx) => {
    const { docket, run } = await planAt(tx, docketId, n)
    const branch = run.branches[letter]
    if (!branch) throw new PlanError('noBranch')
    const steps = [...branch.steps]
    const at = Math.max(startedCount(steps), Math.min(after ?? steps.length, steps.length))
    const step = plannedStep({ id: newId(), prompt, model, room, condition: CONDITIONS.includes(condition) ? condition : null, group, waiting: steps.length > 0 && steps.every((s) => s.status === STATUS.WAITING && s.ended !== 'unmet'), now })
    steps.splice(at, 0, step)
    const changes = []
    const back = await keepRunBranch(tx, docket, run, letter, { ...branch, steps }, now, changes)
    return { result: { step, index: at + 1, n: run.n, back }, changes }
  })
}

/** A planned step's prompt, model, room or condition changed; refused once it has started. */
export async function changeStep(db, { docketId, n = null, letter, stepId, set, now = new Date().toISOString() }) {
  return write(db, ['dockets', 'runs'], async (tx) => {
    const { docket, run } = await planAt(tx, docketId, n)
    const branch = run.branches[letter]
    if (!branch) throw new PlanError('noBranch')
    const i = branch.steps.findIndex((s) => s.id === stepId)
    if (i < 0) throw new PlanError('noStep')
    if (isFixed(branch.steps[i].status) || branch.steps[i].messageId) throw new PlanError('fixed')
    const next = { ...branch.steps[i] }
    if (set.prompt !== undefined) next.prompt = String(set.prompt)
    if (set.model !== undefined) next.model = set.model
    if (set.room !== undefined) { if (set.room) next.room = set.room; else delete next.room }
    if (set.condition !== undefined) next.condition = CONDITIONS.includes(set.condition) ? set.condition : null
    const steps = branch.steps.map((s, k) => (k === i ? next : s))
    const changes = []
    await keepRunBranch(tx, docket, run, letter, { ...branch, steps }, now, changes)
    return { result: next, changes }
  })
}

/**
 * hold: and hold:off (A4; C45): a branch's steps not yet started wait, or are
 * ready again, in one run. Refused while the branch runs.
 */
export async function holdBranch(db, { docketId, n = null, letter, on, now = new Date().toISOString() }) {
  return write(db, ['dockets', 'runs'], async (tx) => {
    const { docket, run } = await planAt(tx, docketId, n)
    const branch = run.branches[letter]
    if (!branch) throw new PlanError('noBranch')
    if (branch.steps.some((s) => s.status === STATUS.RUNNING)) throw new PlanError('running')
    const from = on ? STATUS.READY : STATUS.WAITING
    const to = on ? STATUS.WAITING : STATUS.READY
    const steps = branch.steps.map((s) => (!s.messageId && s.status === from ? { ...s, status: to } : s))
    const changes = []
    const back = await keepRunBranch(tx, docket, run, letter, { ...branch, steps }, now, changes)
    return { result: { n: run.n, changed: steps.filter((s, k) => s !== branch.steps[k]).length, back }, changes }
  })
}

/** new:run: the next run, copying the latest forward, nothing started (docket spec §5). */
export async function newRun(db, { docketId, newId = () => crypto.randomUUID(), now = new Date().toISOString() }) {
  return write(db, ['dockets', 'runs', 'messages'], async (tx) => {
    const { docket, runs } = await planAt(tx, docketId, null)
    const prev = latestRun(runs)
    const texts = new Map()
    for (const b of Object.values(prev.branches)) {
      for (const s of b.steps || []) if (s.messageId) texts.set(s.messageId, (await tx.objectStore('messages').get(s.messageId))?.content ?? s.prompt ?? '')
    }
    const run = runFromRun(prev, { id: newId(), n: prev.n + 1, now, newId, promptOf: (id) => texts.get(id), order: docket.order })
    const nextDocket = { ...docket, updatedAt: now }
    await tx.objectStore('runs').put(run)
    await tx.objectStore('dockets').put(nextDocket)
    const back = backOf({ dockets: [[docket, nextDocket]], runs: [[null, run]] })
    return { result: { ...run, back }, changes: [{ kind: 'run', op: 'created', id: run.id }, { kind: 'docket', op: 'updated', id: docket.id, num: docket.num }] }
  })
}

/** new:plan: a plan with nothing in it yet, numbered (docket spec §7). */
export async function newPlan(db, { title = '', newId = () => crypto.randomUUID(), now = new Date().toISOString() } = {}) {
  return write(db, ['dockets', 'runs', 'counters'], async (tx) => {
    const num = await takeNum(tx)
    const { docket, run } = emptyPlan({ id: newId(), runId: newId(), num, title, now })
    await tx.objectStore('dockets').put(docket)
    await tx.objectStore('runs').put(run)
    const back = backOf({ dockets: [[null, docket]], runs: [[null, run]] })
    return { result: { docket, run, back }, changes: [{ kind: 'docket', op: 'created', id: docket.id, num }] }
  })
}

/** A branch with no chat yet, added to a plan in one run (new:branch on the plan board). */
export async function newPlanBranch(db, { docketId, n = null, name = '', room = null, now = new Date().toISOString() }) {
  return write(db, ['dockets', 'runs'], async (tx) => {
    const { docket, run } = await planAt(tx, docketId, n)
    const added = plannedBranch(docket, run, { name, room, now })
    await tx.objectStore('dockets').put(added.docket)
    await tx.objectStore('runs').put(added.run)
    const back = backOf({ dockets: [[docket, added.docket]], runs: [[run, added.run]] })
    return { result: { letter: added.letter, n: run.n, back }, changes: [{ kind: 'docket', op: 'updated', id: docket.id, num: docket.num }, { kind: 'run', op: 'updated', id: run.id }] }
  })
}

// ── delete: of what has not been sent (C199) ────────────
// A planned step, a branch that has never run, a plan with no chat: nothing
// of these was sent, so each goes on one Enter and undo: brings it back.
// What has been sent is deleted by eraseRecords, for good.

const hasRun = (runs, letter = null) => runs.some((r) => Object.entries(r.branches || {})
  .some(([l, b]) => (letter == null || l === letter) && (b?.chatId || (b?.steps || []).some((s) => s.messageId))))

/** delete:201a 2: a step not yet started, out of the last run (or run n). */
export async function removeStep(db, { docketId, n = null, letter, stepId, now = new Date().toISOString() }) {
  return write(db, ['dockets', 'runs'], async (tx) => {
    const { docket, run } = await planAt(tx, docketId, n)
    const branch = run.branches[letter]
    if (!branch) throw new PlanError('noBranch')
    const i = branch.steps.findIndex((s) => s.id === stepId)
    if (i < 0) throw new PlanError('noStep')
    if (isFixed(branch.steps[i].status) || branch.steps[i].messageId) throw new PlanError('fixed')
    const steps = branch.steps.filter((_, k) => k !== i)
    const changes = []
    const back = await keepRunBranch(tx, docket, run, letter, { ...branch, steps }, now, changes)
    return { result: { index: i + 1, back }, changes }
  })
}

/** delete:201c: a branch that has never run, out of the plan and every run; its letter is not given out again. */
export async function removePlanBranch(db, { docketId, letter, now = new Date().toISOString() }) {
  return write(db, ['dockets', 'runs'], async (tx) => {
    const { docket, runs } = await planAt(tx, docketId, null)
    if (!docket.branches.some((b) => b.letter === letter)) throw new PlanError('noBranch')
    if (hasRun(runs, letter)) throw new PlanError('ran')
    const left = removeBranch(docket, runs, letter, now)
    const changes = []
    if (!left.docket) {
      // The last branch: the plan goes with it.
      await tx.objectStore('dockets').delete(docket.id)
      for (const r of runs) await tx.objectStore('runs').delete(r.id)
      changes.push({ kind: 'docket', op: 'removed', id: docket.id, num: docket.num })
      return { result: { planGone: true, back: backOf({ dockets: [[docket, null]], runs: runs.map((r) => [r, null]) }) }, changes }
    }
    await tx.objectStore('dockets').put(left.docket)
    for (const r of left.runs) await tx.objectStore('runs').put(r)
    changes.push({ kind: 'docket', op: 'updated', id: docket.id, num: docket.num }, ...left.runs.map((r) => ({ kind: 'run', op: 'updated', id: r.id })))
    return { result: { planGone: false, back: backOf({ dockets: [[docket, left.docket]], runs: runs.map((r, k) => [r, left.runs[k]]) }) }, changes }
  })
}

/** delete:224: a plan with no chat, and its runs. */
export async function removePlan(db, { docketId }) {
  return write(db, ['dockets', 'runs'], async (tx) => {
    const { docket, runs } = await planAt(tx, docketId, null)
    if (hasRun(runs)) throw new PlanError('ran')
    await tx.objectStore('dockets').delete(docket.id)
    for (const r of runs) await tx.objectStore('runs').delete(r.id)
    return {
      result: { back: backOf({ dockets: [[docket, null]], runs: runs.map((r) => [r, null]) }) },
      changes: [{ kind: 'docket', op: 'removed', id: docket.id, num: docket.num }],
    }
  })
}

// ── Running a plan (stage 10, piece 3; C196 (d); C200) ──
// The runner (runner.js) marks a step running as it starts and says how it
// ended; its messages fill in the rest, as a typed prompt's do.

/**
 * A branch's chat, made when it first runs in a run: numbered, filed in the
 * plan, the run and the branch. Refused if the branch has one already.
 */
export async function createPlanChat(db, { docketId, n, letter, conversation }) {
  return write(db, ['conversations', ...DOCKET_STORES], async (tx) => {
    const { docket, run } = await planAt(tx, docketId, n)
    const branch = run.branches[letter]
    if (!branch) throw new PlanError('noBranch')
    if (branch.chatId) throw new PlanError('ran')
    const num = await takeNum(tx)
    const chat = { ...conversation, num, docketId: docket.id, branch: letter, run: run.n }
    await tx.objectStore('conversations').put(chat)
    await tx.objectStore('runs').put({ ...run, branches: { ...run.branches, [letter]: { ...branch, chatId: chat.id } } })
    await tx.objectStore('dockets').put({ ...docket, updatedAt: conversation.createdAt ?? docket.updatedAt })
    return {
      result: chat,
      changes: [{ kind: 'chat', op: 'created', id: chat.id, num }, { kind: 'run', op: 'updated', id: run.id }, { kind: 'docket', op: 'updated', id: docket.id, num: docket.num }],
    }
  })
}

/**
 * How a step stands, as the runner says: running as it starts (only a step
 * planned and ready), then done, or paused with why (ENDED).
 */
export async function markStep(db, { docketId, n, letter, stepId, status, ended = null, now = new Date().toISOString() }) {
  return write(db, ['dockets', 'runs'], async (tx) => {
    const { docket, run } = await planAt(tx, docketId, n)
    const branch = run.branches[letter]
    if (!branch) throw new PlanError('noBranch')
    const i = branch.steps.findIndex((s) => s.id === stepId)
    if (i < 0) throw new PlanError('noStep')
    const was = branch.steps[i]
    const fresh = was.status === STATUS.READY && !was.messageId
    if ((status === STATUS.RUNNING || status === STATUS.WAITING) && !fresh) throw new PlanError('fixed')
    if (![STATUS.RUNNING, STATUS.DONE, STATUS.PAUSED, STATUS.WAITING].includes(status)) throw new PlanError('fixed')
    const next = { ...was, status }
    if (status === STATUS.PAUSED && ENDED.includes(ended)) next.ended = ended
    else if (status === STATUS.WAITING) next.ended = 'unmet'
    else delete next.ended
    const steps = branch.steps.map((s, k) => (k === i ? next : s))
    const changes = []
    await keepRunBranch(tx, docket, run, letter, { ...branch, steps }, now, changes)
    return { result: next, changes }
  })
}

/**
 * Steps left running by a tab that closed read as paused, "left", once no
 * tab runs the plan (C196 (d)). Returns how many.
 */
export async function settleLeft(db, { docketId, now = new Date().toISOString() }) {
  return write(db, ['dockets', 'runs'], async (tx) => {
    const { docket, runs } = await planAt(tx, docketId, null)
    let count = 0
    const changes = []
    for (const run of runs) {
      let touched = false
      const branches = {}
      for (const [letter, b] of Object.entries(run.branches || {})) {
        const steps = (b.steps || []).map((s) => {
          if (s.status !== STATUS.RUNNING) return s
          count += 1
          touched = true
          return { ...s, status: STATUS.PAUSED, ended: 'left' }
        })
        branches[letter] = { ...b, steps, status: branchStatus(steps) }
      }
      if (!touched) continue
      await tx.objectStore('runs').put({ ...run, branches })
      changes.push({ kind: 'run', op: 'updated', id: run.id })
    }
    if (count) {
      await tx.objectStore('dockets').put({ ...docket, updatedAt: now })
      changes.push({ kind: 'docket', op: 'updated', id: docket.id, num: docket.num })
    }
    return { result: count, changes }
  })
}

/** move:201c after 201a: a branch's place in the plan; its letter stays (docket spec §2). */
export async function moveBranch(db, { docketId, letter, after = null, before = null, now = new Date().toISOString() }) {
  return write(db, ['dockets'], async (tx) => {
    const docket = await tx.objectStore('dockets').get(docketId)
    if (!docket) throw new PlanError('noPlan')
    if (!docket.order.includes(letter)) throw new PlanError('noBranch')
    const rest = docket.order.filter((l) => l !== letter)
    const anchor = after ?? before
    const at = rest.indexOf(anchor)
    if (at < 0) throw new PlanError('noBranch')
    rest.splice(after ? at + 1 : at, 0, letter)
    const next = { ...docket, order: rest, updatedAt: now }
    await tx.objectStore('dockets').put(next)
    return { result: { order: rest, back: backOf({ dockets: [[docket, next]] }) }, changes: [{ kind: 'docket', op: 'updated', id: docket.id, num: docket.num }] }
  })
}

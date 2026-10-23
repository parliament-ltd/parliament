import 'fake-indexeddb/auto'
import { maybeSealed } from './__fixtures__/sealedHarness'
import { IDBFactory } from 'fake-indexeddb'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { openDB } from 'idb'
import { upgradeSchema } from './schema'
import * as R from './records'

// The write path against a real IndexedDB implementation in memory, at
// version 5 (today) and version 6 (after the upgrade).

let n = 0
const newId = () => `id-${++n}`
let clock = 0
const at = () => new Date(Date.UTC(2026, 9, 19, 10, 0, clock++)).toISOString()

const open = async (version) => maybeSealed(await openDB('records-test', version, { upgrade: upgradeSchema }))
const chat = (extra = {}) => {
  const now = at()
  return {
    id: newId(), title: 'New Conversation', model: 'claude-sonnet', parentId: null, branchPoint: null,
    createdInMode: null, room: 'mode_1', pinned: false, storageBytes: 0, createdAt: now, updatedAt: now, ...extra,
  }
}
const message = (conversationId, role, content, extra = {}) => ({
  id: newId(), conversationId, role, content, tokenCount: 1, incomplete: false, createdAt: at(), ...extra,
})
const runOf = async (db, c) => (await db.getAllFromIndex('runs', 'docketId', c.docketId)).find((r) => r.n === c.run)

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  n = 0
  clock = 0
})

describe('the write path at version 6', () => {
  let db
  beforeEach(async () => { db = await open(6) })
  afterEach(() => db.close())

  it('starts a docket for a new chat, which takes the two next numbers', async () => {
    const c = await R.createChat(db, chat())
    const docket = await db.get('dockets', c.docketId)
    expect([docket.num, c.num, c.branch, c.run]).toEqual([201, 202, 'a', 1])
    expect(docket.title).toBeNull()
    expect((await db.get('counters', 'num')).next).toBe(203)
  })

  it('keeps steps with the messages: paused while a reply streams, done when it completes', async () => {
    const c = await R.createChat(db, chat())
    const u = await R.addMessageRecord(db, message(c.id, 'user', 'Is concrete better?'))
    const a = await R.addMessageRecord(db, message(c.id, 'assistant', '', { incomplete: true }))
    expect((await runOf(db, c)).branches.a.steps).toEqual([{ status: 'paused', model: 'claude-sonnet', messageId: u.id, condition: null }])
    await R.updateMessageRecord(db, a.id, { content: 'Partly.', incomplete: true })
    await R.updateMessageRecord(db, a.id, { content: 'Partly. It lasts.', incomplete: false })
    const branch = (await runOf(db, c)).branches.a
    expect([branch.status, branch.steps[0].status]).toEqual(['done', 'done'])
    expect((await db.get('conversations', c.id)).storageBytes).toBe('Is concrete better?'.length + 'Partly. It lasts.'.length)
  })

  it('names the docket from the title call, and marks tags as the model\'s', async () => {
    const c = await R.createChat(db, chat())
    await R.updateChat(db, c.id, { title: 'Concrete or steel' })
    await R.updateChat(db, c.id, { tags: ['building'] })
    const docket = await db.get('dockets', c.docketId)
    expect([docket.title, docket.branches[0].name]).toEqual(['Concrete or steel', 'Concrete or steel'])
    expect((await db.get('conversations', c.id)).tagsBy).toBe('model')
  })

  it('files a fork as the next letter of its parent\'s docket, with its messages and fork point', async () => {
    const c = await R.createChat(db, chat({ title: 'Tower' }))
    await R.addMessageRecord(db, message(c.id, 'user', 'When?'))
    const a = await R.addMessageRecord(db, message(c.id, 'assistant', '1931.'))
    await R.addMessageRecord(db, message(c.id, 'user', 'Who?'))
    const fork = await R.createBranchChat(db, { sourceId: c.id, branchAtMessageId: a.id, newId, now: at() })
    expect([fork.num, fork.branch, fork.docketId === c.docketId, fork.title]).toEqual([203, 'b', true, 'Branch: Tower'])
    const docket = await db.get('dockets', c.docketId)
    expect(docket.branches[1]).toMatchObject({ letter: 'b', name: 'Tower', forkedFrom: { chatNum: 202, step: 1 } })
    expect((await runOf(db, c)).branches.b.steps).toHaveLength(1)
    expect(await db.getAllFromIndex('messages', 'conversationId', fork.id)).toHaveLength(2)
    expect((await db.get('conversations', c.id)).familyId).toBe(c.id)
  })

  it('stores nothing of a fork that fails', async () => {
    const c = await R.createChat(db, chat())
    await R.addMessageRecord(db, message(c.id, 'user', 'Hello'))
    await expect(R.createBranchChat(db, { sourceId: c.id, branchAtMessageId: 'missing', newId, now: at() })).rejects.toThrow('Branch point')
    expect(await db.count('conversations')).toBe(1)
    expect((await db.get('conversations', c.id)).familyId).toBeUndefined()
    expect((await db.get('counters', 'num')).next).toBe(203)
  })

  it('numbers notes, terms and quotes, and keeps the Favorites collection with the favourites', async () => {
    const c = await R.createChat(db, chat())
    const m = await R.addMessageRecord(db, message(c.id, 'assistant', 'A reply'))
    const note = await R.addNumbered(db, 'notes', { id: newId(), conversationId: c.id, messageId: m.id, text: 'n', createdAt: at() })
    const term = await R.addNumbered(db, 'highlights', { id: newId(), conversationId: c.id, messageId: m.id, text: 'reply', color: '#B8A070', createdAt: at() })
    const quote = await R.addNumbered(db, 'pins', { id: newId(), targetConversationId: c.id, sourceConversationId: c.id, sourceMessageId: m.id, content: 'A reply', createdAt: at() })
    expect([note.num, note.pinned, note.tags, term.num, term.kind, quote.num, quote.kind]).toEqual([203, false, [], 204, 'term', 205, 'quote'])
    const fav = await R.addFavoriteRecord(db, { id: newId(), conversationId: c.id, messageId: m.id, createdAt: at() })
    expect((await db.getFromIndex('collections', 'builtIn', 'favorites')).items.map((i) => i.fromFavorite)).toEqual([fav.id])
    await R.removeFavoriteRecord(db, fav.id)
    expect((await db.getFromIndex('collections', 'builtIn', 'favorites')).items).toEqual([])
  })

  it('takes a removed branch out without reissuing its letter, and the docket with its last branch', async () => {
    const c = await R.createChat(db, chat())
    const a = await R.addMessageRecord(db, message(c.id, 'assistant', 'x'))
    const fork = await R.createBranchChat(db, { sourceId: c.id, branchAtMessageId: a.id, newId, now: at() })
    await R.addFavoriteRecord(db, { id: newId(), conversationId: fork.id, messageId: 'm', createdAt: at() })
    await R.removeChat(db, fork.id)
    const docket = await db.get('dockets', c.docketId)
    expect([docket.order, docket.nextLetter]).toEqual([['a'], 2])
    expect(Object.keys((await runOf(db, c)).branches)).toEqual(['a'])
    expect((await db.getFromIndex('collections', 'builtIn', 'favorites')).items).toEqual([])
    await R.removeChat(db, c.id)
    expect(await db.count('dockets')).toBe(0)
    expect(await db.count('runs')).toBe(0)
    expect(await db.count('messages')).toBe(0)
    expect((await db.get('counters', 'num')).next).toBe(204)
  })

  it('writes nothing when a document is saved unchanged, and keeps its suggestionStates', async () => {
    const doc = { paragraphs: [{ id: 'p1', text: 'Hello' }], suggestionStates: { s1: 'accepted' }, submittedReplies: {} }
    expect(await R.saveDocument(db, 'c1', doc)).toBe(true)
    const first = await db.get('sbrd_documents', 'c1')
    expect(await R.saveDocument(db, 'c1', { paragraphs: doc.paragraphs, submittedReplies: {} })).toBe(false)
    expect((await db.get('sbrd_documents', 'c1')).updatedAt).toBe(first.updatedAt)
    await R.saveDocument(db, 'c1', { paragraphs: [{ id: 'p1', text: 'Hello there' }], submittedReplies: {} })
    expect((await db.get('sbrd_documents', 'c1')).suggestionStates).toEqual({ s1: 'accepted' })
  })
})

describe('the write path at version 5', () => {
  it('stores a chat, a fork and a note as it always has: no numbers, no dockets', async () => {
    const db = await open(5)
    const c = await R.createChat(db, chat())
    const a = await R.addMessageRecord(db, message(c.id, 'assistant', 'x'))
    const fork = await R.createBranchChat(db, { sourceId: c.id, branchAtMessageId: a.id, newId, now: at() })
    const note = await R.addNumbered(db, 'notes', { id: newId(), conversationId: c.id, messageId: a.id, text: 'n', createdAt: at() })
    expect([c.num, c.docketId, fork.num, note.num, note.pinned]).toEqual([undefined, undefined, undefined, undefined, undefined])
    expect(await db.getAllFromIndex('messages', 'conversationId', fork.id)).toHaveLength(1)
    await R.removeChat(db, fork.id)
    await R.removeChat(db, c.id)
    expect([await db.count('conversations'), await db.count('messages'), await db.count('notes')]).toEqual([0, 0, 0])
    db.close()
  })
})

describe('announcements', () => {
  it('say what changed, in this tab, with no content', async () => {
    const target = new EventTarget()
    globalThis.window = target
    const heard = []
    const off = R.onRecordsChanged((c) => heard.push(c))
    try {
      const db = await open(6)
      const c = await R.createChat(db, chat({ title: 'Secret plans' }))
      await R.addMessageRecord(db, message(c.id, 'user', 'my private prompt'))
      db.close()
    } finally {
      off()
      delete globalThis.window
    }
    expect(heard.map((h) => `${h.op} ${h.kind}`)).toEqual(['created chat', 'created docket', 'created message', 'updated chat', 'updated run'])
    expect(JSON.stringify(heard)).not.toMatch(/Secret|private/)
  })
})

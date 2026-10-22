import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { openDB } from 'idb'
import { upgradeSchema } from './schema'
import * as R from './records'

// The row verbs' write path (stage 6, piece 3; C143), at version 6.

let db
let n = 0
const newId = () => `id-${++n}`
const at = '2026-10-20T10:00:00.000Z'
const chat = (extra = {}) => ({ id: newId(), title: 'Owls', model: 'claude-sonnet', parentId: null, branchPoint: null, room: null, pinned: false, storageBytes: 0, createdAt: at, updatedAt: at, ...extra })

beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory()
  n = 0
  db = await openDB('rows-test', 6, { upgrade: upgradeSchema })
})
afterEach(() => db.close())

describe('changing rows', () => {
  it('writes every change in one go, and leaves "last active" as it was (C143 (b))', async () => {
    const a = await R.createChat(db, chat())
    const b = await R.createChat(db, chat({ title: 'Herons' }))
    const done = await R.changeRecords(db, [
      { store: 'conversations', id: a.id, num: a.num, set: { pinned: true }, expect: { pinned: false } },
      { store: 'conversations', id: b.id, num: b.num, set: { tags: ['essay'], tagsMine: ['essay'] }, expect: { tags: [], tagsMine: [] } },
    ])
    expect(done).toEqual([
      { store: 'conversations', id: a.id, num: a.num, before: { pinned: false }, after: { pinned: true } },
      { store: 'conversations', id: b.id, num: b.num, before: { tags: [], tagsMine: [] }, after: { tags: ['essay'], tagsMine: ['essay'] } },
    ])
    const stored = await db.get('conversations', a.id)
    expect(stored).toMatchObject({ pinned: true, updatedAt: at })
  })

  it('writes nothing when something changed meanwhile, and says which', async () => {
    const a = await R.createChat(db, chat())
    const b = await R.createChat(db, chat())
    const p = R.changeRecords(db, [
      { store: 'conversations', id: a.id, num: a.num, set: { pinned: true }, expect: { pinned: false } },
      { store: 'conversations', id: b.id, num: b.num, set: { pinned: true }, expect: { pinned: true } },
    ])
    await expect(p).rejects.toMatchObject({ name: 'Changed', nums: [b.num] })
    expect((await db.get('conversations', a.id)).pinned).toBe(false)
  })

  it('takes a change back with before and after swapped, as undo: does', async () => {
    const a = await R.createChat(db, chat())
    const [c] = await R.changeRecords(db, [{ store: 'conversations', id: a.id, set: { archived: true }, expect: { archived: false } }])
    await R.changeRecords(db, [{ store: 'conversations', id: a.id, set: c.before, expect: c.after }])
    expect((await db.get('conversations', a.id)).archived).toBe(false)
  })

  it('lets a chat\'s new name reach its plan, as a rename does', async () => {
    const a = await R.createChat(db, chat())
    await R.changeRecords(db, [{ store: 'conversations', id: a.id, set: { title: 'Barn owls' }, expect: { title: 'Owls' } }])
    expect((await db.get('dockets', a.docketId)).title).toBe('Barn owls')
  })

  it('works on notes, keywords and quotes too', async () => {
    const a = await R.createChat(db, chat())
    const note = await R.addNumbered(db, 'notes', { id: newId(), conversationId: a.id, messageId: null, text: 'Range map', createdAt: at })
    const quote = await R.addNumbered(db, 'pins', { id: newId(), targetConversationId: a.id, sourceConversationId: a.id, sourceMessageId: 'm', content: 'Hunts by sound', createdAt: at })
    await R.changeRecords(db, [
      { store: 'notes', id: note.id, set: { pinned: true }, expect: { pinned: false } },
      { store: 'pins', id: quote.id, set: { tags: ['owls'], tagsMine: ['owls'] }, expect: { tags: [], tagsMine: [] } },
    ])
    expect((await db.get('notes', note.id)).pinned).toBe(true)
    expect((await db.get('pins', quote.id)).tags).toEqual(['owls'])
  })
})

describe('the model\'s tagging (C136, C143 (e))', () => {
  it('keeps the person\'s tags', async () => {
    const a = await R.createChat(db, chat())
    await R.changeRecords(db, [{ store: 'conversations', id: a.id, set: { tags: ['Essay'], tagsMine: ['Essay'] }, expect: { tags: [], tagsMine: [] } }])
    await R.updateChat(db, a.id, { tags: ['owls', 'essay'] })
    expect(await db.get('conversations', a.id)).toMatchObject({ tags: ['owls', 'essay'], tagsMine: ['Essay'], tagsBy: 'model' })
    await R.updateChat(db, a.id, { tags: ['birds'] })
    expect((await db.get('conversations', a.id)).tags).toEqual(['birds', 'Essay'])
  })
})

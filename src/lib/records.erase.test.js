import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { openDB } from 'idb'
import { upgradeSchema } from './schema'
import * as R from './records'
import { gatherContents, restoreInto } from './backupData'

// erase: in the write path (stage 6, piece 4; C137), at version 6.

let db
let n = 0
const newId = () => `id-${++n}`
let clock = 0
const at = () => new Date(Date.UTC(2026, 9, 21, 10, 0, clock++)).toISOString()
const chat = (extra = {}) => {
  const now = at()
  return { id: newId(), title: 'Owls', model: 'claude-sonnet', parentId: null, branchPoint: null, room: null, pinned: false, storageBytes: 0, createdAt: now, updatedAt: now, ...extra }
}
const message = (conversationId, content) => ({ id: newId(), conversationId, role: 'user', content, tokenCount: 0, incomplete: false, createdAt: at() })

beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory()
  n = 0
  clock = 0
  db = await openDB('erase-test', 6, { upgrade: upgradeSchema })
})
afterEach(() => db.close())

// A chat with a message, a note, a keyword, a quote kept in it, a favourite and a file.
async function full() {
  const c = await R.createChat(db, chat())
  const m = await R.addMessageRecord(db, message(c.id, 'Barn owls hunt by sound'))
  const note = await R.addNumbered(db, 'notes', { id: newId(), conversationId: c.id, messageId: m.id, text: 'Check the range map', createdAt: at() })
  const term = await R.addNumbered(db, 'highlights', { id: newId(), conversationId: c.id, messageId: m.id, text: 'Tyto', color: '#B8A070', createdAt: at() })
  const quote = await R.addNumbered(db, 'pins', { id: newId(), targetConversationId: c.id, sourceConversationId: c.id, sourceMessageId: m.id, content: 'Hunts by sound', createdAt: at() })
  await R.addFavoriteRecord(db, { id: newId(), conversationId: c.id, messageId: m.id, createdAt: at() })
  await db.put('files', { id: 'f1', conversationId: c.id, name: 'owls.csv', type: 'csv', sizeBytes: 3, uploadedAt: at() })
  await db.put('file_data', { fileId: 'f1', data: 'abc' })
  return { c, m, note, term, quote }
}

describe('erase:', () => {
  it('takes a chat and what is its own, and keeps its notes, keywords and quotes, detached and marked (C137 (c))', async () => {
    const { c, m, note, term, quote } = await full()
    await R.eraseRecords(db, { chats: [{ id: c.id, num: c.num }] })
    expect(await db.get('conversations', c.id)).toBeUndefined()
    expect(await db.get('messages', m.id)).toBeUndefined()
    expect(await db.get('files', 'f1')).toBeUndefined()
    expect(await db.get('file_data', 'f1')).toBeUndefined()
    expect(await db.getAll('favorites')).toEqual([])
    expect((await db.getFromIndex('collections', 'builtIn', 'favorites')).items).toEqual([])
    expect(await db.get('dockets', c.docketId)).toBeUndefined() // a plan goes with its last chat
    expect(await db.get('notes', note.id)).toMatchObject({ text: 'Check the range map', conversationId: null, messageId: null, erasedFrom: c.num, num: note.num })
    expect(await db.get('highlights', term.id)).toMatchObject({ text: 'Tyto', conversationId: null, messageId: null, erasedFrom: c.num })
    expect(await db.get('pins', quote.id)).toMatchObject({ content: 'Hunts by sound', targetConversationId: null, sourceConversationId: null, sourceMessageId: null, erasedFrom: c.num })
  })

  it('takes them too with all', async () => {
    const { c, note, term, quote } = await full()
    await R.eraseRecords(db, { chats: [{ id: c.id, num: c.num }], keepMarks: false })
    expect(await db.get('notes', note.id)).toBeUndefined()
    expect(await db.get('highlights', term.id)).toBeUndefined()
    expect(await db.get('pins', quote.id)).toBeUndefined()
  })

  it('erases notes, keywords and quotes named, and one its chat took already is no matter', async () => {
    const { c, note, term } = await full()
    await R.eraseRecords(db, { chats: [{ id: c.id, num: c.num }], marks: [{ store: 'notes', id: note.id, num: note.num }, { store: 'highlights', id: term.id, num: term.num }], keepMarks: false })
    expect(await db.get('notes', note.id)).toBeUndefined()
  })

  it('erases nothing when something named is gone already, and says which', async () => {
    const { c, note } = await full()
    await expect(R.eraseRecords(db, { chats: [{ id: c.id, num: c.num }], marks: [{ store: 'notes', id: 'gone', num: 299 }] })).rejects.toMatchObject({ name: 'Changed', nums: [299] })
    expect(await db.get('conversations', c.id)).toBeDefined()
    expect(await db.get('notes', note.id)).toMatchObject({ conversationId: c.id })
  })

  it('leaves a plan while it holds another chat', async () => {
    const c = await R.createChat(db, chat())
    const m = await R.addMessageRecord(db, message(c.id, 'One'))
    const fork = await R.createBranchChat(db, { sourceId: c.id, branchAtMessageId: m.id, title: 'Fork', newId, now: at() })
    await R.eraseRecords(db, { chats: [{ id: fork.id, num: fork.num }] })
    expect((await db.get('dockets', c.docketId)).branches.map((b) => b.letter)).toEqual(['a'])
  })

  it('keeps what it kept through a backup and a restore', async () => {
    const { c, note, term, quote } = await full()
    await R.eraseRecords(db, { chats: [{ id: c.id, num: c.num }] })
    const contents = await gatherContents(db)
    globalThis.indexedDB = new IDBFactory()
    const other = await openDB('erase-restore', 6, { upgrade: upgradeSchema })
    try {
      const summary = await restoreInto(other, contents, { strategy: 'merge', newId })
      expect(summary.dropped ?? {}).not.toMatchObject({ highlights: 1 })
      expect((await other.get('notes', note.id))?.text).toBe('Check the range map')
      expect(await other.get('highlights', term.id)).toMatchObject({ text: 'Tyto', erasedFrom: c.num })
      expect(await other.get('pins', quote.id)).toMatchObject({ content: 'Hunts by sound', erasedFrom: c.num })
    } finally {
      other.close()
    }
  })

  it('leaves today\'s delete as it was: everything goes', async () => {
    const { c, note } = await full()
    await R.removeChat(db, c.id)
    expect(await db.get('notes', note.id)).toBeUndefined()
  })
})

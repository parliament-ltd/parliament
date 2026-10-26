import 'fake-indexeddb/auto'
import { maybeSealed } from './__fixtures__/sealedHarness'
import { IDBFactory } from 'fake-indexeddb'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { openDB } from 'idb'
import { upgradeSchema } from './schema'
import * as R from './records'
import { gatherContents, restoreInto } from './backupData'

// A reply's editable form and its edits, stored as C212 has them.

let n = 0
const newId = () => `id-${++n}`
let clock = 0
const at = () => new Date(Date.UTC(2026, 9, 26, 10, 0, clock++)).toISOString()
const open = async () => maybeSealed(await openDB('edited-test', 6, { upgrade: upgradeSchema }))
const chat = () => {
  const now = at()
  return { id: newId(), title: 'New Conversation', model: 'claude-sonnet', parentId: null, branchPoint: null, createdInMode: null, room: 'mode_1', pinned: false, storageBytes: 0, createdAt: now, updatedAt: now }
}
const message = (conversationId, role, content) => ({ id: newId(), conversationId, role, content, tokenCount: 1, incomplete: false, createdAt: at() })

const blocks = [{ id: 'b1', type: 'paragraph', text: [{ text: 'eleven years', struck: 'e1' }, { text: 'a century', added: 'e1' }] }]
const said = (struck, added) => ({ struck, added, places: [{ block: 'b1', from: 0, to: struck.length + added.length }] })

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  n = 0
  clock = 0
})

describe('saving an edited reply (C212)', () => {
  let db
  let c
  let reply
  beforeEach(async () => {
    db = await open()
    c = await R.createChat(db, chat())
    await R.addMessageRecord(db, message(c.id, 'user', 'Write the opening.'))
    reply = await R.addMessageRecord(db, message(c.id, 'assistant', 'It had not gone out in eleven years.'))
  })
  afterEach(() => db.close())

  it('keeps the reply as the model wrote it, its blocks beside it, and numbers each new edit', async () => {
    const counts = await R.saveEditedMessage(db, reply.id, { blocks, edits: new Map([['e1', said('eleven years', 'a century')]]), now: at() })
    expect(counts).toEqual({ created: 1, updated: 0, removed: 0 })
    const stored = await db.get('messages', reply.id)
    expect(stored.content).toBe('It had not gone out in eleven years.')
    expect(stored.blocks).toEqual(blocks)
    const [edit] = await db.getAll('edits')
    expect(edit).toMatchObject({ id: `${reply.id}:e1`, edit: 'e1', num: c.num + 1, conversationId: c.id, messageId: reply.id, part: 'reply', struck: 'eleven years', added: 'a century', held: false, sent: null })
  })

  it('changes an edit in place, keeping its number, and removes one taken back', async () => {
    await R.saveEditedMessage(db, reply.id, { blocks, edits: new Map([['e1', said('eleven years', 'a century')]]), now: at() })
    const first = (await db.getAll('edits'))[0]
    expect(await R.saveEditedMessage(db, reply.id, { blocks, edits: new Map([['e1', said('eleven years', 'a long century')]]), now: at() })).toEqual({ created: 0, updated: 1, removed: 0 })
    const changed = (await db.getAll('edits'))[0]
    expect([changed.num, changed.added]).toEqual([first.num, 'a long century'])
    expect(await R.saveEditedMessage(db, reply.id, { blocks, edits: new Map([['e1', said('eleven years', 'a long century')]]), now: at() })).toEqual({ created: 0, updated: 0, removed: 0 })
    expect(await R.saveEditedMessage(db, reply.id, { blocks: [], edits: new Map(), now: at() })).toEqual({ created: 0, updated: 0, removed: 1 })
    expect(await db.getAll('edits')).toEqual([])
    // A number taken is not used again.
    await R.saveEditedMessage(db, reply.id, { blocks, edits: new Map([['e2', said('years', 'decades')]]), now: at() })
    expect((await db.getAll('edits'))[0].num).toBe(first.num + 1)
  })

  it('removes a message\'s edits with the message, and a chat\'s with the chat', async () => {
    await R.saveEditedMessage(db, reply.id, { blocks, edits: new Map([['e1', said('eleven years', 'a century')]]), now: at() })
    await R.removeMessage(db, reply.id)
    expect(await db.getAll('edits')).toEqual([])

    const again = await R.addMessageRecord(db, message(c.id, 'assistant', 'Another reply.'))
    await R.saveEditedMessage(db, again.id, { blocks, edits: new Map([['e1', said('eleven years', 'a century')]]), now: at() })
    await R.removeChat(db, c.id)
    expect(await db.getAll('edits')).toEqual([])
  })

  it('carries a reply\'s blocks and edits in a backup, and brings them back', async () => {
    await R.saveEditedMessage(db, reply.id, { blocks, edits: new Map([['e1', said('eleven years', 'a century')]]), now: at() })
    const contents = await gatherContents(db, ['chats'])
    const sent = contents.chats.find((x) => x.id === c.id)
    expect(sent.edits).toHaveLength(1)
    expect(sent.messages.find((m) => m.id === reply.id).blocks).toEqual(blocks)

    // Into an empty database: the same records, numbered there.
    const other = await maybeSealed(await openDB('edited-other', 6, { upgrade: upgradeSchema }))
    try {
      await restoreInto(other, JSON.parse(JSON.stringify(contents)), { strategy: 'merge', newId, now: at() })
      const [edit] = await other.getAll('edits')
      const chatThere = (await other.getAll('conversations'))[0]
      expect(edit).toMatchObject({ id: `${reply.id}:e1`, edit: 'e1', messageId: reply.id, conversationId: chatThere.id, struck: 'eleven years', added: 'a century' })
      expect(edit.num).toBeGreaterThan(chatThere.num)
      expect((await other.get('messages', reply.id)).blocks).toEqual(blocks)
    } finally {
      other.close()
    }
  })

  it('keeps a copy\'s edits apart, under its new message', async () => {
    await R.saveEditedMessage(db, reply.id, { blocks, edits: new Map([['e1', said('eleven years', 'a century')]]), now: at() })
    const contents = JSON.parse(JSON.stringify(await gatherContents(db, ['chats'])))
    // Changed here since, so the file's chat comes in as a copy.
    await R.saveEditedMessage(db, reply.id, { blocks, edits: new Map([['e1', said('eleven years', 'two centuries')]]), now: at() })
    await R.updateMessageRecord(db, reply.id, { content: 'Changed since.' })
    await restoreInto(db, contents, { strategy: 'merge', newId, now: at() })
    const edits = await db.getAll('edits')
    expect(edits).toHaveLength(2)
    const copy = edits.find((e) => e.messageId !== reply.id)
    expect(copy).toMatchObject({ edit: 'e1', added: 'a century', id: `${copy.messageId}:e1` })
    expect((await db.get('messages', copy.messageId)).blocks).toEqual(blocks)
  })

  it('leaves out an edit whose reply is not in the file', async () => {
    await R.saveEditedMessage(db, reply.id, { blocks, edits: new Map([['e1', said('eleven years', 'a century')]]), now: at() })
    const contents = JSON.parse(JSON.stringify(await gatherContents(db, ['chats'])))
    const chatIn = contents.chats[0]
    chatIn.edits.push({ ...chatIn.edits[0], messageId: 'nowhere', edit: 'e9' })
    const other = await maybeSealed(await openDB('edited-third', 6, { upgrade: upgradeSchema }))
    try {
      const summary = await restoreInto(other, contents, { strategy: 'merge', newId, now: at() })
      expect(await other.count('edits')).toBe(1)
      expect(summary.leftOut.edits).toBe(1)
    } finally {
      other.close()
    }
  })

  it('marks edits told once, never twice, and keeps each record\'s number (C216)', async () => {
    await R.saveEditedMessage(db, reply.id, { blocks, edits: new Map([['e1', said('eleven years', 'a century')]]), now: at() })
    const [edit] = await R.editsOfChat(db, c.id)
    expect(await R.markEditsSent(db, [edit.id], { to: 'claude-sonnet', at: 't1', prompt: 'p1' })).toBe(1)
    expect(await R.markEditsSent(db, [edit.id], { to: 'other', at: 't2', prompt: 'p2' })).toBe(0)
    const after = (await R.editsOfChat(db, c.id))[0]
    expect(after.sent).toEqual({ to: 'claude-sonnet', at: 't1', prompt: 'p1' })
    expect(after.num).toBe(edit.num)
  })

  it('holds an edit back, as undo: can take back (C216 (f))', async () => {
    await R.saveEditedMessage(db, reply.id, { blocks, edits: new Map([['e1', said('eleven years', 'a century')]]), now: at() })
    const [edit] = await R.editsOfChat(db, c.id)
    const done = await R.changeRecords(db, [{ store: 'edits', id: edit.id, num: edit.num, set: { held: true }, expect: { held: false } }])
    expect(done).toEqual([{ store: 'edits', id: edit.id, num: edit.num, before: { held: false }, after: { held: true } }])
    expect((await R.editsOfChat(db, c.id))[0].held).toBe(true)
  })

  it('counts the blocks in the chat\'s size', async () => {
    const before = (await db.get('conversations', c.id)).storageBytes
    await R.saveEditedMessage(db, reply.id, { blocks, edits: new Map(), now: at() })
    expect((await db.get('conversations', c.id)).storageBytes).toBe(before + JSON.stringify(blocks).length)
  })
})

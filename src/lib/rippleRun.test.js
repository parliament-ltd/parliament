import 'fake-indexeddb/auto'
import { maybeSealed } from './__fixtures__/sealedHarness'
import { IDBFactory } from 'fake-indexeddb'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { openDB } from 'idb'
import { upgradeSchema } from './schema'
import * as R from './records'
import { checkBranches, landRipple } from './ripple'
import { wordsOf } from '../editing/blocks'
import { readRipple } from '../providers/shared'

// Ripple's checks from end to end, with a stand-in for the helper (stage 12, piece 2; C231).

let n = 0
const newId = () => `id-${++n}`
let clock = 0
const at = () => new Date(Date.UTC(2026, 9, 27, 12, 0, clock++)).toISOString()
const chat = () => {
  const now = at()
  return { id: newId(), title: 'Glass', model: 'claude-sonnet', parentId: null, branchPoint: null, createdInMode: null, room: 'mode_1', pinned: false, storageBytes: 0, createdAt: now, updatedAt: now }
}
const message = (conversationId, role, content, extra = {}) => ({ id: newId(), conversationId, role, content, tokenCount: 1, incomplete: false, createdAt: at(), ...extra })
const blocksA = [{ id: 'b1', type: 'paragraph', text: [{ text: 'The furnace had not gone out in ' }, { text: 'eleven years', struck: 'e1' }, { text: 'a century', added: 'e1' }, { text: '.' }] }]

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  n = 0
  clock = 0
})

describe('Ripple, checked and landed (C231)', () => {
  let db
  let a
  let b
  let replyB
  let going
  let asked
  beforeEach(async () => {
    db = await maybeSealed(await openDB('ripple-run', 6, { upgrade: upgradeSchema }))
    a = await R.createChat(db, chat())
    b = await R.createChat(db, chat())
    await R.addMessageRecord(db, message(a.id, 'user', 'Write the opening.'))
    const replyA = await R.addMessageRecord(db, message(a.id, 'assistant', 'The furnace had not gone out in eleven years.'))
    await R.addMessageRecord(db, message(b.id, 'user', 'Write the opening.'))
    replyB = await R.addMessageRecord(db, message(b.id, 'assistant', 'For eleven years the fire had burned. Ferro kept it lit.'))
    await R.saveEditedMessage(db, replyA.id, { blocks: blocksA, edits: new Map([['e1', { struck: 'eleven years', added: 'a century', places: [{ block: 'b1', from: 32, to: 53 }] }]]), now: at() })
    going = await R.editsOfChat(db, a.id)
    asked = []
  })
  afterEach(() => db.close())

  const msgs = async (id) => (await db.getAllFromIndex('messages', 'conversationId', id)).sort((x, y) => x.createdAt.localeCompare(y.createdAt))
  const run = async (answer) => checkBranches({
    going,
    from: await msgs(a.id),
    branches: [{ chatId: b.id, address: '201b' }],
    messagesOf: async (id) => (await db.getAllFromIndex('messages', 'conversationId', id)).sort((x, y) => x.createdAt.localeCompare(y.createdAt)),
    ask: async (request) => { asked.push(request); return readRipple(answer(request), request) },
    land: (messageId, items) => landRipple(db, messageId, items, { model: 'claude-haiku', chat: a.num, branch: '201a' }),
    newId: (() => { let k = 0; return () => `s${++k}` })(),
  })

  it('sends the edit and the other branch\'s matching reply, and lands what comes back as a suggestion there', async () => {
    const from = (await db.getAllFromIndex('messages', 'conversationId', a.id)).sort((x, y) => x.createdAt.localeCompare(y.createdAt))
    const said = await checkBranches({
      going, from,
      branches: [{ chatId: b.id, address: '201b' }],
      messagesOf: async (id) => (await db.getAllFromIndex('messages', 'conversationId', id)).sort((x, y) => x.createdAt.localeCompare(y.createdAt)),
      ask: async (request) => {
        asked.push(request)
        return readRipple(JSON.stringify({ suggestions: [{ edit: going[0].num, in: 'r1', quote: 'For eleven years', replace: 'For a century' }] }), request)
      },
      land: (messageId, items) => landRipple(db, messageId, items, { model: 'claude-haiku', chat: a.num, branch: '201a' }),
      newId: () => 'sx1',
    })
    expect(asked[0].other).toEqual([{ id: 'r1', part: 'reply', text: 'For eleven years the fire had burned. Ferro kept it lit.' }])
    expect(asked[0].edits[0]).toMatchObject({ num: going[0].num, struck: 'eleven years', added: 'a century' })
    expect(said).toEqual({ message: 'rippleDone', values: { count: 1, nums: ['201b'], checked: 1 } })
    const [s] = await db.getAll('suggestions')
    expect(s).toMatchObject({ mark: 'sx1', messageId: replyB.id, kind: 'ripple', struck: 'For eleven years', suggested: 'For a century', from: { edit: going[0].num, chat: a.num, branch: '201a' }, model: 'claude-haiku', state: 'open' })
    const stored = await db.get('messages', replyB.id)
    expect(stored.content).toBe('For eleven years the fire had burned. Ferro kept it lit.')
    expect(wordsOf(stored.blocks)).toBe('For eleven years the fire had burned. Ferro kept it lit.')
  })

  it('says when nothing matched, what could not be placed, and what could not be checked', async () => {
    expect(await run(() => '{"suggestions": []}')).toEqual({ message: 'rippleDone', values: { count: 0, nums: [], checked: 1 } })
    expect(asked).toHaveLength(1)
    // "eleven" alone is not where the quote says, so it cannot be placed.
    const missed = await run(() => JSON.stringify({ suggestions: [{ edit: going[0].num, in: 'r1', quote: 'twelve years', replace: 'x' }] }))
    expect(missed.also).toEqual([{ message: 'rippleMissed', values: { count: 1 } }])
    expect(await run(() => 'not JSON')).toEqual({ message: 'rippleFailed', values: { nums: ['201b'] } })
    expect(await db.count('suggestions')).toBe(0)
  })
})

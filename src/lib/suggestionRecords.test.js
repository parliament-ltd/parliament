import 'fake-indexeddb/auto'
import { maybeSealed } from './__fixtures__/sealedHarness'
import { IDBFactory } from 'fake-indexeddb'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { openDB } from 'idb'
import { upgradeSchema } from './schema'
import * as R from './records'
import { gatherContents, restoreInto } from './backupData'
import { placeInStored, newSuggestionId, settleStored } from '../editing/suggestions'
import { toRows } from './almanacRows'

// Suggestions stored as C229 has them (stage 12, piece 1).

let n = 0
const newId = () => `id-${++n}`
let clock = 0
const at = () => new Date(Date.UTC(2026, 9, 27, 10, 0, clock++)).toISOString()
const open = async (name = 'sug-test') => maybeSealed(await openDB(name, 6, { upgrade: upgradeSchema }))
const chat = () => {
  const now = at()
  return { id: newId(), title: 'New Conversation', model: 'claude-sonnet', parentId: null, branchPoint: null, createdInMode: null, room: 'mode_1', pinned: false, storageBytes: 0, createdAt: now, updatedAt: now }
}
const message = (conversationId, role, content) => ({ id: newId(), conversationId, role, content, tokenCount: 1, incomplete: false, createdAt: at() })
const TEXT = 'The furnace had not gone out in eleven years.'

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  n = 0
  clock = 0
})

// A suggestion landed in a reply never edited, as Ripple and sweeps will land them.
async function land(db, reply, kind = 'ripple') {
  const mark = newSuggestionId()
  const placed = placeInStored(null, reply.content, [{ id: mark, kind, quote: 'eleven years', text: 'nearly a century' }])
  const s = placed.suggestions.get(mark)
  const from = kind === 'ripple' ? { edit: 242, chat: 201, branch: '201a' } : { framework: 'pushback', name: 'Push back on me', instruction: 'Disagree when I am wrong.' }
  const [made] = await R.addSuggestions(db, reply.id, { expect: null, blocks: placed.blocks, suggestions: [{ mark, kind, struck: s.struck, suggested: s.suggested, places: s.places, from, model: 'claude-haiku' }], now: at() })
  return { mark, made, blocks: placed.blocks }
}

describe('suggestions stored (C229)', () => {
  let db
  let c
  let reply
  beforeEach(async () => {
    db = await open()
    c = await R.createChat(db, chat())
    await R.addMessageRecord(db, message(c.id, 'user', 'Write the opening.'))
    reply = await R.addMessageRecord(db, message(c.id, 'assistant', TEXT))
  })
  afterEach(() => db.close())

  it('lands in the reply\'s stored form, its text unchanged, with a numbered record', async () => {
    const { mark, made, blocks } = await land(db, reply)
    const stored = await db.get('messages', reply.id)
    expect(stored.content).toBe(TEXT)
    expect(stored.blocks).toEqual(blocks)
    const [rec] = await db.getAll('suggestions')
    expect(rec).toMatchObject({ id: `${reply.id}:${mark}`, mark, num: made.num, conversationId: c.id, messageId: reply.id, part: 'reply', kind: 'ripple', struck: 'eleven years', suggested: 'nearly a century', state: 'open', model: 'claude-haiku', from: { edit: 242, branch: '201a' } })
    expect(made.num).toBeGreaterThan(c.num)
    // Placed on what was there: refused once the reply has changed since.
    await expect(R.addSuggestions(db, reply.id, { expect: null, blocks, suggestions: [] })).rejects.toMatchObject({ name: 'Changed' })
  })

  it('shows as a row only under its own type, with where it came from', async () => {
    await land(db, reply, 'sweep')
    const [rec] = await db.getAll('suggestions')
    const rows = toRows({ chats: [await db.get('conversations', c.id)], suggestions: [rec] })
    const row = rows.find((r) => r.kind === 'suggestion')
    expect(row.change).toMatchObject({ kind: 'suggestion', made: 'sweep', struck: 'eleven years', suggested: 'nearly a century', state: 'open', from: { name: 'Push back on me', instruction: 'Disagree when I am wrong.' } })
  })

  it('is settled and kept, and opens again when its marks come back', async () => {
    const { mark, blocks } = await land(db, reply)
    await R.settleSuggestionRecord(db, `${reply.id}:${mark}`, 'accepted')
    const after = settleStored(blocks, mark, 'accept')
    await R.saveEditedMessage(db, reply.id, { blocks: after.blocks, edits: after.edits, asks: after.asks, suggestions: after.suggestions, now: at() })
    expect((await db.getAll('suggestions'))[0].state).toBe('accepted')
    // Ripple's, accepted, is an edit of yours now, numbered.
    const [edit] = await db.getAll('edits')
    expect(edit).toMatchObject({ struck: 'eleven years', added: 'nearly a century', sent: null })
    // Ctrl+Z after accepting: the marks are back, and so is the suggestion.
    const places = (await db.getAll('suggestions'))[0].places
    await R.saveEditedMessage(db, reply.id, { blocks, edits: new Map(), asks: new Map(), suggestions: new Map([[mark, { struck: 'eleven years', suggested: 'nearly a century', places }]]), now: at() })
    expect((await db.getAll('suggestions'))[0].state).toBe('open')
  })

  it('goes with its message, and with its chat', async () => {
    await land(db, reply)
    await R.removeMessage(db, reply.id)
    expect(await db.getAll('suggestions')).toEqual([])
    const again = await R.addMessageRecord(db, message(c.id, 'assistant', TEXT))
    await land(db, again)
    await R.removeChat(db, c.id)
    expect(await db.getAll('suggestions')).toEqual([])
  })

  it('is put back by undo: as it was', async () => {
    const { mark, blocks } = await land(db, reply)
    const snap = await R.messageSnapshot(db, reply.id)
    expect(snap.suggestions).toHaveLength(1)
    const after = settleStored(blocks, mark, 'reject')
    await R.saveEditedMessage(db, reply.id, { blocks: after.blocks, edits: after.edits, asks: after.asks, suggestions: after.suggestions, now: at() })
    await R.settleSuggestionRecord(db, `${reply.id}:${mark}`, 'rejected')
    await R.putMessageBack(db, snap, after.blocks)
    expect((await db.get('messages', reply.id)).blocks).toEqual(blocks)
    expect((await db.getAll('suggestions'))[0].state).toBe('open')
  })

  it('travels in a backup and comes back, renumbered, pointing at its reply', async () => {
    const { mark, blocks } = await land(db, reply)
    const contents = await gatherContents(db, ['chats'])
    expect(contents.chats.find((x) => x.id === c.id).suggestions).toHaveLength(1)
    const other = await open('sug-other')
    try {
      await restoreInto(other, JSON.parse(JSON.stringify(contents)), { strategy: 'merge', newId, now: at() })
      const [rec] = await other.getAll('suggestions')
      const chatThere = (await other.getAll('conversations'))[0]
      expect(rec).toMatchObject({ id: `${reply.id}:${mark}`, mark, messageId: reply.id, conversationId: chatThere.id, kind: 'ripple', state: 'open' })
      expect(rec.num).toBeGreaterThan(chatThere.num)
      expect((await other.get('messages', reply.id)).blocks).toEqual(blocks)
    } finally {
      other.close()
    }
  })

  it('reads a backup from before suggestions as it always did, and leaves out one whose reply is not in the file', async () => {
    await land(db, reply)
    const contents = JSON.parse(JSON.stringify(await gatherContents(db, ['chats'])))
    const before = JSON.parse(JSON.stringify(contents))
    delete before.chats[0].suggestions
    const third = await open('sug-third')
    try {
      await restoreInto(third, before, { strategy: 'merge', newId, now: at() })
      expect(await third.count('suggestions')).toBe(0)
      expect(await third.count('messages')).toBe(2)
    } finally {
      third.close()
    }
    contents.chats[0].suggestions.push({ ...contents.chats[0].suggestions[0], messageId: 'nowhere', mark: 's9' })
    const fourth = await open('sug-fourth')
    try {
      const summary = await restoreInto(fourth, contents, { strategy: 'merge', newId, now: at() })
      expect(await fourth.count('suggestions')).toBe(1)
      expect(summary.leftOut.edits).toBe(1)
    } finally {
      fourth.close()
    }
  })

  it('keeps the file\'s numbers on a replace that keeps them, and the counter after them', async () => {
    const { made } = await land(db, reply)
    const contents = JSON.parse(JSON.stringify(await gatherContents(db, ['chats'])))
    const other = await open('sug-replace')
    try {
      await restoreInto(other, contents, { strategy: 'replace', newId, now: at() })
      const [rec] = await other.getAll('suggestions')
      expect(rec.num).toBe(made.num)
      expect((await other.get('counters', 'num')).next).toBeGreaterThan(made.num)
    } finally {
      other.close()
    }
  })
})

import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { openDB } from 'idb'
import { upgradeSchema } from './schema'
import * as R from './records'
import { readIt, isDraft, writingOf, draftWords } from './writing'
import { validateBackup } from './validate'
import { noteFor } from '../editing/told'
import { changeStored } from '../editing/storedChange'
import { forModel, WRITING_LEAD } from '../stores/sendHistory'
import { emptyRoom, planWritten, shipped, SPACE } from '../shell/arrangement'

// Your own text, written in a room (C301 (f); ruled 16 November).

let n = 0
const newId = () => `id-${++n}`
let clock = 0
const at = () => new Date(Date.UTC(2026, 10, 16, 10, 0, clock++)).toISOString()
const chat = () => {
  const now = at()
  return { id: newId(), title: 'Committee notes', model: 'claude-sonnet-5-5', parentId: null, branchPoint: null, createdInMode: null, room: 'mode_1', pinned: false, storageBytes: 0, createdAt: now, updatedAt: now }
}
const message = (conversationId, role, content, extra = {}) => ({ id: newId(), conversationId, role, content, tokenCount: 0, incomplete: false, createdAt: at(), ...extra })
const para = (runs) => [{ id: 'b1', type: 'paragraph', text: runs }]

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  n = 0
  clock = 0
})

describe('your text: a draft until a model reads it', () => {
  const own = { id: 'w1', role: 'user', writing: true, content: 'First, the budget.' }
  it('is a draft until a model replies after it; an answer from a source does not count', () => {
    expect(isDraft(own, [own])).toBe(true)
    expect(isDraft(own, [own, { role: 'user', content: '' }, { role: 'assistant', content: 'x', source: { id: 'wikipedia' } }])).toBe(true)
    expect(isDraft(own, [own, { role: 'user', content: '' }, { role: 'assistant', content: '' }])).toBe(false)
    expect(readIt({ role: 'assistant', source: { id: 'wikipedia' } })).toBe(false)
    expect(isDraft({ id: 'p', role: 'user', content: 'a prompt' }, [])).toBe(false)
    expect(writingOf([{ id: 'p', role: 'user' }, own])).toBe(own)
  })

  it('leaves out a change held back: its struck words stand, its added words go', () => {
    const blocks = para([{ text: 'and the board wants ' }, { text: 'a plan', struck: 'e1' }, { text: 'a costed plan', added: 'e1' }, { text: ' before the vote.' }])
    expect(draftWords(blocks, ['e1'])).toBe('and the board wants a plan before the vote.')
    // Let go, it reads as the text.
    expect(draftWords(blocks, [])).toBe('and the board wants a costed plan before the vote.')
  })
})

describe('what is stored', () => {
  let db
  beforeEach(async () => { db = await openDB('writing-test', 6, { upgrade: upgradeSchema }) })
  afterEach(() => db.close())

  it('keeps the draft\'s words as you type, and stops once a model has read it', async () => {
    const c = await R.createChat(db, chat())
    const w = await R.addMessageRecord(db, message(c.id, 'user', 'First, the budget.', { writing: true, blocks: para([{ text: 'First, the budget.' }]) }))
    await R.saveEditedMessage(db, w.id, { blocks: para([{ text: 'First, the budget. Then the move.' }]), edits: new Map(), content: 'First, the budget. Then the move.', now: at() })
    expect((await db.get('messages', w.id)).content).toBe('First, the budget. Then the move.')
    // No edit is kept for words typed in a draft.
    expect(await db.count('edits')).toBe(0)
    // A model reads it: its words stay as read.
    await R.addMessageRecord(db, message(c.id, 'user', ''))
    await R.addMessageRecord(db, message(c.id, 'assistant', 'Noted.'))
    await R.saveEditedMessage(db, w.id, { blocks: para([{ text: 'Changed after.' }]), edits: new Map(), content: 'Changed after.', now: at() })
    const after = await db.get('messages', w.id)
    expect(after.content).toBe('First, the budget. Then the move.')
    expect(after.blocks).toEqual(para([{ text: 'Changed after.' }]))
  })

  it('never takes words for a message that is not your text', async () => {
    const c = await R.createChat(db, chat())
    const p = await R.addMessageRecord(db, message(c.id, 'user', 'A prompt.'))
    await R.saveEditedMessage(db, p.id, { blocks: para([{ text: 'Other.' }]), edits: new Map(), content: 'Other.', now: at() })
    expect((await db.get('messages', p.id)).content).toBe('A prompt.')
  })

  it('copies what waits into each branch made at the same moment, each with its own number', async () => {
    const c = await R.createChat(db, chat())
    const w = await R.addMessageRecord(db, message(c.id, 'user', 'First, the budget.', { writing: true, blocks: para([{ text: 'First, ' }, { text: 'the budget', ask: 'q1' }, { text: '.' }]) }))
    await R.saveEditedMessage(db, w.id, {
      blocks: para([{ text: 'First, ' }, { text: 'the budget', ask: 'q1' }, { text: '.' }]),
      edits: new Map(),
      asks: new Map([['q1', { question: 'add the figures', passage: 'the budget', places: [{ block: 'b1', from: 7, to: 17 }] }]]),
      now: at(),
    })
    const [ask] = await db.getAll('asks')
    const fork = await R.createBranchChat(db, { sourceId: c.id, branchAtMessageId: w.id, title: 'Committee notes', answerer: 'mistral-medium-3-5', waiting: true, newId, now: at() })
    const copied = (await db.getAllFromIndex('asks', 'conversationId', fork.id))
    expect(copied).toHaveLength(1)
    expect(copied[0]).toMatchObject({ edit: 'q1', question: 'add the figures', state: 'open', sent: null })
    expect(copied[0].num).not.toBe(ask.num)
    const [copy] = await db.getAllFromIndex('messages', 'conversationId', fork.id)
    expect(copied[0].messageId).toBe(copy.id)
    expect(copy.writing).toBe(true)
    // Without waiting, a branch copies the messages only, as before.
    const plain = await R.createBranchChat(db, { sourceId: c.id, branchAtMessageId: w.id, title: 'Committee notes', newId, now: at() })
    expect(await db.getAllFromIndex('asks', 'conversationId', plain.id)).toHaveLength(0)
  })

  it('is checked on restore: true, and only on your side; a backup without it reads as before', () => {
    const when = '2026-11-16T10:00:00.000Z'
    const c1 = { id: 'c1', title: 'Committee notes', model: 'claude-sonnet', parentId: null, branchPoint: null, pinned: false, storageBytes: 0, createdAt: when, updatedAt: when }
    const base = { id: 'm1', conversationId: 'c1', role: 'user', content: 'x', tokenCount: 0, incomplete: false, createdAt: when }
    const check = (m) => validateBackup({ conversations: [c1], messages: [m] })
    expect(check(base)).toEqual({ valid: true })
    expect(check({ ...base, writing: true })).toEqual({ valid: true })
    expect(check({ ...base, writing: 'yes' }).valid).toBe(false)
    expect(check({ ...base, role: 'assistant', writing: true }).valid).toBe(false)
  })
})

describe('what the model reads (C301 (f))', () => {
  const own = { id: 'w1', role: 'user', writing: true, content: '# Committee notes\n\nFirst, the budget.', blocks: para([{ text: 'First, ' }, { text: 'the budget', ask: 'q1' }, { text: '.' }]) }
  const prompt = { id: 'u1', role: 'user', content: '' }

  it('your text goes on your side, under its lead, joined with the prompt that sends it', () => {
    const turns = forModel([own, { ...prompt, content: 'tighten it', told: '' }])
    expect(turns).toHaveLength(1)
    expect(turns[0].role).toBe('user')
    expect(turns[0].content.startsWith(`${WRITING_LEAD}\n\n<writing>\n# Committee notes`)).toBe(true)
    expect(turns[0].content.endsWith('</writing>\n\ntighten it')).toBe(true)
  })

  it('asks about "their own text", and with nothing typed, asks for nothing more', () => {
    const ask = { id: 'w1:q1', edit: 'q1', messageId: 'w1', num: 214, question: 'add the figures', passage: 'the budget', state: 'open', sent: null }
    const quiet = noteFor([own], [], { asks: [ask], typed: false })
    expect(quiet.text).toContain('The person asks about their own text, in their own words.')
    expect(quiet.text).toContain('With nothing else asked, write nothing more.')
    expect(quiet.text).not.toContain('Write the rest of your reply as usual.')
    const typed = noteFor([own], [], { asks: [ask] })
    expect(typed.text).toContain('Write the rest of your reply as usual.')
  })

  it('never tells an edit made before a model read your text: it goes as its words', () => {
    const blocks = para([{ text: 'a plan', struck: 'e1' }, { text: 'a costed plan', added: 'e1' }])
    const record = { id: 'w1:e1', edit: 'e1', messageId: 'w1', num: 216, sent: null, held: false }
    const note = noteFor([{ ...own, blocks }], [record])
    expect(note.text).toBe('')
    expect(note.drafted).toEqual(['w1:e1'])
    // Read once, an edit is told as any other.
    const read = noteFor([{ ...own, blocks }, prompt, { id: 'a1', role: 'assistant', content: 'Noted.' }], [record])
    expect(read.drafted).toEqual([])
    expect(read.text).toContain('The person edited their own text, since you read it.')
  })
})

describe('a change accepted in a draft (C301 (f))', () => {
  it('goes into the text, unmarked, the changes still held kept as they are', () => {
    const blocks = para([
      { text: 'wants ' }, { text: 'a plan', struck: 'e1' }, { text: 'a costed plan', added: 'e1' },
      { text: ' before ' }, { text: 'the vote', struck: 'e2' }, { text: 'the vote on the 4th', added: 'e2' },
    ])
    const kept = changeStored(blocks, 'keepEdit', 'e1')
    expect(kept.blocks[0].text.map((r) => r.text).join('')).toBe('wants a costed plan before the votethe vote on the 4th')
    expect(kept.blocks[0].text.some((r) => r.struck === 'e1' || r.added === 'e1')).toBe(false)
    expect([...kept.edits.keys()]).toEqual(['e2'])
    expect(draftWords(kept.blocks, ['e2'])).toBe('wants a costed plan before the vote')
    expect(changeStored(kept.blocks, 'keepEdit', 'e1')).toBeNull()
  })
})

describe('the room it is written in (C301 (f))', () => {
  it('shows the new chat in the room it was written in', () => {
    const a = emptyRoom({ ...shipped('room'), id: SPACE })
    const p = planWritten(a, 'room', 'c-new')
    expect(p.next.context.room).toBe('c-new')
    expect(p.next.addressed).toBe('room')
  })
})

import { describe, it, expect } from 'vitest'
import { selectionOf, actCommand, aboutText, replySide, chatAddress, planSummarize, ownActsOf, sharedActs } from './cardActs'
import { cardsOf } from './collectionCards'
import { newCollection } from './collections'

// Selecting cards and the four acts (stage 6, piece 7; C145 (d), (e), (h)).

describe('the selection', () => {
  const cards = [{ num: 214, kind: 'term' }, { num: 217, kind: 'quote' }, { num: 219, kind: 'note' }, { num: null, kind: 'message' }]
  it('names each by kind and number, in the order picked, and counts the kinds', () => {
    expect(selectionOf(cards, [219, 214])).toEqual({ items: [{ num: 219, kind: 'note' }, { num: 214, kind: 'term' }], kinds: { note: 1, term: 1 }, nums: [219, 214] })
    expect(selectionOf(cards, [299]).nums).toEqual([])
  })
})

describe('what the acts write into the bar', () => {
  it('carries the numbers, and "" where words are wanted', () => {
    expect(actCommand.note([214, 217])).toBe('>note:214, 217 ""')
    expect(actCommand.note([])).toBe('>note:""')
    expect(actCommand.tag([214])).toBe('>tagadd:"" 214')
    expect(actCommand.summarize([214, 217])).toBe('>summarize:214, 217')
    expect(actCommand.summarize([])).toBe('>summarize:')
  })
})

describe('the words a prompt about cards starts with', () => {
  it('quotes each card line by line and says what it is', () => {
    const rows = [{ num: 217, kind: 'quote', text: 'Hunts by sound.\nAt night.' }, { num: 219, kind: 'note', text: 'Check the face' }]
    expect(aboutText(rows, (r) => `${r.kind} ${r.num}`)).toBe('> Hunts by sound.\n> At night.\n(quote 217)\n\n> Check the face\n(note 219)')
  })
})

describe('cards for notes of their own (C145 (e), (g))', () => {
  it('carry what they quote, or what they summarize, and say they were written here', () => {
    const rows = [
      { num: 231, kind: 'note', id: 'n231', store: 'notes', chatId: null, text: 'Thread', quotes: [214, 217], summarized: null, tags: [] },
      { num: 234, kind: 'note', id: 'n234', store: 'notes', chatId: null, text: 'In short', quotes: [], summarized: { from: [214], at: '2026-10-21T10:00:00Z', model: 'claude-haiku' }, tags: [] },
    ]
    const c = { ...newCollection({ id: 'c1', now: '2026-10-21T10:00:00Z' }), items: rows.map((r) => ({ kind: 'marking', store: 'notes', id: r.id, num: r.num })) }
    const { cards } = cardsOf(c, rows)
    expect(cards[0]).toMatchObject({ num: 231, quotes: [214, 217], own: true, summary: null })
    expect(cards[1]).toMatchObject({ num: 234, summary: { from: [214] }, own: true })
  })
})

describe('compare: with branches (C289)', () => {
  const wordsNow = (m) => m.content
  const whoOf = (m) => m.source?.name ?? m.model ?? null
  it('reads a branch by its last reply as it stands, and says who gave it', () => {
    const messages = [
      { id: 'u1', role: 'user', content: 'Where do owls nest?' },
      { id: 'r1', role: 'assistant', content: 'In hollows.', model: 'claude-sonnet-5-5' },
      { id: 'u2', role: 'user', content: 'And barn owls?' },
      { id: 'r2', role: 'assistant', content: 'In barns and old trees.', source: { name: 'Wikipedia' } },
      { id: 'r3', role: 'assistant', content: 'Still arri', incomplete: true },
    ]
    expect(replySide('201a', messages, wordsNow, whoOf)).toEqual({ kind: 'reply', address: '201a', who: 'Wikipedia', text: 'In barns and old trees.' })
    expect(replySide('201b', messages.slice(0, 2), wordsNow, whoOf).who).toBe('claude-sonnet-5-5')
  })
  it('has nothing to set beside another before a reply has come', () => {
    expect(replySide('201a', [{ id: 'u1', role: 'user', content: 'Hello' }], wordsNow, whoOf)).toBeNull()
    expect(replySide('201a', [], wordsNow, whoOf)).toBeNull()
  })
  it('names a chat by its branch, else its number', () => {
    expect(chatAddress({ num: 230, docketNum: 229, branch: 'b' })).toBe('229b')
    expect(chatAddress({ num: 202, docketNum: null, branch: null })).toBe('202')
  })
})

describe('a branch whose last reply has no words (C290)', () => {
  it('is that empty reply, not an earlier one to another prompt', () => {
    const messages = [
      { id: 'u1', role: 'user', content: 'barn owl' },
      { id: 'r1', role: 'assistant', content: 'The barn owls are owls.', source: { name: 'Wikipedia' } },
      { id: 'u2', role: 'user', content: 'p>barn owl' },
      { id: 'r2', role: 'assistant', content: '', source: { name: 'Wikipedia' } },
    ]
    expect(replySide('201a', messages, (m) => m.content, (m) => m.source.name)).toEqual({ kind: 'reply', address: '201a', who: 'Wikipedia', text: '' })
  })
})

describe('summarize: again (C291 (o)): rewrite: is summarize: on cards summarized before', () => {
  const rows = [
    { num: 214, kind: 'note', text: 'One', tags: [], tagsMine: [] },
    { num: 217, kind: 'quote', text: 'Two', tags: [], tagsMine: [] },
    { num: 231, kind: 'note', text: 'Both, in short', summarized: { from: [214, 217], at: '2026-11-04', model: 'claude-haiku-5-5' }, tags: [], tagsMine: [] },
  ]
  const screens = {
    records: { rows },
    collection: { shown: { id: 'q2' }, label: () => 'Q2', cards: rows.map((r) => ({ num: r.num, kind: r.kind })) },
    helper: { keyed: true, provider: 'Anthropic', price: { inputPerMillion: 1, outputPerMillion: 5 } },
  }
  const step = (nums) => ({ match: { values: nums.map((n) => ({ kind: 'number', value: n })) } })
  it('says a new summary is dated and the old one stays', () => {
    expect(planSummarize(step([214, 217]), screens, 'collection').says.also[0]).toEqual({ message: 'summarizeAgain' })
    expect(planSummarize(step([214]), screens, 'collection').says.also.some((a) => a.message === 'summarizeAgain')).toBe(true)
    expect(planSummarize(step([231]), screens, 'collection').says.also.some((a) => a.message === 'summarizeAgain')).toBe(false)
  })
})

describe("a picked change card's own actions, at the foot (C298 (a))", () => {
  const edit = (num, change = {}) => ({ num, kind: 'edit', change: { held: false, sent: null, ...change } })
  const ask = (num, change) => ({ num, kind: 'ask', change })
  const sug = (num, state = 'open') => ({ num, kind: 'suggestion', change: { state } })
  it('offers what can be done to each kind now', () => {
    expect(ownActsOf(edit(241))).toEqual(['holdBack', 'undoEdit'])
    expect(ownActsOf(edit(244, { held: true }))).toEqual(['letGo', 'undoEdit'])
    expect(ownActsOf(edit(245, { sent: { to: 'm', at: 'x' } }))).toEqual([])
    expect(ownActsOf(ask(246, { state: 'open' }))).toEqual(['holdBack', 'dropAsk'])
    expect(ownActsOf(ask(247, { state: 'answered', answer: { inPlace: true } }))).toEqual(['acceptAnswer', 'undoAnswer'])
    expect(ownActsOf(ask(249, { state: 'answered', answer: { inPlace: false } }))).toEqual(['undoAnswer'])
    expect(ownActsOf(sug(248))).toEqual(['accept', 'reject'])
    expect(ownActsOf(sug(250, 'accepted'))).toEqual([])
    expect(ownActsOf({ num: 236, kind: 'highlight' })).toEqual([])
  })
  it('writes the command for one, and for several only what they share, undo: for one alone', () => {
    expect(sharedActs([edit(241)])).toEqual([
      { key: 'holdBack', word: 'actHoldBack', command: 'hold:241' },
      { key: 'undoEdit', word: 'actUndo', command: 'undo:241' },
    ])
    expect(sharedActs([edit(241), edit(243)]).map((a) => a.command)).toEqual(['hold:241, 243'])
    expect(sharedActs([edit(244, { held: true })]).map((a) => a.command)).toEqual(['hold:off 244', 'undo:244'])
    expect(sharedActs([edit(241), edit(244, { held: true })])).toEqual([])
    expect(sharedActs([sug(248), sug(251)]).map((a) => a.command)).toEqual(['accept:248, 251', 'reject:248, 251'])
    expect(sharedActs([ask(246, { state: 'open' })]).map((a) => a.command)).toEqual(['hold:246', 'delete:246'])
    // With a note among them, only the four acts, on the note.
    expect(sharedActs([edit(241), { num: 250, kind: 'note' }])).toEqual([])
    expect(sharedActs([])).toEqual([])
  })
})

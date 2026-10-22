import { describe, it, expect } from 'vitest'
import { selectionOf, actCommand, aboutText } from './cardActs'
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

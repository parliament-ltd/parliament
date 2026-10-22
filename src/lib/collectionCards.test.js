import { describe, it, expect } from 'vitest'
import { cardsOf, tabCounts, sequenceOf, orderKeys } from './collectionCards'
import { newCollection } from './collections'

// The cards a collection shows (stage 6, piece 6; C144).

const STORE = { note: 'notes', term: 'highlights', quote: 'pins' }
const mark = (num, kind, chatId, extra = {}) => ({ num, kind, id: `${kind}${num}`, store: STORE[kind], chatId, text: `${kind} ${num}`, chatNum: null, createdAt: `2026-10-${num - 190}T10:00:00Z`, tags: [], ...extra })
const rows = [
  { num: 202, kind: 'chat', id: 'chat-202', chatId: 'chat-202', title: 'Owls', docketNum: null },
  { num: 204, kind: 'chat', id: 'chat-204', chatId: 'chat-204', title: 'Barn owl', docketNum: 203 },
  { num: 203, kind: 'docket', id: 'plan-203', title: 'Barn owl' },
  mark(210, 'note', 'chat-202', { chatNum: 202 }),
  mark(211, 'term', 'chat-202', { chatNum: 202 }),
  mark(212, 'quote', 'chat-204', { chatNum: 204 }),
  mark(215, 'note', null, { erasedFrom: 206 }),
]
const coll = (items, extra = {}) => ({ ...newCollection({ id: 'c1', now: '2026-10-21T10:00:00Z' }), items, ...extra })
const chatItem = { kind: 'chat', conversationId: 'chat-202', num: 202 }
const planItem = { kind: 'plan', docketId: 'plan-203', num: 203 }
const markItem = (r) => ({ kind: 'marking', store: r.store, id: r.id, num: r.num })
const find = (num) => rows.find((r) => r.num === num)

describe('cards', () => {
  it('shows every marking of a held chat or plan, and one added on its own', () => {
    const { cards, sources } = cardsOf(coll([chatItem, planItem, markItem(find(215))]), rows)
    expect(cards.map((c) => [c.num, c.kind, c.via?.num ?? null])).toEqual([[210, 'note', 202], [211, 'term', 202], [212, 'quote', 203], [215, 'note', null]])
    expect(sources).toEqual([
      { key: 'chat:chat-202', kind: 'chat', num: 202, title: 'Owls', gone: false },
      { key: 'plan:plan-203', kind: 'plan', num: 203, title: 'Barn owl', gone: false },
    ])
    // Kept from an erased chat: its words stay, marked so (C137 (d)).
    expect(cards[3]).toMatchObject({ erasedFrom: 206, gone: true, text: 'note 215' })
  })

  it('shows each card once, as held, however many ways it is held', () => {
    const { cards } = cardsOf(coll([markItem(find(210)), chatItem]), rows)
    expect(cards.filter((c) => c.num === 210)).toHaveLength(1)
    expect(cards.find((c) => c.num === 210).via).toEqual({ kind: 'chat', num: 202 })
  })

  it('keeps a card for an erased chat, with what it left', () => {
    const { cards, sources } = cardsOf(coll([{ kind: 'chat', conversationId: 'gone', num: 206 }]), rows)
    expect(cards.map((c) => [c.num, c.kind])).toEqual([[215, 'note'], [206, 'gone']])
    expect(cards[1]).toMatchObject({ what: 'chat', gone: true, text: '' })
    expect(sources[0]).toMatchObject({ num: 206, gone: true })
  })

  it('shows a message by its words, and one erased as gone', () => {
    const messages = new Map([['m1', { id: 'm1', content: 'Barn owls hunt by ear', createdAt: '2026-10-20T10:00:00Z' }]])
    const items = [{ kind: 'message', messageId: 'm1', conversationId: 'chat-204' }, { kind: 'message', messageId: 'm2', conversationId: 'chat-204' }]
    const { cards } = cardsOf(coll(items), rows, messages)
    expect(cards[0]).toMatchObject({ kind: 'message', text: 'Barn owls hunt by ear', chatNum: 204 })
    expect(cards[1]).toMatchObject({ kind: 'gone', what: 'message' })
  })

  it('counts each kind for the tabs; a kind with none has no tab (A16)', () => {
    const { cards } = cardsOf(coll([chatItem, planItem]), rows)
    expect(tabCounts(cards)).toEqual({ all: 3, note: 1, term: 1, quote: 1 })
  })
})

describe('the three orders (C144 (e))', () => {
  const c = coll([chatItem, planItem], { headings: [{ id: 'h1', text: 'Causes' }], order: ['mark:pins:quote212', 'head:h1', 'mark:notes:note210'] })
  const { cards, sources } = cardsOf(c, rows)
  const show = (seq) => seq.map((e) => (e.head ? `§${e.head.text}` : e.group ? `[${e.group.kind} ${e.group.num}]` : e.card.num))

  it('your order: the order kept, then the rest oldest first', () => {
    expect(show(sequenceOf(cards, c, 'yours'))).toEqual([212, '§Causes', 210, 211])
    expect(orderKeys(cards, c)).toEqual(['mark:pins:quote212', 'head:h1', 'mark:notes:note210', 'mark:highlights:term211'])
  })

  it('by source: grouped in the order the picker numbers them', () => {
    expect(show(sequenceOf(cards, c, 'source', { sources }))).toEqual(['[chat 202]', 210, 211, '[plan 203]', 212])
  })

  it('by date, newest first unless asked, each with the heading it sits under', () => {
    const seq = sequenceOf(cards, c, 'date')
    expect(show(seq)).toEqual([212, 211, 210])
    expect(seq.map((e) => e.under)).toEqual([null, 'Causes', 'Causes'])
    expect(show(sequenceOf(cards, c, 'date', { asc: true }))).toEqual([210, 211, 212])
  })
})

import { describe, it, expect } from 'vitest'
import { cardsOf, tabCounts, sequenceOf, orderKeys, cardsShown, cardsCostUnknown } from './collectionCards'
import { readFilter } from './recordsFilter'
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

describe('edits and asks (stage 11, piece 5; C220)', () => {
  const change = (num, kind, chatId, extra = {}) => ({ num, kind, id: `m:${num}`, store: kind === 'edit' ? 'edits' : 'asks', chatId, text: '', createdAt: `2026-10-${num - 220}T10:00:00Z`, tags: [], change: { kind, mark: `x${num}` }, ...extra })
  const more = [
    ...rows,
    { num: 205, kind: 'chat', id: 'chat-205', chatId: 'chat-205', title: 'Barn owl b', docketNum: 203 },
    change(242, 'edit', 'chat-202', { chatNum: 202 }),
    change(243, 'ask', 'chat-204', { chatNum: 204, docketNum: 203, branch: 'a' }),
    change(244, 'edit', 'chat-205', { chatNum: 205, docketNum: 203, branch: 'b' }),
  ]
  it('come with a held chat or plan, from every room, with their own tabs', () => {
    const { cards } = cardsOf(coll([chatItem, planItem]), more)
    expect(cards.filter((c) => c.change).map((c) => [c.num, c.kind])).toEqual([[242, 'edit'], [243, 'ask'], [244, 'edit']])
    expect(tabCounts(cards)).toMatchObject({ edit: 2, ask: 1 })
  })
  it('group by branch under their plan, by source', () => {
    const c = coll([chatItem, planItem])
    const { cards, sources } = cardsOf(c, more)
    const groups = sequenceOf(cards, c, 'source', { sources }).filter((e) => e.group).map((e) => `${e.group.kind}:${e.group.num}${e.group.branch ?? ''}`)
    expect(groups).toEqual(['chat:202', 'plan:203', 'branch:203a', 'branch:203b'])
  })
})

describe('search and filters on the cards (C287)', () => {
  // Rows as Records holds them: what the filters read.
  const full = [
    { num: 202, kind: 'chat', id: 'chat-202', store: 'conversations', chatId: 'chat-202', chatNum: 202, roomId: 'mode_owl', models: ['claude-opus-4'], sources: [], marks: ['note', 'term'], cost: 0.42, collections: ['c1'], tags: [] },
    { num: 204, kind: 'chat', id: 'chat-204', store: 'conversations', chatId: 'chat-204', chatNum: 204, roomId: null, models: [], sources: ['wikipedia'], marks: ['quote'], cost: null, collections: ['c1'], tags: [], docketNum: 203 },
    mark(210, 'note', 'chat-202', { chatNum: 202, tags: ['essay'], roomId: 'mode_owl', collections: ['c1'], createdAt: '2026-10-20T10:00:00Z' }),
    mark(211, 'term', 'chat-202', { chatNum: 202, roomId: 'mode_owl', collections: ['c1', 'c2'], createdAt: '2026-10-21T10:00:00Z' }),
    mark(212, 'quote', 'chat-204', { chatNum: 204, docketNum: 203, tags: ['essay', 'draft'], collections: ['c1'], createdAt: '2026-10-22T10:00:00Z' }),
    mark(215, 'note', null, { tags: ['essay'], collections: ['c1'], createdAt: '2026-10-25T10:00:00Z' }),
  ]
  const messages = new Map([['m1', { id: 'm1', content: 'Barn owls hunt by ear', createdAt: '2026-10-23T10:00:00Z' }]])
  const items = [{ kind: 'chat', conversationId: 'chat-202', num: 202 }, { kind: 'chat', conversationId: 'chat-204', num: 204 }, markItem(full[5]), { kind: 'message', messageId: 'm1', conversationId: 'chat-204', addedAt: '2026-10-23T10:00:00Z' }]
  const { cards } = cardsOf(coll(items), full, messages)
  const NOW = new Date(2026, 9, 26, 12).getTime()
  const filter = (verb, values, minus = false) => readFilter({ verb, minus, match: { values } }, {
    rows: full, now: NOW, locale: 'en', rooms: [{ id: 'mode_owl', label: 'Owl questions' }], collections: [{ id: 'c1', label: 'Q2' }, { id: 'c2', label: 'Rail' }],
  }).filter
  const word = (value) => ({ kind: 'word', value, text: value })
  const ctx = { models: [{ id: 'claude-opus-4', name: 'Opus' }], sources: [{ id: 'wikipedia', name: 'Wikipedia' }] }
  const shown = (view) => cardsShown(cards, view, { rows: full, ctx }).map((c) => c.num ?? c.kind)

  it('reads a card by its own row: tags, room, collections, where it came from, and when it was made', () => {
    expect(shown({})).toEqual([210, 211, 212, 215, 'message'])
    expect(shown({ filters: [filter('tag', [word('essay')])] })).toEqual([210, 212, 215])
    expect(shown({ filters: [filter('tag', [word('essay')], true)] })).toEqual([211, 'message'])
    expect(shown({ filters: [filter('in', [{ kind: 'text', value: 'Owl questions', text: '"Owl questions"' }])] })).toEqual([210, 211])
    expect(shown({ filters: [filter('in', [word('rail')])] })).toEqual([211])
    expect(shown({ filters: [filter('from', [{ kind: 'address', num: 204, text: '204' }])] })).toEqual([212, 'message'])
    expect(shown({ filters: [filter('since', [word('2026-10-22')])] })).toEqual([212, 215, 'message'])
    expect(shown({ filters: [filter('until', [word('2026-10-21')])] })).toEqual([210, 211])
  })

  it('reads who answered, the cost and what is held from the chat a card sits in', () => {
    expect(shown({ filters: [filter('model', [word('opus')])] })).toEqual([210, 211])
    expect(shown({ filters: [filter('model', [word('wikipedia')])] })).toEqual([212, 'message'])
    expect(shown({ filters: [filter('cost', [word('>0.10')])] })).toEqual([210, 211])
    expect(cardsCostUnknown(cards, { filters: [filter('cost', [word('>0.10')])] }, { rows: full, ctx })).toBe(2)
    expect(shown({ filters: [filter('has', [word('quote')])] })).toEqual([212, 'message'])
  })

  it('narrows with the tab and the search too, and every filter must hold', () => {
    expect(shown({ tab: 'note', filters: [filter('tag', [word('essay')])] })).toEqual([210, 215])
    expect(shown({ search: 'quote', filters: [filter('tag', [word('essay')])] })).toEqual([212])
    expect(shown({ filters: [filter('tag', [word('essay')]), filter('model', [word('opus')])] })).toEqual([210])
    // A tab with no cards shows All, as the board does.
    expect(shown({ tab: 'edit' })).toEqual([210, 211, 212, 215, 'message'])
  })
})

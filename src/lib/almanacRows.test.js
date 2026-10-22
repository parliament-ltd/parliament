import { describe, it, expect } from 'vitest'
import { toRows, sortRows } from './almanacRows'

const chat = (num, extra = {}) => ({ id: `c${num}`, num, title: `Chat ${num}`, room: 'mode_writing', docketId: `d${num - 1}`, branch: 'a', createdAt: '2026-10-20T10:00:00Z', updatedAt: '2026-10-20T10:00:00Z', ...extra })
const docket = (num, branches, extra = {}) => ({ id: `d${num}`, num, title: `Docket ${num}`, branches: branches.map((letter) => ({ letter })), order: branches, createdAt: '2026-10-20T09:00:00Z', updatedAt: '2026-10-21T09:00:00Z', ...extra })

describe('the Almanac rows (stage 5, piece 3)', () => {
  it('lists every numbered chat with its room, summary and tags', () => {
    const [row] = toRows({
      chats: [chat(204, { aiSummary: 'Owls in the genus Tyto', tags: ['owls'], pinned: true })],
      rooms: { mode_writing: { template: 'writing-studio' } },
    })
    expect(row).toMatchObject({ kind: 'chat', num: 204, chatId: 'c204', title: 'Chat 204', summary: 'Owls in the genus Tyto', tags: ['owls'], pinned: true, room: { template: 'writing-studio' } })
  })

  it('tells a room with no name of its own from a chat with no room file', () => {
    const rows = toRows({ chats: [chat(204), chat(206, { room: 'mode_gone' }), chat(208, { room: null })], rooms: { mode_writing: null } })
    expect(rows.map((r) => r.room)).toEqual([{ unnamed: true }, null, null])
  })

  it('shows a docket only once it holds more than one branch (C127), an archived one marked (C143 (c))', () => {
    const chats = [chat(204, { docketId: 'd203' }), chat(206, { docketId: 'd203', branch: 'b' })]
    const rows = toRows({ chats, dockets: [docket(203, ['a', 'b']), docket(205, ['a']), docket(207, ['a', 'b'], { archived: true })] })
    const dockets = rows.filter((r) => r.kind === 'docket')
    expect(dockets.map((d) => [d.num, d.archived])).toEqual([[203, false], [207, true]])
    expect(dockets[0]).toMatchObject({ num: 203, branches: 2, chatId: 'c204', chatNum: 204, store: 'dockets' })
  })

  it('lists notes, terms and quotes with their text, in their chat\'s room', () => {
    const rows = toRows({
      chats: [chat(204)],
      notes: [{ id: 'n1', num: 210, conversationId: 'c204', text: 'Check the range\nmap later', createdAt: '2026-10-21T08:00:00Z' }],
      highlights: [{ id: 'h1', num: 211, conversationId: 'c204', text: 'Tyto', kind: 'term', createdAt: '2026-10-21T08:00:00Z' }],
      quotes: [{ id: 'q1', num: 212, targetConversationId: 'c204', content: 'Barn owls hunt by sound', createdAt: '2026-10-21T08:00:00Z' }],
      rooms: { mode_writing: { own: 'Owl desk' } },
    })
    expect(rows.slice(1).map((r) => [r.kind, r.num, r.title, r.room?.own])).toEqual([
      ['note', 210, 'Check the range', 'Owl desk'],
      ['term', 211, 'Tyto', 'Owl desk'],
      ['quote', 212, 'Barn owls hunt by sound', 'Owl desk'],
    ])
    expect(rows[1].text).toBe('Check the range\nmap later')
  })

  it('carries what the filters read: room, plan, branch, markings, collections, who answered and cost (C132)', () => {
    const facts = new Map([
      ['c204', { models: ['claude-sonnet'], sources: [], usage: [{ model: 'claude-sonnet', input: 1_000_000, output: 0 }], unpriced: 0, words: 'tyto' }],
      ['c206', { models: [], sources: ['wikipedia'], usage: [], unpriced: 0, words: '' }],
    ])
    const rows = toRows({
      chats: [chat(204, { docketId: 'd203', run: 1 }), chat(206, { docketId: 'd203', branch: 'b', run: 1 })],
      dockets: [docket(203, ['a', 'b'])],
      highlights: [{ id: 'h1', num: 211, conversationId: 'c204', text: 'Tyto', kind: 'term', createdAt: '2026-10-21T08:00:00Z' }],
      quotes: [{ id: 'q1', num: 212, targetConversationId: 'c206', content: 'Hunts by sound', createdAt: '2026-10-21T08:00:00Z' }],
      collections: [{ id: 'fav', items: [{ kind: 'message', conversationId: 'c206', messageId: 'm1' }] }],
      rooms: { mode_writing: { own: 'Owl desk' } },
      facts,
      priceOf: (id) => (id === 'claude-sonnet' ? { inputPerMillion: 3, outputPerMillion: 15 } : null),
    })
    const by = (num) => rows.find((r) => r.num === num)
    expect(by(204)).toMatchObject({ roomId: 'mode_writing', docketNum: 203, branch: 'a', run: 1, chatNum: 204, marks: ['term'], models: ['claude-sonnet'], cost: 3, words: 'tyto' })
    expect(by(206)).toMatchObject({ branch: 'b', marks: ['quote'], sources: ['wikipedia'], cost: 0, collections: ['fav'] })
    expect(by(203)).toMatchObject({ kind: 'docket', docketNum: 203, chatNums: [204, 206], marks: ['term', 'quote'], cost: 3, collections: ['fav'] })
    expect(by(211)).toMatchObject({ chatNum: 204, docketNum: 203, branch: 'a', roomId: 'mode_writing' })
  })

  it('knows a plan\'s cost only when every chat in it is known', () => {
    const rows = toRows({ chats: [chat(204, { docketId: 'd203' }), chat(206, { docketId: 'd203', branch: 'b' })], dockets: [docket(203, ['a', 'b'])] })
    expect(rows.find((r) => r.kind === 'docket').cost).toBeNull()
  })

  it('leaves out what has no number yet', () => {
    expect(toRows({ chats: [{ id: 'old', title: 'Before version 6' }] })).toEqual([])
  })

  it('puts pinned rows first, then the most recently active', () => {
    const rows = sortRows([
      { num: 201, pinned: false, activeAt: '2026-10-21T10:00:00Z' },
      { num: 202, pinned: true, activeAt: '2026-10-01T10:00:00Z' },
      { num: 203, pinned: false, activeAt: '2026-10-21T12:00:00Z' },
      { num: 204, pinned: false, activeAt: null },
    ])
    expect(rows.map((r) => r.num)).toEqual([202, 203, 201, 204])
  })
})

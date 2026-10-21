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

  it('shows a docket only once it holds more than one branch (C127)', () => {
    const chats = [chat(204, { docketId: 'd203' }), chat(206, { docketId: 'd203', branch: 'b' })]
    const rows = toRows({ chats, dockets: [docket(203, ['a', 'b']), docket(205, ['a']), docket(207, ['a', 'b'], { archived: true })] })
    const dockets = rows.filter((r) => r.kind === 'docket')
    expect(dockets).toHaveLength(1)
    expect(dockets[0]).toMatchObject({ num: 203, branches: 2, chatId: 'c204', chatNum: 204 })
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

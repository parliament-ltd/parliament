import { describe, it, expect } from 'vitest'
import { spendingOf } from './spending'

// This month's spending in Settings (settings spec §9; stage 10, piece 6; C203).

const chat = (num, cost, extra = {}) => ({ kind: 'chat', num, title: `Chat ${num}`, docketNum: num - 1, run: 1, monthCosts: { '2026-10': cost }, ...extra })

describe('this month, by runs of plans and chats on their own', () => {
  it('counts a plan’s chats in one run as a run, and a chat that is its own plan as a chat', () => {
    const rows = [
      { kind: 'docket', num: 201, title: 'Water tower' },
      chat(202, 0.1, { docketNum: 201, branch: 'a' }),
      chat(206, 0.25, { docketNum: 201, branch: 'b' }),
      chat(210, 0.05, { docketNum: 201, branch: 'a', run: 2 }),
      chat(221, 0.3, { docketNum: 220 }),
      chat(231, null, { docketNum: 230 }),
      chat(241, 0, { docketNum: 240 }),
    ]
    const s = spendingOf(rows, '2026-10')
    expect(s.total).toBeCloseTo(0.7)
    expect(s.unknown).toBe(1)
    expect(s.chats).toBe(1)
    expect(s.runs).toEqual([{ num: 201, run: 1, title: 'Water tower', cost: 0.35 }, { num: 201, run: 2, title: 'Water tower', cost: 0.05 }])
    expect(s.solo).toEqual([{ num: 221, title: 'Chat 221', cost: 0.3 }])
  })

  it('leaves out what was spent in another month', () => {
    expect(spendingOf([chat(202, 1, { monthCosts: { '2026-09': 1 } })], '2026-10')).toMatchObject({ total: 0, chats: 0, runs: [] })
  })
})

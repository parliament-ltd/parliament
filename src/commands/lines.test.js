import { describe, it, expect } from 'vitest'
import { LINES } from './verbs'
import { preview } from '../chrome/preview'
import { shipped, planOpen, SPACE } from '../shell/arrangement'

// The command menu's lines (C287): each plans whole, every command in it,
// on a screen with the boards it names and the numbers it uses.
const rows = [207, 209, 216].map((num) => ({ kind: num === 216 ? 'note' : 'chat', num, id: `r${num}`, chatId: `c${num}`, tags: [], tagsMine: [] }))
const withLibrary = planOpen(shipped(SPACE), 'library').next

describe('lines of several commands', () => {
  it('has three, each with at least three commands', () => {
    expect(LINES.rows).toHaveLength(3)
    for (const r of LINES.rows) expect(r.example.match(/\b[a-z]+:/g).length, r.example).toBeGreaterThanOrEqual(3)
  })

  it('each plans with nothing refused', () => {
    const screens = { records: { rows, view: undefined }, numbered: new Map(rows.map((r) => [r.num, r])), displays: { list: [{ n: 1 }, { n: 2 }] } }
    for (const r of LINES.rows) {
      const board = r.example.startsWith('open:') ? withLibrary : { ...withLibrary, addressed: 'almanac' }
      const p = preview(`>${r.example}`, { mode: 'command', arrangement: board, screens })
      expect(p.answer.state, r.example).toBe('ready')
      expect(Boolean(p.next || p.act), `${r.example}: ${p.says?.message}`).toBe(true)
    }
  })
})

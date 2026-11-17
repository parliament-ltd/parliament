import { describe, it, expect } from 'vitest'
import { boardInSight, besideOf } from './phoneBoards'

describe('the boards on a phone, one above another (17 November)', () => {
  const order = ['room', 'collection', 'almanac']

  it('point the bar at the board most on screen above the bar', () => {
    const at = (top) => [
      { board: 'room', top, bottom: top + 740 },
      { board: 'collection', top: top + 750, bottom: top + 1490 },
      { board: 'almanac', top: top + 1500, bottom: top + 2240 },
    ]
    expect(boardInSight(at(8), 0, 750)).toBe('room')
    expect(boardInSight(at(-500), 0, 750)).toBe('collection')
    expect(boardInSight(at(-1400), 0, 750)).toBe('almanac')
    expect(boardInSight([], 0, 750)).toBeNull()
  })

  it('name the board above and the one below, with none past either end', () => {
    expect(besideOf(order, 'room')).toEqual({ above: null, below: 'collection' })
    expect(besideOf(order, 'collection')).toEqual({ above: 'room', below: 'almanac' })
    expect(besideOf(order, 'almanac')).toEqual({ above: 'collection', below: null })
    // The bar at a board in a window of its own: the first board is below.
    expect(besideOf(order, 'settings')).toEqual({ above: null, below: 'room' })
  })
})

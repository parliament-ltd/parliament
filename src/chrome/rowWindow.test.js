import { describe, it, expect } from 'vitest'
import { rowRange, ROW_GUESS } from './rowWindow'

// Drawing only the rows on screen (stage 6, piece 2; C142).

describe('which rows to draw', () => {
  const tens = (n) => Array.from({ length: n }, () => 10)

  it('draws the rows in view, and leaves space for the rest', () => {
    expect(rowRange(tens(100), 200, 300)).toEqual({ start: 20, end: 30, before: 200, after: 700 })
  })

  it('draws further either side by the overscan', () => {
    expect(rowRange(tens(100), 200, 300, { overscan: 50 })).toEqual({ start: 15, end: 35, before: 150, after: 650 })
  })

  it('keeps the whole height, so the scroll bar stays true', () => {
    const r = rowRange(tens(100), 420, 515)
    const drawn = (r.end - r.start) * 10
    expect(r.before + drawn + r.after).toBe(1000)
  })

  it('guesses the height of rows not drawn yet, and uses what was measured', () => {
    const heights = [80, 80, undefined, undefined]
    expect(rowRange(heights, 0, 100)).toEqual({ start: 0, end: 2, before: 0, after: 2 * ROW_GUESS })
    expect(rowRange(heights, 170, 200, { guess: 40 })).toEqual({ start: 2, end: 3, before: 160, after: 40 })
  })

  it('draws the first rows when the view is above the table, and none when below it', () => {
    expect(rowRange(tens(10), -500, -100)).toEqual({ start: 0, end: 0, before: 0, after: 100 })
    expect(rowRange(tens(10), 400, 900)).toEqual({ start: 10, end: 10, before: 100, after: 0 })
  })

  it('draws a short table whole', () => {
    expect(rowRange(tens(3), 0, 800)).toEqual({ start: 0, end: 3, before: 0, after: 0 })
  })
})

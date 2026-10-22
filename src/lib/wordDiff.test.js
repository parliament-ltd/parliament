import { describe, it, expect } from 'vitest'
import { wordDiff, diffCounts } from './wordDiff'

// compare: (stage 6, piece 7; C145 (i)): word by word, no model call.

const join = (parts, ops) => parts.filter((p) => ops.includes(p.op)).map((p) => p.text).join('')

describe('wordDiff', () => {
  it('keeps what both share, and marks what went and what came', () => {
    const parts = wordDiff('the atmosphere guided part of it', 'the atmosphere, more than the blast, guided part of it')
    expect(join(parts, ['same', 'gone'])).toBe('the atmosphere guided part of it')
    expect(join(parts, ['same', 'added'])).toBe('the atmosphere, more than the blast, guided part of it')
    expect(diffCounts(parts)).toEqual({ gone: 1, added: 5 })
  })

  it('gives back each text whole, spaces and lines as typed', () => {
    const a = 'One  line\nand another'
    const b = 'One line\nand yet another'
    const parts = wordDiff(a, b)
    expect(join(parts, ['same', 'gone'])).toBe(a)
    expect(join(parts, ['same', 'added'])).toBe(b)
  })

  it('handles empty sides and identical texts', () => {
    expect(wordDiff('', 'new words')).toEqual([{ op: 'added', text: 'new words' }])
    expect(wordDiff('old words', '')).toEqual([{ op: 'gone', text: 'old words' }])
    expect(wordDiff('same', 'same')).toEqual([{ op: 'same', text: 'same' }])
    expect(wordDiff(null, undefined)).toEqual([])
  })

  it('shows very long texts whole rather than holding the page', () => {
    const long = 'word '.repeat(5000)
    expect(wordDiff(long, 'short').map((p) => p.op)).toEqual(['gone', 'added'])
  })
})

describe('two unrelated texts', () => {
  it('read as one taken out and one put in, not shuffled together', () => {
    expect(wordDiff('Ibis feed by probing mud.', 'Touch, not sight, finds the food').map((p) => p.op)).toEqual(['gone', 'added'])
  })
})

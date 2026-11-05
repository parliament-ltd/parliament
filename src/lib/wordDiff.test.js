import { describe, it, expect } from 'vitest'
import { wordDiff, diffCounts, sharedShare, wordsFound, tokensOf, _useSegmenter } from './wordDiff'

// compare: (stage 6, piece 7; C145 (i)): word by word, no model call.

const join = (parts, ops) => parts.filter((p) => ops.includes(p.op)).map((p) => p.text).join('')

describe('wordDiff', () => {
  it('keeps what both share, and marks what went and what came', () => {
    const parts = wordDiff('the atmosphere guided part of it', 'the atmosphere, more than the blast, guided part of it')
    expect(join(parts, ['same', 'gone'])).toBe('the atmosphere guided part of it')
    expect(join(parts, ['same', 'added'])).toBe('the atmosphere, more than the blast, guided part of it')
    expect(diffCounts(parts)).toEqual({ gone: 1, added: 5, same: 5 })
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

describe('languages written without spaces (C290)', () => {
  it('splits them into words with the dictionary, keeping each text whole', () => {
    const a = '猫は魚が好きです。'
    const b = '犬は魚が好きです。'
    const parts = wordDiff(a, b)
    expect(join(parts, ['same', 'gone'])).toBe(a)
    expect(join(parts, ['same', 'added'])).toBe(b)
    expect(parts[0]).toEqual({ op: 'gone', text: '猫' })
    expect(parts[1]).toEqual({ op: 'added', text: '犬' })
    expect(diffCounts(parts)).toMatchObject({ gone: 1, added: 1 })
    expect(tokensOf('鸟会飞 birds fly').length).toBeGreaterThan(3)
    expect(wordsFound(a)).toBe(true)
  })

  it('compares runs whole in a browser with no dictionary, and says so', () => {
    _useSegmenter(null)
    try {
      expect(wordDiff('猫は魚が好きです。', '犬は魚が好きです。').map((p) => p.op)).toEqual(['gone', 'added'])
      expect(wordsFound('猫は魚が好きです。')).toBe(false)
      expect(wordsFound('Owls hunt at night')).toBe(true)
    } finally {
      _useSegmenter(undefined)
    }
  })
})

describe('how much two texts share (C290)', () => {
  it('is the share of the longer text kept, so two unrelated answers read low', () => {
    expect(sharedShare(diffCounts(wordDiff('Barn owls hunt at night', 'Barn owls hunt at dusk')))).toBeCloseTo(0.8)
    expect(sharedShare(diffCounts(wordDiff('Ibis feed by probing mud.', 'Touch, not sight, finds the food')))).toBe(0)
    expect(sharedShare({ gone: 0, added: 0, same: 0 })).toBe(1)
  })
})

import { describe, it, expect } from 'vitest'
import { estimateTokens, inputCost, historyChars, describeCost } from './estimate'

describe('the estimate before Enter (C83)', () => {
  it('counts characters over four, rounding up', () => {
    expect(estimateTokens('abcd')).toBe(1)
    expect(estimateTokens('abcde')).toBe(2)
    expect(estimateTokens('ab', 'cd', 'e')).toBe(2)
    expect(estimateTokens('', null, undefined)).toBe(0)
  })

  it('prices tokens at the input price per million', () => {
    expect(inputCost(1_000_000, 3)).toBe(3)
    expect(inputCost(500, 3)).toBeCloseTo(0.0015, 10)
    expect(inputCost(500, null)).toBeNull()
    expect(inputCost(500, Number.NaN)).toBeNull()
  })

  it('counts what goes along: messages with text', () => {
    expect(historyChars([{ content: 'abc' }, { content: '' }, { content: [{ type: 'text' }] }, null])).toBe(3)
    expect(historyChars()).toBe(0)
  })
})

describe('the one request after a first answer (C62)', () => {
  it('prices it at its most, before the answer exists', () => {
    // (500 + 500 + 800) / 4 = 450 tokens in, 200 out, at Haiku's price
    expect(describeCost(10_000, { inputPerMillion: 0.25, outputPerMillion: 1.25 })).toBeCloseTo(450 * 0.25e-6 + 200 * 1.25e-6, 12)
    expect(describeCost(20, { inputPerMillion: 1, outputPerMillion: 1 })).toBeCloseTo((Math.ceil(1320 / 4) + 200) * 1e-6, 12)
    expect(describeCost(20, null)).toBeNull()
  })
})

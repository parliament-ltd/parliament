import { describe, it, expect } from 'vitest'
import { evaluate, format, figuresIn, sumOf, readFigure } from './sums'

// Sums (C303 (c)): worked out exactly, never run as code.
const said = (text, locale = 'en') => format(evaluate(text), locale)

describe('a sum written in the bar', () => {
  it('works out the four operations, brackets, powers and percentages', () => {
    expect(said('48000*2/12')).toEqual({ text: '8,000', exact: true })
    expect(said('(1250+3400)*1.25')).toEqual({ text: '5,812.5', exact: true })
    expect(said('2^10 - 24')).toEqual({ text: '1,000', exact: true })
    expect(said('15% * 200')).toEqual({ text: '30', exact: true })
    expect(said('-3 + 2(4)')).toEqual({ text: '5', exact: true })
    expect(said('48,000.50 × 2 ÷ 4')).toEqual({ text: '24,000.25', exact: true })
  })

  it('is exact with decimals, and says when it rounds', () => {
    expect(said('0.1 + 0.2')).toEqual({ text: '0.3', exact: true })
    expect(said('1/3')).toEqual({ text: '0.3333333333', exact: false })
    expect(said('2/3', 'sv').text).toBe('0,6666666667')
  })

  it('refuses what it cannot read, saying what', () => {
    expect(() => evaluate('1/0')).toThrow(expect.objectContaining({ code: 'divideByZero' }))
    expect(() => evaluate('(1+2')).toThrow(expect.objectContaining({ code: 'bracket' }))
    expect(() => evaluate('alert(1)')).toThrow(expect.objectContaining({ code: 'char' }))
    expect(() => evaluate('2^1000')).toThrow(expect.objectContaining({ code: 'power' }))
    expect(() => evaluate('3 4')).toThrow(expect.objectContaining({ code: 'syntax' }))
  })
})

describe('the figures in a selection', () => {
  it('reads thousands and decimals as the language writes them', () => {
    expect(format(readFigure('31.000,50', ',')).text).toBe('31,000.5')
    expect(format(readFigure('31 000')).text).toBe('31,000')
    expect(format(readFigure('31,5', ',')).text).toBe('31.5')
    expect(format(readFigure('1.5')).text).toBe('1.5')
  })

  it('adds up the figures of a reply, leaving codes such as v2 out', () => {
    const s = sumOf(figuresIn('Staff 31,000, materials 9,500, and outreach 7,500, with v2 of the plan'))
    expect(format(s.sum).text).toBe('48,000')
    expect(format(s.average).text).toBe('16,000')
    expect(s.count).toBe(3)
    expect(sumOf(figuresIn('only 12'))).toBe(null)
  })
})

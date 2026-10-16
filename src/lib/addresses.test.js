import { describe, it, expect } from 'vitest'
import { letterAt, letterIndex, parseAddress, formatAddress, LETTERS, NUMBERED_KINDS } from './addresses'

describe('letters', () => {
  it('are lower case and skip i, l and o', () => {
    expect(LETTERS).toHaveLength(23)
    expect(LETTERS).toBe(LETTERS.toLowerCase())
    expect(LETTERS).not.toMatch(/[ilo]/)
    expect(letterAt(7)).toBe('h')
    expect(letterAt(8)).toBe('j')
    expect(letterAt(9)).toBe('k')
    expect(letterAt(10)).toBe('m')
    expect(letterAt(12)).toBe('p')
  })

  it('double past z with no limit', () => {
    expect(letterAt(22)).toBe('z')
    expect(letterAt(23)).toBe('aa')
    expect(letterAt(24)).toBe('ab')
    expect(letterAt(23 + 23)).toBe('ba')
    expect(letterAt(23 + 23 * 23)).toBe('aaa')
  })

  it('round-trip, and read capitals too', () => {
    for (let i = 0; i < 2000; i++) expect(letterIndex(letterAt(i))).toBe(i)
    expect(letterIndex('AB')).toBe(24)
  })

  it('reject i, l, o and non-letters', () => {
    expect(letterIndex('i')).toBe(-1)
    expect(letterIndex('l')).toBe(-1)
    expect(letterIndex('AO')).toBe(-1)
    expect(letterIndex('')).toBe(-1)
    expect(letterIndex('a1')).toBe(-1)
  })
})

describe('addresses', () => {
  it('read a docket and a branch, in either case', () => {
    expect(parseAddress('201')).toEqual({ num: 201, letter: null })
    expect(parseAddress('201b')).toEqual({ num: 201, letter: 'b' })
    expect(parseAddress('201B')).toEqual({ num: 201, letter: 'b' })
    expect(parseAddress('201AA')).toEqual({ num: 201, letter: 'aa' })
    expect(parseAddress('12045c')).toEqual({ num: 12045, letter: 'c' })
  })

  it('stop at two levels and never take a run', () => {
    expect(parseAddress('201b2')).toBeNull()
    expect(parseAddress('201/3')).toBeNull()
    expect(parseAddress('201#3')).toBeNull()
  })

  it('refuse i, l, o, short numbers and numbers below the first', () => {
    expect(parseAddress('201i')).toBeNull()
    expect(parseAddress('201l')).toBeNull()
    expect(parseAddress('201O')).toBeNull()
    expect(parseAddress('3')).toBeNull()
    expect(parseAddress('200')).toBeNull()
  })

  it('format in lower case', () => {
    expect(formatAddress({ num: 201, letter: 'b' })).toBe('201b')
    expect(formatAddress({ num: 201, letter: 'B' })).toBe('201b')
    expect(formatAddress({ num: 207 })).toBe('207')
  })
})

describe('numbered kinds', () => {
  it('include the markings and the editing records', () => {
    for (const k of ['chat', 'note', 'docket', 'highlight', 'term', 'quote', 'edit', 'ask', 'suggestion']) {
      expect(NUMBERED_KINDS).toContain(k)
    }
  })
})

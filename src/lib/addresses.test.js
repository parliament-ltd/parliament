import { describe, it, expect } from 'vitest'
import { letterAt, letterIndex, parseAddress, formatAddress, LETTERS } from './addresses'

describe('letters', () => {
  it('skips I and O', () => {
    expect(LETTERS).toHaveLength(24)
    expect(LETTERS).not.toMatch(/[IO]/)
    expect(letterAt(7)).toBe('H')
    expect(letterAt(8)).toBe('J')
    expect(letterAt(12)).toBe('N')
    expect(letterAt(13)).toBe('P')
  })

  it('doubles past Z with no limit', () => {
    expect(letterAt(23)).toBe('Z')
    expect(letterAt(24)).toBe('AA')
    expect(letterAt(25)).toBe('AB')
    expect(letterAt(24 + 24)).toBe('BA')
    expect(letterAt(24 + 24 * 24)).toBe('AAA')
  })

  it('round-trips', () => {
    for (let i = 0; i < 2000; i++) expect(letterIndex(letterAt(i))).toBe(i)
  })

  it('rejects I, O and non-letters', () => {
    expect(letterIndex('I')).toBe(-1)
    expect(letterIndex('AO')).toBe(-1)
    expect(letterIndex('')).toBe(-1)
    expect(letterIndex('A1')).toBe(-1)
  })
})

describe('addresses', () => {
  it('reads a docket and a branch', () => {
    expect(parseAddress('201')).toEqual({ num: 201, letter: null })
    expect(parseAddress('201b')).toEqual({ num: 201, letter: 'B' })
    expect(parseAddress('201AA')).toEqual({ num: 201, letter: 'AA' })
    expect(parseAddress('12045C')).toEqual({ num: 12045, letter: 'C' })
  })

  it('stops at two levels and never takes a run', () => {
    expect(parseAddress('201B2')).toBeNull()
    expect(parseAddress('201/3')).toBeNull()
    expect(parseAddress('201#3')).toBeNull()
  })

  it('refuses I, O, short numbers and numbers below the first', () => {
    expect(parseAddress('201I')).toBeNull()
    expect(parseAddress('201O')).toBeNull()
    expect(parseAddress('3')).toBeNull()
    expect(parseAddress('200')).toBeNull()
  })

  it('formats', () => {
    expect(formatAddress({ num: 201, letter: 'B' })).toBe('201B')
    expect(formatAddress({ num: 207 })).toBe('207')
  })
})

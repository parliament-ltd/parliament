import { describe, it, expect } from 'vitest'
import { lineTitle, titlesIn, isTitleList, MOST_TITLES } from './linkedTitles'

const linked = ['List of Nintendo arcade video games', 'List of Nintendo home video games', 'Nintendo Co., Ltd.', 'Kyoto']

describe('which lines are titles of pages an answer links to (C287)', () => {
  it('finds a line that is a title, word for word, its spaces at either end aside', () => {
    expect(lineTitle('List of Nintendo arcade video games', linked)).toBe('List of Nintendo arcade video games')
    expect(lineTitle('  List of Nintendo home video games \t', linked)).toBe('List of Nintendo home video games')
    expect(lineTitle('List of Nintendo arcade video games', new Set(linked))).toBe('List of Nintendo arcade video games')
  })

  it('accepts a line with a full stop at its end, and a title that ends in one as it is', () => {
    expect(lineTitle('Kyoto.', linked)).toBe('Kyoto')
    expect(lineTitle('Nintendo Co., Ltd.', linked)).toBe('Nintendo Co., Ltd.')
    expect(lineTitle('Kyoto!', linked)).toBeNull()
  })

  it('never finds a title inside a longer line, nor in other letters', () => {
    expect(lineTitle('Nintendo was founded in Kyoto', linked)).toBeNull()
    expect(lineTitle('See List of Nintendo arcade video games', linked)).toBeNull()
    expect(lineTitle('list of nintendo arcade video games', linked)).toBeNull()
    expect(lineTitle('Kyoto, Japan', linked)).toBeNull()
  })

  it('finds nothing in an empty line, or with no titles', () => {
    expect(lineTitle('', linked)).toBeNull()
    expect(lineTitle('   ', linked)).toBeNull()
    expect(lineTitle('.', ['.', ''])).toBe('.')
    expect(lineTitle('Kyoto', [])).toBeNull()
    expect(lineTitle('Kyoto', null)).toBeNull()
    expect(lineTitle(null, linked)).toBeNull()
  })
})

describe('the titles a note keeps: those that are lines of its text', () => {
  const text = 'Nintendo Co., Ltd. is a Japanese company, in Kyoto.\n\nList of Nintendo arcade video games\nList of Nintendo home video games.\nList of Nintendo arcade video games\nKyoto'

  it('keeps each title that is a line, once, in the order the lines come', () => {
    expect(titlesIn(text, linked)).toEqual(['List of Nintendo arcade video games', 'List of Nintendo home video games', 'Kyoto'])
  })

  it('keeps nothing when no line is a title, or there are no titles', () => {
    expect(titlesIn('Nintendo is a company.', linked)).toEqual([])
    expect(titlesIn(text, [])).toEqual([])
    expect(titlesIn(text, undefined)).toEqual([])
    expect(titlesIn(undefined, linked)).toEqual([])
  })

  it('ignores a title that is not a short string', () => {
    expect(titlesIn('Kyoto\n7', [7, { t: 'Kyoto' }, 'x'.repeat(301), 'Kyoto'])).toEqual(['Kyoto'])
  })

  it('keeps at most as many as a note may hold', () => {
    const many = Array.from({ length: MOST_TITLES + 20 }, (_, i) => `Page ${i}`)
    const out = titlesIn(many.join('\n'), many)
    expect(out).toHaveLength(MOST_TITLES)
    expect(isTitleList(out)).toBe(true)
  })
})

describe('what a stored note may hold', () => {
  it('is a list of short strings, not too many', () => {
    expect(isTitleList([])).toBe(true)
    expect(isTitleList(linked)).toBe(true)
    expect(isTitleList('Kyoto')).toBe(false)
    expect(isTitleList([''])).toBe(false)
    expect(isTitleList([7])).toBe(false)
    expect(isTitleList(Array(MOST_TITLES + 1).fill('x'))).toBe(false)
  })
})

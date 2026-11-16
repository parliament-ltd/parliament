import { describe, it, expect } from 'vitest'
import { shardOf, splitShardOf, pieceFor, wordOf, formsOf, distance, nearest, entryView } from './words'

// The Dictionary board's words (C303 (b)): looked up in pieces, by first letters.
describe('the word lists', () => {
  it('finds the piece a word is in, split where a piece was too large', () => {
    expect(shardOf('Reluctant')).toBe('re')
    expect(shardOf('a')).toBe('a_')
    expect(shardOf('3d')).toBe('0')
    expect(splitShardOf('constructor')).toBe('con')
    expect(pieceFor('constructor', ['co', 'con'])).toBe('con')
    expect(pieceFor('cow', ['co', 'con'])).toBe('co')
    expect(pieceFor('zzz', ['co'])).toBe(null)
  })

  it('reads a word as looked up, and the forms it may be listed under', () => {
    expect(wordOf('  “Reluctant,” ')).toBe('reluctant')
    expect(wordOf('x'.repeat(61))).toBe('')
    expect(formsOf('figures')).toContain('figure')
    expect(formsOf('running')).toContain('run')
    expect(formsOf('happier')).toContain('happy')
  })

  it('suggests the nearest words, a swap of two letters counting as one slip', () => {
    expect(distance('recieve', 'receive')).toBe(1)
    expect(nearest('recieve', ['recede', 'receive', 'recipe', 'relieve'])[0]).toBe('receive')
    expect(nearest('cat', ['cat'])).toEqual([])
  })

  it('groups meanings by kind for the board', () => {
    const v = entryView('reluctant', { m: [['a', 'not eager', 'a reluctant smile'], ['n', 'a noun sense']], s: ['loath'], o: ['willing'] })
    expect(v).toEqual({ word: 'reluctant', groups: [{ kind: 'adjective', meanings: [{ definition: 'not eager', example: 'a reluctant smile' }] }, { kind: 'noun', meanings: [{ definition: 'a noun sense', example: null }] }], same: ['loath'], opposite: ['willing'] })
  })
})

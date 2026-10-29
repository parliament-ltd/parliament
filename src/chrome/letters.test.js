import { describe, it, expect } from 'vitest'
import { LETTERS, letterOf, newestLetter, cleanRead, markRead } from './letters'
import { COPY } from '../copy'

describe('the letters (C279 (c))', () => {
  it('are numbered from one, and letter one is the welcome page\'s letter, word for word (C265)', () => {
    expect(LETTERS.map((l) => l.n)).toEqual(LETTERS.map((_, i) => i + 1))
    const one = letterOf(1)
    expect(one.paragraphs.map((p) => p.id)).toEqual(['welcome.letter.1', 'welcome.letter.2', 'welcome.letter.3', 'welcome.letter.4', 'welcome.letter.5'])
    expect(one.signature).toBe(COPY.welcome.signature)
    expect(newestLetter()).toBe(LETTERS[LETTERS.length - 1])
    expect(letterOf(99)).toBeNull()
  })

  it('keep which were read safely, and only once each', () => {
    expect(cleanRead(null)).toEqual([])
    expect(cleanRead([1, 1, 'x', 99])).toEqual([1])
    const read = markRead([], 1)
    expect(read).toEqual([1])
    expect(markRead(read, 1)).toBe(read)
    expect(markRead(read, 99)).toBe(read)
  })
})

import { describe, it, expect } from 'vitest'
import { nameFromChat, titleFromPrompt, fieldsFromDescription } from './chatTitles'

describe('a title from the first words of a prompt', () => {
  it('keeps a short prompt whole', () => {
    expect(titleFromPrompt('  What is a barn   owl? ')).toBe('What is a barn owl?')
  })

  it('takes the first eight words, and says it was cut short', () => {
    expect(titleFromPrompt('one two three four five six seven eight nine ten')).toBe('one two three four five six seven eight…')
  })

  it('stops before sixty characters, at a word', () => {
    const t = titleFromPrompt('Photosynthesis transforms electromagnetic radiation into chemically stored energy reliably')
    expect(Array.from(t.replace('…', '')).length).toBeLessThanOrEqual(60)
    expect(t.endsWith('…')).toBe(true)
    expect(t).not.toContain('reliably')
  })

  it('cuts a language written without spaces by characters, never half of one', () => {
    const t = titleFromPrompt('フクロウ'.repeat(20))
    expect(Array.from(t)).toHaveLength(61)
    expect(t.endsWith('…')).toBe(true)
    expect(titleFromPrompt('😀'.repeat(70)).replace('…', '')).toBe('😀'.repeat(60))
  })

  it('gives nothing for nothing', () => {
    expect(titleFromPrompt('   ')).toBe('')
    expect(titleFromPrompt(undefined)).toBe('')
  })
})

describe('a name from a chat', () => {
  it('treats the words the old code stored as no title', () => {
    expect(nameFromChat({ title: 'New Conversation' })).toBeNull()
    expect(nameFromChat({ title: '' })).toBeNull()
    expect(nameFromChat({ title: 'Barn owls' })).toBe('Barn owls')
  })
})

describe('a chat from its description (C62)', () => {
  it('takes only what came back', () => {
    expect(fieldsFromDescription({ title: 'Barn Owls', summary: 'Discussed owls', tags: ['birds'] })).toEqual({ title: 'Barn Owls', aiSummary: 'Discussed owls', tags: ['birds'] })
    expect(fieldsFromDescription({ summary: 'Discussed owls' })).toEqual({ aiSummary: 'Discussed owls' })
    expect(fieldsFromDescription({ title: '', tags: [] })).toEqual({})
    expect(fieldsFromDescription(null)).toEqual({})
  })
})

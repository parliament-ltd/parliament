import { describe, it, expect } from 'vitest'
import { forModel, fromSource, cutReason } from './sendHistory'

describe('what a model receives of a chat', () => {
  it('sends turns as they are', () => {
    expect(forModel([
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello' },
      { role: 'user', content: 'More?' },
    ])).toEqual([
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello' },
      { role: 'user', content: 'More?' },
    ])
  })

  it('leaves answers from a source out, and keeps the person\'s own prompts (C115)', () => {
    const turns = forModel([
      { role: 'user', content: 'What is a barn owl?' },
      { role: 'assistant', content: 'The barn owl is…', source: { id: 'wikipedia', name: 'Wikipedia', title: 'Barn owl' } },
      { role: 'user', content: 'How big are they?' },
    ])
    expect(turns).toEqual([{ role: 'user', content: 'What is a barn owl?\n\nHow big are they?' }])
    expect(JSON.stringify(turns)).not.toContain('The barn owl is')
  })

  it('leaves out empty messages and what a source did not find', () => {
    expect(forModel([
      { role: 'user', content: 'qxz' },
      { role: 'assistant', content: '', source: { id: 'wikipedia', name: 'Wikipedia', found: false } },
      { role: 'assistant', content: '' },
      null,
      { role: 'user', content: 'Again' },
    ])).toEqual([{ role: 'user', content: 'qxz\n\nAgain' }])
  })

  it('knows an answer from a source', () => {
    expect(fromSource({ source: { id: 'wikipedia' } })).toBe(true)
    expect(fromSource({ content: 'x' })).toBe(false)
    expect(fromSource(null)).toBe(false)
  })
})

describe('a reply cut off', () => {
  it('by the length limit, by an error, or not at all', () => {
    expect(cutReason('max_tokens')).toBe('limit')
    expect(cutReason(null)).toBe('error')
    expect(cutReason(undefined)).toBe('error')
    expect(cutReason('end_turn')).toBeNull()
    expect(cutReason('stop_sequence')).toBeNull()
  })
})

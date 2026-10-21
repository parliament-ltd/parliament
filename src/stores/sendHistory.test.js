import { describe, it, expect } from 'vitest'
import { forModel, cutReason } from './sendHistory'

const introduce = (s) => `[From ${s.name}: ${s.title}]`

describe('what a model receives of a chat', () => {
  it('sends turns as they are', () => {
    expect(forModel([
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello' },
      { role: 'user', content: 'More?' },
    ], introduce)).toEqual([
      { role: 'user', content: 'Hi' },
      { role: 'assistant', content: 'Hello' },
      { role: 'user', content: 'More?' },
    ])
  })

  it('sends an answer from a source as quoted context on the person\'s side, never as the model\'s words', () => {
    const turns = forModel([
      { role: 'user', content: 'What is a barn owl?' },
      { role: 'assistant', content: 'The barn owl is…', source: { id: 'wikipedia', name: 'Wikipedia', title: 'Barn owl' } },
      { role: 'user', content: 'How big are they?' },
    ], introduce)
    expect(turns).toEqual([
      { role: 'user', content: 'What is a barn owl?\n\n[From Wikipedia: Barn owl]\n\nThe barn owl is…\n\nHow big are they?' },
    ])
  })

  it('leaves out empty messages and what a source did not find', () => {
    expect(forModel([
      { role: 'user', content: 'qxz' },
      { role: 'assistant', content: '', source: { id: 'wikipedia', name: 'Wikipedia', found: false } },
      { role: 'assistant', content: '' },
      null,
      { role: 'user', content: 'Again' },
    ], introduce)).toEqual([{ role: 'user', content: 'qxz\n\nAgain' }])
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

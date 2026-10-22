import { describe, it, expect } from 'vitest'
import { startStream, appendStream, appendThinking, getStream, thoughtOf, endStream, streamThinking, streamAnswering } from './chatStore'

// A reply's thinking, kept beside its text (C165).
describe('thinking in the stream store', () => {
  it('keeps the thinking apart from the text, and when the answer began', () => {
    startStream('t1', { messageId: 'm1', at: 1000 })
    appendThinking('t1', 'First, ')
    appendThinking('t1', 'owls.')
    expect(streamThinking('t1')).toBe('First, owls.')
    expect(streamAnswering('t1')).toBe(false)
    appendStream('t1', 'An owl.')
    expect(streamAnswering('t1')).toBe(true)
    const s = getStream('t1')
    expect(s.text).toBe('An owl.')
    const kept = thoughtOf(s)
    expect(kept.thinking).toBe('First, owls.')
    expect(kept.thinkingMs).toBeGreaterThanOrEqual(0)
    endStream('t1')
  })
  it('keeps nothing for a reply that did not think', () => {
    startStream('t2', { messageId: 'm2' })
    appendStream('t2', 'Plain.')
    expect(thoughtOf(getStream('t2'))).toEqual({})
    endStream('t2')
  })
})

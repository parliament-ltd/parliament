import { describe, it, expect } from 'vitest'
import { sanitizeSignal, openBus } from './bus'

describe('sanitizeSignal', () => {
  it('keeps only allowed fields for the type', () => {
    expect(sanitizeSignal({ type: 'changed', kind: 'chat', num: 207, content: 'secret prompt', apiKey: 'sk-ant-x' }))
      .toEqual({ type: 'changed', kind: 'chat', num: 207 })
  })

  it('carries what happened to a record, and nothing of its content', () => {
    expect(sanitizeSignal({ type: 'changed', kind: 'note', op: 'created', id: 'n1', num: 226, text: 'my note' }))
      .toEqual({ type: 'changed', kind: 'note', op: 'created', id: 'n1', num: 226 })
  })

  it('drops wrongly typed and oversized values', () => {
    expect(sanitizeSignal({ type: 'changed', num: '207', id: 'x'.repeat(200) })).toEqual({ type: 'changed' })
  })

  it('refuses unknown types', () => {
    expect(sanitizeSignal({ type: 'transcript', text: 'hello' })).toBeNull()
    expect(sanitizeSignal(null)).toBeNull()
  })

  it('carries a stop scope', () => {
    expect(sanitizeSignal({ type: 'stop', scope: 'branch', num: 201, letter: 'B' }))
      .toEqual({ type: 'stop', scope: 'branch', num: 201, letter: 'B' })
  })
})

describe('openBus', () => {
  it('delivers sanitized signals to other tabs and not to itself', async () => {
    const name = `test-${Math.random()}`
    const a = openBus({ channelName: name, tabId: 'a' })
    const b = openBus({ channelName: name, tabId: 'b' })
    const gotA = []
    const gotB = []
    a.on((s) => gotA.push(s))
    b.on((s) => gotB.push(s))
    a.post({ type: 'changed', kind: 'docket', num: 201, text: 'must not travel' })
    await new Promise((r) => setTimeout(r, 30))
    expect(gotB).toEqual([{ type: 'changed', from: 'a', kind: 'docket', num: 201 }])
    expect(gotA).toEqual([])
    a.close()
    b.close()
  })
})

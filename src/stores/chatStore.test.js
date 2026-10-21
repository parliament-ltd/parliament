import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as S from './chatStore'

beforeEach(() => {
  S._reset()
  vi.useRealTimers()
})

describe('a stream per conversation', () => {
  it('keeps each conversation apart, so two can stream at once', () => {
    S.startStream('a', { messageId: 'm1' })
    S.startStream('b', { messageId: 'm2' })
    S.appendStream('a', 'Hello')
    S.appendStream('b', 'Bonjour')
    expect(S.streamText('a')).toBe('Hello')
    expect(S.streamText('b')).toBe('Bonjour')
    expect(S.streamingIds().sort()).toEqual(['a', 'b'])
    expect(S.endStream('a')).toMatchObject({ messageId: 'm1', text: 'Hello' })
    expect(S.isStreaming('a')).toBe(false)
    expect(S.isStreaming('b')).toBe(true)
  })

  it('tells listeners of one conversation only, and text at most every 40ms', () => {
    vi.useFakeTimers()
    const heardA = vi.fn()
    const heardB = vi.fn()
    S.subscribe('stream:a', heardA)
    S.subscribe('stream:b', heardB)
    S.startStream('a', { messageId: 'm1' })
    heardA.mockClear()
    S.appendStream('a', 'x')
    S.appendStream('a', 'y')
    S.appendStream('a', 'z')
    expect(heardA).not.toHaveBeenCalled()
    vi.advanceTimersByTime(40)
    expect(heardA).toHaveBeenCalledTimes(1)
    expect(heardB).not.toHaveBeenCalled()
  })

  it('tells at once when a stream starts and ends', () => {
    const status = vi.fn()
    S.subscribe('status:a', status)
    S.startStream('a', { messageId: 'm1' })
    S.endStream('a')
    expect(status).toHaveBeenCalledTimes(2)
  })

  it('stops a stream through its controller and keeps the reason until it ends', () => {
    const controller = new AbortController()
    S.startStream('a', { messageId: 'm1', controller })
    expect(S.stopStream('a', 'left')).toBe(true)
    expect(controller.signal.aborted).toBe(true)
    S.stopStream('a', 'stopped')
    expect(S.getStream('a').stopReason).toBe('left')
    expect(S.endStream('a').stopReason).toBe('left')
    expect(S.stopStream('a')).toBe(false)
  })

  it('stops listening when asked', () => {
    const heard = vi.fn()
    const stop = S.subscribe('status:a', heard)
    stop()
    S.startStream('a', { messageId: 'm1' })
    expect(heard).not.toHaveBeenCalled()
  })
})

describe('notices of replies stopped on leaving (C109)', () => {
  it('are kept until dismissed, and told to listeners', () => {
    const heard = vi.fn()
    S.subscribe('notices', heard)
    S.addNotice({ conversationId: 'a', messageId: 'm1' })
    expect(S.getNotices()).toMatchObject([{ conversationId: 'a' }])
    const before = S.getNotices()
    S.dismissNotice('a')
    expect(S.getNotices()).toEqual([])
    expect(S.getNotices()).not.toBe(before)
    expect(heard).toHaveBeenCalledTimes(2)
  })
})

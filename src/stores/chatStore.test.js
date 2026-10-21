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

describe('messages, by chat (stage 4)', () => {
  const m = (id, content = id) => ({ id, content })

  it('keeps each chat apart, and tells only that chat', () => {
    const heardA = vi.fn()
    S.subscribe('messages:a', heardA)
    S.setMessages('a', [m('1')])
    S.setMessages('b', [m('2')])
    expect(S.getMessages('a').map((x) => x.id)).toEqual(['1'])
    expect(S.getMessages('b').map((x) => x.id)).toEqual(['2'])
    expect(heardA).toHaveBeenCalledTimes(1)
  })

  it('changes a chat only while it is held, and lets it go', () => {
    S.updateMessages('a', (list) => [...list, m('x')])
    expect(S.hasMessages('a')).toBe(false)
    S.setMessages('a', [m('1')])
    S.updateMessages('a', (list) => [...list, m('2')])
    expect(S.getMessages('a').map((x) => x.id)).toEqual(['1', '2'])
    S.releaseMessages('a')
    expect(S.getMessages('a')).toEqual([])
    expect(S.getMessages('a')).toBe(S.getMessages('nowhere')) // one empty list, so readers do not redraw
  })

  it('sends neither hidden messages nor empty ones, and shows them again when asked', () => {
    S.setMessages('a', [m('1'), m('2'), m('3', '')])
    S.hideMessage('a', '2')
    expect(S.sendable('a').map((x) => x.id)).toEqual(['1'])
    S.showAllMessages('a')
    expect(S.sendable('a').map((x) => x.id)).toEqual(['1', '2'])
    S.hideMessage('a', '1')
    S.showMessage('a', '1')
    expect(S.hiddenIds('a').size).toBe(0)
  })

  it('a delete leaves at once, happens after its time even if the chat was left, and can be undone before', async () => {
    vi.useFakeTimers()
    const remove = vi.fn(async () => {})
    S.setMessages('a', [m('1'), m('2'), m('3')])
    S.scheduleDelete('a', '2', { remove, ms: 20_000 })
    S.scheduleDelete('a', '3', { remove, ms: 20_000 })
    expect(S.sendable('a').map((x) => x.id)).toEqual(['1'])
    expect(S.pendingDeletes('a').map((p) => p.messageId)).toEqual(['2', '3'])
    expect(S.undoDelete('a', '3')).toBe(true)
    S.releaseMessages('a') // the chat was left
    await vi.advanceTimersByTimeAsync(20_000)
    expect(remove).toHaveBeenCalledTimes(1)
    expect(remove).toHaveBeenCalledWith('2')
    expect(S.pendingDeletes('a')).toEqual([])
    expect(S.undoDelete('a', '2')).toBe(false)
  })

  it('drops the deleted message from a chat still open', async () => {
    vi.useFakeTimers()
    S.setMessages('a', [m('1'), m('2')])
    S.scheduleDelete('a', '2', { remove: async () => {}, ms: 10 })
    await vi.advanceTimersByTimeAsync(10)
    expect(S.getMessages('a').map((x) => x.id)).toEqual(['1'])
  })
})

describe('how a reply ended, for the ink pot (C114)', () => {
  it('arrived, stopped, or broke off', () => {
    expect(S.streamEnd('a')).toBeNull()
    S.startStream('a', { messageId: 'm1' })
    S.endStream('a')
    expect(S.streamEnd('a').how).toBe('done')
    S.startStream('a', { messageId: 'm2' })
    S.stopStream('a', 'stopped')
    S.endStream('a')
    expect(S.streamEnd('a').how).toBe('stopped')
    S.startStream('a', { messageId: 'm3' })
    S.noteCut('a')
    S.endStream('a')
    expect(S.streamEnd('a').how).toBe('stopped')
  })

  it('tells the status topic, so the pot hears it at once', () => {
    const heard = vi.fn()
    S.subscribe('status:a', heard)
    S.startStream('a', { messageId: 'm1' })
    S.endStream('a')
    expect(heard).toHaveBeenCalledTimes(2)
  })
})

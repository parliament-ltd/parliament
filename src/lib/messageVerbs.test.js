import { describe, it, expect } from 'vitest'
import { openingOf, messageInHand, planQuoteMessage, planCopyMessage, planDeleteMessage, planNoteMessage, planTagMessage } from './messageVerbs'
import { preview } from '../chrome/preview'
import { shipped, planRoom, SPACE } from '../shell/arrangement'

const chat = [
  { id: 'p1', role: 'user', content: 'Where do barn owls live?' },
  { id: 'r1', role: 'assistant', content: 'Barn owls live on every continent except Antarctica, in open country.' },
  { id: 'p2', role: 'user', content: 'And what do they eat?' },
  { id: 'r2', role: 'assistant', content: 'Mostly voles and mice.' },
]
const screensWith = (held) => ({
  hand: (part) => {
    const f = messageInHand(chat, held, part)
    return { room: true, chatId: 'c1', message: f?.message ?? null, inHand: f?.inHand ?? false }
  },
  records: { rows: [{ kind: 'chat', num: 207, chatId: 'c207' }] },
})

describe('the message in hand (C286 (b))', () => {
  it('is the one the caret was last in, or the other card of its pair', () => {
    expect(messageInHand(chat, 'r1', 'reply')).toEqual({ message: chat[1], inHand: true })
    expect(messageInHand(chat, 'p1', 'reply')).toEqual({ message: chat[1], inHand: true })
    expect(messageInHand(chat, 'r2', 'prompt')).toEqual({ message: chat[2], inHand: true })
  })

  it('is the last of its kind with nothing in hand, or with the one in hand gone', () => {
    expect(messageInHand(chat, null, 'reply')).toEqual({ message: chat[3], inHand: false })
    expect(messageInHand(chat, 'gone', 'prompt')).toEqual({ message: chat[2], inHand: false })
    expect(messageInHand([], null, 'reply')).toBeNull()
  })

  it('leaves out a reply still arriving', () => {
    const arriving = [...chat, { id: 'p3', role: 'user', content: 'Why?' }, { id: 'r3', role: 'assistant', content: '', incomplete: true }]
    expect(messageInHand(arriving, null, 'reply').message.id).toBe('r2')
  })

  it('quotes the words it begins with, eight at most', () => {
    expect(openingOf('Barn owls live on every continent except Antarctica, in open country.')).toBe('Barn owls live on every continent except Antarctica,…')
    expect(openingOf('## Mostly *voles*')).toBe('Mostly voles')
  })
})

describe('planning one message by command', () => {
  const room = planRoom(shipped(SPACE), 'c1').next
  const step = (line) => preview(line, { mode: 'command', arrangement: room, screens: screensWith('r1') })

  it('quote:reply keeps a quote beside its chat, quote:reply 207 in another', () => {
    const own = planQuoteMessage({ match: { values: [{ kind: 'word', value: 'reply' }] } }, screensWith('r1'))
    expect(own.act).toMatchObject({ kind: 'quoteMessage', chatId: 'c1', messageId: 'r1', into: null, tag: null })
    expect(own.says.message).toBe('quoteMessage')
    const into = planQuoteMessage({ match: { values: [{ kind: 'word', value: 'reply' }, { kind: 'address', num: 207, letter: null, text: '207' }] } }, screensWith('r1'))
    expect(into.act).toMatchObject({ into: 'c207', intoNum: '207' })
    const none = planQuoteMessage({ match: { values: [{ kind: 'word', value: 'reply' }, { kind: 'address', num: 299, letter: null, text: '299' }] } }, screensWith('r1'))
    expect(none.says.message).toBe('quoteIntoWhich')
  })

  it('says when the last one goes, since nothing is in hand', () => {
    const p = planCopyMessage({ match: { values: [{ kind: 'word', value: 'prompt' }] } }, screensWith(null))
    expect(p.act).toMatchObject({ kind: 'copyMessage', messageId: 'p2', part: 'prompt' })
    expect(p.says.also).toEqual([{ message: 'messageLast', values: { part: 'prompt' } }])
  })

  it('delete:reply asks for a second Enter, with its own words', () => {
    const p = planDeleteMessage({ match: { values: [{ kind: 'word', value: 'reply' }] } }, screensWith('r2'))
    expect(p.act).toMatchObject({ kind: 'deleteMessage', messageId: 'r2', confirm: true, again: { message: 'deleteMessageAgain' } })
  })

  it('note:reply needs its words; tagadd:favorite reply tags through a quote', () => {
    expect(planNoteMessage({ args: [{ kind: 'word', value: 'reply' }] }, screensWith('r1')).says.message).toBe('noteWords')
    const n = planNoteMessage({ args: [{ kind: 'word', value: 'reply' }, { kind: 'text', value: 'Check this figure' }] }, screensWith('r1'))
    expect(n.act).toMatchObject({ kind: 'noteMessage', messageId: 'r1', text: 'Check this figure' })
    const t = planTagMessage({ match: { values: [{ kind: 'word', value: 'favorite', text: 'favorite' }, { kind: 'word', value: 'reply' }] } }, screensWith('r1'))
    expect(t.act).toMatchObject({ kind: 'quoteMessage', messageId: 'r1', tag: 'favorite' })
  })

  it('with no room on screen, says so', () => {
    const p = planCopyMessage({ match: { values: [{ kind: 'word', value: 'reply' }] } }, { hand: () => ({ room: false }) })
    expect(p.says.message).toBe('messageNoRoom')
    expect(p.act).toBeNull()
  })

  it('reaches each form from the bar', () => {
    expect(step('quote:reply').act?.kind).toBe('quoteMessage')
    expect(step('quote:').act?.kind).toBe('quoteMessage')
    expect(step('copy:reply').act?.kind).toBe('copyMessage')
    expect(step('delete:prompt').act).toMatchObject({ kind: 'deleteMessage', messageId: 'p1' })
    expect(step('note:reply "Check this figure"').act?.kind).toBe('noteMessage')
    expect(step('tagadd:favorite reply').act).toMatchObject({ kind: 'quoteMessage', tag: 'favorite' })
    // Unquoted words are a note of their own, as before.
    expect(step('note:reply to Sam first').act?.kind).toBe('note')
    // delete: alone is still Delete everything, in Settings.
    expect(step('delete:').says.message).toBe('deleteEverything')
  })
})

import { describe, it, expect } from 'vitest'
import { setupI18n } from '@lingui/core'
import { preview, promptPreview, BUILT } from './preview'
import { say } from './say'
import { shipped } from '../shell/arrangement'
import { messages as en } from '../locales/en/messages.mjs'

const i18n = setupI18n({ locale: 'en', messages: { en } })
i18n.activate('en')
const almanac = () => shipped('almanac')
const words = (value, a = almanac()) => {
  const p = preview(value, { mode: 'command', arrangement: a })
  return { ...p, text: say(i18n, p.says.message, p.says.values) }
}

describe('what Enter would do', () => {
  it('says it in words, with board names from the copy table', () => {
    const p = words('>open:library')
    expect(p.text).toBe('Enter opens Library on the right')
    expect(p.next.columns).toEqual([['almanac'], ['collection'], ['library']])
  })

  it('refuses before Enter, and Enter then runs nothing', () => {
    const p = words('>close:library')
    expect(p.text).toBe('Library is not open')
    expect(p.next).toBeNull()
  })

  it('plans a line whole, so it never stops half done', () => {
    const p = words('>open:library close:settings')
    expect(p.text).toBe('Settings is not open')
    expect(p.next).toBeNull()
    const q = words('>open:library move:library left')
    expect(q.text).toBe('Enter runs 2 commands in turn: open: and move:')
    expect(q.next.columns[0]).toEqual(['library'])
  })

  it('says a verb is not built yet, including forms of built verbs that wait for later', () => {
    expect(words('>open:207').text).toBe('open: is not built yet')
    expect(words('>pop:settings keys').text).toBe('pop: is not built yet')
    expect(words('>tour:').text).toBe('tour: is not built yet')
  })

  it('plans pop:, which opens windows', () => {
    expect(BUILT.has('pop')).toBe(true)
    expect(words('>pop:library').text).toBe('Enter puts Library in its own window')
    expect(words('>pop:command').text).toBe('Enter puts the bar in its own window')
    expect(words('>pop:back').text).toBe('No board is in its own window')
  })

  it('answers renamed verbs, places and lists in words', () => {
    expect(words('>hide:library').text).toBe('That verb is now close:. Enter writes it in')
    expect(words('>bar:sideways').text).toBe('bar: takes top, bottom, left, center, or right')
    expect(words('>bar:bottom').text).toBe('Enter moves the bar to the bottom')
    expect(words('>move:collection left').text).toBe('Enter moves Collection to the left')
  })

  it('names where a verb works', () => {
    const p = preview('>type:chat', { mode: 'command', arrangement: shipped('settings') })
    expect(say(i18n, p.says.message, p.says.values)).toBe('type: works on Almanac and Collection')
  })
})

describe('going to another screen (C95)', () => {
  const room = (id) => shipped(`room:${id}`)
  const at = (value, a, screens) => {
    const p = preview(value, { mode: 'command', arrangement: a, screens })
    return { ...p, text: say(i18n, p.says.message, p.says.values) }
  }

  it('alm: goes to the Almanac, from anywhere but the Almanac', () => {
    expect(BUILT.has('alm')).toBe(true)
    const p = at('>alm:', room('c1'))
    expect(p.text).toBe('Enter goes to Almanac')
    expect(p.go).toEqual({ id: 'almanac', context: {} })
    expect(p.next).toBeNull()
    const here = at('>alm:', almanac())
    expect(here.text).toBe('You are on Almanac already')
    expect(here.go).toBeNull()
  })

  it('sym: goes back to the last room, naming its chat on the strip', () => {
    const screens = { lastRoom: { id: 'c1', num: 202 } }
    const p = at('>sym:', almanac(), screens)
    expect(p.text).toBe('Enter goes back to the last room')
    expect(p.go).toEqual({ id: 'room:c1', context: { room: 202 } })
    expect(at('>sym:', room('c1'), screens).text).toBe('This is the last room already')
    expect(at('>sym:', room('c2'), screens).go.id).toBe('room:c1')
  })

  it('sym: with no chat yet opens an empty room', () => {
    const p = at('>sym:', almanac(), { lastRoom: null })
    expect(p.text).toBe('Enter opens an empty room. Its first prompt starts it')
    expect(p.go).toEqual({ id: 'room:new', context: {} })
    expect(at('>sym:', shipped('room:new')).text).toBe('This room is empty. Its first prompt starts it')
  })

  it('a switch runs on a line of its own; a room by name waits for name:', () => {
    expect(at('>alm: bar:bottom', room('c1')).text).toBe('alm: goes to another screen, so it runs on a line of its own')
    expect(at('>bar:bottom sym:', almanac()).text).toBe('sym: goes to another screen, so it runs on a line of its own')
    expect(at('>sym:"Barn owls"', almanac()).text).toBe('sym: is not built yet')
  })
})

describe('what Enter does with a prompt (stage 4; C83)', () => {
  const line = (text, target) => {
    const p = promptPreview(text, target)
    return { ...p, text: p.says ? say(i18n, p.says.message, p.says.values) : null }
  }
  const room = { room: 'c1', streaming: false, provider: 'Anthropic', source: 'Wikipedia', historyChars: 0, systemChars: 0, perMillion: 3 }

  it('needs a room on the screen', () => {
    const p = line('hello', { room: undefined })
    expect(p.ready).toBe(false)
    expect(p.text).toBe('Prompts go to a room. sym: opens one')
  })

  it('without a key, asks the source and says it costs nothing', () => {
    const p = line('barn owl', { ...room, keyed: false })
    expect(p.ready).toBe(true)
    expect(p.text).toBe('Enter asks Wikipedia, which needs no key and costs nothing')
  })

  it('with a key, names the provider, a local estimate of the tokens and the cost', () => {
    const cheap = line('barn owl', { ...room, keyed: true })
    expect(cheap.text).toBe('Enter sends to Anthropic, about 2 tokens, under $0.01 to send')
    const long = line('x', { ...room, keyed: true, historyChars: 40_000 - 1 })
    expect(long.text).toBe('Enter sends to Anthropic, about 10,000 tokens, $0.03 to send')
    const one = line('owl', { ...room, keyed: true, perMillion: null })
    expect(one.text).toBe('Enter sends to Anthropic, about 1 token')
  })

  it('counts what goes along: the chat and the standing instructions', () => {
    const p = promptPreview('abcd', { ...room, keyed: true, historyChars: 8, systemChars: 4 })
    expect(p.says.values.tokens).toBe(4)
  })

  it('waits while a reply arrives, while the key is looked for, and for words', () => {
    expect(line('more', { ...room, keyed: true, streaming: true }).text).toBe('A reply is still arriving here. Send once it is done')
    expect(line('more', { ...room, keyed: null }).ready).toBe(false)
    expect(line('   ', { ...room, keyed: false })).toMatchObject({ ready: false, says: null })
  })

  it('works in an empty room too', () => {
    expect(line('barn owl', { ...room, room: null, keyed: false }).ready).toBe(true)
  })
})

describe('what stays out of a prompt (stage 4)', () => {
  it('says how many hidden messages stay out when the chat goes along', () => {
    const p = promptPreview('more', { room: 'c1', keyed: true, provider: 'Anthropic', perMillion: 3, hiddenOut: 2 })
    expect(p.says.also).toEqual([{ message: 'promptHiddenOut', values: { count: 2 } }])
    expect(say(i18n, p.says.also[0].message, p.says.also[0].values)).toBe('2 hidden messages stay out')
    expect(promptPreview('more', { room: 'c1', keyed: true, provider: 'Anthropic', perMillion: 3, hiddenOut: 0 }).says.also).toBeUndefined()
    expect(promptPreview('more', { room: 'c1', keyed: false, source: 'Wikipedia', hiddenOut: 2 }).says.also).toBeUndefined()
  })
})

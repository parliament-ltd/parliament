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
    expect(words('>tour:advanced').text).toBe('tour: is not built yet')
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

describe('naming the one request after a first answer (C62)', () => {
  const haiku = { inputPerMillion: 0.25, outputPerMillion: 1.25 }
  const target = { room: null, keyed: true, provider: 'Anthropic', perMillion: 3 }

  it('names it, and what it costs at most, on a chat\'s first prompt', () => {
    const p = promptPreview('What is a barn owl?', { ...target, describe: { price: haiku } })
    expect(p.says.also).toEqual([{ message: 'promptDescribeCheap', values: { cost: 0.01 } }])
    expect(say(i18n, p.says.also[0].message, p.says.also[0].values)).toBe('After the answer, one short request for its title, summary and tags, under $0.01')
    expect(promptPreview('x', { ...target, describe: { price: null } }).says.also[0].message).toBe('promptDescribeUnpriced')
  })

  it('says nothing of it when it will not go', () => {
    expect(promptPreview('x', { ...target, describe: null }).says.also).toBeUndefined()
  })
})

describe('answers from sources stay out (C115)', () => {
  it('names how many, and from where, when the chat goes to a model', () => {
    const p = promptPreview('How big are they?', { room: 'c1', keyed: true, provider: 'Anthropic', perMillion: 3, sourcesOut: { count: 2, names: ['Wikipedia'] } })
    const also = p.says.also.find((a) => a.message === 'promptSourcesOut')
    expect(say(i18n, also.message, also.values)).toBe('2 answers from Wikipedia stay out')
    const one = promptPreview('x', { room: 'c1', keyed: true, provider: 'Anthropic', perMillion: 3, sourcesOut: { count: 1, names: ['Wikipedia', 'Hacker News'] } })
    expect(say(i18n, one.says.also[0].message, one.says.also[0].values)).toBe('1 answer from Wikipedia and Hacker News stays out')
  })

  it('says nothing when there are none, or when the prompt goes to a source', () => {
    expect(promptPreview('x', { room: 'c1', keyed: true, provider: 'Anthropic', perMillion: 3, sourcesOut: { count: 0, names: [] } }).says.also).toBeUndefined()
    expect(promptPreview('x', { room: 'c1', keyed: false, source: 'Wikipedia', sourcesOut: { count: 2, names: ['Wikipedia'] } }).says.also).toBeUndefined()
  })
})

describe('after a reply stalled (C114)', () => {
  const target = { room: 'c1', keyed: true, provider: 'Anthropic', perMillion: 3, historyChars: 400, resend: true }

  it('offers, with nothing typed, to send it again without streaming, naming the cost', () => {
    const p = promptPreview('', target)
    expect(p.ready).toBe(true)
    expect(p.resend).toBe(true)
    expect(say(i18n, p.says.message)).toBe('The reply stalled, as happens on networks that hold streamed replies')
    expect(say(i18n, p.says.also[0].message, p.says.also[0].values)).toBe('Enter sends it again without streaming, about 100 tokens, under $0.01 to send')
  })

  it('sends a new prompt as usual when one is typed, and offers nothing without a key or a stall', () => {
    expect(promptPreview('Something else', target).resend).toBeUndefined()
    expect(promptPreview('', { ...target, resend: false }).ready).toBe(false)
    expect(promptPreview('', { ...target, keyed: false }).ready).toBe(false)
  })
})

describe('name: for the room (C40)', () => {
  const room = shipped('room:c1')
  const at = (value, a = room, screens = {}) => {
    const p = preview(value, { mode: 'command', arrangement: a, screens })
    return { ...p, text: say(i18n, p.says.message, p.says.values) }
  }

  it('names the room on screen with the words as typed', () => {
    expect(BUILT.has('name')).toBe(true)
    const p = at('>name:"Barn owls"')
    expect(p.text).toBe('Enter names this room: Barn owls')
    expect(p.act).toEqual({ kind: 'nameRoom', chatId: 'c1', name: 'Barn owls' })
    expect(at('>name:Murano').act.name).toBe('Murano')
  })

  it('refuses an empty name, one it has already, and a room with no chat yet', () => {
    expect(at('>name:""').text).toBe('A name needs some words, like name:"Barn owls"')
    expect(at('>name:"Barn owls"', room, { roomName: { own: 'Barn owls' } }).act).toBeNull()
    expect(at('>name:"Barn owls"', shipped('room:new')).text).toBe('This room has no chat yet. Its first prompt starts it, and then name: names it')
    expect(at(`>name:"${'x'.repeat(81)}"`).text).toBe("A room's name is at most 80 characters")
  })

  it('runs alone, and waits for its stages elsewhere', () => {
    expect(at('>name:"Owls" bar:top').text).toBe('name: runs on a line of its own for now')
    expect(at('>name:207 "New title"').text).toBe('name: is not built yet')
    expect(at('>name:"Q2"', shipped('almanac')).text).toMatch(/not built yet|works on/)
  })
})

describe('the welcome page (stage 5)', () => {
  const welcome = () => shipped('welcome')
  const at = (value, a = welcome(), screens = {}) => {
    const p = preview(value, { mode: 'command', arrangement: a, screens })
    return { ...p, text: say(i18n, p.says.message, p.says.values) }
  }

  it('rests the field in its card', () => {
    expect(welcome().bar.at).toBe('card')
  })

  it('opens the Almanac and the Library on the right of the card (W §5; C95)', () => {
    const p = at('>alm:')
    expect(p.go).toBeFalsy()
    expect(p.next.columns).toEqual([['welcome'], ['almanac']])
    expect(at('>library:').next.columns).toEqual([['welcome'], ['library']])
    expect(at('>library:', shipped('almanac')).next.columns).toEqual([['almanac'], ['collection'], ['library']])
    // Elsewhere alm: still goes to the Almanac's screen, until C124 is ruled.
    expect(at('>alm:', shipped('room:c1')).go.id).toBe('almanac')
  })

  it('tour: shows the page and its steps; tour:off puts them away (A20)', () => {
    const p = at('>tour:', shipped('almanac'))
    expect(p.text).toBe('Enter shows the welcome page and its steps')
    expect(p.go).toMatchObject({ id: 'welcome', show: true })
    expect(at('>tour:').text).toBe('The steps are here already')
    expect(at('>tour:', welcome(), { stepsOff: true }).act).toEqual({ kind: 'tourOn' })
    expect(at('>tour:off').act).toEqual({ kind: 'tourOff' })
    expect(at('>tour:off', welcome(), { stepsOff: true }).text).toBe('The steps are put away already')
  })
})

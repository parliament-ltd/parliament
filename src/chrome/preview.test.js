import { describe, it, expect } from 'vitest'
import { setupI18n } from '@lingui/core'
import { preview, promptPreview, BUILT } from './preview'
import { say } from './say'
import { shipped, planRoom, SPACE } from '../shell/arrangement'
import { messages as en } from '../locales/en/messages.mjs'

const keep = (p) => { if (!p.next) throw new Error(p.says.message); return p.next }
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
    expect(words('>open:201a summary').text).toBe('open: is not built yet')
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

describe('one space: alm: and sym: bring boards beside what is here (C125)', () => {
  const space = () => shipped(SPACE)
  const at = (value, a = space(), screens = {}) => {
    const p = preview(value, { mode: 'command', arrangement: a, screens })
    return { ...p, text: say(i18n, p.says.message, p.says.values) }
  }

  it('alm: brings the Almanac and the Collection, and nothing switches screens', () => {
    expect(BUILT.has('alm')).toBe(true)
    const w = { ...shipped('welcome'), id: SPACE }
    const p = at('>alm:', w)
    expect(p.text).toBe('Enter brings Almanac and Collection beside what is here')
    expect(p.next.columns).toEqual([['welcome'], ['almanac', 'collection']])
    expect(p.go).toBeUndefined()
    expect(at('>alm:').text).toBe('Everything it brings is here already')
    // open:alm still opens the Almanac alone.
    expect(at('>open:alm', w).next.columns).toEqual([['welcome'], ['almanac']])
  })

  it('sym: brings the last room beside what is here, and shows it there after', () => {
    const screens = { lastRoom: { id: 'c1', num: 202 } }
    const p = at('>sym:', space(), screens)
    expect(p.text).toBe('Enter brings the last room beside what is here')
    expect(p.next.columns).toEqual([['almanac'], ['collection'], ['room']])
    expect(p.next.context.room).toBe('c1')
    expect(at('>sym:', p.next, screens).text).toBe('The last room is here already')
    expect(at('>sym:', p.next, { lastRoom: { id: 'c2' } }).text).toBe('Enter shows the last room here')
  })

  it('sym: with no chat yet opens an empty room beside', () => {
    const p = at('>sym:', space(), { lastRoom: null })
    expect(p.text).toBe('Enter opens an empty room beside what is here. Its first prompt starts it')
    expect(at('>sym:', p.next, { lastRoom: null }).text).toBe('This room is empty. Its first prompt starts it')
  })

  it('shares a line with other layout commands (C99), and a room by name waits for name:', () => {
    const p = at('>alm: bar:bottom', { ...shipped('welcome'), id: SPACE })
    expect(p.text).toBe('Enter runs 2 commands in turn: alm: and bar:')
    expect(p.next.bar.at).toBe('bottom')
    expect(at('>sym:"Barn owls"').text).toBe('sym: is not built yet')
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

describe('open: and inspect: by number (stage 5, piece 3)', () => {
  const numbered = new Map([
    [202, { kind: 'chat', num: 202, chatId: 'c202' }],
    [204, { kind: 'chat', num: 204, chatId: 'c204' }],
    [203, { kind: 'docket', num: 203, chatId: 'c204', chatNum: 204 }],
    [210, { kind: 'note', num: 210, chatId: 'c204' }],
  ])
  const at = (value, a = shipped(SPACE)) => {
    const p = preview(value, { mode: 'command', arrangement: a, screens: { numbered } })
    return { ...p, text: say(i18n, p.says.message, p.says.values) }
  }

  it('opens a chat in a room beside what is here, or in the room here', () => {
    const p = at('>open:204')
    expect(p.text).toBe('Enter opens 204 in a room beside what is here')
    expect(p.next.columns).toEqual([['almanac'], ['collection'], ['room']])
    expect(p.next.context.room).toBe('c204')
    expect(at('>open:202', p.next).text).toBe('Enter shows 202 in the room here')
    expect(at('>open:204', p.next).text).toBe('204 is in the room here already')
  })

  it('opens a docket\'s first branch, and says opening a marking comes later', () => {
    expect(at('>open:203').text).toBe('Enter opens its first branch, 204, in a room beside what is here')
    expect(at('>open:210').text).toBe('Opening this comes later. inspect:210 shows it now')
    expect(at('>open:999').text).toBe('Nothing here has the number 999')
    expect(at('>open:204a').text).toBe('open: is not built yet')
  })

  it('inspect: shows one thing in detail, on a line of its own', () => {
    const p = at('>inspect:204')
    expect(p.text).toBe('Enter shows 204 in detail, here')
    expect(p.act).toEqual({ kind: 'inspect', num: 204 })
    expect(p.next).toBeNull()
    expect(at('>inspect:999').act).toBeNull()
    expect(at('>inspect:204 bar:top').text).toBe('inspect: runs on a line of its own for now')
  })
})

describe('width: (C126)', () => {
  const at = (value, a = shipped(SPACE)) => {
    const p = preview(value, { mode: 'command', arrangement: a })
    return { ...p, text: say(i18n, p.says.message, p.says.values) }
  }

  it('says what share the board will have, the way the language writes it', () => {
    expect(BUILT.has('width')).toBe(true)
    expect(at('>width:60%').text).toBe('Enter gives it 60% of the width')
    expect(at('>width:collection 30%').text).toBe('Enter gives Collection 30% of the width')
    expect(at('>width:5%').text).toBe('A board takes from 10% to 90% of the width')
    expect(at('>width:even').text).toBe('Every board has its usual width already')
    const sv = setupI18n({ locale: 'sv', messages: { sv: en } })
    expect(say(sv, 'widthIt', { percent: 60 })).toMatch(/60\s%/)
  })

  it('shares a line with other layout commands', () => {
    expect(at('>open:library width:50%').text).toBe('Enter runs 2 commands in turn: open: and width:')
  })
})

describe('name: for the room (C40)', () => {
  const room = keep(planRoom(shipped(SPACE), 'c1'))
  const at = (value, a = room, screens = {}) => {
    const p = preview(value, { mode: 'command', arrangement: a, screens })
    return { ...p, text: say(i18n, p.says.message, p.says.values) }
  }

  it('names the room in the space with the words as typed', () => {
    expect(BUILT.has('name')).toBe(true)
    const p = at('>name:"Barn owls"')
    expect(p.text).toBe('Enter names this room: Barn owls')
    expect(p.act).toEqual({ kind: 'nameRoom', chatId: 'c1', name: 'Barn owls' })
    expect(at('>name:Murano').act.name).toBe('Murano')
  })

  it('refuses an empty name, one it has already, and a room with no chat yet', () => {
    expect(at('>name:""').text).toBe('A name needs some words, like name:"Barn owls"')
    expect(at('>name:"Barn owls"', room, { roomName: { own: 'Barn owls' } }).act).toBeNull()
    const empty = keep(planRoom(shipped(SPACE), null))
    expect(at('>name:"Barn owls"', empty).text).toBe('This room has no chat yet. Its first prompt starts it, and then name: names it')
    expect(at(`>name:"${'x'.repeat(81)}"`).text).toBe("A room's name is at most 80 characters")
  })

  it('runs alone, and waits for its stages elsewhere', () => {
    expect(at('>name:"Owls" bar:top').text).toBe('name: runs on a line of its own for now')
    expect(at('>name:207 "New title"').text).toBe('name: is not built yet')
    expect(at('>name:"Q2"', shipped('almanac')).text).toMatch(/not built yet|works on/)
  })
})

describe('the welcome page (stage 5)', () => {
  const welcome = () => ({ ...shipped('welcome'), id: SPACE })
  const at = (value, a = welcome(), screens = {}) => {
    const p = preview(value, { mode: 'command', arrangement: a, screens })
    return { ...p, text: say(i18n, p.says.message, p.says.values) }
  }

  it('rests the field in its card', () => {
    expect(welcome().bar.at).toBe('card')
  })

  it('brings the Almanac and the Library on the right of the card (W §5; C95, C125)', () => {
    expect(at('>alm:').next.columns).toEqual([['welcome'], ['almanac', 'collection']])
    expect(at('>library:').next.columns).toEqual([['welcome'], ['library']])
    expect(at('>library:', shipped('almanac')).next.columns).toEqual([['almanac'], ['collection'], ['library']])
  })

  it('tour: brings the page and its steps back; tour:off puts the steps away (A20)', () => {
    const p = at('>tour:', shipped(SPACE))
    expect(p.text).toBe('Enter brings the welcome page and its steps beside what is here')
    expect(p.next.columns).toEqual([['welcome'], ['almanac'], ['collection']])
    expect(p.act).toEqual({ kind: 'tourOn' })
    expect(at('>tour:').text).toBe('The steps are here already')
    expect(at('>tour:', welcome(), { stepsOff: true }).act).toEqual({ kind: 'tourOn' })
    expect(at('>tour:off').act).toEqual({ kind: 'tourOff' })
    expect(at('>tour:off', welcome(), { stepsOff: true }).text).toBe('The steps are put away already')
    expect(at('>tour:off', shipped(SPACE)).text).toBe('The steps are put away already')
  })
})


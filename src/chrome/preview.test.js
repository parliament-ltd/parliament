import { describe, it, expect } from 'vitest'
import { setupI18n } from '@lingui/core'
import { preview, promptPreview, BUILT } from './preview'
import { say } from './say'
import { shipped, planRoom, SPACE } from '../shell/arrangement'
import { messages as en } from '../locales/en/messages.mjs'
import { frameworkList } from '../lib/frameworks'

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
    expect(say(i18n, p.says.message, p.says.values)).toBe('type: works on Records and Collection')
  })
})

describe('one space: records: and room: bring boards beside what is here (C125, C131)', () => {
  const space = () => shipped(SPACE)
  const at = (value, a = space(), screens = {}) => {
    const p = preview(value, { mode: 'command', arrangement: a, screens })
    return { ...p, text: say(i18n, p.says.message, p.says.values) }
  }

  it('records: brings Records and the Collection, and nothing switches screens', () => {
    expect(BUILT.has('records')).toBe(true)
    const w = { ...shipped('welcome'), id: SPACE }
    const p = at('>records:', w)
    expect(p.text).toBe('Enter brings Records and Collection beside what is here')
    expect(p.next.columns).toEqual([['welcome'], ['almanac', 'collection']])
    expect(p.go).toBeUndefined()
    expect(at('>records:').text).toBe('Everything it brings is here already')
    // open:records opens the Records board alone.
    expect(at('>open:records', w).next.columns).toEqual([['welcome'], ['almanac']])
  })

  it('room: brings the last room beside what is here, and shows it there after', () => {
    const screens = { lastRoom: { id: 'c1', num: 202 } }
    const p = at('>room:', space(), screens)
    expect(p.text).toBe('Enter brings the last room beside what is here')
    expect(p.next.columns).toEqual([['almanac'], ['collection'], ['room']])
    expect(p.next.context.room).toBe('c1')
    expect(at('>room:', p.next, screens).text).toBe('The last room is here already')
    // Another chat opens in a room of its own beside (C175 (a), ruled 23 October).
    const q = at('>room:', p.next, { lastRoom: { id: 'c2' } })
    expect(q.text).toBe('Enter brings the last room beside what is here')
    expect(q.next.columns).toEqual([['almanac'], ['collection'], ['room'], ['room-2']])
  })

  it('letter: opens the newest letter, one by its number, or the list, and nothing else moves (C279 (c))', () => {
    expect(at('>letter:').text).toBe('Enter opens letter 1')
    expect(at('>letter:').act).toEqual({ kind: 'letter', n: 1 })
    expect(at('>letter:1').act).toEqual({ kind: 'letter', n: 1 })
    expect(at('>letter:all').text).toBe('Enter lists every letter')
    expect(at('>letter:all').act).toEqual({ kind: 'letter', all: true })
    expect(at('>letter:9').text).toBe('There is no letter 9. letter:all lists them')
    expect(at('>letter:9').act).toBeNull()
    expect(at('>letter:').next).toBeNull()
  })

  it('close:letter closes the letter, as Escape does', () => {
    expect(at('>close:letter').text).toBe('Enter closes the letter')
    expect(at('>close:letter').act).toEqual({ kind: 'letterClose' })
    expect(at('>close:letter').next).toBeNull()
  })

  it('open:commandmenu and pop:commandmenu bring the command menu as a board (C280)', () => {
    const opened = at('>open:commandmenu').next
    expect(opened.columns.flat()).toContain('commands')
    const popped = at('>pop:commandmenu').next
    expect(popped.popped.map((p) => p.board)).toContain('commands')
  })

  it('settings: opens Settings, and settings:data a section of it (C279)', () => {
    expect(at('>settings:').text).toBe('Enter opens Settings on the right')
    expect(at('>settings:data').text).toBe('Enter opens Settings at Data and backups')
    expect(at('>settings:data').next.context.settings).toBe('data')
    expect(at('>settings:nonsense').next).toBeNull()
    expect(at('>settings: bar:bottom').text).toBe('Enter runs 2 commands in turn: settings: and bar:')
  })

  it('room: with no chat yet opens an empty room beside', () => {
    const p = at('>room:', space(), { lastRoom: null })
    expect(p.text).toBe('Enter opens an empty room beside what is here. Its first prompt starts it')
    expect(at('>room:', p.next, { lastRoom: null }).text).toBe('This room is empty. Its first prompt starts it')
  })

  it('shares a line with other layout commands (C99), and a room by name waits for name:', () => {
    const p = at('>records: bar:bottom', { ...shipped('welcome'), id: SPACE })
    expect(p.text).toBe('Enter runs 2 commands in turn: records: and bar:')
    expect(p.next.bar.at).toBe('bottom')
    expect(at('>room:"Barn owls"').text).toBe('room: is not built yet')
  })

  it('takes the new words, and points the old verbs to them (C131)', () => {
    expect(at('>alm:').text).toBe('That verb is now records:. Enter writes it in')
    expect(at('>sym:').text).toBe('That verb is now room:. Enter writes it in')
    expect(at('>collab:pushback').text).toBe('That verb is now framework:. Enter writes it in')
    expect(at('>plan:').next.columns).toEqual([['almanac'], ['collection'], ['docket']])
    expect(at('>close:records').text).toBe('Enter closes Records. Nothing is lost')
    expect(at('>close:almanac').text).toBe('close: does not take that. For example: close:records')
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
    expect(p.text).toBe('Prompts go to a room. room: opens one')
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
    expect(at('>open:204', p.next).text).toBe('204 is in the room here already')
    // Any number of rooms (C175 (a)): another chat opens beside, and one
    // open already has the bar pointed at it.
    const q = at('>open:202', p.next)
    expect(q.text).toBe('Enter opens 202 in a room beside what is here')
    expect(q.next.columns).toEqual([['almanac'], ['collection'], ['room'], ['room-2']])
    expect(q.next.context['room-2']).toBe('c202')
    const r = at('>open:204', q.next)
    expect(r.text).toBe('204 is open in a room already. Enter points the bar at it')
    expect(r.next.addressed).toBe('room')
  })

  it('opens a plan on the Plan board, and says opening a marking comes later', () => {
    // Its first branch until the board was built (C127); the board now (C196 (g)).
    const plan = at('>open:203')
    expect(plan.text).toBe('Enter opens plan 203 on the Plan board')
    expect(plan.next.addressed).toBe('docket')
    expect(plan.next.context.docket).toBe('203')
    expect(at('>open:210').text).toBe('Opening this comes later. inspect:210 shows it now')
    expect(at('>open:999').text).toBe('Nothing here has the number 999')
    // A branch by its letter is built with stage 8 (C175): none here has this address.
    expect(at('>open:204a').text).toBe('Nothing here has the number 204a')
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

describe('focus: (stage 5, piece 6)', () => {
  const room = keep(planRoom({ ...shipped('welcome'), id: SPACE }, 'c1'))
  const at = (value, a = room, screens = {}) => {
    const p = preview(value, { mode: 'command', arrangement: a, screens })
    return { ...p, text: say(i18n, p.says.message, p.says.values) }
  }

  it('names what closes, and turns the field to prompt mode after', () => {
    expect(BUILT.has('focus')).toBe(true)
    const p = at('>focus:')
    expect(p.text).toBe('Enter clears the screen to the chat, closing Welcome page. Nothing is lost, and focus:off brings them back')
    expect(p.after).toBe('prompt')
    expect(at('>focus:off', p.next)).toMatchObject({ text: 'Enter brings back Welcome page', after: null })
    expect(at('>focus:', shipped(SPACE)).text).toBe('Nothing to focus on yet. p> starts a chat')
    expect(at('>focus:save').text).toBe('A focus is kept with its room. Open one first: room:')
  })
})

describe('api: and the key panel (stage 5, piece 5)', () => {
  const none = [{ id: 'anthropic', name: 'Anthropic', has: false, ending: null }]
  const saved = [{ id: 'anthropic', name: 'Anthropic', has: true, ending: '4f2a' }]
  const at = (value, keys = none) => {
    const p = preview(value, { mode: 'command', arrangement: shipped(SPACE), screens: { keys, noKey: ['Wikipedia'] } })
    return { ...p, text: say(i18n, p.says.message, p.says.values) }
  }

  it('opens the panel, at a provider\'s field when one is named', () => {
    expect(BUILT.has('api')).toBe(true)
    expect(at('>api:')).toMatchObject({ text: 'Enter shows your keys, here under the field', act: { kind: 'keys', focus: null } })
    expect(at('>api:anthropic')).toMatchObject({ text: 'Enter opens the Anthropic key field. Never type a key here', act: { focus: 'anthropic' } })
    expect(at('>api:anthropic', saved).text).toBe('Anthropic has a key ending 4f2a. Enter opens it for replacing')
    expect(at('>api:new').text).toBe('Enter opens the Anthropic key field, the first without a key')
    expect(at('>api:new', saved)).toMatchObject({ text: 'Every provider has a key. api:anthropic replaces one', act: null })
  })

  it('says which need no key, and refuses a provider it does not know', () => {
    expect(at('>api:wikipedia').text).toBe('Wikipedia needs no key')
    expect(at('>api:openai').text).toBe('No provider is called openai. Try api:anthropic or api:new')
  })

  it('never takes a key in the bar, and refuses a prompt that holds one (C129)', () => {
    expect(at('>api:anthropic sk-ant-api03-abcdefgh').text).toBe('No keys in the command line, for security. Delete it, and api: opens the key field')
    const p = promptPreview('is sk-ant-api03-abcdefghijklmnop right?', { room: 'c1', keyed: false, source: 'Wikipedia' })
    expect(p.ready).toBe(false)
    expect(say(i18n, p.says.message)).toBe('This looks like a key, which would be sent with the prompt. Delete it, and api: opens the key field')
    expect(promptPreview('what changed in 3f9a1c7e5b2d4f6a8c0e1b3d5f7a9c2e4b6d8f0a?', { room: 'c1', keyed: false, source: 'Wikipedia' }).ready).toBe(true)
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
    // name: with a number names a chat or a plan on Records (stage 6, piece 3).
    expect(at('>name:207 "New title"').text).toBe('Nothing here has the number 207')
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

  it('brings Records and the Library on the right of the card (W §5; C95, C125)', () => {
    expect(at('>records:').next.columns).toEqual([['welcome'], ['almanac', 'collection']])
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


describe('search and filters on Records (stage 6, piece 1; C132)', () => {
  const NOW = new Date(2026, 9, 21, 12).getTime()
  const row = (num, kind, extra = {}) => ({
    num, kind, title: `${kind} ${num}`, text: null, summary: null, tags: [], pinned: false, roomId: null,
    createdAt: new Date(2026, 9, 1).toISOString(), activeAt: new Date(2026, 9, 1).toISOString(),
    chatNum: kind === 'chat' ? num : null, docketNum: null, branch: null, run: null,
    marks: [], models: [], sources: [], cost: null, collections: [], words: '', ...extra,
  })
  const rows = [
    row(202, 'chat', { tags: ['owls'], roomId: 'mode_owl', cost: 0.42, createdAt: new Date(2026, 9, 20).toISOString() }),
    row(204, 'chat', { tags: ['owls', 'essay'] }),
    row(206, 'chat'),
    row(211, 'term', { text: 'Tyto alba', chatNum: 202 }),
  ]
  const records = (view) => ({
    rows, view, now: NOW, locale: 'en-US',
    rooms: [{ id: 'mode_owl', label: 'Owl questions' }], collections: [{ id: 'fav', label: 'Favorites' }],
    ctx: { roomLabel: () => '' },
  })
  const at = (value, view = undefined, a = almanac()) => {
    const p = preview(value, { mode: 'command', arrangement: a, screens: { records: records(view) } })
    const also = [].concat(p.says?.also ?? []).map((x) => say(i18n, x.message, x.values))
    return { ...p, text: [say(i18n, p.says.message, p.says.values), ...also].join(' · ') }
  }

  it('says how many rows Enter will show, and hands the shell the view', () => {
    const p = at('>tag:owls')
    expect(p.text).toBe('Enter shows 2 rows')
    expect(p.next).toBeNull()
    expect(p.act.kind).toBe('records')
    expect(p.act.view.filters.map((f) => f.text)).toEqual(['tag:owls'])
    expect(at('>tag:owls -tag:essay').text).toBe('Enter shows 1 row')
    expect(at('>tag:nothing').text).toBe('Enter shows no rows')
  })

  it('shows keywords only when asked for (A19, C133)', () => {
    expect(at('>type:keyword').text).toBe('Enter shows 1 row')
  })

  it('spells out the day it read, so a misreading shows before Enter (C132 (e))', () => {
    expect(at('>since:10/15/26').text).toBe('Enter shows 1 row · made since October 15, 2026')
    expect(at('>until:yesterday').text).toBe('Enter shows 3 rows · made until the end of October 20, 2026')
  })

  it('says how many have no cost recorded (C132 (h))', () => {
    expect(at('>cost:<1').text).toBe('Enter shows 1 row · 2 with no cost recorded are left out')
  })

  it('refuses what it cannot read, before Enter', () => {
    expect(at('>in:attic').text).toBe('No room or collection is called attic')
    expect(at('>cost:lots').text).toBe('cost: takes an amount, like >0.50, <1 or 0.18')
    expect(at('>since:soon').text).toBe('since: takes 7d, 3w, a month, or a date like 2026-09-01')
    expect(at('>from:299').text).toBe('Nothing here has the number 299')
    expect(at('>from:211').text).toBe('Nothing comes from 211. from: takes a chat, a plan, a branch or a run')
  })

  it('clears one kind of filter, the search, or everything (C132 (c))', () => {
    const view = { search: 'owl', filters: [{ k: 'tag', neg: false, v: ['owls'], text: 'tag:owls' }], sort: { by: 'active', asc: false } }
    expect(at('>clear:tag', view).text).toBe('Enter removes tag:owls · Enter shows 2 rows')
    expect(at('>clear:filters', view).text).toBe('Enter clears the search and every filter · Enter shows 3 rows')
    expect(at('>clear:filters').text).toBe('No search or filter is in force')
    expect(at('>clear:cost', view).text).toBe('No cost: filter is in force')
    expect(at('>clear:').text).toBe('clear: is not built yet')
  })

  it('shares a line with layout commands (C99)', () => {
    const p = at('>tag:owls open:library')
    expect(p.text).toBe('Enter runs 2 commands in turn: tag: and open: · Enter shows 2 rows')
    expect(p.next.columns).toEqual([['almanac'], ['collection'], ['library']])
    expect(p.act.view.filters).toHaveLength(1)
  })

  it('waits for the Collection to filter it', () => {
    expect(at('>tag:owls', undefined, { ...almanac(), addressed: 'collection' }).text).toBe('tag: is not built yet')
  })
})

describe('saved searches and columns (stage 6, piece 2; C140, C141)', () => {
  const NOW = new Date(2026, 9, 21, 12).getTime()
  const row = (num, extra = {}) => ({
    num, kind: 'chat', title: `chat ${num}`, text: null, summary: null, tags: [], pinned: false, roomId: null,
    createdAt: new Date(2026, 9, 1).toISOString(), activeAt: new Date(2026, 9, 1).toISOString(),
    chatNum: num, docketNum: null, branch: null, run: null, marks: [], models: [], sources: [], cost: null, collections: [], words: '', ...extra,
  })
  const rows = [row(202, { tags: ['owls'], createdAt: new Date(2026, 9, 20).toISOString() }), row(204, { tags: ['owls', 'essay'] }), row(206)]
  const saved = [
    { id: 's1', name: 'Owls', search: '', line: 'tag:owls' },
    { id: 's2', name: 'This week', search: '', line: 'since:7d sort:oldest' },
    { id: 's3', name: 'Old room', search: '', line: 'in:"Attic"' },
  ]
  const view = (filters = [], search = '') => ({ search, filters, sort: { by: 'active', asc: false } })
  const records = (v = view()) => ({ rows, view: v, saved, now: NOW, locale: 'en-US', rooms: [], collections: [], ctx: { roomLabel: () => '' } })
  const at = (value, v, a = almanac()) => {
    const p = preview(value, { mode: 'command', arrangement: a, screens: { records: records(v) } })
    const also = [].concat(p.says?.also ?? []).map((x) => say(i18n, x.message, x.values))
    return { ...p, text: [say(i18n, p.says.message, p.says.values), ...also].join(' · ') }
  }
  const tagOwls = { k: 'tag', neg: false, v: ['owls'], text: 'tag:owls' }

  it('save: keeps the search and filters as commands, and says if it replaces one', () => {
    const p = at('>save:"Owl chats"', view([tagOwls, { k: 'type', neg: false, v: ['chat'], text: 'type:chat' }], 'barn'))
    expect(p.text).toBe('Enter keeps this search as Owl chats. Opening it works it out again')
    expect(p.act).toEqual({ kind: 'saveSearch', name: 'Owl chats', search: 'barn', line: 'type:chat tag:owls' })
    expect(at('>save:owls', view([{ k: 'type', neg: false, v: ['chat'], text: 'type:chat' }])).text).toBe('Enter replaces the saved search owls with this one')
    expect(at('>save:owls', view([tagOwls])).text).toBe('Owls is saved as this search already')
  })

  it('save: needs something to save, a name, and no key in the search', () => {
    expect(at('>save:x', view()).text).toBe('Nothing to save yet. Search or filter first')
    expect(at('>save:""', view([tagOwls])).text).toBe('A saved search needs a name, like save:"Owls this week"')
    expect(at('>save:x', view([], 'sk-ant-api03-abcdefghijklmnop')).text).toBe('This search looks like it holds a key, so it is not kept')
    expect(at('>save:x bar:top', view([tagOwls])).text).toBe('save: runs on a line of its own for now')
  })

  it('forget: removes one by name, and says when the name is not enough', () => {
    expect(at('>forget:"this week"').act).toEqual({ kind: 'forgetSearch', id: 's2' })
    expect(at('>forget:"this week"').text).toBe('Enter forgets the saved search This week. Nothing it finds is touched')
    expect(at('>forget:attic').text).toBe('Nothing is saved as attic')
  })

  it('open:"…" shows a saved search, worked out again today', () => {
    const p = at('>open:"This week"')
    expect(p.text).toBe('Enter shows the saved search This week · Enter shows 1 row')
    expect(p.act.view.filters.map((f) => f.text)).toEqual(['since:7d'])
    expect(p.act.view.sort).toEqual({ by: 'active', asc: true })
    expect(p.next.addressed).toBe('almanac')
  })

  it('open:"…" brings Records when it is not here, and never takes a board for a saved search', () => {
    const p = at('>open:owls', undefined, shipped('settings'))
    expect(p.next.columns.flat()).toContain('almanac')
    expect(at('>open:records', undefined, shipped('settings')).act ?? null).toBeNull()
  })

  it('says why a saved search cannot open as it is', () => {
    expect(at('>open:"Old room"').text).toBe('No room or collection is called Attic · so the saved search Old room cannot open as it is. forget: removes it')
  })

  it('cols: says what it hides or shows, by the columns\' names', () => {
    expect(at('>cols:-room +created').text).toBe('Enter hides Room')
    expect(at('>cols:').text).toBe('Records shows Type, ID, Title, Room, Tags, Created, and Last active. A minus hides one, a plus shows it again')
    expect(at('>cols:-id').text).toBe('ID always shows')
    expect(at('>cols:-colour').text).toBe('No column is called colour. Try type, id, title, room, tags, created, or active')
  })
})

describe('the row verbs, copy: and undo: (stage 6, piece 3; C143, C134)', () => {
  const row = (num, kind, extra = {}) => ({
    num, kind, id: `${kind}${num}`, store: kind === 'chat' ? 'conversations' : 'notes', title: `${kind} ${num}`,
    tags: [], tagsMine: [], pinned: false, archived: false, docketNum: null, branch: null, ...extra,
  })
  const rows = [row(202, 'chat', { tags: ['owls'] }), row(204, 'chat', { pinned: true, tags: ['owls'] }), row(210, 'note', { text: 'Range map' })]
  const at = (value, screens = {}) => {
    const p = preview(value, { mode: 'command', arrangement: almanac(), screens: { records: { rows, view: { search: '', filters: [], sort: { by: 'active', asc: false } } }, ...screens } })
    const also = [].concat(p.says?.also ?? []).map((x) => say(i18n, x.message, x.values))
    return { ...p, text: [say(i18n, p.says.message, p.says.values), ...also].join(' · ') }
  }

  it('says what each would change, before Enter', () => {
    expect(at('>pin:202, 210').text).toBe('Enter pins 202 and 210 at the top')
    expect(at('>pin:204').text).toBe('Enter unpins 204')
    expect(at('>archive:202').text).toBe('Enter archives 202. Nothing is deleted, and in:archive shows them')
    expect(at('>name:202 "Barn owls"').text).toBe('Enter names 202: Barn owls')
    expect(at('>name:210 "x"').text).toBe('210 is its own words, so it takes no name')
    expect(at('>tagadd:essay 202, 210').text).toBe('Enter tags 202 and 210 with essay')
    expect(at('>untag:owls').text).toBe('Enter takes owls off all 2 things that carry it')
    expect(at('>retag:owls to birds').text).toBe('Enter renames owls to birds on 2 things')
  })

  it('hands the shell the changes, all of a line together', () => {
    const p = at('>pin:202 tagadd:essay 202')
    expect(p.text).toBe('Enter runs 2 commands in turn: pin: and tagadd: · Enter pins 202 at the top · Enter tags 202 with essay')
    expect(p.act).toEqual({ kind: 'rows', changes: [{ store: 'conversations', id: 'chat202', num: 202, set: { pinned: true, tags: ['owls', 'essay'], tagsMine: ['essay'] }, expect: { pinned: false, tags: ['owls'], tagsMine: [] } }] })
    expect(at('>pin:202 bar:top').text).toBe('pin: shares a line only with commands like it, for now')
  })

  it('copy: names what it copies', () => {
    expect(at('>copy:210').text).toBe('Enter copies 210 as Markdown')
    expect(at('>copy:210').act).toEqual({ kind: 'copy', num: 210 })
    expect(at('>copy:299').text).toBe('Nothing here has the number 299')
  })

  it('undo: names the line it takes back, or that there is none', () => {
    expect(at('>undo:', { undo: 'pin:202' }).text).toBe('Enter takes back pin:202')
    expect(at('>undo:', { undo: 'pin:202' }).act).toEqual({ kind: 'undo' })
    expect(at('>undo:').text).toBe('Nothing to take back in this tab')
    expect(at('>undo:242', { undo: 'pin:202' }).text).toBe('Nothing here has the number 242')
  })
})

describe('delete: of what has been sent (stage 6, piece 4; C137; C199)', () => {
  const row = (num, kind, extra = {}) => ({ num, kind, id: `${kind}${num}`, chatId: kind === 'chat' ? `c${num}` : null, store: kind === 'chat' ? 'conversations' : 'notes', title: `${kind} ${num}`, tags: [], tagsMine: [], docketNum: null, ...extra })
  const rows = [row(204, 'chat', { title: 'barn owl', docketNum: 203 }), row(206, 'chat', { title: 'Essay plan', docketNum: 205 }), row(210, 'note', { chatId: 'c204', text: 'Check the range map' })]
  const at = (value) => {
    const p = preview(value, { mode: 'command', arrangement: almanac(), screens: { records: { rows, view: { search: '', filters: [], sort: { by: 'active', asc: false } } } } })
    const also = [].concat(p.says?.also ?? []).map((x) => say(i18n, x.message, x.values))
    return { ...p, text: [say(i18n, p.says.message, p.says.values), ...also].join(' · ') }
  }

  it('names everything that goes, what stays, that it is for good, and asks for a second Enter', () => {
    expect(at('>delete:204').text).toBe('Enter, then Enter again, deletes 204 “barn owl” for good · 1 note, keyword or quote stays, marked as from a deleted chat. Add all to delete it too · Plan 203 goes with its last chat · Undo cannot bring it back, and stops here')
    expect(at('>delete:204, 206 all').text).toBe('Enter, then Enter again, deletes 204 “barn owl” and 206 “Essay plan” for good · 1 note, keyword or quote goes too · Plans 203 and 205 go with their last chats · Undo cannot bring them back, and stops here')
    expect(at('>delete:204').act).toMatchObject({ kind: 'erase', confirm: true, chats: [{ id: 'c204', num: 204 }], keepMarks: true })
  })

  it('runs alone, takes numbers only, and answers erase: with delete:', () => {
    expect(at('>delete:204 pin:206').text).toBe('delete: runs on a line of its own, so it is plain what goes for good')
    expect(at('>delete:all').text).toBe('delete: does not take that. For example: delete:207')
    expect(at('>erase:204').text).toBe('That verb is now delete:. Enter writes it in')
  })

  it('points delete: alone to Delete everything in Settings (C199)', () => {
    const p = at('>delete:')
    expect(p.text).toBe('Delete everything is a button at the foot of Settings. Enter opens it there')
    expect(p.next.addressed).toBe('settings')
    expect(p.next.context.settings).toBeTruthy()
    expect(at('>delete:everything').text).toBe('Delete everything is a button at the foot of Settings. Enter opens it there')
  })
})

describe('export: (stage 6, piece 5; C138)', () => {
  const row = (num, kind, extra = {}) => ({ num, kind, id: `${kind}${num}`, chatId: kind === 'chat' ? `c${num}` : null, title: `${kind} ${num}`, tags: [], docketNum: null, pinned: false, archived: false, activeAt: '2026-10-21T10:00:00Z', ...extra })
  const rows = [row(204, 'chat'), row(206, 'chat', { tags: ['essay'] }), row(210, 'note', { chatId: 'c204', text: 'Range map' })]
  const NOW = new Date(2026, 9, 21, 12).getTime()
  const at = (value, view = { search: '', filters: [], sort: { by: 'active', asc: false } }, hidden = new Set()) => {
    const p = preview(value, { mode: 'command', arrangement: almanac(), screens: { records: { rows, view, now: NOW, ctx: {} }, hiddenOf: () => hidden } })
    const also = [].concat(p.says?.also ?? []).map((x) => say(i18n, x.message, x.values))
    return { ...p, text: [say(i18n, p.says.message, p.says.values), ...also].join(' · ') }
  }

  it('names the file it downloads, and that it cannot be brought back in', () => {
    expect(at('>export:md 204').text).toBe('Enter downloads 1 thing as Markdown: parliament-204-2026-10-21.md · It is for reading elsewhere, and cannot be brought back in')
    expect(at('>export:md 204').act).toEqual({ kind: 'export', format: 'md', picked: [204], file: 'parliament-204-2026-10-21.md' })
    // The note goes inside its chat's section, so the file holds two things.
    expect(at('>export:jsonl records').text).toBe('Enter downloads 2 things as JSONL: parliament-records-2026-10-21.jsonl · It is for reading elsewhere, and cannot be brought back in')
  })

  it('takes the table as it is shown when no numbers are given', () => {
    const view = { search: '', filters: [{ k: 'tag', neg: false, v: ['essay'], text: 'tag:essay' }], sort: { by: 'active', asc: false } }
    expect(at('>export:', view).text).toBe('Enter downloads 1 thing as Markdown: parliament-records-shown-2026-10-21.md · It is for reading elsewhere, and cannot be brought back in')
  })

  it('says how many hidden messages stay out', () => {
    expect(at('>export:md 204', undefined, new Set(['m1', 'm2'])).text).toContain('2 hidden messages stay out')
  })

  it('refuses a number that is not here, or nothing to export', () => {
    expect(at('>export:md 299').text).toBe('Nothing here has the number 299')
    expect(at('>export:', { search: 'zzz', filters: [], sort: { by: 'active', asc: false } }).text).toBe('Nothing to export here')
  })
})

describe('the Collection (stage 6, piece 6; C144)', () => {
  const STORE = { chat: 'conversations', docket: 'dockets', note: 'notes', term: 'highlights', quote: 'pins' }
  const row = (num, kind, extra = {}) => ({
    num, kind, id: `${kind}${num}`, store: STORE[kind], chatId: kind === 'chat' ? `chat-${num}` : null, title: `${kind} ${num}`,
    tags: [], tagsMine: [], pinned: false, archived: false, docketNum: null, ...extra,
  })
  const rows = [row(202, 'chat'), row(204, 'chat'), row(210, 'note', { chatId: 'chat-202', text: 'Range map' }), row(211, 'term', { chatId: 'chat-202', text: 'tapetum' }), row(212, 'quote', { chatId: 'chat-204', text: 'Owls hunt by ear' })]
  const q2 = {
    id: 'q2', name: 'Q2', builtIn: null, createdAt: '2026-10-20T10:00:00Z', updatedAt: '2026-10-20T10:00:00Z',
    items: [{ kind: 'chat', conversationId: 'chat-202', num: 202 }, { kind: 'marking', store: 'pins', id: 'quote212', num: 212 }],
    headings: [{ id: 'h1', text: 'Causes' }], order: ['mark:pins:quote212', 'head:h1'],
  }
  const fav = { id: 'fav', name: null, builtIn: 'favorites', items: [], headings: [], order: [] }
  const cards = [210, 211, 212].map((num) => { const r = rows.find((x) => x.num === num); return { key: `mark:${r.store}:${r.id}`, num, kind: r.kind } })
  const label = (c) => c.name ?? (c.builtIn === 'favorites' ? 'Favorites' : 'Untitled collection')
  const onCollection = () => ({ ...almanac(), addressed: 'collection' })
  const at = (value, { shown = q2, a = onCollection() } = {}) => {
    const collection = { shown, all: [q2, fav], cards: shown ? cards : [], label, view: { tab: 'all', sort: 'yours', asc: false } }
    const p = preview(value, { mode: 'command', arrangement: a, screens: { records: { rows, nowIso: '2026-10-21T10:00:00Z', view: { search: '', filters: [], sort: { by: 'active', asc: false } } }, collection } })
    const also = [].concat(p.says?.also ?? []).map((x) => say(i18n, x.message, x.values))
    return { ...p, text: [say(i18n, p.says.message, p.says.values), ...also].join(' · ') }
  }

  it('new:collection makes one; add: and rm: say what goes in and out', () => {
    expect(at('>new:collection')).toMatchObject({ text: 'Enter makes a new collection and shows it', act: { kind: 'newCollection' } })
    expect(at('>add:204, 210').text).toBe('Enter puts 204 and 210 in Q2')
    expect(at('>add:204').act).toMatchObject({ kind: 'collectionWrite', id: 'q2', before: q2, after: { items: [...q2.items, { kind: 'chat', conversationId: 'chat-204', num: 204 }] } })
    expect(at('>add:212').text).toBe('Those are in Q2 already')
    expect(at('>rm:212').text).toBe('Enter takes 212 out of Q2. The things themselves stay')
    expect(at('>rm:211')).toMatchObject({ text: '211 is there because 202 is: rm:202 takes it out', act: null })
    expect(at('>rm:204').text).toBe('204 is not in Q2')
  })

  it('says there is no collection yet, and how to make one', () => {
    expect(at('>add:210', { shown: null }).text).toBe('No collection is on Collection yet. new:collection makes one')
  })

  it('places headings and cards in your order', () => {
    expect(at('>heading:"Effects" before 210').text).toBe('Enter adds the heading Effects before 210')
    expect(at('>heading:"Effects" before 210').act.after.order).toEqual(['mark:pins:quote212', 'head:h1', 'head:h2', 'mark:notes:note210', 'mark:highlights:term211'])
    expect(at('>heading:"Effects"').text).toBe('Enter adds the heading Effects at the end of your order')
    expect(at('>heading:"Effects" after 299').text).toBe('No card here has the number 299')
    expect(at('>move:211 before 212').text).toBe('Enter moves 211 before 212 in your order')
    expect(at('>move:211 before 211').text).toBe('A card cannot move beside itself')
    expect(at('>rm:"causes"').text).toBe('Enter takes out the heading Causes. The cards under it stay')
  })

  it('clear: alone empties the collection, only on the Collection', () => {
    expect(at('>clear:').text).toBe('Enter empties Q2 of 3 things. They stay where they are')
    expect(at('>clear:', { a: almanac() }).text).toBe('clear: is not built yet')
  })

  it('name:, open: and forget: take a collection by name (C144 (i))', () => {
    expect(at('>name:"Q3"').text).toBe('Enter names this collection: Q3')
    expect(at('>name:"favorites"').text).toBe('Another collection is called favorites')
    expect(at('>open:"Favorites"')).toMatchObject({ text: 'Enter shows the collection Favorites', next: { addressed: 'collection', context: { collection: 'fav' } } })
    expect(at('>forget:"Q2"')).toMatchObject({ text: 'Enter forgets the collection Q2. What it held stays where it is', act: { kind: 'collectionWrite', id: 'q2', after: null } })
    expect(at('>forget:"Favorites"').text).toBe('Enter forgets the collection Favorites. What it held stays where it is')
  })

  it('sort: and type: pick the order and the tab', () => {
    expect(at('>sort:source')).toMatchObject({ text: 'Enter groups the cards by where they come from', act: { kind: 'collectionView', view: { sort: 'source', asc: false } } })
    expect(at('>sort:oldest').text).toBe('Enter shows the oldest first')
    expect(at('>sort:active').text).toBe('On Collection, sort: takes yours, source, newest or oldest')
    expect(at('>type:keyword')).toMatchObject({ text: 'Enter shows the keywords', act: { view: { tab: 'term' } } })
  })
})

describe('the four acts, compare: and jump: (stage 6, piece 7; C145)', () => {
  const STORE = { chat: 'conversations', note: 'notes', term: 'highlights', quote: 'pins' }
  const row = (num, kind, extra = {}) => ({
    num, kind, id: `${kind}${num}`, store: STORE[kind], chatId: kind === 'chat' ? `chat-${num}` : 'chat-202', title: `${kind} ${num}`,
    tags: [], tagsMine: [], pinned: false, archived: false, docketNum: null, ...extra,
  })
  const rows = [row(202, 'chat'), row(214, 'term', { text: 'tapetum' }), row(217, 'quote', { text: 'The atmosphere did a good share of the carrying.' }), row(219, 'note', { text: 'Check the range map' })]
  const q2 = { id: 'q2', name: 'Q2', items: [], headings: [], order: [] }
  const cards = [214, 217, 219].map((num) => ({ num, kind: rows.find((r) => r.num === num).kind, key: `k${num}` }))
  const at = (value, { addressed = 'collection', helper = { keyed: true, provider: 'Anthropic', price: { inputPerMillion: 1, outputPerMillion: 5 } }, shown = q2 } = {}) => {
    const collection = { shown, all: [q2], cards, label: (c) => c.name, view: { tab: 'all', sort: 'yours' } }
    const p = preview(value, { mode: 'command', arrangement: { ...almanac(), addressed }, screens: { records: { rows, view: { search: '', filters: [], sort: { by: 'active', asc: false } } }, collection, helper } })
    const also = [].concat(p.says?.also ?? []).map((x) => say(i18n, x.message, x.values))
    return { ...p, text: [say(i18n, p.says.message, p.says.values), ...also].join(' · ') }
  }

  it('note: writes a note quoting what it names, or nothing, and never sends it', () => {
    expect(at('>note:214, 217 "Thread for the essay"')).toMatchObject({
      text: 'Enter writes a note in Q2, quoting 214 and 217 beneath it · A note is for people and is never sent',
      act: { kind: 'note', text: 'Thread for the essay', quotes: [214, 217], collection: 'q2' },
    })
    expect(at('>note:"Check the dates"').act).toEqual({ kind: 'note', text: 'Check the dates', quotes: [], collection: 'q2' })
    expect(at('>note:Check the dates', { addressed: 'almanac' })).toMatchObject({ text: 'Enter writes a note of its own in Records · A note is for people and is never sent', act: { collection: null } })
    expect(at('>note:214 ""').text).toBe('A note needs some words, like note:214 "…"')
    expect(at('>note:214').text).toBe('A note needs some words, like note:214 "…"')
    expect(at('>note:299 "x"').text).toBe('Nothing here has the number 299')
  })

  it('summarize: names its one call and its cost first, and any quote that goes', () => {
    expect(at('>summarize:214, 217')).toMatchObject({
      text: 'Enter writes a summary of 214 and 217 in Q2, dated today: one call to Anthropic, under $0.01 · 217 is a quote, kept from models until now: its words go in this call',
      act: { kind: 'summarize', nums: [214, 217], collection: 'q2' },
    })
    expect(at('>summarize:').act.nums).toEqual([214, 217, 219])
    expect(at('>summarize:202').text).toBe('202 is not a note, keyword or quote, which are what summarize: takes for now')
    expect(at('>summarize:214', { helper: { keyed: false, provider: 'Anthropic' } }).text).toBe('A summary needs a key for Anthropic. api: adds one')
    expect(at('>summarize:214', { addressed: 'almanac' }).text).toBe('summarize: writes a summary note on Collection. Rewriting a summary line here comes later')
  })

  it('compare: takes two with words, and sends nothing', () => {
    expect(at('>compare:214 219')).toMatchObject({ text: 'Enter sets 214 and 219 side by side, word by word · Nothing is sent', act: { kind: 'compare', nums: [214, 219] } })
    expect(at('>compare:214, 219').act.nums).toEqual([214, 219])
    expect(at('>compare:214').text).toBe('compare: takes two numbers, like compare:218 231')
    expect(at('>compare:214 202').text).toBe('202 is not a note, keyword or quote, which are what compare: takes for now')
  })

  it('jump: finds a number on the board the bar points at', () => {
    expect(at('>jump:217')).toMatchObject({ text: 'Enter finds 217 here', act: { kind: 'find', num: 217, to: 'card' } })
    expect(at('>jump:202').text).toBe('202 is not in Q2. add:202 puts it there')
    expect(at('>jump:217', { addressed: 'room' })).toMatchObject({ text: 'Enter finds 217 in its chat', act: { to: 'chat' } })
    expect(at('>jump:202', { addressed: 'room' }).text).toBe('202 is not a passage. open:202 shows it')
    expect(at('>jump:217', { addressed: 'almanac' })).toMatchObject({ text: 'Enter scrolls to 217', act: { to: 'row' } })
    expect(at('>go:217').text).toContain('jump:')
  })

  it('the Tag act writes tagadd: with the numbers, and asks for the word first', () => {
    expect(at('>tagadd:"" 214, 217').text).toBe('A tag needs a word, like tagadd:essay 214, 217')
    expect(at('>tagadd:"essay" 214, 217').text).toBe('Enter tags 214 and 217 with essay')
  })
})

describe('a prompt about selected cards (C145 (h))', () => {
  const target = { room: 'chat-202', keyed: true, provider: 'Anthropic', perMillion: 3, historyChars: 0, systemChars: 0 }
  const about = { nums: [214, 217], quotes: [217], chars: 400, text: '…' }
  const words = (p) => [say(i18n, p.says.message, p.says.values), ...[].concat(p.says.also ?? []).map((x) => say(i18n, x.message, x.values))].join(' · ')

  it('counts their words, says they go first, and names a quote going along', () => {
    const p = promptPreview('Why so far?', { ...target, about })
    expect(p.ready).toBe(true)
    expect(words(p)).toBe('Enter sends to Anthropic, about 103 tokens, under $0.01 to send · A new chat: the words of 2 cards go first · 217 is a quote, kept from models until now: its words go along this once')
  })

  it('needs a key, since a model reads them', () => {
    expect(words(promptPreview('Why?', { ...target, keyed: false, source: 'Wikipedia', about }))).toBe('A chat about cards needs a key for Anthropic. api: adds one')
  })
})

describe('close: and width: by a room\'s number, and close:welcome (stage 6, piece 8; C146 (c))', () => {
  const room = keep(planRoom(shipped(SPACE), 'c204'))
  const rows = [
    { num: 204, kind: 'chat', chatId: 'c204', docketNum: 203, branch: 'a' },
    { num: 203, kind: 'docket', chatId: 'c204', chatNum: 204 },
    { num: 206, kind: 'chat', chatId: 'c206', docketNum: null },
    { num: 210, kind: 'note', chatId: 'c204' },
  ]
  const at = (value, a = room) => {
    const p = preview(value, { mode: 'command', arrangement: a, screens: { records: { rows } } })
    return { ...p, text: say(i18n, p.says.message, p.says.values) }
  }

  it('closes or widens the room showing that chat, and nothing else', () => {
    expect(at('>close:204').text).toBe('Enter closes the room showing 204. Nothing is lost')
    expect(at('>close:204').next.columns.flat()).not.toContain('room')
    expect(at('>close:203').text).toBe('Enter closes the room showing 203. Nothing is lost')
    expect(at('>close:206').text).toBe('No room here shows 206. open:206 shows it')
    expect(at('>close:210').text).toBe('210 is not a chat, so no room shows it')
    expect(at('>close:299').text).toBe('Nothing here has the number 299')
    expect(at('>width:204 60%').text).toBe('Enter gives the room showing 204 60% of the width')
  })

  it('closes the welcome card from wherever the bar points', () => {
    const both = keep(planRoom(shipped('welcome'), 'c204'))
    expect(both.addressed).not.toBe('welcome')
    expect(at('>close:welcome', both).text).toBe('Enter closes the welcome page. tour: brings it back')
    expect(at('>close:welcome', both).next.columns.flat()).not.toContain('welcome')
    expect(at('>close:welcome').text).toBe('Welcome page is not open')
    // close:tour is close:welcome (29 October).
    expect(at('>close:tour', both).text).toBe('Enter closes the welcome page. tour: brings it back')
    expect(at('>close:tour', both).next.columns.flat()).not.toContain('welcome')
  })
})

describe('by: and who answers (stage 7, piece 1; C149, C150)', () => {
  const metered = (i, o) => ({ type: 'metered', inputPerMillion: i, outputPerMillion: o })
  const rows = {
    model: [
      { id: 'claude-opus-9', group: 'model', name: 'Opus 9', provider: 'anthropic', providerName: 'Anthropic', mark: '×5', later: false, needsKey: false },
      { id: 'claude-haiku-9', group: 'model', name: 'Haiku 9', provider: 'anthropic', providerName: 'Anthropic', mark: '×1', later: false, needsKey: false },
      { id: 'mistral', group: 'model', name: 'Mistral', provider: 'mistral', providerName: 'Mistral', mark: null, later: true, needsKey: false },
    ],
    local: [],
    source: [
      { id: 'wikipedia', group: 'source', name: 'Wikipedia', provider: 'wikipedia', providerName: 'Wikipedia', later: false, needsKey: false },
      { id: 'hackernews', group: 'source', name: 'Hacker News', provider: 'hackernews', providerName: 'Hacker News', later: true, needsKey: false },
    ],
  }
  const keyless = { ...rows, model: rows.model.map((r) => (r.later ? r : { ...r, needsKey: true })) }
  const now = { id: 'wikipedia', group: 'source', name: 'Wikipedia', chosen: false }
  const answering = (more = {}) => ({ room: 'c1', num: 204, now, rows, stored: null, ...more })
  const at = (value, screens) => {
    const p = preview(value, { mode: 'command', arrangement: shipped('almanac'), screens })
    return { ...p, text: say(i18n, p.says.message, p.says.values) }
  }

  it('chooses one by any part of its name, for the chat the room shows', () => {
    const p = at('>by:haiku', { answering: answering() })
    expect(p.text).toBe('Enter has Haiku 9 answer in 204')
    expect(p.act).toEqual({ kind: 'answerer', chatId: 'c1', id: 'claude-haiku-9', before: null })
  })
  it('holds a choice for the chat the next prompt starts, in a room with no chat yet', () => {
    const p = at('>by:opus', { answering: answering({ room: null, num: null }) })
    expect(p.text).toBe('Enter has Opus 9 answer the chat your next prompt starts')
    expect(p.act).toMatchObject({ kind: 'answerer', chatId: null, id: 'claude-opus-9' })
  })
  it('alone, says who answers and shows who else can', () => {
    const p = at('>by:', { answering: answering() })
    expect(p.text).toBe('Wikipedia answers here. Enter shows who else can')
    expect(p.act).toEqual({ kind: 'picker' })
  })
  it('refuses before Enter: a model with no key, one not built, several, none, or no room', () => {
    expect(at('>by:haiku', { answering: answering({ rows: keyless }) }).text).toBe('Haiku 9 needs a key for Anthropic. api:anthropic adds one')
    expect(at('>by:hacker', { answering: answering() }).text).toBe('Hacker News is not built yet')
    expect(at('>by:haiku, wikipedia', { answering: answering() }).text).toBe('Enter has Haiku 9 and Wikipedia answer your next prompt here, in that order, each a branch of its own')
    expect(at('>by:anthropic', { answering: answering() }).text).toBe('anthropic could be Opus 9 or Haiku 9. Say which, like by:"Opus 9"')
    expect(at('>by:gpt', { answering: answering() }).text).toBe('Nothing called gpt can answer. by: shows who can')
    expect(at('>by:haiku', { answering: answering({ room: undefined }) }).text).toBe('Prompts go to a room. room: opens one')
    expect(at('>by:gpt', { answering: answering() }).act).toBeNull()
    // Several are held for the next prompt (C172 (c)).
    expect(at('>by:haiku, wikipedia', { answering: answering() }).act).toEqual({ kind: 'answerers', room: 'c1', ids: ['claude-haiku-9', 'wikipedia'], order: 'together', before: null })
  })
  it('says when the one chosen answers already, and names what it replaces for undo:', () => {
    const chosen = { id: 'claude-haiku-9', group: 'model', name: 'Haiku 9', chosen: true }
    expect(at('>by:haiku', { answering: answering({ now: chosen, stored: 'claude-haiku-9' }) }).text).toBe('Haiku 9 answers here already')
    expect(at('>by:wikipedia', { answering: answering({ now: chosen, stored: 'claude-haiku-9' }) }).act.before).toBe('claude-haiku-9')
  })

  const line = (text, target) => {
    const p = promptPreview(text, target)
    return { ...p, text: p.says ? say(i18n, p.says.message, p.says.values) : null }
  }
  const room = { room: 'c1', streaming: false, keyed: true, provider: 'Anthropic', source: 'Wikipedia', historyChars: 0, systemChars: 0 }
  const model = { id: 'claude-haiku-9', group: 'model', name: 'Haiku 9', provider: 'anthropic', providerName: 'Anthropic', price: metered(1, 5) }

  it('the Enter line names who answers, and prices it by that model', () => {
    expect(line('x', { ...room, historyChars: 40_000 - 1, answerer: model }).text).toBe('Enter sends to Haiku 9, about 10,000 tokens, $0.01 to send')
    expect(line('barn owl', { ...room, answerer: { id: 'wikipedia', group: 'source', name: 'Wikipedia' } }).text).toBe('Enter asks Wikipedia, which needs no key and costs nothing')
  })
  it('prices a long prompt at the higher price where a model has one', () => {
    const tiered = { ...model, price: { ...metered(0.1, 0.5), over: { promptTokens: 100_000, inputPerMillion: 0.5, outputPerMillion: 2.5 } } }
    expect(line('x', { ...room, historyChars: 40_000 - 1, answerer: tiered }).text).toBe('Enter sends to Haiku 9, about 10,000 tokens, under $0.01 to send')
    expect(line('x', { ...room, historyChars: 800_000 - 1, answerer: tiered }).text).toBe('Enter sends to Haiku 9, about 200,000 tokens, $0.10 to send')
  })
  it('sends to no one else: a model with no key, one gone or one not built is refused', () => {
    expect(line('owl', { ...room, keyed: false, answerer: { ...model, needsKey: true } })).toMatchObject({ ready: false, text: 'Haiku 9 answers here and needs a key for Anthropic. api:anthropic adds one, by: chooses another' })
    // The key vault did not open (stage 15; C267 (h)): said as that, not as a missing key.
    expect(line('owl', { ...room, keyed: false, vaultUnreached: true, answerer: { ...model, needsKey: true } })).toMatchObject({ ready: false, text: 'Haiku 9 answers here, but the key store did not open, so no key can be used. Reload to try again; models on this computer and sources still work' })
    expect(line('owl', { ...room, answerer: { ...model, gone: true } }).text).toBe('Haiku 9 is no longer offered. by: chooses who answers here')
    expect(line('owl', { ...room, answerer: { id: 'hackernews', group: 'source', name: 'Hacker News', later: true } }).text).toBe('Hacker News answers here and is not built yet. by: chooses another')
  })
})

describe('by: with a name of several words (stage 7, piece 3)', () => {
  const rows = {
    model: [{ id: 'mistral-small-4', group: 'model', name: 'Mistral Small 4', provider: 'mistral', providerName: 'Mistral', later: false, needsKey: false },
      { id: 'mistral-large-3', group: 'model', name: 'Mistral Large 3', provider: 'mistral', providerName: 'Mistral', later: false, needsKey: false }],
    local: [],
    source: [{ id: 'wikipedia', group: 'source', name: 'Wikipedia', provider: 'wikipedia', providerName: 'Wikipedia', later: false, needsKey: false }],
  }
  const answering = { room: 'c1', num: 204, now: { id: 'wikipedia', group: 'source', name: 'Wikipedia', chosen: false }, rows, stored: null }
  const at = (value) => {
    const p = preview(value, { mode: 'command', arrangement: shipped('almanac'), screens: { answering } })
    return { ...p, text: say(i18n, p.says.message, p.says.values) }
  }
  it('reads the words together as one name, quoted or not', () => {
    expect(at('>by:mistral small').act).toMatchObject({ kind: 'answerer', id: 'mistral-small-4' })
    expect(at('>by:mistral small 4').act).toMatchObject({ id: 'mistral-small-4' })
    expect(at('>by:"Mistral Large 3"').act).toMatchObject({ id: 'mistral-large-3' })
  })
  it('reads commas as several at once, each a branch (C172 (c))', () => {
    expect(at('>by:mistral small, wikipedia').text).toBe('Enter has Mistral Small 4 and Wikipedia answer your next prompt here, in that order, each a branch of its own')
  })
  it('reads then as one after another (ruled 23 October; C202)', () => {
    const p = at('>by:wikipedia then mistral small')
    expect(p.text).toBe('Enter has Wikipedia and Mistral Small 4 answer your next prompt here one after another, each a branch of its own, each after the first on its condition')
    expect(p.act).toMatchObject({ kind: 'answerers', ids: ['wikipedia', 'mistral-small-4'], order: 'sequence' })
    expect(at('>by:mistral small, wikipedia').act).toMatchObject({ order: 'together' })
    expect(at('>by:wikipedia then mistral small, mistral large').text).toBe('Put then between each of them, as by:wikipedia then sonnet')
  })
})

describe('models on this computer (stage 7, piece 4; C163)', () => {
  const line = (text, target) => {
    const p = promptPreview(text, target)
    return { ...p, text: p.says ? say(i18n, p.says.message, p.says.values) : null }
  }
  const room = { room: 'c1', streaming: false, keyed: false, provider: 'Anthropic', source: 'Wikipedia', historyChars: 0, systemChars: 0 }
  const model = { id: 'ollama:qwen3.5:9b', group: 'local', name: 'qwen3.5:9b', provider: 'ollama', providerName: 'Ollama', price: { type: 'free-local' } }
  it('says a prompt stays on this computer, with no cost', () => {
    expect(line('owls?', { ...room, answerer: model }).text).toBe('Enter sends to qwen3.5:9b on this computer, about 2 tokens. Nothing leaves it')
  })
  it('sends nothing to a model no check has listed since the page opened', () => {
    expect(line('owls?', { ...room, answerer: { ...model, unchecked: true } })).toMatchObject({ ready: false, text: 'qwen3.5:9b is on this computer, but Ollama has not listed it since this page opened. api:ollama checks' })
  })
  it('api:ollama shows the panel at Ollama, which needs no key but a check', () => {
    const p = preview('>api:ollama', { mode: 'command', arrangement: shipped('almanac'), screens: { keys: [], noKey: ['Wikipedia'], local: { id: 'ollama', name: 'Ollama' } } })
    expect(say(i18n, p.says.message, p.says.values)).toBe('Enter shows Ollama on this computer, and how to check for it')
    expect(p.act).toEqual({ kind: 'keys', focus: 'ollama' })
  })
})

describe('framework:, new:framework and forget: (stage 7, piece 5; C164)', () => {
  const NAMES = { challenge: 'Challenge artifacts', reasoning: 'Show reasoning', pushback: 'Push back on me', alts: 'Offer alternatives', uncertain: 'Flag uncertainty' }
  const nameOf = (f) => (f.builtIn ? NAMES[f.id] : f.name)
  const list = frameworkList([{ id: 'e1', name: 'Editor', instruction: 'Make each sentence shorter.' }])
  const frameworks = (more = {}) => ({ room: 'c1', num: 204, now: [], stored: null, list, nameOf, ...more })
  const at = (value, more) => {
    const p = preview(value, { mode: 'command', arrangement: shipped('almanac'), screens: { frameworks: frameworks(more) } })
    return { ...p, text: say(i18n, p.says.message, p.says.values) }
  }

  it('sets frameworks on the chat the room shows, in the order given', () => {
    const p = at('>framework:pushback, editor')
    expect(p.text).toBe('Enter sets frameworks Push back on me and Editor for every prompt in 204, in that order, until turned off')
    expect(p.act).toEqual({ kind: 'frameworks', chatId: 'c1', ids: ['pushback', 'own:e1'], before: null })
  })
  it('reads a name of several words, and holds them for a new chat in an empty room', () => {
    expect(at('>framework:push back on me').act.ids).toEqual(['pushback'])
    expect(at('>framework:flag uncertainty, push back on me').act.ids).toEqual(['uncertain', 'pushback'])
    expect(at('>framework:uncertain', { room: null, num: null }).text).toBe('Enter sets framework Flag uncertainty for the chat your next prompt starts')
  })
  it('turns them off, says when nothing changes, and shows them alone', () => {
    expect(at('>framework:off', { now: ['pushback'], stored: ['pushback'] })).toMatchObject({ text: 'Enter turns off the frameworks in 204', act: { ids: [], before: ['pushback'] } })
    expect(at('>framework:pushback', { now: ['pushback'] }).text).toBe('That is how the frameworks stand here already')
    expect(at('>framework:', { now: ['pushback'] })).toMatchObject({ text: 'Framework Push back on me is on here. Enter shows them all', act: { kind: 'frameworkPicker' } })
  })
  it('refuses a name it does not know, and asks which when several fit', () => {
    expect(at('>framework:nope').text).toBe('No framework is called nope. framework: shows them')
    expect(at('>framework:nope').act).toBeNull()
  })
  it('keeps a framework of your own, or rewrites one, and refuses a built-in name', () => {
    expect(at('>new:framework "Skeptic" "Doubt everything I say."')).toMatchObject({ text: 'Enter keeps “Skeptic” as a framework of yours. framework: puts it on a chat', act: { kind: 'ownFramework', name: 'Skeptic', before: null } })
    expect(at('>new:framework "editor" "Shorter still."').act.before.id).toBe('e1')
    expect(at('>new:framework "Push back on me" "x"').text).toBe('“Push back on me” is a framework built in. Give yours another name')
    expect(at('>new:framework').text).toBe('A framework needs a name and what it asks: new:framework "brief" "keep each answer short"')
  })
  it('forgets one of your own by name', () => {
    expect(at('>forget:"Editor"')).toMatchObject({ text: 'Enter removes your framework “Editor”. Chats it is on go on without it', act: { kind: 'forgetFramework' } })
    expect(at('>forget:"Editor" framework').act.record.id).toBe('e1')
  })
  it('names the frameworks that go with a prompt', () => {
    const p = promptPreview('owls?', { room: 'c1', streaming: false, keyed: true, provider: 'Anthropic', source: 'Wikipedia', historyChars: 0, systemChars: 0,
      answerer: { id: 'm', group: 'model', name: 'Haiku 9', price: null }, frameworks: ['Push back on me', 'Editor'] })
    expect(p.says.also.map((x) => say(i18n, x.message, x.values))).toContain('Frameworks Push back on me and Editor go with it, in that order')
  })
})

describe('markup: replies marked up, or clean (stage 11, piece 1)', () => {
  const at = (value, screens = {}) => {
    // It works where replies are edited: a room.
    const p = preview(value, { mode: 'command', arrangement: { ...shipped('almanac'), addressed: 'room' }, screens })
    return { ...p, text: say(i18n, p.says.message, p.says.values) }
  }
  it('turns markup off and on, marked up unless turned off', () => {
    expect(at('>markup:off')).toMatchObject({ text: 'Enter shows replies clean: the result only, read-only until markup:on', act: { kind: 'markup', on: false, before: true } })
    expect(at('>markup:on', { markup: { on: false } }).act).toEqual({ kind: 'markup', on: true, before: false })
    expect(at('>markup:on').text).toBe('Replies are marked up already')
    expect(at('>markup:off', { markup: { on: false } }).text).toBe('Replies are clean already')
  })
})

describe('ask: an ask from the bar (stage 11, piece 4; C218 (a))', () => {
  const at = (value) => {
    const p = preview(value, { mode: 'command', arrangement: { ...shipped('almanac'), addressed: 'room' }, screens: {} })
    return { ...p, text: say(i18n, p.says.message, p.says.values) }
  }
  it('opens the ask box, or keeps the ask written after it', () => {
    expect(at('>ask:')).toMatchObject({ act: { kind: 'ask', question: null } })
    expect(at('>ask:').text).toMatch(/^Enter opens the ask box/)
    expect(at('>ask:"Add the year it opened"').act).toEqual({ kind: 'ask', question: 'Add the year it opened' })
    expect(at('>ask:' + '"' + 'x'.repeat(1001) + '"')).toMatchObject({ act: null, text: 'An ask holds up to 1000 characters' })
  })
})

describe('thinking: and the Enter line of a model that thinks (C165)', () => {
  const at = (value, on = true) => {
    const p = preview(value, { mode: 'command', arrangement: shipped('almanac'), screens: { thinking: { on } } })
    return { ...p, text: say(i18n, p.says.message, p.says.values) }
  }
  it('is off unless turned on', () => {
    const p = preview('>thinking:', { mode: 'command', arrangement: shipped('almanac'), screens: {} })
    expect(say(i18n, p.says.message, p.says.values)).toBe('Thinking is off. thinking:on turns it back on')
  })
  it('turns thinking off and on, and says how it stands', () => {
    expect(at('>thinking:off')).toMatchObject({ text: 'Enter turns thinking off: models that can think answer straight away, quicker and perhaps less careful', act: { kind: 'thinking', on: false, before: true } })
    expect(at('>thinking:on', false).act).toEqual({ kind: 'thinking', on: true, before: false })
    expect(at('>thinking:on').text).toBe('Thinking is on already')
    expect(at('>thinking:').text).toBe('Models that can think do so first, shown as they go. thinking:off turns it off')
  })
  it('says before Enter that a local model will think first, or that it will not', () => {
    const who = { id: 'ollama:bonsai-2:9b', group: 'local', name: 'bonsai-2:9b', provider: 'ollama', providerName: 'Ollama', thinks: true }
    const room = { room: 'c1', streaming: false, keyed: false, provider: 'Anthropic', source: 'Wikipedia', historyChars: 0, systemChars: 0 }
    const also = (thinking) => promptPreview('owls?', { ...room, answerer: who, thinking }).says.also.map((x) => say(i18n, x.message, x.values))
    expect(also(true)[0]).toBe('bonsai-2:9b thinks before answering, shown as it goes. On this computer that can take minutes. thinking:off skips it')
    expect(also(false)[0]).toBe('bonsai-2:9b answers straight away, without thinking first. thinking:on lets it, shown as it goes, which can take minutes on this computer')
    expect(promptPreview('owls?', { ...room, answerer: who }).says.also.map((x) => x.message)[0]).toBe('promptThinksOff')
  })
})

describe('edits on the Enter line (stage 11, piece 3; C216)', () => {
  const room = { room: 'c1', streaming: false, keyed: true, provider: 'Anthropic', source: 'Wikipedia', historyChars: 0, systemChars: 0 }
  const model = { id: 'm', group: 'model', name: 'Haiku 9', price: null }
  const also = (p) => (p.says?.also ?? []).map((x) => say(i18n, x.message, x.values))
  it('counts what goes with a prompt, and who reads it', () => {
    const p = promptPreview('Go on.', { ...room, answerer: model, edits: { count: 3, chars: 120 } })
    expect(p.ready).toBe(true)
    expect(also(p)).toContain('With it, told once: 3 edits · Haiku 9 reads them')
    const both = promptPreview('Go on.', { ...room, answerer: model, edits: { count: 2, asks: 1, chars: 120 } })
    expect(also(both)).toContain('With it, told once: 2 edits and 1 ask · Haiku 9 reads them')
  })
  it('sends just the edits on an empty Enter', () => {
    const p = promptPreview('', { ...room, answerer: model, edits: { count: 1, chars: 80 } })
    expect(p).toMatchObject({ ready: true, editsOnly: true })
    expect(also(p)[0]).toBe('Nothing typed: just your 1 edit, told to Haiku 9')
  })
  it('on the branch of a source, sends them to a model at the same time, or says it needs a key (C218 (e))', () => {
    const wiki = { id: 'wikipedia', group: 'source', name: 'Wikipedia' }
    const p = promptPreview('', { ...room, answerer: wiki, edits: { count: 2, chars: 80 } })
    expect(p.ready).toBe(false)
    expect(say(i18n, p.says.message, p.says.values)).toBe('Wikipedia reads none of your 2 edits. A model reads them once it has a key: api:')
    const reader = { id: 'm', group: 'model', name: 'Haiku 9' }
    const only = promptPreview('', { ...room, answerer: wiki, reader, historyChars: 400, edits: { count: 2, asks: 1, chars: 0 } })
    expect(only).toMatchObject({ ready: true, editsOnly: true, toReader: true })
    expect(say(i18n, only.says.message, only.says.values)).toBe('Enter sends just your 2 edits and 1 ask to Haiku 9, about 100 tokens · Wikipedia reads none')
    const along = promptPreview('glass', { ...room, answerer: wiki, reader, historyChars: 400, edits: { count: 1, chars: 0 } })
    expect(also(along)).toContain('Your 1 edit goes to Haiku 9 at the same time, about 100 tokens · Wikipedia reads none')
  })
  it('holds an edit here back, and lets it go (C216 (f))', () => {
    const heldEdits = { byNum: new Map([[242, { id: 'm:e1', held: false, sent: false }], [243, { id: 'm:e2', held: true, sent: false }], [244, { id: 'm:e3', held: false, sent: true }]]) }
    const at = (value) => {
      const p = preview(value, { mode: 'command', arrangement: { ...shipped('almanac'), addressed: 'room' }, screens: { heldEdits } })
      return { ...p, text: say(i18n, p.says.message, p.says.values) }
    }
    expect(at('>hold:242')).toMatchObject({ text: 'Enter holds back 242: yours, and not sent, until hold:off', act: { kind: 'holdEdits', edits: [{ num: 242, id: 'm:e1', list: 'edits' }], held: true } })
    expect(at('>hold:off 243').act).toEqual({ kind: 'holdEdits', edits: [{ num: 243, id: 'm:e2', list: 'edits' }], held: false })
    expect(at('>hold:243').text).toBe('Held back already: 243')
    expect(at('>hold:244').text).toBe('244 was told already, so it cannot be held back')
  })
})

describe('tell: notes on the Enter line (stage 11, piece 7; C225 (d), (e))', () => {
  const room = { room: 'c1', streaming: false, keyed: true, provider: 'Anthropic', source: 'Wikipedia', historyChars: 0, systemChars: 0 }
  const model = { id: 'm', group: 'model', name: 'Haiku 9', price: null }
  const also = (p) => (p.says?.also ?? []).map((x) => say(i18n, x.message, x.values))
  it('counts the notes that go with a prompt, and who reads them', () => {
    expect(also(promptPreview('Go on.', { ...room, answerer: model, told: { count: 1, chars: 80 } }))).toContain('With it, told once: your note · Haiku 9 reads it')
    expect(also(promptPreview('Go on.', { ...room, answerer: model, told: { count: 2, chars: 80 } }))).toContain('With it, told once: your 2 notes · Haiku 9 reads them')
  })
  it('goes with edits sent on an empty Enter, and alone waits for words', () => {
    const p = promptPreview('', { ...room, answerer: model, edits: { count: 1, chars: 80 }, told: { count: 1, chars: 60 } })
    expect(p).toMatchObject({ ready: true, editsOnly: true })
    expect(also(p).slice(0, 2)).toEqual(['Nothing typed: just your 1 edit, told to Haiku 9', 'With it, told once: your note · Haiku 9 reads it'])
    expect(promptPreview('', { ...room, answerer: model, told: { count: 1, chars: 60 } }).ready).toBe(false)
  })
  it('on the branch of a source, goes to the reader, or waits for a key', () => {
    const wiki = { id: 'wikipedia', group: 'source', name: 'Wikipedia' }
    expect(also(promptPreview('glass', { ...room, answerer: wiki, told: { count: 1, chars: 60 } }))).toContain('Wikipedia reads no notes. Yours waits for a model with a key: api:')
    const reader = { id: 'm', group: 'model', name: 'Haiku 9' }
    expect(also(promptPreview('glass', { ...room, answerer: wiki, reader, told: { count: 2, chars: 60 } }))).toContain('Your 2 notes go to Haiku 9 at the same time · Wikipedia reads none')
  })
})

describe('Ripple on the Enter line (stage 12, piece 2; C231 (d))', () => {
  const room = { room: 'c1', streaming: false, keyed: true, provider: 'Anthropic', source: 'Wikipedia', historyChars: 0, systemChars: 0 }
  const model = { id: 'm', group: 'model', name: 'Sonnet 5.5', price: null }
  const also = (p) => (p.says?.also ?? []).map((x) => say(i18n, x.message, x.values))
  const ripple = { nums: ['201b', '201c'], count: 2, ready: true, name: 'Haiku 5.5', perMillion: 1, chars: 4000 }
  it('names the checks, who makes them and their cost, before Enter', () => {
    const p = promptPreview('Go on.', { ...room, answerer: model, edits: { count: 1, chars: 80 }, ripple })
    expect(also(p)).toContain('Ripple checks 201b and 201c: 2 calls to Haiku 5.5, under $0.01')
    const big = promptPreview('Go on.', { ...room, answerer: model, edits: { count: 1, chars: 80 }, ripple: { ...ripple, perMillion: 3, chars: 40000 } })
    expect(also(big)).toContain('Ripple checks 201b and 201c: 2 calls to Haiku 5.5, about $0.06')
    expect(also(promptPreview('', { ...room, answerer: model, edits: { count: 1, chars: 80 }, ripple }))).toContain('Ripple checks 201b and 201c: 2 calls to Haiku 5.5, under $0.01')
  })
  it('says when checking needs a key, and says nothing without edits going', () => {
    expect(also(promptPreview('Go on.', { ...room, answerer: model, edits: { count: 1, chars: 80 }, ripple: { ...ripple, ready: false } }))).toContain('Ripple is on, but checking 201b and 201c needs a model with a key: api:')
    expect(also(promptPreview('Go on.', { ...room, answerer: model, ripple })).some((t) => t.startsWith('Ripple'))).toBe(false)
  })
})

describe('a second room (C175 (a))', () => {
  it('takes the commands that work in a room', () => {
    const a = { ...shipped('almanac'), addressed: 'room-2' }
    const p = preview('>tell:"Shorter"', { mode: 'command', arrangement: a, screens: { telling: { room: 'c1', held: [] } } })
    expect(p.act).toMatchObject({ kind: 'tell' })
  })
})

describe('Ripple and a source answering (C228 (d))', () => {
  it('names no checks when a source answers the branch', () => {
    const room = { room: 'c1', streaming: false, keyed: false, provider: 'Anthropic', source: 'Wikipedia', historyChars: 0, systemChars: 0 }
    const wiki = { id: 'wikipedia', group: 'source', name: 'Wikipedia' }
    const p = promptPreview('glass', { ...room, answerer: wiki, edits: { count: 1, chars: 80 }, ripple: { nums: ['201b'], count: 1, ready: true, name: 'Haiku 5.5', perMillion: 1, chars: 100 } })
    expect((p.says?.also ?? []).some((x) => x.message.startsWith('promptRipple'))).toBe(false)
  })
})

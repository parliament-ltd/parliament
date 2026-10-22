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
    expect(at('>room:', p.next, { lastRoom: { id: 'c2' } }).text).toBe('Enter shows the last room here')
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
    expect(at('>focus:save').text).toBe('focus: is not built yet')
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
    expect(at('>undo:242', { undo: 'pin:202' }).text).toBe('undo: is not built yet')
  })
})

describe('erase: (stage 6, piece 4; C137)', () => {
  const row = (num, kind, extra = {}) => ({ num, kind, id: `${kind}${num}`, chatId: kind === 'chat' ? `c${num}` : null, store: kind === 'chat' ? 'conversations' : 'notes', title: `${kind} ${num}`, tags: [], tagsMine: [], docketNum: null, ...extra })
  const rows = [row(204, 'chat', { title: 'barn owl', docketNum: 203 }), row(206, 'chat', { title: 'Essay plan', docketNum: 205 }), row(210, 'note', { chatId: 'c204', text: 'Check the range map' })]
  const at = (value) => {
    const p = preview(value, { mode: 'command', arrangement: almanac(), screens: { records: { rows, view: { search: '', filters: [], sort: { by: 'active', asc: false } } } } })
    const also = [].concat(p.says?.also ?? []).map((x) => say(i18n, x.message, x.values))
    return { ...p, text: [say(i18n, p.says.message, p.says.values), ...also].join(' · ') }
  }

  it('names everything that goes, what stays, and that it is for good', () => {
    expect(at('>erase:204').text).toBe('Enter erases 204 “barn owl” for good · 1 note, keyword or quote stays, marked as from an erased chat. Add all to erase it too · Plan 203 goes with its last chat · Undo cannot bring it back, and stops here')
    expect(at('>erase:204, 206 all').text).toBe('Enter erases 204 “barn owl” and 206 “Essay plan” for good · 1 note, keyword or quote goes too · Plans 203 and 205 go with their last chats · Undo cannot bring them back, and stops here')
    expect(at('>erase:204').act).toMatchObject({ kind: 'erase', chats: [{ id: 'c204', num: 204 }], keepMarks: true })
  })

  it('runs alone, takes numbers only, and answers delete: with itself', () => {
    expect(at('>erase:204 pin:206').text).toBe('erase: runs on a line of its own, so it is plain what goes for good')
    expect(at('>erase:all').text).toBe('erase: does not take that. For example: erase:207')
    expect(at('>delete:204').text).toBe('To remove something for good, use erase:. Enter writes it in')
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
    expect(at('>forget:"Favorites"').text).toBe('Favorites stays while the heart on messages fills it')
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

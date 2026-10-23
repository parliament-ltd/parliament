import { describe, it, expect } from 'vitest'
import { setupI18n } from '@lingui/core'
import { VERBS, RENAMED, RETIRED, KEPT_FREE, GROUPS, LEADERS, BOARD_NAMES } from './verbs'
import { lookup, parse, matchForm, verbEntry, nearest, enterLine, complete, reference } from './registry'
import { COPY } from '../copy'
import { boardFor } from '../shell/boards'
import { messages as en } from '../locales/en/messages.mjs'

const ALL = new Set(VERBS.map((v) => v.verb))
const line = (value, ctx = {}) => enterLine(value, { mode: 'command', ...ctx })

describe('the verb list', () => {
  it('has one entry per verb, each complete', () => {
    expect(ALL.size).toBe(VERBS.length)
    const groups = new Set(GROUPS.map((g) => g.key))
    for (const v of VERBS) {
      expect(v.verb, v.verb).toMatch(/^[a-z]+$/)
      expect(groups.has(v.group), v.verb).toBe(true)
      expect(Array.isArray(v.takes) && v.takes.length > 0, v.verb).toBe(true)
      expect(['apply', 'fill'], v.verb).toContain(v.click)
      expect(Number.isInteger(v.stage) && v.stage >= 3 && v.stage <= 14, v.verb).toBe(true)
      expect(typeof v.gloss?.id, v.verb).toBe('string')
    }
  })

  it('accepts every example and form it shows', () => {
    for (const v of VERBS) {
      for (const form of v.forms ?? [v.example]) {
        const [cmd, ...others] = parse(form).commands
        expect(others, form).toEqual([])
        expect(cmd?.verb, form).toBe(v.verb)
        expect(matchForm(v, cmd), form).not.toBeNull()
      }
      if (v.forms) expect(v.forms, v.verb).toContain(v.example)
    }
  })

  it('never reuses an old word, and points every old word at a current verb', () => {
    for (const [old, { to }] of Object.entries(RENAMED)) {
      expect(ALL.has(old), old).toBe(false)
      expect(ALL.has(to), `${old} -> ${to}`).toBe(true)
    }
    for (const old of [...Object.keys(RETIRED), ...KEPT_FREE]) expect(ALL.has(old), old).toBe(false)
  })

  it('marks every verb that sends something, so its Enter line names who and what it costs', () => {
    const spends = VERBS.filter((v) => v.spends).map((v) => v.verb).sort()
    expect(spends).toEqual(['again', 'reflect', 'rewrite', 'ripple', 'run', 'summarize', 'sweep', 'translate'])
    // Nothing that sends is applied on a click: it waits for Enter.
    for (const v of VERBS.filter((x) => x.spends)) expect(v.click, v.verb).toBe('fill')
  })

  it('never applies on a click what undo cannot take back, apart from screen-only moves', () => {
    const SCREEN_ONLY = ['records', 'plan', 'library', 'lab', 'room', 'jump', 'tour', 'resources', 'open', 'inspect', 'copy', 'stop', 'diff', 'compare', 'undo', 'done', 'api']
    // Filters only change the view, and clear:filters puts it back.
    for (const v of VERBS.filter((x) => x.click === 'apply' && !x.undoable && x.group !== 'filters')) expect(SCREEN_ONLY, v.verb).toContain(v.verb)
    expect(verbEntry('delete').click).toBe('fill')
    expect(verbEntry('delete').undoable).toBe(false)
    expect(VERBS.filter((x) => x.destructive).map((x) => x.verb)).toEqual(['delete'])
  })
})

describe('the glosses', () => {
  const glosses = [...VERBS.map((v) => ({ where: v.verb, ...v.gloss })), ...GROUPS.map((g) => ({ where: g.key, ...g.title })), { where: 'leaders', ...LEADERS.title }, ...LEADERS.rows.map((r) => ({ where: r.example, ...r.gloss }))]
  // Names that keep their capital in a sentence: boards, formats and a key.
  const PROPER = new Set(['Parliament', 'Records', 'Plan', 'Collection', 'Library', 'Lab', 'Markdown', 'JSONL', 'Enter', 'English'])

  it('have unique ids and follow the copy rules', () => {
    const ids = glosses.map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
    const copyIds = new Set(Object.values(COPY).flatMap((group) => Object.values(group).map((e) => e.id)))
    for (const g of glosses) {
      expect(copyIds.has(g.id), g.id).toBe(false)
      expect(g.message, g.where).not.toMatch(/—/)
      expect(g.message, g.where).not.toMatch(/Anthropic|Mistral|Ollama|Claude/)
      for (const sentence of g.message.split(/(?<=[.!?])\s+/)) {
        const words = sentence.replace(/[.,!?;:"()']/g, '').split(/\s+/).slice(1)
        expect(words.filter((w) => /^\p{Lu}/u.test(w) && !PROPER.has(w)), `${g.where}: "${sentence}"`).toEqual([])
      }
    }
  })

  it('are in the compiled catalogue', () => {
    for (const g of glosses) expect(en[g.id], g.id).toBeDefined()
    const i18n = setupI18n({ locale: 'en', messages: { en } })
    expect(i18n._(verbEntry('bar').gloss)).toBe('Move the bar on the page')
  })
})

describe('reading a command with the registry', () => {
  it('knows which verbs keep the rest of the line', () => {
    expect(lookup('tell')).toEqual({ rest: true })
    expect(lookup('open')).toEqual({ rest: false })
    expect(lookup('rename')).toEqual({})
    expect(lookup('strain')).toEqual({})
    expect(lookup('https')).toBeNull()
    expect(lookup('constructor')).toBeNull()
    expect(lookup('toString')).toBeNull()
  })

  it('suggests the verb one slip away, but never for a word kept free', () => {
    expect(nearest('opne')).toBe('open')
    expect(nearest('focuss')).toBe('focus')
    expect(nearest('key')).toBeNull()
    expect(nearest('list')).toBeNull()
    expect(nearest('xylophone')).toBeNull()
  })
})

describe('the Enter line', () => {
  const built = new Set(['bar', 'open', 'close', 'pop'])

  it('asks for a command when there is only the >', () => {
    expect(line('>')).toMatchObject({ state: 'empty', message: 'empty' })
  })

  it('says a built command is ready, and an unbuilt one is not built yet', () => {
    expect(line('>bar:bottom', { built })).toMatchObject({ state: 'ready', verb: 'bar' })
    expect(line('>tour:', { built })).toMatchObject({ state: 'later', message: 'later', values: { verb: 'tour:' } })
  })

  it('answers a renamed verb with the new one, and writes it in without running', () => {
    const a = line('>rename:"Field notes"')
    expect(a).toMatchObject({ state: 'renamed', message: 'renamed', values: { verb: 'rename:', now: 'name:' } })
    expect(a.fill).toBe('>name:"Field notes"')
    expect(line('>hide:library').fill).toBe('>close:library')
  })

  it('answers erase: and drop: with delete:, as ruled on 23 October (C199)', () => {
    expect(line('>erase:207')).toMatchObject({ state: 'renamed', message: 'renamed', fill: '>delete:207' })
    expect(line('>drop:241')).toMatchObject({ state: 'renamed', fill: '>delete:241' })
  })

  it('says a retired verb is gone, with what to use', () => {
    expect(line('>strain:')).toMatchObject({ state: 'retired', message: 'retired' })
    expect(line('>c:')).toMatchObject({ state: 'retired', message: 'retiredInstead', values: { instead: 'new:chat · open:' } })
    expect(line('>bar:hide')).toMatchObject({ state: 'retired', values: { verb: 'bar:hide', instead: 'focus: · calm:' } })
    expect(line('>bar:foot')).toMatchObject({ state: 'retired', values: { instead: 'bar:bottom' } })
    expect(line('>add:key')).toMatchObject({ state: 'retired', values: { instead: 'api:' } })
  })

  it('answers an unknown verb, with a likely slip where there is one', () => {
    expect(line('>opne:207')).toMatchObject({ state: 'unknown', message: 'didYouMean', values: { verb: 'opne:', near: 'open:' } })
    expect(line('>frobnicate:207')).toMatchObject({ state: 'unknown', message: 'unknown' })
    expect(line('>key:')).toMatchObject({ state: 'unknown', message: 'unknown' })
    expect(line('>constructor:')).toMatchObject({ state: 'unknown' })
    expect(line('>almanac')).toMatchObject({ state: 'unknown', message: 'notCommand' })
  })

  it('says what a verb takes when the command does not fit', () => {
    expect(line('>bar:sideways')).toMatchObject({ state: 'misfit', message: 'takesWords', values: { words: ['top', 'bottom', 'left', 'center', 'right'] } })
    expect(line('>delete:all')).toMatchObject({ state: 'misfit', message: 'takesExample', values: { example: 'delete:207' } })
    expect(line('>delete:201-205')).toMatchObject({ state: 'misfit' })
  })

  it('says where a verb works when it does not work here', () => {
    expect(line('>type:chat', { board: 'settings' })).toMatchObject({ state: 'elsewhere', values: { boards: ['almanac', 'collection'] } })
    expect(line('>type:chat', { board: 'almanac' }).state).toBe('later')
  })

  it('lets commands share a line, to run in turn (C99)', () => {
    const filters = new Set(['type', 'tag'])
    expect(line('>type:chat -tag:essay', { board: 'almanac', built: filters })).toMatchObject({ state: 'ready', message: 'filters', values: { count: 2 } })
    const a = line('>bar:bottom open:207 pop:library', { built })
    expect(a).toMatchObject({ state: 'ready', message: 'sequence', values: { count: 3, verbs: ['bar:', 'open:', 'pop:'] } })
    expect(a.steps.map((s) => s.verb)).toEqual(['bar', 'open', 'pop'])
    expect(a.steps[1].match.values[0]).toMatchObject({ kind: 'address', num: 207 })
  })

  it('says not built yet if any command on the line is not', () => {
    expect(line('>bar:bottom tour:', { built })).toMatchObject({ state: 'later', values: { verb: 'tour:' } })
  })

  it('stops at the first command it cannot run, and says why', () => {
    expect(line('>bar:bottom opne:207', { built })).toMatchObject({ state: 'unknown', values: { near: 'open:' } })
    expect(line('>bar:sideways open:207', { built })).toMatchObject({ state: 'misfit', verb: 'bar' })
  })

  it('keeps a command that sends something, and delete:, on a line of its own', () => {
    expect(line('>bar:bottom summarize:207', { board: 'almanac' })).toMatchObject({ state: 'alone', message: 'aloneSpends', values: { verb: 'summarize:' } })
    expect(line('>pin:207 delete:208')).toMatchObject({ state: 'alone', message: 'aloneErase', values: { verb: 'delete:' } })
    expect(line('>summarize:207', { board: 'almanac' }).state).toBe('later')
    expect(line('>delete:207').state).toBe('later')
  })

  it('gives a verb that keeps the rest of the line everything after it', () => {
    const a = line('>pin:207 note:207 "see type:chat"')
    expect(a.steps.map((s) => s.verb)).toEqual(['pin', 'note'])
  })

  it('fixes a renamed verb in place, keeping the rest of the line', () => {
    expect(line('>bar:bottom hide:library').fill).toBe('>bar:bottom close:library')
    expect(line('>-source:201 type:chat', { board: 'almanac' }).fill).toBe('>-from:201 type:chat')
  })

  it('takes a minus on filters only', () => {
    expect(line('>-tag:essay', { board: 'almanac' }).state).toBe('later')
    expect(line('>-open:207')).toMatchObject({ state: 'misfit', message: 'noMinus' })
  })

  it('refuses a line shaped like a key before Enter', () => {
    expect(line('>api:anthropic sk-ant-api03-xyz')).toMatchObject({ state: 'key', message: 'key' })
    expect(line('>api:mistral 8fQ2kLmN0pR4sT6uV8wX0yZ2aB4cD6eF')).toMatchObject({ state: 'key' })
  })

  it('answers ? and help', () => {
    expect(line('>?')).toMatchObject({ state: 'help', message: 'help' })
    expect(line('>?bar')).toMatchObject({ state: 'help', message: 'helpVerb', values: { verb: 'bar:' } })
    expect(line('>help:frob')).toMatchObject({ state: 'unknown', message: 'unknownHelp' })
  })

  it('leaves prompts and searches to their own lines', () => {
    expect(enterLine('p>why', { mode: 'search' })).toMatchObject({ state: 'mode', message: 'prompt' })
    expect(enterLine('almanac', { mode: 'search' })).toMatchObject({ state: 'mode', message: 'search' })
  })

  it('has a sentence in the copy table for every answer it gives', () => {
    const messages = ['empty', 'help', 'helpVerb', 'unknownHelp', 'notCommand', 'unknown', 'didYouMean', 'renamed', 'erase', 'retired', 'retiredInstead', 'noMinus', 'elsewhere', 'takesWords', 'takesExample', 'later', 'ready', 'sequence', 'aloneSpends', 'aloneErase', 'filters', 'key']
    for (const m of messages) expect(COPY.enter[m], m).toBeDefined()
    for (const r of Object.values(RENAMED)) if (r.message) expect(COPY.enter[r.message], r.message).toBeDefined()
  })

  it('names boards by keys the copy table has', () => {
    const named = new Set(VERBS.flatMap((v) => (v.on === 'everywhere' ? [] : v.on)))
    for (const board of [...named, ...BOARD_NAMES.map(boardFor)]) expect(COPY.boards[board], board).toBeDefined()
  })
})

describe('completion', () => {
  it('offers the verbs that start with what is typed, for this board', () => {
    expect(complete('fo')).toEqual(['focus:', 'forget:'])
    expect(complete('ty', 'settings')).toEqual([])
    expect(complete('ty', 'almanac')).toEqual(['type:'])
    expect(complete('')).toEqual([])
  })

  it('offers the words a verb takes once the colon is there', () => {
    expect(complete('bar:')).toEqual(['bar:top', 'bar:bottom', 'bar:left', 'bar:center', 'bar:right'])
    expect(complete('bar:b')).toEqual(['bar:bottom'])
    expect(complete('pop:ba')).toEqual(['pop:back'])
    expect(complete('open:201 x')).toEqual([])
  })
})

describe('the reference', () => {
  it('leads with the bar, then every group that has verbs here', () => {
    const all = reference()
    expect(all[0].group).toBe('leaders')
    expect(all.slice(1).map((g) => g.group)).toEqual(GROUPS.map((g) => g.key))
    expect(all.flatMap((g) => g.rows).length).toBe(VERBS.length + LEADERS.rows.length)
  })

  it('shows on a board only what works there', () => {
    const settings = reference('settings').flatMap((g) => g.rows.map((r) => r.verb)).filter(Boolean)
    expect(settings).toContain('set')
    expect(settings).toContain('bar')
    expect(settings).not.toContain('type')
    expect(settings).not.toContain('tell')
  })
})

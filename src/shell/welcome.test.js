import { describe, it, expect } from 'vitest'
import { STEPS, ADVANCED_STEPS, ADVANCED_GROUPS, freshWelcome, cleanWelcome, tick, nextStep, nextAdvanced, isDone, showSteps, withChat, stepsShown, stepsMade, stepsKept, advancedNumbers, carriesEdit } from './welcome'
import { shipped } from './arrangement'

describe('the welcome steps (stage 5)', () => {
  it('are the nine as ruled, the Lab step waiting with the Lab: bar:bottom second, pop:records sixth, api: seventh, then strike and a highlight (C131 names, C225, C279 (a), C282)', () => {
    expect(STEPS.map((s) => s.shows)).toEqual(['>', 'bar:bottom', 'p>', 'records:', 'name:"…"', 'pop:records', 'api:', 'strikethrough:', null])
    expect(STEPS.at(-1)).toMatchObject({ id: 'highlight', writes: null })
    expect(STEPS.find((s) => s.id === 'strike').writes).toBe('>strikethrough:')
    expect(STEPS.find((s) => s.id === 'almanac').writes).toBe('>records:')
  })

  it('cross off in any order, and the last one finishes the page', () => {
    let w = freshWelcome()
    w = tick(w, 'key')
    w = tick(w, 'command')
    expect(w.done).toEqual(['command', 'key'])
    expect(nextStep(w).id).toBe('bar')
    expect(tick(w, 'key')).toBe(w)
    // The Lab's step is no step while the Lab waits (C279 (a)).
    expect(tick(w, 'lab')).toBe(w)
    expect(tick(w, 'nonsense')).toBe(w)
    for (const s of STEPS) w = tick(w, s.id)
    expect(w.finished).toBe(true)
    expect(nextStep(w)).toBeNull()
    expect(isDone(w, 'key')).toBe(true)
  })

  it('reads stored progress safely', () => {
    expect(cleanWelcome(null)).toEqual(freshWelcome())
    const w = cleanWelcome({ done: ['key', 'evil', 'command', 'command'], off: 'yes', chat: 7 })
    expect(w).toEqual({ done: ['command', 'key'], off: false, finished: false, chat: null, advanced: false, advancedDone: [] })
  })

  it('puts the list away and back, and remembers the chat it started', () => {
    const w = freshWelcome()
    expect(showSteps(w, false).off).toBe(true)
    expect(showSteps(w, true)).toBe(w)
    expect(withChat(w, 'c1').chat).toBe('c1')
  })

  it('sees steps in the welcome screen as it stands', () => {
    const a = shipped('welcome')
    expect(stepsShown(a)).toEqual([])
    const b = { ...a, bar: { ...a.bar, at: 'bottom' }, columns: [['welcome'], ['almanac']], popped: [{ board: 'library' }] }
    expect(stepsShown(b)).toEqual(['bar', 'almanac', 'pop'])
    // Step 7 is the Lab open (C265).
    expect(stepsShown({ ...b, lab: { columns: [['canvas']], popped: [], addressed: 'canvas', bar: b.bar } })).toEqual(['bar', 'almanac', 'pop', 'lab'])
  })

  it('drops the Lab step, and the Library step ticked before C265, while the Lab waits (C279 (a))', () => {
    expect(cleanWelcome({ done: ['command', 'library', 'lab'] }).done).toEqual(['command'])
  })
})

describe('steps 9 and 10 (stage 11, piece 7; C225)', () => {
  const edit = (change) => ({ kind: 'edit', num: 242, change: { struck: '', added: '', sent: null, ...change } })
  it('cross off a strike saved and an edit or ask sent, from the numbered rows', () => {
    expect(stepsMade([])).toEqual([])
    expect(stepsMade([edit({ added: 'more' })])).toEqual([])
    expect(stepsMade([edit({ struck: 'eleven' })])).toEqual(['strike'])
    expect(stepsMade([edit({ struck: 'eleven', sent: { to: 'haiku', at: 'x', into: null } })])).toEqual(['strike', 'send'])
    expect(stepsMade([{ kind: 'ask', num: 203, change: { sent: { to: 'haiku' } } }])).toEqual(['send'])
    expect(stepsMade([{ kind: 'chat', num: 202 }])).toEqual([])
    // A highlight crosses off step 9 (C282).
    expect(stepsMade([{ kind: 'highlight', num: 205 }])).toEqual(['highlight'])
    expect(stepsMade([{ kind: 'chat', num: 202, marks: ['highlight'] }])).toEqual(['highlight'])
    expect(stepsMade([{ kind: 'chat', num: 202, marks: ['term'] }])).toEqual(['highlight'])
    expect(stepsMade([{ kind: 'chat', num: 202, marks: ['note'] }])).toEqual([])
  })
  it('leave someone who finished the eight finished, and show two more to someone part way', () => {
    const was = cleanWelcome({ done: ['command', 'bar', 'ask', 'almanac', 'name', 'pop', 'library', 'key'], finished: true })
    expect(was.finished).toBe(true)
    const part = cleanWelcome({ done: ['command', 'bar', 'ask', 'almanac', 'name', 'pop', 'library'] })
    expect(part.finished).toBe(false)
    expect(nextStep(tick(part, 'key')).id).toBe('strike')
    expect(tick(tick(tick(part, 'key'), 'strike'), 'highlight').finished).toBe(true)
  })
})

describe('step 9 crosses off at once when a prompt goes out carrying an edit (C225 (b); Stefan, 29 October)', () => {
  it('when a model answering reads the edits or asks the line counted', () => {
    expect(carriesEdit({ edits: { count: 2, asks: 0 }, read: true })).toBe(true)
    expect(carriesEdit({ edits: { count: 0, asks: 1 }, read: true })).toBe(true)
    expect(carriesEdit({ edits: null, read: true })).toBe(false)
    expect(carriesEdit({ edits: { count: 0, asks: 0 }, read: true })).toBe(false)
  })

  it('on a branch a source answers, only when a model reads them at the same time (C218 (e)); waiting, they do not go', () => {
    expect(carriesEdit({ edits: { count: 2 }, read: true })).toBe(true)
    expect(carriesEdit({ edits: { count: 2 }, read: false })).toBe(false)
  })

  it('when the words of a prompt and reply joined with edits in them go as the prompt, to a model or a source (C214)', () => {
    expect(carriesEdit({ edits: null, read: false, joined: 2 })).toBe(true)
    expect(carriesEdit({ edits: null, read: true, joined: 1 })).toBe(true)
    // Joined with nothing edited in them: no edit goes.
    expect(carriesEdit({ edits: null, read: false, joined: 0 })).toBe(false)
    expect(carriesEdit()).toBe(false)
  })

  it('ticks nothing since send is no longer a step (C282)', () => {
    let w = freshWelcome()
    for (const st of STEPS.filter((x) => x.id !== 'highlight')) w = tick(w, st.id)
    expect(w.finished).toBe(false)
    if (carriesEdit({ edits: null, joined: 1 })) w = tick(w, 'send')
    expect([isDone(w, 'send'), w.finished]).toEqual([false, false])
    expect(tick(w, 'highlight').finished).toBe(true)
  })
})

describe('the second list, tour:advanced (welcome spec §13; A20)', () => {
  it('is seven steps under three headings, the four that need the Lab, room columns or new:block left out', () => {
    expect(ADVANCED_GROUPS).toEqual(['sources', 'collection', 'space'])
    expect(ADVANCED_STEPS.map((s) => [s.group, s.id])).toEqual([
      ['sources', 'sources'], ['sources', 'compare'],
      ['collection', 'highlight'], ['collection', 'collection'], ['collection', 'noteQuotes'], ['collection', 'summary'],
      ['space', 'arrange'],
    ])
    expect(ADVANCED_STEPS.map((s) => s.shows)).toEqual(['p>', 'compare:', null, 'new:collection', 'note:"…"', 'summarize:', 'arrange:save "research"'])
    // Every command it writes is a command, led by > (or p> for a prompt).
    for (const s of ADVANCED_STEPS.filter((x) => x.writes)) expect(s.writes, s.id).toMatch(/^(>|p>)/)
    for (const hidden of ['layout:', 'place:', 'edit:', 'new:block']) {
      expect(ADVANCED_STEPS.some((s) => String(s.writes ?? '').includes(hidden)), hidden).toBe(false)
    }
  })

  it('reads stored progress kept before it as not shown and none of it done, and its own safely', () => {
    // A value stored before the second list existed.
    const old = cleanWelcome({ done: ['command', 'key'], off: true, finished: false, chat: 'c1' })
    expect(old).toMatchObject({ advanced: false, advancedDone: [], done: ['command', 'key'], off: true, chat: 'c1' })
    const w = cleanWelcome({ done: [], advanced: true, advancedDone: ['arrange', 'evil', 'compare', 'compare', 'labRoom'] })
    expect([w.advanced, w.advancedDone]).toEqual([true, ['compare', 'arrange']])
    expect(cleanWelcome({ advanced: 'yes', advancedDone: 'compare' })).toMatchObject({ advanced: false, advancedDone: [] })
    // What it writes reads back the same.
    expect(cleanWelcome(JSON.parse(JSON.stringify(w)))).toEqual(w)
  })

  it('crosses off in any order, apart from the first list, and finishes nothing', () => {
    let w = freshWelcome()
    expect(nextAdvanced(w).id).toBe('sources')
    w = tick(w, 'arrange')
    w = tick(w, 'compare')
    expect(w.advancedDone).toEqual(['compare', 'arrange'])
    expect([w.done, w.finished]).toEqual([[], false])
    expect(nextAdvanced(w).id).toBe('sources')
    expect(tick(w, 'compare')).toBe(w)
    // The first list's steps leave it alone.
    expect(tick(w, 'key').advancedDone).toEqual(['compare', 'arrange'])
    for (const s of ADVANCED_STEPS) w = tick(w, s.id)
    expect([nextAdvanced(w), w.finished]).toEqual([null, false])
  })

  it('shares the highlight with the first list: one crosses off both', () => {
    const w = tick(freshWelcome(), 'highlight')
    expect([w.done, w.advancedDone]).toEqual([['highlight'], ['highlight']])
    // Progress kept as the first list had it ticks the second too.
    const was = tick(cleanWelcome({ done: ['highlight'] }), 'highlight')
    expect(was.advancedDone).toEqual(['highlight'])
  })

  it('shows in the first list’s place with tour:advanced, the first again with tour:, either put away with tour:off', () => {
    const w = freshWelcome()
    const a = showSteps(w, true, true)
    expect([a.off, a.advanced]).toEqual([false, true])
    expect(showSteps(a, true, true)).toBe(a)
    const back = showSteps(a, true)
    expect([back.off, back.advanced]).toEqual([false, false])
    const off = showSteps(a, false)
    expect([off.off, off.advanced]).toEqual([true, true])
    expect(showSteps(off, true, true)).toMatchObject({ off: false, advanced: true })
  })

  it('crosses off a note that quotes and a summary note from the numbered rows (C145 (e), (g))', () => {
    const note = (extra) => ({ kind: 'note', num: 230, quotes: [], summarized: null, ...extra })
    expect(stepsMade([note()])).toEqual([])
    expect(stepsMade([note({ quotes: [221, 222] })])).toEqual(['noteQuotes'])
    expect(stepsMade([note({ summarized: { from: [221], at: 'x' } })])).toEqual(['summary'])
    // Quotes on a highlight row are no note's.
    expect(stepsMade([{ kind: 'term', num: 221, quotes: [220] }])).toEqual(['highlight'])
  })

  it('crosses off a collection of one’s own and an arrangement saved, from what is kept (C144, C257)', () => {
    expect(stepsKept()).toEqual([])
    expect(stepsKept({ collections: [{ id: 'f', builtIn: 'favorites' }], arrangements: [] })).toEqual([])
    expect(stepsKept({ collections: [{ id: 'c1', builtIn: null }], arrangements: [{ id: 'saved:1', name: 'research' }] })).toEqual(['collection', 'arrange'])
  })

  it('fills compare: and note: with numbers that work, where they are known', () => {
    expect(advancedNumbers([])).toEqual({ compare: null, quotes: [] })
    const mark = (num, kind, docketNum, branch, createdAt, extra = {}) => ({ num, kind, docketNum, branch, createdAt, ...extra })
    const rows = [
      mark(202, 'chat', 201, 'a', '2026-11-02T10:00:00Z'),
      mark(203, 'chat', 201, 'b', '2026-11-02T10:00:00Z'),
      mark(221, 'quote', 201, 'b', '2026-11-02T10:02:00Z'),
      mark(222, 'term', 201, 'a', '2026-11-02T10:01:00Z'),
      mark(223, 'note', 201, 'a', '2026-11-02T10:03:00Z'),
      mark(224, 'quote', 201, 'a', '2026-11-02T09:00:00Z', { archived: true }),
    ]
    // compare: the plan's first two branches (C289); note: the newest highlights and quotes, archived ones left out.
    expect(advancedNumbers(rows)).toEqual({ compare: ['201a', '201b'], quotes: [221, 222] })
    // The newest plan with two branches, in its letters' order: z before aa; archived ones left out.
    const later = [mark(240, 'chat', 239, 'aa', '2026-11-03T10:00:00Z'), mark(241, 'chat', 239, 'z', '2026-11-03T10:00:00Z'), mark(242, 'chat', 239, 'b', '2026-11-03T11:00:00Z', { archived: true })]
    expect(advancedNumbers([...rows, ...later]).compare).toEqual(['239z', '239aa'])
    // A plan of one branch has nothing to compare across.
    expect(advancedNumbers([mark(202, 'chat', 201, 'a', 'x'), mark(221, 'quote', 201, 'a', 'x')])).toEqual({ compare: null, quotes: [221] })
  })
})

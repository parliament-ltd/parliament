import { describe, it, expect } from 'vitest'
import { STEPS, freshWelcome, cleanWelcome, tick, nextStep, isDone, showSteps, withChat, stepsShown, stepsMade, carriesEdit } from './welcome'
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
    expect(w).toEqual({ done: ['command', 'key'], off: false, finished: false, chat: null })
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

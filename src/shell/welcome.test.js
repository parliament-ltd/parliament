import { describe, it, expect } from 'vitest'
import { STEPS, freshWelcome, cleanWelcome, tick, nextStep, isDone, showSteps, withChat, stepsShown, stepsMade } from './welcome'
import { shipped } from './arrangement'

describe('the welcome steps (stage 5)', () => {
  it('are the ten as ruled: bar:bottom second, pop:records sixth, api: eighth, then strike and send (C131 names, C225)', () => {
    expect(STEPS.map((s) => s.shows)).toEqual(['>', 'bar:bottom', 'p>', 'records:', 'name:"…"', 'pop:records', 'lab:', 'api:', 'strikethrough:', 'p>'])
    expect(STEPS.find((s) => s.id === 'strike').writes).toBe('>strikethrough:')
    expect(STEPS.find((s) => s.id === 'almanac').writes).toBe('>records:')
  })

  it('cross off in any order, and the last one finishes the page', () => {
    let w = freshWelcome()
    w = tick(w, 'lab')
    w = tick(w, 'command')
    expect(w.done).toEqual(['command', 'lab'])
    expect(nextStep(w).id).toBe('bar')
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

  it('counts the Library step ticked before C265 as the Lab step', () => {
    expect(cleanWelcome({ done: ['command', 'library'] }).done).toEqual(['command', 'lab'])
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
  })
  it('leave someone who finished the eight finished, and show two more to someone part way', () => {
    const was = cleanWelcome({ done: ['command', 'bar', 'ask', 'almanac', 'name', 'pop', 'library', 'key'], finished: true })
    expect(was.finished).toBe(true)
    const part = cleanWelcome({ done: ['command', 'bar', 'ask', 'almanac', 'name', 'pop', 'library'] })
    expect(part.finished).toBe(false)
    expect(nextStep(tick(part, 'key')).id).toBe('strike')
    expect(tick(tick(tick(part, 'key'), 'strike'), 'send').finished).toBe(true)
  })
})

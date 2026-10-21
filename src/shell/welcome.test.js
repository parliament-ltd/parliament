import { describe, it, expect } from 'vitest'
import { STEPS, freshWelcome, cleanWelcome, tick, nextStep, isDone, showSteps, withChat, stepsShown } from './welcome'
import { shipped } from './arrangement'

describe('the welcome steps (stage 5)', () => {
  it('are the eight as ruled: bar:bottom second, pop:almanac sixth, api: last', () => {
    expect(STEPS.map((s) => s.shows)).toEqual(['>', 'bar:bottom', 'p>', 'open:alm', 'name:"…"', 'pop:almanac', 'library:', 'api:'])
    expect(STEPS.find((s) => s.id === 'almanac').writes).toBe('>open:alm')
  })

  it('cross off in any order, and the last one finishes the page', () => {
    let w = freshWelcome()
    w = tick(w, 'library')
    w = tick(w, 'command')
    expect(w.done).toEqual(['command', 'library'])
    expect(nextStep(w).id).toBe('bar')
    expect(tick(w, 'library')).toBe(w)
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
    expect(stepsShown(b)).toEqual(['bar', 'almanac', 'pop', 'library'])
  })
})

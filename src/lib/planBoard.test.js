import { describe, it, expect } from 'vitest'
import { planBoardOf, compareRuns, latestPlan } from './planBoard'

// What the Plan board draws (stage 10, pieces 2 and 5; C198; C202).

const docket = { id: 'd', num: 201, title: 'Tower', branches: [{ letter: 'a', name: 'Tower' }, { letter: 'b', name: 'Short' }], order: ['a', 'b'], nextLetter: 2 }
const step = (id, prompt, extra = {}) => ({ id, status: 'ready', prompt, model: null, condition: null, ...extra })
const plan = {
  docket,
  runs: [
    { n: 1, branches: { a: { status: 'done', chatId: 'c1', steps: [{ status: 'done', messageId: 'm1', model: 'sonnet' }, step('s2', 'Who built it?')] } } },
    { n: 2, branches: { a: { status: 'ready', chatId: null, steps: [step('t1', 'What is it made of?'), step('t2', 'Who built it, and when?', { model: 'opus' })] }, b: { status: 'ready', chatId: null, steps: [step('u1', 'Shorter')] } } },
  ],
}
const textOf = (id) => ({ m1: 'What is it   made of?' }[id])

describe('the Plan board', () => {
  it('draws one run, with a pip per run on each step', () => {
    const p = planBoardOf(plan, { run: 1, textOf })
    expect(p).toMatchObject({ num: 201, n: 1, latest: 2, runNums: [1, 2], next: 'c', neverRan: ['b'] })
    expect(p.branches.map((b) => b.letter)).toEqual(['a'])
    expect(p.branches[0].steps[0]).toMatchObject({ text: 'What is it   made of?', planned: false, reached: [{ n: 1, yes: true }, { n: 2, yes: true }] })
  })

  it('marks what differs between two runs, on both sides, space never counting', () => {
    const one = planBoardOf(plan, { run: 1, textOf })
    const two = planBoardOf(plan, { run: 2, textOf })
    const left = compareRuns(two, one)
    expect(left.get('a:1')).toMatchObject({ chg: true, txt: false, model: true })
    expect(left.get('a:2')).toMatchObject({ chg: true, txt: true, model: true, other: 'Who built it?' })
    expect(left.get('b')).toEqual({ only: true })
    const right = compareRuns(one, two)
    expect(right.get('a:2')).toMatchObject({ txt: true, other: 'Who built it, and when?' })
    expect(right.has('b')).toBe(false)
  })

  it('shows the plan changed last when none is asked for', () => {
    expect(latestPlan([{ kind: 'docket', num: 201, activeAt: '2026-10-20' }, { kind: 'docket', num: 205, activeAt: '2026-10-22' }, { kind: 'chat', num: 206, activeAt: '2026-10-23' }])).toBe(205)
  })
})

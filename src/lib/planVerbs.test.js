import { describe, it, expect } from 'vitest'
import { setupI18n } from '@lingui/core'
import { messages as en } from '../locales/en/messages.mjs'
import { preview, promptPreview } from '../chrome/preview'
import { say } from '../chrome/say'
import { shipped, planOpen } from '../shell/arrangement'
import { planKey, keyOf } from './planVerbs'

// The Plan board's commands (stage 10, piece 2; C198): what each says
// before Enter, and what it would do. Nothing here is sent.

const i18n = setupI18n({ locale: 'en', messages: { en } })
i18n.activate('en')
const words = (says) => [say(i18n, says.message, says.values), ...(says.also ?? []).map((x) => say(i18n, x.message, x.values))]
const onPlan = planOpen(shipped('almanac'), 'docket').next
const run = (value, screens = {}, arrangement = onPlan) => {
  const p = preview(value, { mode: 'command', arrangement, screens })
  return { ...p, text: p.says ? words(p.says) : [] }
}
const plan = (over = {}) => ({
  num: 201, docketId: 'd1', title: 'Water tower', n: 1, latest: 1, next: 'c', selected: null, order: ['a', 'b'],
  branches: [
    { letter: 'a', address: '201a', name: 'Water tower', status: 'ready', chatId: 'c1', steps: [{ id: 's1', status: 'done', planned: false }, { id: 's2', status: 'ready', planned: true }] },
    { letter: 'b', address: '201b', name: 'Shorter', status: 'ready', chatId: null, steps: [] },
  ],
  ...over,
})

describe('new:plan, new:step, new:run and new:branch on the Plan board', () => {
  it('makes a plan with nothing in it, named or not', () => {
    expect(run('>new:plan')).toMatchObject({ text: ['Enter makes a plan with nothing in it and opens it on the Plan board. Nothing is sent'], act: { kind: 'newPlan', title: '' } })
    expect(run('>new:plan "Grant application"')).toMatchObject({ text: ['Enter makes the plan “Grant application”, with nothing in it, and opens it on the Plan board. Nothing is sent'], act: { title: 'Grant application' } })
  })

  it('plans a step at the end of a branch, in the last run only', () => {
    expect(run('>new:step').text[0]).toBe('No plan is on the Plan board. open: and a plan’s number shows one, or new:plan makes one')
    expect(run('>new:step', { plan: plan() }).text[0]).toBe('Which branch? Pick one on the Plan board, or name it, as 201a')
    expect(run('>new:step 201b "Who built it?"', { plan: plan() })).toMatchObject({
      text: ['Enter adds step 1 to 201b in run 1. Nothing is sent'],
      act: { kind: 'planStep', docketId: 'd1', n: 1, letter: 'b', prompt: 'Who built it?' },
    })
    expect(run('>new:step "When?"', { plan: plan({ selected: 'a' }) })).toMatchObject({ text: ['Enter adds step 3 to 201a in run 1. Nothing is sent'], act: { letter: 'a', prompt: 'When?' } })
    expect(run('>new:step 201a', { plan: plan() }).text[0]).toBe('Enter adds an empty step 3 to 201a in run 1, to write on the board. Nothing is sent')
    expect(run('>new:step 203a', { plan: plan() }).text[0]).toBe('Plan 203 is not on the Plan board. open:203 shows it')
    expect(run('>new:step 201d', { plan: plan() }).text[0]).toBe('201d is not in run 1')
    expect(run('>new:step 201a', { plan: plan({ n: 1, latest: 2 }) }).text[0]).toBe('Run 1 is an earlier run, kept as it was. open:run 2 to change the plan')
    // A chat's own number names its branch.
    const rows = [{ kind: 'chat', num: 202, docketNum: 201, branch: 'a' }]
    expect(run('>new:step 202', { plan: plan(), records: { rows } }).act).toMatchObject({ letter: 'a' })
  })

  it('says a step in a held branch waits too', () => {
    const p = plan()
    p.branches[0].steps[1].status = 'waiting'
    expect(run('>new:step 201a "More"', { plan: p }).text).toEqual([
      'Enter adds step 3 to 201a in run 1. Nothing is sent',
      '201a is held, so the step waits too. hold:off 201a lets them go',
    ])
  })

  it('makes the next run from the last, and a branch with no chat', () => {
    expect(run('>new:run', { plan: plan() })).toMatchObject({ text: ['Enter makes run 2 of plan 201 from run 1: every step planned again, nothing started. Nothing is sent'], act: { kind: 'planRun', docketId: 'd1' } })
    expect(run('>new:branch', { plan: plan() })).toMatchObject({ text: ['Enter adds 201c to plan 201, with no chat until it runs. Nothing is sent'], act: { kind: 'planBranch', name: '' } })
    // Named, from anywhere; bare, off the Plan board, it is a fork (C178).
    expect(run('>new:branch "Longer"', { plan: plan() }, shipped('almanac')).act).toMatchObject({ kind: 'planBranch', name: 'Longer' })
    expect(run('>new:branch', { plan: plan() }, shipped('almanac')).act?.kind).not.toBe('planBranch')
  })
})

describe('hold: and move: (A4; C45; docket spec §2)', () => {
  it('holds a branch’s planned steps, and lets them go', () => {
    expect(run('>hold:201a', { plan: plan() })).toMatchObject({ text: ['Enter holds 201a in run 1. Their steps wait until hold:off'], act: { kind: 'planHold', letters: ['a'], on: true } })
    expect(run('>hold:off 201a', { plan: plan() }).text[0]).toBe('Not held: 201a')
    expect(run('>hold:201b', { plan: plan() }).text[0]).toBe('201b has nothing planned to hold')
    const p = plan({ selected: 'a' })
    p.branches[0].steps[1].status = 'waiting'
    expect(run('>hold:off', { plan: p })).toMatchObject({ text: ['Enter lets 201a go again in run 1'], act: { on: false } })
    const busy = plan()
    busy.branches[0].status = 'running'
    expect(run('>hold:201a', { plan: busy }).text[0]).toBe('201a is running. stop:201a halts it')
  })

  it('leaves an edit’s number to stage 11', () => {
    expect(run('>hold:242', { plan: plan() }).text[0]).toBe('hold: is not built yet')
  })

  it('moves a branch before or after another, keeping its letter', () => {
    expect(run('>move:201b before 201a', { plan: plan() })).toMatchObject({ text: ['Enter moves 201b before 201a. It keeps its letter'], act: { kind: 'planMove', letter: 'b', before: 'a' } })
    expect(run('>move:201b after 201a', { plan: plan() }).text[0]).toBe('201b is after 201a already')
    expect(run('>move:201b after 201b', { plan: plan() }).text[0]).toBe('201b cannot move beside itself')
  })
})

describe('open: on plans (C196 (g))', () => {
  const numbered = new Map([[201, { kind: 'docket', num: 201, chatId: 'c1', chatNum: 202 }]])

  it('opens a plan on the Plan board, and another run of it', () => {
    const p = run('>open:201', { numbered }, shipped('almanac'))
    expect(p.text[0]).toBe('Enter opens plan 201 on the Plan board')
    expect(p.next.addressed).toBe('docket')
    expect(planKey(p.next.context.docket)).toEqual({ num: 201, run: null })
    expect(run('>open:run 2', { plan: plan() }).text[0]).toBe('Plan 201 has one run')
    const two = run('>open:run 1', { plan: plan({ n: 2, latest: 2 }) })
    expect(two.text[0]).toBe('Enter shows run 1 of plan 201')
    expect(two.next.context.docket).toBe(keyOf(201, 1))
    expect(run('>open:run 2', { plan: plan({ n: 2, latest: 2 }) }).text[0]).toBe('Run 2 is on the Plan board already')
  })

  it('shows a branch that has not run on the Plan board', () => {
    expect(run('>open:201b', { plan: plan(), records: { rows: [] } }).text[0]).toBe('201b has not run yet. Enter shows its steps on the Plan board')
  })
})

describe('a prompt with the Plan board addressed (C198)', () => {
  it('is a step planned, and nothing is sent', () => {
    expect(promptPreview('Who built it?', { plan: plan({ selected: 'b' }) })).toMatchObject({ ready: true, act: { kind: 'planStep', letter: 'b' } })
    expect(words(promptPreview('Who built it?', { plan: plan({ selected: 'b' }) }).says)).toEqual(['Enter adds this as step 1 of 201b in run 1. Nothing is sent'])
    expect(words(promptPreview('', { plan: plan({ selected: 'b' }) }).says)).toEqual(['Write the step. Enter adds it as step 1 of 201b. Nothing is sent'])
    expect(promptPreview('x', { plan: plan() }).ready).toBe(false)
  })
})

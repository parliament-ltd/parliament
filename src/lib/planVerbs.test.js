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
  num: 201, docketId: 'd1', title: 'Water tower', n: 1, latest: 1, next: 'c', selected: null, order: ['a', 'b'], neverRan: ['b'], branchCount: 2,
  branches: [
    { letter: 'a', address: '201a', name: 'Water tower', status: 'ready', chatId: 'c1', steps: [{ id: 's1', stepId: 's1', status: 'done', planned: false }, { id: 's2', stepId: 's2', status: 'ready', planned: true }] },
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
    expect(planKey(p.next.context.docket)).toEqual({ num: 201, run: null, against: null })
    expect(run('>open:run 2', { plan: plan() }).text[0]).toBe('Plan 201 has one run')
    const two = run('>open:run 1', { plan: plan({ n: 2, latest: 2 }) })
    expect(two.text[0]).toBe('Enter shows run 1 of plan 201')
    expect(two.next.context.docket).toBe(keyOf(201, 1))
    expect(run('>open:run 2', { plan: plan({ n: 2, latest: 2 }) }).text[0]).toBe('Run 2 is on the Plan board already')
  })

  it('opens a plan of one chat by its number, though Records lists only the chat', () => {
    const p = run('>open:205', { numbered: new Map(), records: { rows: [{ kind: 'chat', num: 206, chatId: 'c206', docketNum: 205, branch: 'a' }] } }, shipped('almanac'))
    expect(p.text[0]).toBe('Enter opens plan 205 on the Plan board')
    expect(p.next.context.docket).toBe('205')
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

describe('delete: of what has not been sent (C199)', () => {
  it('deletes a step not yet started, in the last run, and says undo brings it back', () => {
    expect(run('>delete:201a 2', { plan: plan() })).toMatchObject({
      text: ['Enter deletes step 2 of 201a in run 1. undo: brings it back'],
      act: { kind: 'planDelete', what: 'step', letter: 'a', stepId: 's2', index: 2 },
    })
    expect(run('>delete:201a 1', { plan: plan() }).text[0]).toBe('Step 1 of 201a has started, so it stays with its chat')
    expect(run('>delete:201a 5', { plan: plan() }).text[0]).toBe('201a has no step 5 in run 1')
    expect(run('>delete:201a 2', { plan: plan({ latest: 2 }) }).text[0]).toBe('Run 1 is an earlier run, kept as it was. open:run 2 to change the plan')
    expect(run('>delete:203a 1', { plan: plan() }).text[0]).toBe('Plan 203 is not on the Plan board. open:203 shows it')
  })

  it('deletes a branch that has never run, from every run, and a plan with no chat', () => {
    expect(run('>delete:201b', { plan: plan() })).toMatchObject({
      text: ['Enter deletes 201b, which has never run, from every run of plan 201. undo: brings it back'],
      act: { kind: 'planDelete', what: 'branch', letter: 'b' },
    })
    expect(run('>delete:201b', { plan: plan({ branchCount: 1 }) }).text[1]).toBe('It is the plan’s last branch, so plan 201 goes too')
    const rows = [{ kind: 'docket', num: 224, id: 'd224', chatNums: [] }, { kind: 'docket', num: 230, id: 'd230', chatNums: [231] }]
    expect(run('>delete:224', { records: { rows } }, shipped('almanac'))).toMatchObject({
      text: ['Enter deletes plan 224, which has no chat yet. undo: brings it back'],
      act: { kind: 'planDelete', what: 'plan', docketId: 'd224' },
    })
    // A branch that has run, and a plan with chats, go for good after a second Enter.
    expect(run('>delete:201a', { plan: plan(), records: { rows: [{ kind: 'chat', num: 202, chatId: 'c1', docketNum: 201, branch: 'a', title: 'Tower' }] } }).act).toMatchObject({ kind: 'erase', confirm: true })
    expect(run('>delete:230', { records: { rows: [...rows, { kind: 'chat', num: 231, chatId: 'c231', docketNum: 230, branch: 'a', title: 'x' }] } }, shipped('almanac')).act).toMatchObject({ kind: 'erase', confirm: true })
    expect(run('>delete:201b, 202', { plan: plan(), records: { rows: [] } }).text[0]).toBe('Delete what has not been sent on a line of its own')
  })
})

describe('run: and stop: (stage 10, piece 3; C200)', () => {
  const sonnet = { id: 'claude-sonnet-5-5', name: 'Sonnet 5.5', group: 'model', provider: 'anthropic', providerName: 'Anthropic', price: { inputPerMillion: 3 } }
  const wiki = { id: 'wikipedia', name: 'Wikipedia', group: 'source' }
  const facts = (over = {}) => ({ keyed: { anthropic: true }, whoOf: (model) => (model === 'wikipedia' ? wiki : sonnet), charsOf: () => 4000, here: [], ...over })
  const ready = (stepId, text, model = null) => ({ id: stepId, stepId, status: 'ready', planned: true, text, model })
  const runPlan = (over = {}) => plan({
    branches: [
      { letter: 'a', address: '201a', name: 'Tower', status: 'ready', chatId: 'c1', steps: [{ id: 's1', stepId: 's1', status: 'done', planned: false, text: 'Built?' }, ready('s2', 'Who designed it?')] },
      { letter: 'b', address: '201b', name: 'Shorter', status: 'ready', chatId: null, steps: [ready('s3', 'Water tower', 'wikipedia'), ready('s4', '')] },
    ],
    ...over,
  })

  it('names every step, who answers, what it costs before any reply, and that undo stops at a run', () => {
    const p = run('>run:', { plan: runPlan(), runFacts: facts() })
    expect(p.text).toEqual([
      'Enter runs 2 steps of 201a and 201b, in run 1: the branches side by side, each one step after another',
      'They go to Sonnet 5.5 and Wikipedia',
      'At least 1,004 tokens to send, under $0.01. Each step also sends the replies before it',
      'One empty step is skipped',
      'Undo stops at a run: what it writes stays',
    ])
    expect(p.act).toMatchObject({ kind: 'run', docketId: 'd1', num: 201, n: 1, letters: ['a', 'b'], newRun: false })
  })

  it('runs one branch, or makes the next run for it, and refuses what cannot go', () => {
    expect(run('>run:201b', { plan: runPlan(), runFacts: facts() }).text[0]).toBe('Enter runs one step of 201b, in run 1')
    const done = runPlan()
    done.branches[0].steps = [{ id: 's1', stepId: 's1', status: 'done', planned: false, text: 'Built?' }]
    expect(run('>run:201a', { plan: done, runFacts: facts() })).toMatchObject({ text: ['Enter makes run 2 and runs one step of 201a in it. The other branches wait', 'They go to Sonnet 5.5', 'At least 2 tokens to send, under $0.01. Each step also sends the replies before it', 'Undo stops at a run: what it writes stays'], act: { newRun: true, letters: ['a'] } })
    expect(run('>run:', { plan: runPlan(), runFacts: facts({ whoOf: () => ({ ...sonnet, needsKey: true }) }) }).text[0]).toBe('Step 1 of 201a goes to Sonnet 5.5, which needs a key for Anthropic. api:anthropic adds one')
    expect(run('>run:', { plan: runPlan(), runFacts: facts({ keyed: null }) }).text[0]).toBe('Looking for a key on this device')
    expect(run('>run:', { plan: runPlan({ latest: 2 }), runFacts: facts() }).text[0]).toBe('Run 1 is an earlier run, kept as it was. open:run 2 to change the plan')
  })

  it('stops a branch, a plan, every run, or the reply in a room', () => {
    const busy = runPlan()
    busy.branches[0].status = 'running'
    expect(run('>stop:201a', { plan: busy, runFacts: facts() })).toMatchObject({ text: ['Enter stops 201a. What is done stays done and paid for; the step running now stops where it is'], act: { kind: 'stop', scope: 'branch', num: 201, letter: 'a' } })
    expect(run('>stop:201b', { plan: busy, runFacts: facts() }).text[0]).toBe('Nothing is running in 201b')
    expect(run('>stop:', { plan: busy, runFacts: facts() }).act).toMatchObject({ kind: 'stop', scope: 'docket', num: 201 })
    expect(run('>stop:all', {}).act).toEqual({ kind: 'stop', scope: 'all' })
    expect(run('>stop:', { runFacts: { room: { chatId: 'c9', num: 209, streaming: true } } }, shipped('almanac')).act).toEqual({ kind: 'stopReply', chatId: 'c9' })
    expect(run('>stop:', {}, shipped('almanac')).text[0]).toBe('Nothing is running here')
  })
})

describe('run: with conditions (C201)', () => {
  const sonnet = { id: 'claude-sonnet-5-5', name: 'Sonnet 5.5', group: 'model', provider: 'anthropic', providerName: 'Anthropic', price: { inputPerMillion: 3 } }
  const alex = { id: 'openalex', name: 'OpenAlex', group: 'source' }
  const ready = (stepId, text, model = null, condition = null) => ({ id: stepId, stepId, status: 'ready', planned: true, text, model, condition })
  const p = plan({ branches: [{ letter: 'a', address: '201a', name: 'Tower', status: 'ready', chatId: null, steps: [ready('s1', 'Wassertürme Geschichte', 'openalex'), ready('s2', 'Then ask a model', null, 'nothing')] }] })
  const facts = (over = {}) => ({ keyed: {}, whoOf: (model) => (model === 'openalex' ? alex : sonnet), charsOf: () => 0, here: [], nameOf: (t) => ({ en: 'English' }[t] ?? t), queryOf: () => null, ...over })

  it('says what goes if every step runs, and how many run only on their condition', () => {
    expect(run('>run:', { plan: p, runFacts: facts() }).text).toEqual([
      'Enter runs 2 steps of 201a, in run 1, one after another',
      'They go to OpenAlex and Sonnet 5.5',
      'If every step runs, at least 10 tokens to send, under $0.01. Each step also sends the replies before it',
      'One step runs only if the one before fails or finds nothing',
      'Undo stops at a run: what it writes stays',
    ])
  })

  it('says a question to a source that reads only English goes translated first', () => {
    const q = { from: 'de', to: 'en', who: { kind: 'browser' } }
    const text = run('>run:', { plan: p, runFacts: facts({ queryOf: (id) => (id === 'openalex' ? q : null) }) }).text
    expect(text).toContain('Your question goes translated into English, which it reads best, unless it is in English already')
  })
})

describe('diff: (stage 10, piece 5; C202)', () => {
  it('reads and writes the board’s context, with a run beside', () => {
    expect(planKey('201:3+2')).toEqual({ num: 201, run: 3, against: 2 })
    expect(planKey('201:+2')).toEqual({ num: 201, run: null, against: 2 })
    expect(keyOf(201, null, 2)).toBe('201:+2')
    expect(keyOf(201, 3, 2)).toBe('201:3+2')
    expect(keyOf(201)).toBe('201')
  })

  it('sets the run before beside the one shown, or a run named, and takes it away', () => {
    const p = run('>diff:', { plan: plan({ n: 3, latest: 3 }) })
    expect(p.text[0]).toBe('Enter sets run 2 beside run 3, marking in ink what differs')
    expect(p.next.context.docket).toBe('201:+2')
    expect(run('>diff:1', { plan: plan({ n: 3, latest: 3 }) }).next.context.docket).toBe('201:+1')
    expect(run('>diff:', { plan: plan({ n: 1, latest: 3 }) }).next.context.docket).toBe('201:1+2')
    expect(run('>diff:3', { plan: plan({ n: 3, latest: 3 }) }).text[0]).toBe('That is run 3, on the board already. diff: and another run compares them')
    expect(run('>diff:', { plan: plan() }).text[0]).toBe('Plan 201 has one run. new:run makes another to compare')
    expect(run('>diff:off', { plan: plan({ n: 3, latest: 3, against: 2 }) })).toMatchObject({ text: ['Enter shows run 3 alone again'], next: { context: { docket: '201' } } })
    expect(run('>diff:off', { plan: plan({ n: 3, latest: 3 }) }).text[0]).toBe('Nothing is being compared. diff: sets two runs side by side')
  })
})

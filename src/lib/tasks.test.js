import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { openDB } from 'idb'
import { upgradeSchema } from './schema'
import * as R from './records'
import { withSteps, runFromRun } from './recordsModel'
import { STATUS, plannedStep, isTodo } from './docketModel'
import { createRunner, nextStep, waitsAt, runScope } from './runner'
import { validateBackup } from './validate'

// Tasks (C301 (g), ruled 16 November): a prompt is one kind of task, a to-do
// of yours another, ticked and never sent; a run waits at an unticked one.

let n = 0
const newId = () => `id-${++n}`
let clock = 0
const at = () => new Date(Date.UTC(2026, 10, 16, 12, 0, clock++)).toISOString()
const prompt = (id, status = STATUS.READY, extra = {}) => ({ id, status, prompt: `Prompt ${id}`, model: null, condition: null, ...extra })
const todo = (id, done = false, extra = {}) => ({ id, status: done ? STATUS.DONE : STATUS.READY, prompt: '', model: null, condition: null, todo: { text: `To do ${id}`, doneAt: done ? '2026-11-16T12:00:00.000Z' : null }, ...extra })

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  n = 0
  clock = 0
})

describe('a to-do as stored', () => {
  it('keeps its words apart from the prompt, which stays empty, so it is never sent', () => {
    const s = plannedStep({ id: 's1', todo: 'Check the figures with Anna', model: 'claude-sonnet-5-5', now: 'x' })
    expect(s).toMatchObject({ prompt: '', model: null, status: STATUS.READY, todo: { text: 'Check the figures with Anna', doneAt: null } })
    expect(isTodo(s)).toBe(true)
    expect(isTodo(plannedStep({ id: 's2', prompt: 'Who built it?', now: 'x' }))).toBe(false)
  })

  it('keeps its place among the prompts, ticked or not, as the chat moves on', () => {
    const lane = { chatId: 'c', steps: [prompt('p1', STATUS.DONE, { messageId: 'm1' }), todo('t2', true), prompt('p3')] }
    // p3 is sent: it becomes a turn of the chat, and the to-do stays between.
    const after = withSteps(lane, [{ messageId: 'm1', status: STATUS.DONE }, { messageId: 'm3', stepId: 'p3', status: STATUS.DONE }])
    expect(after.steps.map((s) => s.id)).toEqual(['p1', 't2', 'p3'])
    // Nothing sent yet: the order is as written.
    const fresh = withSteps({ chatId: null, steps: [prompt('p1'), todo('t2'), prompt('p3')] }, [])
    expect(fresh.steps.map((s) => s.id)).toEqual(['p1', 't2', 'p3'])
  })

  it('comes forward unticked in a new run', () => {
    const next = runFromRun({ docketId: 'd', branches: { a: { steps: [todo('t1', true)] } } }, { id: 'r2', n: 2, now: 'x', newId, promptOf: () => '' })
    expect(next.branches.a.steps[0]).toMatchObject({ status: STATUS.READY, prompt: '', todo: { text: 'To do t1', doneAt: null } })
  })

  it('is checked on restore: its words and when it was ticked', () => {
    const when = '2026-11-16T12:00:00.000Z'
    const run = (s) => ({ id: 'r1', docketId: 'd1', n: 1, branches: { a: { status: 'ready', steps: [s] } } })
    const check = (s) => validateBackup({ conversations: [], dockets: [{ id: 'd1', branches: [], order: [] }], runs: [run(s)] })
    expect(check(todo('t1')).valid).toBe(true)
    expect(check({ ...todo('t1'), todo: { text: 'x', doneAt: when } }).valid).toBe(true)
    expect(check({ ...todo('t1'), todo: { text: 3 } }).valid).toBe(false)
    expect(check({ ...todo('t1'), todo: { text: 'x', doneAt: 'soon' } }).valid).toBe(false)
    expect(check({ ...todo('t1'), todo: { text: 'x', other: 1 } }).valid).toBe(false)
  })
})

describe('ticking, in the database', () => {
  let db
  beforeEach(async () => { db = await openDB('tasks-test', 6, { upgrade: upgradeSchema }) })
  afterEach(() => db.close())

  it('adds a to-do, ticks and unticks it, keeps it from changing as a prompt, and lets it go', async () => {
    const made = await R.newPlan(db, { title: 'Grant application', newId, now: at() })
    const docketId = made.docket.id
    const { step } = await R.planStep(db, { docketId, letter: 'a', todo: 'Check the figures', newId, now: at() })
    expect(step).toMatchObject({ prompt: '', todo: { text: 'Check the figures', doneAt: null } })
    await R.changeStep(db, { docketId, letter: 'a', stepId: step.id, set: { prompt: 'Check the figures with Anna' }, now: at() })
    const ticked = await R.tickTodo(db, { docketId, letter: 'a', stepId: step.id, done: true, now: at() })
    expect(ticked.step).toMatchObject({ status: STATUS.DONE, prompt: '', todo: { text: 'Check the figures with Anna' } })
    expect(ticked.step.todo.doneAt).toBeTruthy()
    const again = await R.tickTodo(db, { docketId, letter: 'a', stepId: step.id, done: false, now: at() })
    expect(again.step).toMatchObject({ status: STATUS.READY, todo: { doneAt: null } })
    // A ticked to-do can still be deleted: it was never sent.
    await R.tickTodo(db, { docketId, letter: 'a', stepId: step.id, done: true, now: at() })
    await R.removeStep(db, { docketId, letter: 'a', stepId: step.id, now: at() })
    // A prompt cannot be ticked.
    const p = await R.planStep(db, { docketId, letter: 'a', prompt: 'Tighten it', newId, now: at() })
    await expect(R.tickTodo(db, { docketId, letter: 'a', stepId: p.step.id, done: true, now: at() })).rejects.toMatchObject({ code: 'notTodo' })
  })
})

describe('a run, and your to-dos', () => {
  it('finds a to-do not ticked as where a lane waits, only with a prompt after it', () => {
    expect(nextStep([prompt('p1', STATUS.DONE), todo('t2'), prompt('p3')], 0)).toMatchObject({ index: 1, yours: true })
    expect(nextStep([prompt('p1', STATUS.DONE), todo('t2', true), prompt('p3')], 0)).toMatchObject({ index: 2 })
    expect(nextStep([prompt('p1', STATUS.DONE), todo('t2')], 0)).toBeNull()
    expect(waitsAt([prompt('p1'), todo('t2'), prompt('p3')])).toEqual({ n: 2, text: 'To do t2' })
    expect(waitsAt([prompt('p1'), todo('t2')])).toBeNull()
  })

  it('does not count a to-do as an empty prompt to skip', () => {
    const scope = runScope({ latest: 1, branches: [{ letter: 'a', address: '201a', status: STATUS.READY, chatId: null, steps: [prompt('p1'), todo('t2'), prompt('p3')] }] })
    expect(scope.skipped).toBe(0)
    expect(scope.branches[0].steps.map((s) => s.id)).toEqual(['p1', 'p3'])
  })

  it('waits at a to-do, and goes on when it is ticked; stop: ends the wait', async () => {
    const lane = { chatId: 'c-a', steps: [prompt('p1'), todo('t2'), prompt('p3')] }
    const sent = []
    let read = () => lane
    const deps = {
      readBranch: async () => structuredClone(read()),
      ensureChat: async () => 'c-a',
      markStep: async ({ stepId, status }) => { lane.steps.find((s) => s.id === stepId).status = status },
      sendStep: async ({ step: s }) => { sent.push(s.id); return 'done' },
      stopChat: () => {},
      lock: async (id, fn) => fn(),
      newRunFor: async () => 1,
    }
    const r = createRunner(deps)
    const out = await r.start({ docketId: 'd', num: 201, n: 1, letters: ['a'] })
    await new Promise((res) => setTimeout(res, 20))
    expect(sent).toEqual(['p1'])
    expect(r.active()[0]).toMatchObject({ letter: 'a', yours: 't2' })
    lane.steps[1].status = STATUS.DONE
    r.ticked({ docketId: 'd', letter: 'a', stepId: 't2' })
    expect(await out.finished).toEqual({ n: 1, ended: { a: 'done' } })
    expect(sent).toEqual(['p1', 'p3'])

    // Again, stopped while it waits.
    lane.steps = [prompt('q1'), todo('u2'), prompt('q3')]
    sent.length = 0
    const two = await r.start({ docketId: 'd', num: 201, n: 1, letters: ['a'] })
    await new Promise((res) => setTimeout(res, 20))
    expect(r.stop({ scope: 'docket', num: 201 })).toBe(1)
    expect(await two.finished).toEqual({ n: 1, ended: { a: 'stopped' } })
    expect(sent).toEqual(['q1'])
    void read
  })
})

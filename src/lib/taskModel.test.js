import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { openDB } from 'idb'
import { upgradeSchema } from './schema'
import * as R from './records'
import { withSteps, runFromRun, emptyPlan } from './recordsModel'
import { STATUS, plannedStep } from './docketModel'
import { taskOf, kindOf, modelOf, targetOf, taskDone, isTaskish, titleOf, isCommand } from './taskModel'
import { validateBackup } from './validate'
import { rebuildRecord } from './backupSchema'

// Tasks v4 (C301 (g), ruled 16 November): a task with a description, a
// model, rooms and a flow; sub-tasks with a title, and a command of yours.

let n = 0
const newId = () => `id-${++n}`
let clock = 0
const at = () => new Date(Date.UTC(2026, 10, 16, 12, 0, clock++)).toISOString()
const isSource = (m) => m === 'openalex'

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  n = 0
  clock = 0
})

describe('a task and its sub-tasks, read from what they hold', () => {
  it('reads a task with defaults: one by one, no model, no rooms', () => {
    expect(taskOf({ title: 'Moving house' })).toEqual({ title: 'Moving house', description: '', model: null, rooms: [], flow: 'oneByOne', doneAt: null })
  })

  it('reads the kind from the step: a to-do, a command, a search, a prompt, or yours', () => {
    const task = { model: 'claude-sonnet-5-5' }
    expect(kindOf(plannedStep({ id: 's', todo: 'Call Anna', now: 'x' }), task, isSource)).toBe('yours')
    expect(kindOf(plannedStep({ id: 's', command: 'compare:204 199', prompt: 'ignored', model: 'm', now: 'x' }), task, isSource)).toBe('command')
    expect(kindOf(plannedStep({ id: 's', prompt: 'land trust grants', model: 'openalex', now: 'x' }), task, isSource)).toBe('search')
    expect(kindOf(plannedStep({ id: 's', prompt: 'Draft it', now: 'x' }), task, isSource)).toBe('prompt')
    expect(kindOf(plannedStep({ id: 's', prompt: 'Draft it', now: 'x' }), {}, isSource)).toBe('yours')
  })

  it('takes the task model where a sub-task names none', () => {
    expect(modelOf({ model: null }, { model: 'claude-sonnet-5-5' })).toBe('claude-sonnet-5-5')
    expect(modelOf({ model: 'claude-opus-5-5' }, { model: 'claude-sonnet-5-5' })).toBe('claude-opus-5-5')
    expect(modelOf({ command: 'export:204' }, { model: 'claude-sonnet-5-5' })).toBe(null)
  })

  it('sends one by one into the first room, else the task chat; all at once, each into its own', () => {
    expect(targetOf({ rooms: ['c-204'] })).toEqual({ chat: 'c-204' })
    expect(targetOf({})).toEqual({ task: true })
    expect(targetOf({ rooms: ['c-204'], flow: 'together' })).toEqual({ own: true })
  })

  it('is done when ticked, or when every sub-task is', () => {
    expect(taskDone({}, [])).toBe(false)
    expect(taskDone({}, [{ status: STATUS.DONE }, { status: STATUS.READY }])).toBe(false)
    expect(taskDone({}, [{ status: STATUS.DONE }, { status: STATUS.DONE }])).toBe(true)
    expect(taskDone({ doneAt: '2026-11-16T12:00:00.000Z' }, [{ status: STATUS.READY }])).toBe(true)
  })

  it('lists a task, a plan made empty or with steps planned, never a chat filed alone', () => {
    expect(isTaskish({ flow: 'oneByOne', branches: [] }, [])).toBe(true)
    expect(isTaskish({ branches: [{ letter: 'a' }] }, [{ branches: { a: { steps: [] } } }])).toBe(true)
    expect(isTaskish({ branches: [{ letter: 'a' }] }, [{ branches: { a: { steps: [{ messageId: 'm1', status: STATUS.DONE }] } } }])).toBe(false)
    expect(isTaskish({ branches: [{ letter: 'a' }] }, [{ branches: { a: { steps: [{ messageId: 'm1' }, { status: STATUS.READY }] } } }])).toBe(true)
    expect(isTaskish({ flow: 'oneByOne', archived: true, branches: [] }, [])).toBe(false)
  })

  it('names a sub-task by its title, else its first words', () => {
    expect(titleOf({ title: 'Draft the summary', prompt: 'A one-page summary' })).toBe('Draft the summary')
    expect(titleOf({ command: 'compare:204 199' })).toBe('compare:204 199')
  })
})

describe('a command sub-task, as stored', () => {
  it('keeps its line apart, its prompt empty and no model, so it is never sent', () => {
    const s = plannedStep({ id: 's1', title: 'Compare with the old draft', command: '  compare:204 199 ', prompt: 'x', model: 'claude-sonnet-5-5', now: 'x' })
    expect(s).toMatchObject({ title: 'Compare with the old draft', command: 'compare:204 199', prompt: '', model: null, status: STATUS.READY })
    expect(isCommand(s)).toBe(true)
  })

  it('keeps its place as the chat moves on, and comes forward in the next run', () => {
    const cmd = { id: 'c2', status: STATUS.READY, prompt: '', model: null, command: 'compare:204 199', title: 'Compare' }
    const lane = { chatId: 'c', steps: [{ id: 'p1', status: STATUS.DONE, prompt: 'One', messageId: 'm1' }, cmd, { id: 'p3', status: STATUS.READY, prompt: 'Three' }] }
    const after = withSteps(lane, [{ messageId: 'm1', status: STATUS.DONE }, { messageId: 'm3', stepId: 'p3', status: STATUS.DONE }])
    expect(after.steps.map((s) => s.id)).toEqual(['p1', 'c2', 'p3'])
    const next = runFromRun({ docketId: 'd', branches: { a: lane } }, { id: 'r2', n: 2, now: 'x', newId, promptOf: () => 'One' })
    expect(next.branches.a.steps[1]).toMatchObject({ status: STATUS.READY, prompt: '', command: 'compare:204 199', title: 'Compare' })
  })

  it('keeps a sub-task sent into another chat in its place', () => {
    const lane = { chatId: 'c', steps: [{ id: 'p1', status: STATUS.DONE, prompt: 'Into 204' }, { id: 'p2', status: STATUS.READY, prompt: 'Two' }, { id: 'p3', status: STATUS.READY, prompt: 'Three' }] }
    const after = withSteps(lane, [{ messageId: 'm2', stepId: 'p2', status: STATUS.DONE }])
    expect(after.steps.map((s) => s.id)).toEqual(['p1', 'p2', 'p3'])
  })

  it('starts the next run of a task with only branch a carried forward', () => {
    const prev = { docketId: 'd', branches: { a: { steps: [{ id: 'p1', status: STATUS.DONE, prompt: 'One' }] }, b: { steps: [{ id: 'x', status: STATUS.DONE, prompt: 'One', messageId: 'm' }] } } }
    const next = runFromRun(prev, { id: 'r2', n: 2, now: 'x', newId, promptOf: () => 'One', keep: ['a'] })
    expect(next.branches.a.steps).toHaveLength(1)
    expect(next.branches.b.steps).toEqual([])
  })
})

describe('restoring a task', () => {
  const run = (s) => ({ id: 'r1', docketId: 'd1', n: 1, branches: { a: { status: 'ready', steps: [s] } } })
  const check = (d, s = { id: 's1', status: 'ready', prompt: '' }) => validateBackup({ conversations: [], dockets: [{ id: 'd1', branches: [], order: [], ...d }], runs: [run(s)] })

  it('checks each field of a task', () => {
    expect(check({ description: 'The grant', model: 'claude-sonnet-5-5', rooms: ['c-204'], flow: 'oneByOne', doneAt: null }).valid).toBe(true)
    expect(check({ flow: 'sideways' }).valid).toBe(false)
    expect(check({ rooms: 'c-204' }).valid).toBe(false)
    expect(check({ description: 'x'.repeat(4001) }).valid).toBe(false)
    expect(check({ doneAt: 'Friday' }).valid).toBe(false)
  })

  it('checks a sub-task title and command', () => {
    expect(check({}, { id: 's1', status: 'ready', prompt: '', title: 'Compare', command: 'compare:204 199' }).valid).toBe(true)
    expect(check({}, { id: 's1', status: 'ready', prompt: '', command: 3 }).valid).toBe(false)
    expect(check({}, { id: 's1', status: 'ready', prompt: '', title: 'x'.repeat(201) }).valid).toBe(false)
  })

  it('writes the new fields into a backup', () => {
    const { docket } = emptyPlan({ id: 'd1', runId: 'r1', num: 207, title: 'Grant application', now: 'x', task: { description: 'The grant', model: 'm', rooms: ['c-204'], flow: 'together' } })
    expect(rebuildRecord('dockets', docket)).toMatchObject({ description: 'The grant', model: 'm', rooms: ['c-204'], flow: 'together' })
  })
})

describe('a task in the database', () => {
  let db
  beforeEach(async () => { db = await openDB('task-v4-test', 6, { upgrade: upgradeSchema }) })
  afterEach(() => db.close())

  it('makes a task, changes it, refuses a new flow once it has run, and ticks it with your sub-tasks', async () => {
    const made = await R.newPlan(db, { title: 'Grant application', task: { description: 'For the board', model: null, rooms: [], flow: 'oneByOne' }, newId, now: at() })
    const docketId = made.docket.id
    expect(made.docket).toMatchObject({ title: 'Grant application', description: 'For the board', model: null, rooms: [], flow: 'oneByOne' })
    const changed = await R.changeTask(db, { docketId, set: { title: 'Grant, two years', model: 'claude-sonnet-5-5', flow: 'together' }, now: at() })
    expect(changed.docket).toMatchObject({ title: 'Grant, two years', model: 'claude-sonnet-5-5', flow: 'together' })
    expect(changed.docket.branches[0].name).toBe('Grant, two years')

    const yours = await R.planStep(db, { docketId, letter: 'a', todo: 'Check the figures', title: 'Check', newId, now: at() })
    const cmd = await R.planStep(db, { docketId, letter: 'a', title: 'Compare', command: 'compare:204 199', newId, now: at() })
    const p = await R.planStep(db, { docketId, letter: 'a', prompt: 'Draft it', title: 'Draft', newId, now: at() })
    expect(cmd.step).toMatchObject({ command: 'compare:204 199', title: 'Compare', prompt: '' })
    await R.changeStep(db, { docketId, letter: 'a', stepId: cmd.step.id, set: { command: 'compare:204 201', title: 'Compare again' }, now: at() })

    // Ticking the task ticks your to-do, and leaves the command and the prompt.
    const ticked = await R.tickTask(db, { docketId, done: true, now: at() })
    expect(ticked.docket.doneAt).toBeTruthy()
    const run = (await db.getAllFromIndex('runs', 'docketId', docketId))[0]
    const byId = Object.fromEntries(run.branches.a.steps.map((s) => [s.id, s]))
    expect(byId[yours.step.id]).toMatchObject({ status: STATUS.DONE })
    expect(byId[yours.step.id].todo.doneAt).toBeTruthy()
    expect(byId[cmd.step.id]).toMatchObject({ status: STATUS.READY, command: 'compare:204 201', title: 'Compare again' })
    expect(byId[p.step.id]).toMatchObject({ status: STATUS.READY })
    // undo: brings both back as they were.
    await R.putPlanBack(db, ticked.back)
    const back = (await db.getAllFromIndex('runs', 'docketId', docketId))[0]
    expect(back.branches.a.steps.find((s) => s.id === yours.step.id).status).toBe(STATUS.READY)
    expect((await db.get('dockets', docketId)).doneAt).toBeFalsy()

    // Once it has run, its flow stays.
    await R.markStep(db, { docketId, n: 1, letter: 'a', stepId: p.step.id, status: STATUS.RUNNING, now: at() })
    await expect(R.changeTask(db, { docketId, set: { flow: 'oneByOne' }, now: at() })).rejects.toMatchObject({ code: 'ran' })
    await expect(R.changeTask(db, { docketId, set: { description: 'Still fine' }, now: at() })).resolves.toBeTruthy()
  })
})

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
import { createRunner } from './runner'
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

  it('lets a sub-task say where it goes, over its task', () => {
    expect(targetOf({ rooms: ['c-204'] }, { into: 'own' })).toEqual({ own: true })
    expect(targetOf({ flow: 'together' }, { into: 'c-199' })).toEqual({ chat: 'c-199' })
    expect(plannedStep({ id: 's', prompt: 'x', into: 'c-199', now: 'x' }).into).toBe('c-199')
    expect(plannedStep({ id: 's', todo: 'x', into: 'c-199', now: 'x' }).into).toBeUndefined()
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

  it('keeps a title as written, its spaces made one', () => {
    expect(plannedStep({ id: 's1', title: '  List  the rooms ', prompt: 'x', now: 'x' }).title).toBe('List the rooms')
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
    expect(check({}, { id: 's1', status: 'ready', prompt: 'x', into: 'own' }).valid).toBe(true)
    expect(check({}, { id: 's1', status: 'ready', prompt: 'x', into: 7 }).valid).toBe(false)
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

  // v5 (C309): a sub-task's kind changed in place, and sub-tasks moved.
  it('changes a sub-task from yours to a search to a command and back, its words kept, each with its undo', async () => {
    const made = await R.newPlan(db, { title: 'Grant application', task: { flow: 'oneByOne' }, newId, now: at() })
    const docketId = made.docket.id
    const { step } = await R.planStep(db, { docketId, letter: 'a', todo: 'Last year’s figures', title: 'Figures', newId, now: at() })
    const asSearch = await R.changeStep(db, { docketId, letter: 'a', stepId: step.id, set: { kind: 'search', model: 'openalex' }, now: at() })
    expect(asSearch.step).toMatchObject({ prompt: 'Last year’s figures', model: 'openalex', title: 'Figures' })
    expect(asSearch.step.todo).toBeUndefined()
    expect(kindOf(asSearch.step, made.docket, isSource)).toBe('search')
    await expect(R.changeStep(db, { docketId, letter: 'a', stepId: step.id, set: { kind: 'command', command: '  ' }, now: at() })).rejects.toMatchObject({ code: 'noCommand' })
    const asCommand = await R.changeStep(db, { docketId, letter: 'a', stepId: step.id, set: { kind: 'command', command: 'compare:204 199' }, now: at() })
    expect(asCommand.step).toMatchObject({ prompt: '', model: null, command: 'compare:204 199' })
    const yours = await R.changeStep(db, { docketId, letter: 'a', stepId: step.id, set: { kind: 'yours', text: 'Ring Anna' }, now: at() })
    expect(yours.step).toMatchObject({ prompt: '', model: null, todo: { text: 'Ring Anna', doneAt: null } })
    expect(yours.step.command).toBeUndefined()
    // Each is stored as a step of its kind is made, so a backup restores it.
    for (const s of [asSearch.step, asCommand.step, yours.step]) {
      expect(validateBackup({ conversations: [], dockets: [{ id: 'd1', branches: [], order: [] }], runs: [{ id: 'r1', docketId: 'd1', n: 1, branches: { a: { status: 'ready', steps: [s] } } }] }).valid).toBe(true)
    }
    // undo: puts the command back as it was.
    await R.putPlanBack(db, yours.back)
    const back = (await db.getAllFromIndex('runs', 'docketId', docketId))[0]
    expect(back.branches.a.steps[0]).toMatchObject({ command: 'compare:204 199' })
  })

  it('moves a sub-task among those not sent, never before one sent, and undo: moves it back', async () => {
    const made = await R.newPlan(db, { title: 'Grant application', task: { flow: 'oneByOne' }, newId, now: at() })
    const docketId = made.docket.id
    const one = await R.planStep(db, { docketId, letter: 'a', prompt: 'One', title: 'One', newId, now: at() })
    await R.planStep(db, { docketId, letter: 'a', todo: 'Two', title: 'Two', newId, now: at() })
    const three = await R.planStep(db, { docketId, letter: 'a', prompt: 'Three', title: 'Three', newId, now: at() })
    const order = async () => (await db.getAllFromIndex('runs', 'docketId', docketId))[0].branches.a.steps.map((s) => s.title)
    const moved = await R.moveStep(db, { docketId, letter: 'a', stepId: three.step.id, to: 0, now: at() })
    expect(moved.index).toBe(1)
    expect(await order()).toEqual(['Three', 'One', 'Two'])
    await R.putPlanBack(db, moved.back)
    expect(await order()).toEqual(['One', 'Two', 'Three'])
    // Once the first is running, nothing goes before it, and it stays put.
    await R.markStep(db, { docketId, n: 1, letter: 'a', stepId: one.step.id, status: STATUS.RUNNING, now: at() })
    await R.moveStep(db, { docketId, letter: 'a', stepId: three.step.id, to: 0, now: at() })
    expect(await order()).toEqual(['One', 'Three', 'Two'])
    await expect(R.moveStep(db, { docketId, letter: 'a', stepId: one.step.id, to: 2, now: at() })).rejects.toMatchObject({ code: 'fixed' })
  })
})

describe('a task run', () => {
  const step = (id, extra = {}) => ({ id, status: STATUS.READY, prompt: `Prompt ${id}`, model: 'm', condition: null, ...extra })
  const depsFor = (lane, { sent, offered, chats }) => ({
    readBranch: async () => structuredClone(lane),
    ensureChat: async ({ step: s, own }) => { const c = own ? `own-${s.id}` : 'c-a'; chats?.push(c); return c },
    markStep: async ({ stepId, status }) => { lane.steps.find((s) => s.id === stepId).status = status },
    sendStep: async ({ step: s, chatId }) => { sent.push(`${s.id}@${chatId}`); return 'done' },
    offerLine: ({ step: s }) => offered.push(s.command),
    stopChat: () => {},
    lock: async (id, fn) => fn(),
    newRunFor: async () => 1,
  })
  const settle = () => new Promise((res) => setTimeout(res, 20))

  it('one by one, puts a command in the bar and waits for it, even last', async () => {
    const lane = { chatId: null, steps: [step('p1'), step('c2', { prompt: '', model: null, command: 'compare:204 199' }), step('p3'), step('c4', { prompt: '', model: null, command: 'export:204' })] }
    const sent = []
    const offered = []
    const r = createRunner(depsFor(lane, { sent, offered }))
    const out = await r.start({ docketId: 'd', num: 207, n: 1, letters: ['a'] })
    await settle()
    expect(sent).toEqual(['p1@c-a'])
    expect(offered).toEqual(['compare:204 199'])
    expect(r.active()[0]).toMatchObject({ yours: 'c2', line: 'compare:204 199' })
    lane.steps[1].status = STATUS.DONE
    r.ticked({ docketId: 'd', letter: 'a', stepId: 'c2' })
    await settle()
    expect(sent).toEqual(['p1@c-a', 'p3@c-a'])
    expect(offered).toEqual(['compare:204 199', 'export:204'])
    lane.steps[3].status = STATUS.DONE
    r.ticked({ docketId: 'd', letter: 'a', stepId: 'c4' })
    expect(await out.finished).toEqual({ n: 1, ended: { a: 'done' } })
  })

  it('one by one, waits at a sub-task that is yours before a prompt', async () => {
    const lane = { chatId: 'c-a', steps: [step('p1'), step('y2', { model: null, yours: true }), step('p3')] }
    const sent = []
    const r = createRunner(depsFor(lane, { sent, offered: [] }))
    const out = await r.start({ docketId: 'd', num: 207, n: 1, letters: ['a'] })
    await settle()
    expect(sent).toEqual(['p1@c-a'])
    expect(r.active()[0]).toMatchObject({ yours: 'y2', line: null })
    r.stop({ scope: 'docket', num: 207 })
    expect(await out.finished).toEqual({ n: 1, ended: { a: 'stopped' } })
  })

  it('all at once, sends each prompt into its own chat, yours holding nothing, then the commands', async () => {
    const lane = { chatId: null, steps: [step('p1'), step('t2', { prompt: '', model: null, todo: { text: 'Call Anna', doneAt: null } }), step('c3', { prompt: '', model: null, command: 'compare:207b 207c' }), step('p4')] }
    const sent = []
    const offered = []
    const chats = []
    const r = createRunner(depsFor(lane, { sent, offered, chats }))
    const out = await r.start({ docketId: 'd', num: 207, n: 1, letters: ['a'], together: true })
    await settle()
    expect(sent.sort()).toEqual(['p1@own-p1', 'p4@own-p4'])
    expect(offered).toEqual(['compare:207b 207c'])
    lane.steps[2].status = STATUS.DONE
    r.ticked({ docketId: 'd', letter: 'a', stepId: 'c3' })
    expect(await out.finished).toEqual({ n: 1, ended: { a: 'done' } })
    expect(lane.steps[1].status).toBe(STATUS.READY)
  })

  it('sends a sub-task into its own room, or a chat of its own, one by one and all at once (into)', async () => {
    const lane = { chatId: 'c-a', steps: [step('p1'), step('p2', { chatId: 'c-204' }), step('p3', { own: true })] }
    const sent = []
    const r = createRunner(depsFor(lane, { sent, offered: [] }))
    expect(await (await r.start({ docketId: 'd', num: 207, n: 1, letters: ['a'] })).finished).toEqual({ n: 1, ended: { a: 'done' } })
    expect(sent).toEqual(['p1@c-a', 'p2@c-204', 'p3@own-p3'])

    const both = { chatId: null, steps: [step('q1', { chatId: 'c-204' }), step('q2', { chatId: 'c-204' }), step('q3')] }
    const order = []
    const deps = depsFor(both, { sent: order, offered: [] })
    let open = 0
    let most = 0
    deps.sendStep = async ({ step: st, chatId }) => { open += chatId === 'c-204' ? 1 : 0; most = Math.max(most, open); await new Promise((res) => setTimeout(res, 5)); open -= chatId === 'c-204' ? 1 : 0; order.push(`${st.id}@${chatId}`); return 'done' }
    const t = createRunner(deps)
    await (await t.start({ docketId: 'd', num: 207, n: 1, letters: ['a'], together: true })).finished
    expect(order.sort()).toEqual(['q1@c-204', 'q2@c-204', 'q3@own-q3'])
    // Two into one room go one after another.
    expect(most).toBe(1)
  })
})

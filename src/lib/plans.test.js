import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { openDB } from 'idb'
import { upgradeSchema } from './schema'
import * as R from './records'
import { withSteps } from './recordsModel'
import { STATUS } from './docketModel'
import { gatherContents, restoreInto } from './backupData'
import { validateBackup } from './validate'
import { contentsToFlatStores } from './backupFormat'
import { maybeSealed } from './__fixtures__/sealedHarness'

// Plans ahead of a run (stage 10, piece 1; C196).

let n = 0
const newId = () => `id-${++n}`
let clock = 0
const at = () => new Date(Date.UTC(2026, 9, 23, 12, 0, clock++)).toISOString()
const open = async (name = 'plans') => maybeSealed(await openDB(name, 6, { upgrade: upgradeSchema }))
const chat = () => {
  const now = at()
  return { id: newId(), title: 'Water tower history', model: 'claude-sonnet-5-5', parentId: null, branchPoint: null, room: 'mode_1', pinned: false, storageBytes: 0, createdAt: now, updatedAt: now }
}
const message = (conversationId, role, content, extra = {}) => ({ id: newId(), conversationId, role, content, tokenCount: 1, incomplete: false, createdAt: at(), ...extra })
const runsOf = async (db, docketId) => (await db.getAllFromIndex('runs', 'docketId', docketId)).sort((a, b) => a.n - b.n)
const code = async (p) => { try { await p } catch (e) { return e.code ?? e.name } return 'ok' }

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  n = 0
  clock = 0
})

describe('a step planned ahead', () => {
  let db
  beforeEach(async () => { db = await open() })
  afterEach(() => db.close())

  it('stays through the chat’s own messages, after the steps that ran', async () => {
    const c = await R.createChat(db, chat())
    const { step } = await R.planStep(db, { docketId: c.docketId, letter: 'a', prompt: 'Who built it, and when?', newId, now: at() })
    // A prompt typed by hand runs first; the planned step waits after it.
    await R.addMessageRecord(db, message(c.id, 'user', 'What is it made of?'))
    await R.addMessageRecord(db, message(c.id, 'assistant', 'Brick.', { model: 'claude-haiku-5-5' }))
    const [run] = await runsOf(db, c.docketId)
    const steps = run.branches.a.steps
    expect(steps.map((s) => [s.status, Boolean(s.messageId), s.prompt ?? null])).toEqual([
      [STATUS.DONE, true, null],
      [STATUS.READY, false, 'Who built it, and when?'],
    ])
    expect(steps[0].model).toBe('claude-haiku-5-5') // the model the reply names
    expect(steps[1].id).toBe(step.id)
    expect(run.branches.a.status).toBe(STATUS.READY)
  })

  it('is the turn whose message names it, keeping what it was planned with', async () => {
    const c = await R.createChat(db, chat())
    const { step } = await R.planStep(db, { docketId: c.docketId, letter: 'a', prompt: 'Who built it?', model: 'claude-opus-5-5', newId, now: at() })
    await R.addMessageRecord(db, message(c.id, 'user', 'Who built it?', { step: step.id }))
    await R.addMessageRecord(db, message(c.id, 'assistant', 'The city.', { model: 'claude-opus-5-5' }))
    const [run] = await runsOf(db, c.docketId)
    expect(run.branches.a.steps).toHaveLength(1)
    expect(run.branches.a.steps[0]).toMatchObject({ id: step.id, prompt: 'Who built it?', model: 'claude-opus-5-5', status: STATUS.DONE })
    expect(run.branches.a.status).toBe(STATUS.DONE)
  })

  it('goes after the steps that started, wherever it was asked for', async () => {
    const c = await R.createChat(db, chat())
    await R.addMessageRecord(db, message(c.id, 'user', 'First'))
    await R.addMessageRecord(db, message(c.id, 'assistant', 'One'))
    const out = await R.planStep(db, { docketId: c.docketId, letter: 'a', prompt: 'Second', after: 0, newId, now: at() })
    expect(out.index).toBe(2)
  })

  it('can be changed until it starts, and not after', async () => {
    const c = await R.createChat(db, chat())
    const { step } = await R.planStep(db, { docketId: c.docketId, letter: 'a', prompt: 'Draft', newId, now: at() })
    await R.changeStep(db, { docketId: c.docketId, letter: 'a', stepId: step.id, set: { prompt: 'Better', condition: 'finished', model: 'claude-haiku-5-5' } })
    let [run] = await runsOf(db, c.docketId)
    expect(run.branches.a.steps[0]).toMatchObject({ prompt: 'Better', condition: 'finished', model: 'claude-haiku-5-5' })
    await R.addMessageRecord(db, message(c.id, 'user', 'Better', { step: step.id }))
    ;[run] = await runsOf(db, c.docketId)
    expect(await code(R.changeStep(db, { docketId: c.docketId, letter: 'a', stepId: step.id, set: { prompt: 'Too late' } }))).toBe('fixed')
  })
})

describe('hold:, runs, empty plans and moves', () => {
  let db
  beforeEach(async () => { db = await open() })
  afterEach(() => db.close())

  it('holds a branch’s planned steps, lets them go again, and refuses while it runs', async () => {
    const c = await R.createChat(db, chat())
    await R.planStep(db, { docketId: c.docketId, letter: 'a', prompt: 'One', newId, now: at() })
    await R.holdBranch(db, { docketId: c.docketId, letter: 'a', on: true })
    let [run] = await runsOf(db, c.docketId)
    expect(run.branches.a.status).toBe(STATUS.WAITING)
    await R.holdBranch(db, { docketId: c.docketId, letter: 'a', on: false })
    ;[run] = await runsOf(db, c.docketId)
    expect(run.branches.a.status).toBe(STATUS.READY)
    await db.put('runs', { ...run, branches: { a: { ...run.branches.a, steps: [{ ...run.branches.a.steps[0], status: STATUS.RUNNING, messageId: 'm' }] } } })
    expect(await code(R.holdBranch(db, { docketId: c.docketId, letter: 'a', on: true }))).toBe('running')
  })

  it('makes the next run from the last, every step planned again, nothing started', async () => {
    const c = await R.createChat(db, chat())
    await R.addMessageRecord(db, message(c.id, 'user', 'What is it made of?'))
    await R.addMessageRecord(db, message(c.id, 'assistant', 'Brick.'))
    await R.planStep(db, { docketId: c.docketId, letter: 'a', prompt: 'Who built it?', newId, now: at() })
    const second = await R.newRun(db, { docketId: c.docketId, newId, now: at() })
    expect(second.n).toBe(2)
    const runs = await runsOf(db, c.docketId)
    expect(runs.map((r) => r.n)).toEqual([1, 2])
    const b = runs[1].branches.a
    expect(b.chatId).toBeNull()
    expect(b.steps.map((s) => [s.status, s.prompt, Boolean(s.messageId)])).toEqual([
      [STATUS.READY, 'What is it made of?', false],
      [STATUS.READY, 'Who built it?', false],
    ])
    // Run 1 is untouched.
    expect(runs[0].branches.a.steps[0].messageId).toBeTruthy()
  })

  it('makes a plan with nothing in it, adds a branch with no chat, and moves it', async () => {
    const { docket } = await R.newPlan(db, { title: 'Grant application', newId, now: at() })
    expect(docket.num).toBe(201)
    const b = await R.newPlanBranch(db, { docketId: docket.id, name: 'Shorter', now: at() })
    const c2 = await R.newPlanBranch(db, { docketId: docket.id, name: 'Longer', now: at() })
    expect([b.letter, c2.letter]).toEqual(['b', 'c'])
    await R.moveBranch(db, { docketId: docket.id, letter: 'c', before: 'b' })
    expect((await db.get('dockets', docket.id)).order).toEqual(['a', 'c', 'b'])
    const [run] = await runsOf(db, docket.id)
    expect(Object.values(run.branches).every((x) => x.chatId === null)).toBe(true)
  })
})

describe('a merge restore (C196 (i))', () => {
  it('brings a plan with steps of its own in whole, as its own plan', async () => {
    const source = await open('source')
    const c = await R.createChat(source, chat())
    await R.addMessageRecord(source, message(c.id, 'user', 'What is it made of?'))
    await R.addMessageRecord(source, message(c.id, 'assistant', 'Brick.'))
    await R.planStep(source, { docketId: c.docketId, letter: 'a', prompt: 'Who built it?', newId, now: at() })
    await R.newRun(source, { docketId: c.docketId, newId, now: at() })
    const contents = await gatherContents(source)
    source.close()
    expect(validateBackup(contentsToFlatStores(contents)).valid).toBe(true)

    const target = await open('target')
    await R.createChat(target, chat()) // something here already
    await restoreInto(target, contents, { strategy: 'merge', newId, now: at() })
    const dockets = await target.getAll('dockets')
    const restored = dockets.find((d) => d.restoredFrom)
    expect(restored).toBeTruthy()
    const runs = await runsOf(target, restored.id)
    expect(runs.map((r) => r.n)).toEqual([1, 2])
    expect(runs[0].branches.a.steps.map((s) => s.prompt ?? null)).toEqual([null, 'Who built it?'])
    const restoredChat = (await target.getAll('conversations')).find((x) => x.docketId === restored.id)
    expect(runs[0].branches.a.chatId).toBe(restoredChat.id)
    const msgIds = new Set((await target.getAllFromIndex('messages', 'conversationId', restoredChat.id)).map((m) => m.id))
    expect(msgIds.has(runs[0].branches.a.steps[0].messageId)).toBe(true)
    target.close()
  })
})

describe('what a backup may hold in a run (C196)', () => {
  it('refuses steps that are not steps', () => {
    const base = { dockets: [], conversations: [], messages: [] }
    const run = (step) => ({ ...base, runs: [{ id: 'r', docketId: 'd', n: 1, branches: { a: { status: 'ready', chatId: null, steps: [step] } } }] })
    expect(validateBackup(run({ status: 'ready', prompt: 'Fine' })).valid).toBe(true)
    expect(validateBackup(run({ status: 'exploding' })).valid).toBe(false)
    expect(validateBackup(run({ status: 'ready', prompt: 42 })).valid).toBe(false)
    expect(validateBackup(run({ status: 'ready', condition: 'whenever' })).valid).toBe(false)
  })

  it('keeps a running step running until its reply ends', () => {
    const b = { status: STATUS.RUNNING, steps: [{ id: 's', status: STATUS.RUNNING, messageId: 'm', prompt: 'p' }] }
    expect(withSteps(b, [{ messageId: 'm', status: STATUS.PAUSED }]).steps[0].status).toBe(STATUS.RUNNING)
    expect(withSteps(b, [{ messageId: 'm', status: STATUS.DONE }]).steps[0].status).toBe(STATUS.DONE)
  })
})

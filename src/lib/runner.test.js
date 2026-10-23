import { describe, it, expect } from 'vitest'
import { createRunner, nextStep, runScope, runsActive } from './runner'
import { STATUS } from './docketModel'

// The runner (stage 10, piece 3; C200), with every effect faked: nothing is
// sent anywhere.

const step = (id, status = STATUS.READY, prompt = `Prompt ${id}`, extra = {}) => ({ id, status, prompt, model: null, condition: null, ...extra })

// A plan as stored, in memory, and the effects the runner is given.
function world({ branches, send = () => 'done', lockFree = true }) {
  const plan = { runs: [{ n: 1, branches: structuredClone(branches) }] }
  const log = []
  const runOf = (n) => plan.runs.find((r) => r.n === n)
  const deps = {
    readBranch: async ({ n, letter }) => {
      const b = runOf(n)?.branches[letter]
      return b ? { chatId: b.chatId, steps: structuredClone(b.steps) } : null
    },
    ensureChat: async ({ n, letter }) => {
      const b = runOf(n).branches[letter]
      b.chatId = `chat-${letter}${n}`
      log.push(['chat', letter])
      return b.chatId
    },
    markStep: async ({ n, letter, stepId, status, ended }) => {
      const s = runOf(n).branches[letter].steps.find((x) => x.id === stepId)
      s.status = status
      if (ended) s.ended = ended
      log.push(['mark', stepId, status, ended ?? null])
    },
    sendStep: async ({ letter, step: s }) => {
      log.push(['send', letter, s.prompt])
      return send(s)
    },
    stopChat: (chatId) => log.push(['stopChat', chatId]),
    lock: async (id, fn) => (lockFree ? fn() : null),
    newRunFor: async ({ letters }) => {
      const last = plan.runs.at(-1)
      const n = last.n + 1
      const next = {}
      for (const [l, b] of Object.entries(last.branches)) {
        next[l] = { chatId: null, steps: b.steps.map((s) => ({ ...step(`${s.id}-${n}`, letters.includes(l) ? STATUS.READY : STATUS.WAITING, s.prompt) })) }
      }
      plan.runs.push({ n, branches: next })
      return n
    },
  }
  return { plan, log, deps, runOf }
}

describe('what run: runs', () => {
  const board = (branches) => ({ num: 201, n: 1, latest: 1, branches })
  const line = (letter, status, steps, chatId = null) => ({ letter, address: `201${letter}`, status, chatId, steps })
  const s = (status, text, planned = true) => ({ stepId: text, status, text, planned })

  it('takes every branch with a step ready, but not held, paused or running ones', () => {
    const p = board([
      line('a', STATUS.READY, [s(STATUS.DONE, 'One', false), s(STATUS.READY, 'Two')], 'c1'),
      line('b', STATUS.WAITING, [s(STATUS.WAITING, 'Held')]),
      line('c', STATUS.PAUSED, [s(STATUS.PAUSED, 'Broke', false), s(STATUS.READY, 'Next')]),
      line('d', STATUS.READY, [s(STATUS.READY, ''), s(STATUS.READY, 'Real')]),
    ])
    const scope = runScope(p)
    expect(scope.branches.map((b) => [b.letter, b.steps.map((x) => x.text)])).toEqual([['a', ['Two']], ['d', ['Real']]])
    expect(scope).toMatchObject({ newRun: false, run: 1, skipped: 1 })
    expect(runScope(board([line('a', STATUS.DONE, [s(STATUS.DONE, 'One', false)])]))).toEqual({ bad: { message: 'runNothing', values: { run: 1 } } })
    expect(runScope(board([line('c', STATUS.PAUSED, [s(STATUS.PAUSED, 'Broke', false), s(STATUS.READY, 'Next')])]))).toEqual({ bad: { message: 'runPausedOnly', values: { count: 1, nums: ['201c'], example: '201c' } } })
  })

  it('runs one branch where it has a step ready, or else in the next run', () => {
    const p = board([line('a', STATUS.DONE, [s(STATUS.DONE, 'One', false)], 'c1'), line('b', STATUS.READY, [s(STATUS.READY, 'Two')])])
    expect(runScope(p, { letter: 'b' })).toMatchObject({ newRun: false, run: 1, branches: [{ letter: 'b' }] })
    expect(runScope(p, { letter: 'a' })).toMatchObject({ newRun: true, run: 2, branches: [{ letter: 'a', chatId: null, steps: [{ text: 'One' }] }] })
    expect(runScope(p, { letter: 'z' }).bad.message).toBe('planNoBranch')
    expect(runScope(board([line('a', STATUS.RUNNING, [s(STATUS.RUNNING, 'x', false)])]), { letter: 'a' }).bad.message).toBe('runRunning')
    expect(runScope(board([line('a', STATUS.WAITING, [s(STATUS.WAITING, 'x')])]), { letter: 'a' }).bad.message).toBe('runHeld')
  })

  it('finds the next step, skipping empty ones', () => {
    expect(nextStep([step('a', STATUS.DONE, 'x', { messageId: 'm' }), step('b', STATUS.READY, '  '), step('c')])).toMatchObject({ index: 2, step: { id: 'c' } })
    expect(nextStep([step('a', STATUS.RUNNING), step('b')])).toBeNull()
  })
})

describe('the runner', () => {
  it('sends each branch’s steps in order, makes a chat for a branch that has none, and marks each', async () => {
    const w = world({ branches: { a: { chatId: null, steps: [step('s1'), step('s2', STATUS.READY, ''), step('s3')] } } })
    const r = createRunner(w.deps)
    const out = await r.start({ docketId: 'd', num: 201, n: 1, letters: ['a'] })
    expect(out).toMatchObject({ started: true, n: 1 })
    expect(runsActive()).toBe(1)
    expect(await out.finished).toEqual({ n: 1, ended: { a: 'done' } })
    expect(runsActive()).toBe(0)
    expect(w.log.filter((x) => x[0] !== 'mark')).toEqual([['chat', 'a'], ['send', 'a', 'Prompt s1'], ['send', 'a', 'Prompt s3']])
    expect(w.runOf(1).branches.a.steps.map((x) => x.status)).toEqual([STATUS.DONE, STATUS.READY, STATUS.DONE])
  })

  it('pauses a step that fails, says why, and stops its branch there; other branches go on', async () => {
    const w = world({
      branches: { a: { chatId: 'c1', steps: [step('a1'), step('a2')] }, b: { chatId: 'c2', steps: [step('b1'), step('b2')] } },
      send: (s) => (s.id === 'a1' ? 'failed' : 'done'),
    })
    const out = await createRunner(w.deps).start({ docketId: 'd', num: 201, n: 1, letters: ['a', 'b'] })
    expect((await out.finished).ended).toEqual({ a: 'failed', b: 'done' })
    expect(w.runOf(1).branches.a.steps.map((x) => [x.status, x.ended ?? null])).toEqual([[STATUS.PAUSED, 'failed'], [STATUS.READY, null]])
    expect(w.runOf(1).branches.b.steps.every((x) => x.status === STATUS.DONE)).toBe(true)
  })

  it('stops a branch where it is, and the step running pauses as stopped', async () => {
    let release
    const w = world({ branches: { a: { chatId: 'c1', steps: [step('a1'), step('a2')] } }, send: () => new Promise((resolve) => { release = resolve }) })
    const r = createRunner(w.deps)
    const out = await r.start({ docketId: 'd', num: 201, n: 1, letters: ['a'] })
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(r.active()).toMatchObject([{ docketId: 'd', letter: 'a', chatId: 'c1' }])
    expect(r.stop({ scope: 'branch', num: 201, letter: 'a' })).toBe(1)
    expect(w.log).toContainEqual(['stopChat', 'c1'])
    release('stopped')
    expect((await out.finished).ended).toEqual({ a: 'stopped' })
    expect(w.runOf(1).branches.a.steps.map((x) => [x.status, x.ended ?? null])).toEqual([[STATUS.PAUSED, 'stopped'], [STATUS.READY, null]])
    expect(r.stop({ scope: 'all' })).toBe(0)
  })

  it('does not run a plan another tab runs, nor one this tab runs already', async () => {
    const w = world({ branches: { a: { chatId: 'c1', steps: [step('a1')] } }, lockFree: false })
    expect(await createRunner(w.deps).start({ docketId: 'd', num: 201, n: 1, letters: ['a'] })).toMatchObject({ started: false, reason: 'elsewhere' })
    let release
    const w2 = world({ branches: { a: { chatId: 'c1', steps: [step('a1')] } }, send: () => new Promise((resolve) => { release = resolve }) })
    const r = createRunner(w2.deps)
    const first = await r.start({ docketId: 'd', num: 201, n: 1, letters: ['a'] })
    expect(await r.start({ docketId: 'd', num: 201, n: 1, letters: ['a'] })).toEqual({ started: false, reason: 'running' })
    await new Promise((resolve) => setTimeout(resolve, 0))
    release('done')
    await first.finished
  })

  it('makes the next run first when asked, the others waiting', async () => {
    const w = world({ branches: { a: { chatId: 'c1', steps: [step('a1', STATUS.DONE)] }, b: { chatId: 'c2', steps: [step('b1', STATUS.DONE)] } } })
    const out = await createRunner(w.deps).start({ docketId: 'd', num: 201, n: 1, letters: ['a'], newRun: true })
    expect(out).toMatchObject({ started: true, n: 2 })
    await out.finished
    expect(w.runOf(2).branches.a.steps[0].status).toBe(STATUS.DONE)
    expect(w.runOf(2).branches.b.steps[0].status).toBe(STATUS.WAITING)
    expect(w.log).toContainEqual(['chat', 'a'])
  })
})

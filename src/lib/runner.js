// Running a plan (refactor-plan.md, stage 10, piece 3; almanac spec §5;
// docket spec §5; C196; C200).
//
// run: alone runs every branch of the plan's last run that has a step ready,
// not held, not paused and not running; each branch's steps go one at a
// time, in order, each after the reply before it has come back whole. A step
// left empty is skipped (ruled 23 October). A step that fails, stalls or is
// stopped pauses, and its branch stops there (conditions come with piece 4).
// run:201b runs that branch where it has a step ready, or else makes the next
// run and runs it there, the other branches waiting.
//
// The runner holds no data of its own: it reads the plan as stored before
// each step, and every change is written through the functions it is given.
// Only one tab runs a plan at a time (a Web Lock per plan, bus.js); stop:
// reaches the tab that runs it over the bus, as ids and signals only.

import { STATUS, isPlanned } from './docketModel'

const hasWords = (s) => String(s?.text ?? s?.prompt ?? '').trim().length > 0
const isReady = (s) => s.status === STATUS.READY && (s.planned ?? isPlanned(s))

/** The next step a branch runs after index `after`: ready, planned and with words. Empty ones are skipped. */
export function nextStep(steps, after = -1) {
  for (let i = after + 1; i < steps.length; i++) {
    const s = steps[i]
    if (s.status === STATUS.RUNNING) return null
    if (isReady(s) && hasWords(s)) return { index: i, step: s }
  }
  return null
}

const readyOf = (b) => b.steps.filter((s) => isReady(s) && hasWords(s))
const emptyOf = (b) => b.steps.filter((s) => isReady(s) && !hasWords(s)).length
const heldOf = (b) => {
  const open = b.steps.filter((s) => s.planned)
  return open.length > 0 && open.every((s) => s.status === STATUS.WAITING)
}

/**
 * What run: would run, from the plan as the Plan board has it (planBoard.js),
 * at its last run.
 * @returns {{ newRun: boolean, run: number, branches: Array<{ letter, address, chatId, steps: object[] }>, skipped: number }|{ bad: { message: string, values?: object } }}
 */
export function runScope(p, { letter = null } = {}) {
  if (letter) {
    const b = p.branches.find((x) => x.letter === letter)
    const address = `${p.num}${letter}`
    if (!b) return { bad: { message: 'planNoBranch', values: { address, run: p.latest } } }
    if (b.status === STATUS.RUNNING) return { bad: { message: 'runRunning', values: { address } } }
    if (heldOf(b)) return { bad: { message: 'runHeld', values: { address } } }
    const ready = readyOf(b)
    if (ready.length) return { newRun: false, run: p.latest, branches: [{ letter, address, chatId: b.chatId, steps: ready }], skipped: emptyOf(b) }
    // Nothing left to run here: the next run, this branch's steps planned again.
    const again = b.steps.filter(hasWords)
    if (!again.length) return { bad: { message: 'runNoSteps', values: { address } } }
    return { newRun: true, run: p.latest + 1, branches: [{ letter, address, chatId: null, steps: again }], skipped: b.steps.length - again.length }
  }
  const branches = []
  let skipped = 0
  for (const b of p.branches) {
    if (b.status === STATUS.RUNNING || b.status === STATUS.PAUSED || heldOf(b)) continue
    const ready = readyOf(b)
    if (!ready.length) continue
    branches.push({ letter: b.letter, address: b.address, chatId: b.chatId, steps: ready })
    skipped += emptyOf(b)
  }
  if (!branches.length) {
    // A paused branch with steps still to run carries on only when named.
    const paused = p.branches.filter((b) => b.status === STATUS.PAUSED && readyOf(b).length)
    if (paused.length) return { bad: { message: 'runPausedOnly', values: { count: paused.length, nums: paused.map((b) => b.address), example: paused[0].address } } }
    return { bad: { message: 'runNothing', values: { run: p.latest } } }
  }
  return { newRun: false, run: p.latest, branches, skipped }
}

// How many runs this page has going, for the lock's idle clock (C196; the
// lock waits while anything is being written).
let going = 0
export const runsActive = () => going

/**
 * The runner. Every effect is a function it is given:
 *   readBranch({ docketId, n, letter })  -> { chatId, steps } as stored, or null
 *   ensureChat({ docketId, n, letter, step }) -> the branch's chat id, made if it has none
 *   markStep({ docketId, n, letter, stepId, status, ended })
 *   sendStep({ docketId, n, letter, chatId, step }) -> 'done' | 'stopped' | 'failed' | 'stalled'
 *   stopChat(chatId)  stops the reply arriving there
 *   lock(docketId, fn) -> fn's result, or null when another tab holds the plan
 *   newRunFor({ docketId, letters }) -> the new run's number, the other branches waiting
 *   onChange(active)  what runs here now changed
 *   onEnd({ docketId, num, n, ended })  a run finished: ended maps each letter to how
 */
export function createRunner({ readBranch, ensureChat, markStep, sendStep, stopChat, lock, newRunFor, onChange = () => {}, onEnd = () => {} }) {
  const jobs = new Map() // docketId -> { num, n, letters, stopping, current }

  const active = () => [...jobs.entries()].flatMap(([docketId, job]) => [...job.letters].map((letter) => ({
    docketId, num: job.num, n: job.n, letter, chatId: job.current.get(letter) ?? null, stopping: job.stopping.has(letter),
  })))
  const changed = () => onChange(active())

  async function runBranch(docketId, job, letter) {
    let after = -1
    for (;;) {
      if (job.stopping.has(letter)) return 'stopped'
      const branch = await readBranch({ docketId, n: job.n, letter })
      if (!branch) return 'gone'
      const next = nextStep(branch.steps, after)
      if (!next) return 'done'
      after = next.index
      const step = next.step
      let chatId = branch.chatId
      try {
        chatId = chatId ?? await ensureChat({ docketId, n: job.n, letter, step })
        await markStep({ docketId, n: job.n, letter, stepId: step.id, status: STATUS.RUNNING })
      } catch {
        return 'failed'
      }
      job.current.set(letter, chatId)
      changed()
      let outcome
      try {
        outcome = job.stopping.has(letter) ? 'stopped' : await sendStep({ docketId, n: job.n, letter, chatId, step })
      } catch (err) {
        outcome = err?.name === 'Stalled' ? 'stalled' : err?.name === 'AbortError' ? 'stopped' : 'failed'
      }
      job.current.delete(letter)
      if (outcome !== 'done' && job.stopping.has(letter)) outcome = 'stopped'
      await markStep({ docketId, n: job.n, letter, stepId: step.id, status: outcome === 'done' ? STATUS.DONE : STATUS.PAUSED, ended: outcome === 'done' ? null : outcome }).catch(() => {})
      changed()
      if (outcome !== 'done') return outcome
    }
  }

  /**
   * Starts a run: { docketId, num, n, letters, newRun }. Resolves once it has
   * begun, or could not: { started, n, reason, finished } where finished
   * resolves when every branch has ended.
   */
  async function start({ docketId, num, n, letters, newRun = false }) {
    if (jobs.has(docketId)) return { started: false, reason: 'running' }
    let begun
    const head = new Promise((resolve) => { begun = resolve })
    const finished = Promise.resolve(lock(docketId, async () => {
      const job = { num, n, letters: new Set(letters), stopping: new Set(), current: new Map() }
      jobs.set(docketId, job)
      going += 1
      const ended = {}
      try {
        if (newRun) job.n = await newRunFor({ docketId, letters })
        begun({ started: true, n: job.n })
        changed()
        const outcomes = await Promise.all(letters.map((l) => runBranch(docketId, job, l)))
        letters.forEach((l, i) => { ended[l] = outcomes[i] })
        return { n: job.n, ended }
      } catch {
        begun({ started: false, reason: 'failed' })
        return { n: job.n, ended }
      } finally {
        jobs.delete(docketId)
        going -= 1
        changed()
        onEnd({ docketId, num, n: job.n, ended })
      }
    })).then((out) => {
      if (out === null) begun({ started: false, reason: 'elsewhere' })
      return out
    }, () => {
      begun({ started: false, reason: 'failed' })
      return null
    })
    const said = await head
    return { ...said, finished }
  }

  /**
   * stop:, here: { scope: 'all' } every run; { scope: 'docket', num } one
   * plan; { scope: 'branch', num, letter } one branch. Each running step
   * stops where it is. Returns how many branches it reached here.
   */
  function stop({ scope, num = null, letter = null }) {
    let hit = 0
    for (const job of jobs.values()) {
      if (scope !== 'all' && job.num !== num) continue
      for (const l of job.letters) {
        if (scope === 'branch' && l !== letter) continue
        job.stopping.add(l)
        hit += 1
        const chat = job.current.get(l)
        if (chat) stopChat(chat)
      }
    }
    if (hit) changed()
    return hit
  }

  return { start, stop, active, runs: (docketId) => jobs.has(docketId) }
}

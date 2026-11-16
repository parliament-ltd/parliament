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
//
// A task (C301 (g), v4) runs its branch a. One by one, in order: a to-do of
// yours, or a sub-task with no model (`yours`, as read for the run), holds
// those after it until you tick it; a command of yours is put in the bar and
// holds the rest until you run it there or tick it. All at once, its prompts
// and searches go together, each into a chat of its own, then its commands
// one at a time; yours hold nothing up. A sub-task whose `into` names a
// room goes into that room's chat (`chatId`, as read for the run), one
// whose `into` is 'own' into a chat of its own (`own`).

import { STATUS, isPlanned, isTodo } from './docketModel'

// How a step ended, for the conditions of the steps after it (C196 (e);
// C201): read from its status, never from what a model or source wrote.
// 'done', 'nothing' (a source answered and found nothing), 'failed',
// 'stalled', 'stopped'; 'unmet' when it did not run for its condition.
const FAILED = new Set(['failed', 'stalled'])

/**
 * Whether a step runs, given how the last step before it that ran ended
 * (null: none ran before it). After it finishes (the default): done or
 * found nothing. If it fails: failed or stalled. If nothing is found: a
 * source found nothing. Always: whatever it did. Nothing runs after a stop.
 */
export function meets(condition, before) {
  if (before === 'stopped') return false
  if (before == null) return true
  if (condition === 'always') return true
  if (condition === 'failed') return FAILED.has(before)
  if (condition === 'nothing') return before === 'nothing'
  return before === 'done' || before === 'nothing'
}

/** How a step already in the run ended, as far as its record says; null if it has not. */
export function outcomeOf(step) {
  if (!step) return null
  if (step.status === STATUS.DONE) return 'done'
  if (step.status === STATUS.PAUSED) return step.ended && step.ended !== 'left' ? step.ended : 'stopped'
  return null
}

// A command of yours (v4): never sent, put in the bar for your Enter.
const isLine = (s) => typeof s?.command === 'string' && s.command.trim().length > 0
// Yours: a to-do, or a sub-task of a task with no model to ask (v4).
const isYours = (s) => isTodo(s) || s?.yours === true
const hasWords = (s) => !isYours(s) && !isLine(s) && String(s?.text ?? s?.prompt ?? '').trim().length > 0
const isReady = (s) => s.status === STATUS.READY && (s.planned ?? isPlanned(s))
// A to-do of yours not yet ticked (C301 (g)): the lane waits there for you.
const openTodo = (s) => isYours(s) && isReady(s)
const openLine = (s) => isLine(s) && isReady(s)
// Whether a prompt is still to run after index i, for a to-do to wait for.
const promptAfter = (steps, i) => steps.slice(i + 1).some((s) => isReady(s) && hasWords(s))

/**
 * The next step a branch runs after index `after`: ready, planned and with
 * words; a to-do of yours not yet ticked with a prompt after it, where the
 * lane waits; or a command of yours, which waits for your Enter (v4). Empty
 * ones are skipped.
 */
export function nextStep(steps, after = -1) {
  for (let i = after + 1; i < steps.length; i++) {
    const s = steps[i]
    if (s.status === STATUS.RUNNING) return null
    if (isReady(s) && hasWords(s)) return { index: i, step: s }
    if (openLine(s)) return { index: i, step: s, yours: true, command: true }
    if (openTodo(s) && (promptAfter(steps, i) || steps.slice(i + 1).some(openLine))) return { index: i, step: s, yours: true }
  }
  return null
}

/**
 * Where a lane would wait for you: its first to-do not ticked with a prompt
 * after it, or its first command (v4), numbered from 1, or null (C301 (g)).
 */
export function waitsAt(steps) {
  const list = steps ?? []
  const i = list.findIndex((s, k) => openLine(s) || (openTodo(s) && (promptAfter(list, k) || list.slice(k + 1).some(openLine))))
  if (i < 0) return null
  const s = list[i]
  const named = s.title ? { title: s.title } : {}
  return isLine(s) ? { n: i + 1, text: s.command, command: true, ...named } : { n: i + 1, text: String(s.todo?.text || s.title || s.prompt || ''), ...named }
}

const readyOf = (b) => b.steps.filter((s) => isReady(s) && (hasWords(s) || isLine(s)))
const emptyOf = (b) => b.steps.filter((s) => isReady(s) && !hasWords(s) && !isYours(s) && !isLine(s)).length
// Held by hold:, not waiting because a condition was not met (C201).
const heldOf = (b) => {
  const open = b.steps.filter((s) => s.planned && s.ended !== 'unmet')
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
 *   sendStep({ docketId, n, letter, chatId, step, group, included }) -> 'done' | 'nothing' | 'stopped' | 'failed' | 'stalled'
 *   stopChat(chatId)  stops the reply arriving there
 *   lock(docketId, fn) -> fn's result, or null when another tab holds the plan
 *   newRunFor({ docketId, letters }) -> the new run's number, the other branches waiting
 *   offerLine({ docketId, num, n, letter, step }) a command of yours, put in the bar (v4)
 *   onChange(active)  what runs here now changed
 *   onEnd({ docketId, num, n, ended })  a run finished: ended maps each letter to how
 */
export function createRunner({ readBranch, ensureChat, markStep, sendStep, stopChat, lock, newRunFor, offerLine = () => {}, onChange = () => {}, onEnd = () => {} }) {
  const jobs = new Map() // docketId -> { num, n, letters, stopping, current }

  const active = () => [...jobs.entries()].flatMap(([docketId, job]) => [...job.letters].map((letter) => ({
    docketId, num: job.num, n: job.n, letter, chatId: job.current.get(letter) ?? null, stopping: job.stopping.has(letter),
    // Waiting for you at a to-do (C301 (g)): its step's id.
    yours: job.waits?.get(letter)?.stepId ?? null,
    // Waiting for your Enter at a command of yours (v4).
    line: job.waits?.get(letter)?.line ?? null,
  })))
  const changed = () => onChange(active())

  // One step: its chat made if the branch has none, marked running, sent,
  // and marked done or paused. Returns how it ended.
  async function runStep(docketId, job, letter, chatId, step, group = null, included = null, own = false) {
    try {
      chatId = chatId ?? await ensureChat({ docketId, n: job.n, letter, step, own })
      await markStep({ docketId, n: job.n, letter, stepId: step.id, status: STATUS.RUNNING })
    } catch {
      return 'failed'
    }
    // All at once, each in its own chat (v4): each kept to stop it.
    if (own) job.chats.add(chatId)
    else job.current.set(letter, chatId)
    changed()
    let outcome
    try {
      outcome = job.stopping.has(letter) ? 'stopped' : await sendStep({ docketId, n: job.n, letter, chatId, step, group, included })
    } catch (err) {
      outcome = err?.name === 'Stalled' ? 'stalled' : err?.name === 'AbortError' ? 'stopped' : 'failed'
    }
    if (own) job.chats.delete(chatId)
    else job.current.delete(letter)
    const answered = outcome === 'done' || outcome === 'nothing'
    if (!answered && job.stopping.has(letter)) outcome = 'stopped'
    await markStep({ docketId, n: job.n, letter, stepId: step.id, status: answered ? STATUS.DONE : STATUS.PAUSED, ended: answered ? null : outcome }).catch(() => {})
    changed()
    return outcome
  }

  // A lane waiting for you at a to-do (C301 (g)): until it is ticked, here
  // (ticked()) or in another tab (read again every two seconds), or stopped.
  function untilTicked(docketId, job, letter, step, line = null) {
    if (job.stopping.has(letter)) return Promise.resolve('stopped')
    return new Promise((resolve) => {
      let timer = 0
      const done = (how) => {
        clearTimeout(timer)
        if (job.waits.get(letter)?.stepId === step.id) job.waits.delete(letter)
        changed()
        resolve(how)
      }
      job.waits.set(letter, { stepId: step.id, done, line })
      changed()
      // A command of yours goes into the bar as the lane waits for it (v4).
      if (line) Promise.resolve().then(() => offerLine({ docketId, num: job.num, n: job.n, letter, step })).catch(() => {})
      const look = async () => {
        if (!job.waits.has(letter)) return
        const branch = await readBranch({ docketId, n: job.n, letter }).catch(() => null)
        const now = branch?.steps.find((s) => s.id === step.id)
        if (!now) { done('ticked'); return }
        if (now.status !== STATUS.READY) { done('ticked'); return }
        timer = setTimeout(look, 2000)
      }
      timer = setTimeout(look, 2000)
    })
  }

  // A step whose condition is not met waits, and says so (C201).
  const unmet = (docketId, job, letter, step) => markStep({ docketId, n: job.n, letter, stepId: step.id, status: STATUS.WAITING, ended: 'unmet' }).catch(() => {})

  // A branch's steps in order. Each after the first runs on its condition,
  // read from how the last step that ran ended. A step not needed (a
  // fallback whose condition is not met) waits; one blocked by a failure
  // stays ready, and the branch stops there.
  async function runBranch(docketId, job, letter) {
    let after = -1
    let before
    let ran = null
    for (;;) {
      if (job.stopping.has(letter)) return 'stopped'
      const branch = await readBranch({ docketId, n: job.n, letter })
      if (!branch) return 'gone'
      const next = nextStep(branch.steps, after)
      if (!next) return ran ?? 'done'
      if (before === undefined) {
        // Before the first step this run sends: the last that had ended.
        const earlier = branch.steps.slice(0, next.index).reverse().find((s) => outcomeOf(s) != null)
        before = earlier ? outcomeOf(earlier) : null
      }
      after = next.index
      const step = next.step
      if (!meets(step.condition, before)) {
        if (FAILED.has(before)) return before
        await unmet(docketId, job, letter, step)
        changed()
        continue
      }
      // Your to-do: the lane waits until you tick it, then goes on as after
      // a step that finished (C301 (g)). stop: ends the wait.
      if (next.yours) {
        if (await untilTicked(docketId, job, letter, step, next.command ? step.command : null) === 'stopped') return 'stopped'
        before = 'done'
        continue
      }
      // A sub-task's own room, or a chat of its own (C301 (g), "Yes, add into").
      const outcome = step.own ? await runStep(docketId, job, letter, null, step, null, null, true)
        : await runStep(docketId, job, letter, step.chatId ?? branch.chatId, step)
      if (outcome === 'stopped') return 'stopped'
      before = outcome
      ran = outcome === 'nothing' ? 'done' : outcome
    }
  }

  // A task all at once (v4): its prompts and searches together, each into a
  // chat of its own; then its commands, one at a time, each waiting for your
  // Enter or a tick; yours hold nothing up.
  async function runTogether(docketId, job, letter) {
    const branch = await readBranch({ docketId, n: job.n, letter })
    if (!branch) return 'gone'
    const prompts = branch.steps.filter((s) => isReady(s) && hasWords(s))
    // Each into a chat of its own; those into one room go there one after
    // another, as a chat answers one prompt at a time.
    const byRoom = new Map()
    const alone = []
    for (const step of prompts) {
      if (step.chatId && !step.own) byRoom.set(step.chatId, [...(byRoom.get(step.chatId) ?? []), step])
      else alone.push(step)
    }
    const send = (chatId, step) => (job.stopping.has(letter) ? 'stopped' : runStep(docketId, job, letter, chatId, step, null, null, true))
    const outcomes = (await Promise.all([
      ...alone.map((step) => send(null, step)),
      ...[...byRoom.entries()].map(async ([chatId, list]) => {
        const outs = []
        for (const step of list) outs.push(await send(chatId, step))
        return outs
      }),
    ])).flat()
    if (job.stopping.has(letter)) return 'stopped'
    for (const step of branch.steps.filter(openLine)) {
      const now = (await readBranch({ docketId, n: job.n, letter }))?.steps.find((s) => s.id === step.id)
      if (!now || !openLine(now)) continue
      if (await untilTicked(docketId, job, letter, now, now.command) === 'stopped') return 'stopped'
    }
    const bad = outcomes.find((o) => o !== 'done' && o !== 'nothing')
    return bad ?? 'done'
  }

  // One prompt to several, one after another (branch slider v9; C201):
  // each branch after the first runs on its step's condition, read from
  // how the last branch that ran ended. A stop ends the chain.
  async function runChain(docketId, job, chain, group, included = null) {
    const ended = {}
    let before = null
    for (const [i, link] of chain.entries()) {
      if (job.stopping.has(link.letter)) { ended[link.letter] = 'stopped'; break }
      const branch = await readBranch({ docketId, n: job.n, letter: link.letter })
      const step = branch?.steps.find((s) => s.id === link.stepId)
      if (!step || step.status !== STATUS.READY) { ended[link.letter] = 'gone'; continue }
      if (i > 0 && !meets(step.condition, before)) {
        await unmet(docketId, job, link.letter, step)
        ended[link.letter] = 'unmet'
        changed()
        continue
      }
      const outcome = await runStep(docketId, job, link.letter, branch.chatId, step, group, included)
      ended[link.letter] = outcome === 'nothing' ? 'done' : outcome
      if (outcome === 'stopped') break
      before = outcome
    }
    return ended
  }

  /**
   * Starts a run: { docketId, num, n, letters, newRun }. Resolves once it has
   * begun, or could not: { started, n, reason, finished } where finished
   * resolves when every branch has ended.
   */
  async function start({ docketId, num, n, letters, newRun = false, chain = null, group = null, included = null, together = false }) {
    if (jobs.has(docketId)) return { started: false, reason: 'running' }
    let begun
    const head = new Promise((resolve) => { begun = resolve })
    const finished = Promise.resolve(lock(docketId, async () => {
      const job = { num, n, letters: new Set(letters), stopping: new Set(), current: new Map(), waits: new Map(), chats: new Set() }
      jobs.set(docketId, job)
      going += 1
      const ended = {}
      try {
        if (newRun) job.n = await newRunFor({ docketId, letters })
        begun({ started: true, n: job.n })
        changed()
        if (chain) Object.assign(ended, await runChain(docketId, job, chain, group, included))
        else {
          const outcomes = await Promise.all(letters.map((l) => (together ? runTogether(docketId, job, l) : runBranch(docketId, job, l))))
          letters.forEach((l, i) => { ended[l] = outcomes[i] })
        }
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
        for (const c of job.chats) stopChat(c)
        // A lane waiting for you stops waiting (C301 (g)).
        job.waits.get(l)?.done('stopped')
      }
    }
    if (hit) changed()
    return hit
  }

  /** A to-do ticked, or a command run, in this tab: the lane waiting at it goes on at once (C301 (g); v4). */
  function ticked({ docketId, letter, stepId }) {
    const w = jobs.get(docketId)?.waits.get(letter)
    if (w && w.stepId === stepId) w.done('ticked')
  }

  return { start, stop, ticked, active, runs: (docketId) => jobs.has(docketId) }
}

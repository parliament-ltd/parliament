// The Plan board's commands (stage 10, piece 2; docket spec §5; Docket v12;
// C196; C198). Each plans what it would do and says so before Enter; the
// shell does it. Nothing here sends anything: making a plan, a run or a
// step, holding a branch and moving one are all on this device.
//
// screens.plan is the plan on the Plan board, null when there is none:
//   { num, docketId, title, n, latest, next, selected,
//     branches: [{ letter, address, name, status, chatId, steps: [{ id, status, planned }] }] }
// n: the run the board shows; latest: the plan's last run, the only one a
// change goes to (an older run is a record of what ran); next: the letter
// a new branch would have; selected: the branch picked on the board.

import { planOpen, address } from '../shell/arrangement'
import { STATUS } from './docketModel'
import { runScope } from './runner'
import { CHARS_PER_TOKEN, inputCost } from '../shell/estimate'
import { queryLines } from './languageVerbs'

const typed = (arg) => (arg?.kind === 'text' ? arg.value : arg?.text ?? '')
const BOARD = 'docket' // the Plan board, by name in what is said
const isWords = (arg) => arg && arg.kind !== 'address'

/**
 * The Plan board's context, '201', '201:2', '201:3+2' (run 3 beside run 2,
 * diff:), or '201:+2' (the last run beside run 2), as { num, run, against }.
 */
export function planKey(value) {
  const m = /^(\d+)(?::(\d*))?(?:\+(\d+))?$/.exec(String(value ?? ''))
  return m ? { num: Number(m[1]), run: m[2] ? Number(m[2]) : null, against: m[3] ? Number(m[3]) : null } : null
}
export const keyOf = (num, run = null, against = null) => {
  if (against) return `${num}:${run ?? ''}+${against}`
  return run ? `${num}:${run}` : String(num)
}

const boardHere = (a) => a.columns.flat().includes('docket') || a.popped.some((p) => p.board === 'docket')

/** The Plan board on the screen, the bar pointed at it, showing a plan (beside another of its runs). */
export function showPlan(a, num, run = null, against = null) {
  const next = boardHere(a) ? address(a, 'docket') : planOpen(a, 'docket').next
  return { ...next, context: { ...next.context, docket: keyOf(num, run, against) } }
}

// The plan a change goes to, or why there is none here.
function shown(screens, num = null) {
  const p = screens.plan ?? null
  if (!p) return { bad: num != null ? { message: 'planNotShown', values: { num, board: BOARD } } : { message: 'planNone', values: { board: BOARD } } }
  if (num != null && num !== p.num) return { bad: { message: 'planNotShown', values: { num, board: BOARD } } }
  return { plan: p }
}
// Only the last run changes; an older one is a record (Docket v12).
const record = (p) => (p.n !== p.latest ? { message: 'planRecord', values: { run: p.n, latest: p.latest } } : null)

// A branch of the plan on the board, by its address, the selection, or the
// only one there is.
function branchOf(p, arg, rows = []) {
  if (arg) {
    let letter = arg.letter ?? null
    if (!letter && arg.num !== p.num) {
      // A chat's own number: its branch, when it is this plan's.
      const row = rows.find((r) => r.kind === 'chat' && r.num === arg.num)
      if (row?.docketNum === p.num) letter = row.branch
      else return { bad: { message: 'planNotShown', values: { num: row?.docketNum ?? arg.num, board: BOARD } } }
    }
    if (arg.letter && arg.num !== p.num) return { bad: { message: 'planNotShown', values: { num: arg.num, board: BOARD } } }
    if (!letter) return p.branches.length === 1 ? { branch: p.branches[0] } : { bad: { message: 'planWhichBranch', values: { example: p.branches[0]?.address ?? `${p.num}a`, board: BOARD } } }
    const branch = p.branches.find((b) => b.letter === letter)
    return branch ? { branch } : { bad: { message: 'planNoBranch', values: { address: `${p.num}${letter}`, run: p.n } } }
  }
  const picked = p.selected ? p.branches.find((b) => b.letter === p.selected) : null
  if (picked) return { branch: picked }
  if (p.branches.length === 1) return { branch: p.branches[0] }
  return { bad: { message: 'planWhichBranch', values: { example: p.branches[0]?.address ?? `${p.num}a`, board: BOARD } } }
}

// Held by hold:, not waiting because a condition was not met (C201).
const held = (b) => {
  const open = b.steps.filter((s) => s.planned && s.ended !== 'unmet')
  return open.length > 0 && open.every((s) => s.status === STATUS.WAITING)
}

/** new:plan, new:plan "Grant application": a plan with nothing in it, opened on the Plan board. */
export function planNewPlan(step) {
  const title = typed(step.match?.values?.[1]).trim()
  return {
    says: title ? { message: 'planNewTitled', values: { title, board: BOARD } } : { message: 'planNew', values: { board: BOARD } },
    act: { kind: 'newPlan', title },
  }
}

/**
 * new:step, new:step 201b, new:step "Who built it?", new:step 201b "…": a
 * step planned at the end of a branch in the last run, to write on the
 * board when no text is given. Nothing is sent.
 */
export function planNewStep(step, screens = {}) {
  const [, a2, a3] = step.match?.values ?? []
  const arg = a2?.kind === 'address' ? a2 : null
  const text = a3 ? typed(a3) : isWords(a2) ? typed(a2) : ''
  const s = shown(screens, arg?.letter ? arg.num : null)
  if (s.bad) return { says: s.bad, act: null }
  const p = s.plan
  const old = record(p)
  if (old) return { says: old, act: null }
  const b = branchOf(p, arg, screens.records?.rows ?? [])
  if (b.bad) return { says: b.bad, act: null }
  const values = { index: b.branch.steps.length + 1, address: b.branch.address, run: p.n }
  return {
    says: {
      message: text.trim() ? 'planStepAdd' : 'planStepEmpty',
      values,
      ...(held(b.branch) ? { also: [{ message: 'planStepHeld', values: { address: b.branch.address } }] } : {}),
    },
    act: { kind: 'planStep', docketId: p.docketId, num: p.num, n: p.n, letter: b.branch.letter, address: b.branch.address, prompt: text.trim() },
  }
}

/** new:run: the next run, from the last, every step planned again, nothing started. */
export function planNewRun(screens = {}) {
  const s = shown(screens)
  if (s.bad) return { says: s.bad, act: null }
  const p = s.plan
  return {
    says: { message: 'planRunNew', values: { next: p.latest + 1, from: p.latest, num: p.num } },
    act: { kind: 'planRun', docketId: p.docketId, num: p.num },
  }
}

/** new:branch on the Plan board, or new:branch "Shorter": a branch with no chat until it runs. */
export function planNewPlanBranch(step, screens = {}) {
  const [, name] = step.match?.values ?? []
  const s = shown(screens)
  if (s.bad) return { says: s.bad, act: null }
  const p = s.plan
  const old = record(p)
  if (old) return { says: old, act: null }
  const next = `${p.num}${p.next}`
  return {
    says: { message: 'planBranchNew', values: { address: next, num: p.num, run: p.n } },
    act: { kind: 'planBranch', docketId: p.docketId, num: p.num, n: p.n, name: typed(name).trim(), address: next },
  }
}

/**
 * hold:201c, hold:201b,201c, hold:off 201c, and hold: or hold:off alone for
 * the branch picked on the board (A4; C45): the steps not yet started wait,
 * in the last run, until hold:off. Refused while a branch runs.
 */
export function planHold(step, screens = {}) {
  const vals = step.match?.values ?? []
  const off = vals[0]?.kind === 'word' && vals[0].value === 'off'
  const listed = (off ? vals.slice(1) : vals).flatMap((v) => (v.kind === 'list' ? v.items : [v]))
  // A plain number other than the plan's is an edit, held with stage 11.
  if (listed.some((v) => v.kind !== 'address' || (!v.letter && v.num !== screens.plan?.num))) return null
  const nums = [...new Set(listed.map((v) => v.num))]
  const s = shown(screens, nums.length === 1 ? nums[0] : null)
  if (s.bad) return { says: s.bad, act: null }
  const p = s.plan
  if (nums.length > 1) return { says: { message: 'planOnePlan' }, act: null }
  const old = record(p)
  if (old) return { says: old, act: null }
  const branches = []
  for (const v of listed.length ? listed : [null]) {
    const b = branchOf(p, v)
    if (b.bad) return { says: b.bad, act: null }
    if (!branches.includes(b.branch)) branches.push(b.branch)
  }
  const running = branches.find((b) => b.status === STATUS.RUNNING)
  if (running) return { says: { message: 'planHoldRunning', values: { address: running.address } }, act: null }
  const empty = branches.find((b) => !b.steps.some((x) => x.planned))
  if (empty) return { says: { message: 'planHoldEmpty', values: { address: empty.address } }, act: null }
  const moving = branches.filter((b) => held(b) === off)
  const addresses = branches.map((b) => b.address)
  if (!moving.length) return { says: { message: off ? 'planHoldNot' : 'planHoldAlready', values: { nums: addresses } }, act: null }
  return {
    says: { message: off ? 'planHoldOff' : 'planHoldOn', values: { nums: moving.map((b) => b.address), run: p.n } },
    act: { kind: 'planHold', docketId: p.docketId, num: p.num, n: p.n, letters: moving.map((b) => b.letter), on: !off },
  }
}

/** move:201c after 201a, move:201c before 201a: a branch's place in its plan; its letter stays. */
export function planMoveBranch(step, screens = {}) {
  const [from, where, to] = step.match?.values ?? []
  if (!from?.letter || !to?.letter) return { says: { message: 'planMoveWhich' }, act: null }
  if (from.num !== to.num) return { says: { message: 'planOnePlan' }, act: null }
  const s = shown(screens, from.num)
  if (s.bad) return { says: s.bad, act: null }
  const p = s.plan
  const order = p.order ?? p.branches.map((b) => b.letter)
  const a = `${p.num}${from.letter}`
  const b = `${p.num}${to.letter}`
  if (!order.includes(from.letter)) return { says: { message: 'planNoBranch', values: { address: a, run: p.n } }, act: null }
  if (!order.includes(to.letter)) return { says: { message: 'planNoBranch', values: { address: b, run: p.n } }, act: null }
  if (from.letter === to.letter) return { says: { message: 'planMoveSame', values: { address: a } }, act: null }
  const after = where.value === 'after'
  const i = order.indexOf(from.letter)
  const j = order.indexOf(to.letter)
  if ((after && i === j + 1) || (!after && i === j - 1)) return { says: { message: 'planMoveThere', values: { address: a, where: where.value, other: b } }, act: null }
  return {
    says: { message: 'planMove', values: { address: a, where: where.value, other: b } },
    act: { kind: 'planMove', docketId: p.docketId, num: p.num, letter: from.letter, ...(after ? { after: to.letter } : { before: to.letter }) },
  }
}

/** open:201, a plan's number (C196 (g)): the Plan board, showing it at its last run. */
export function planOpenPlan(a, num, screens = {}) {
  const here = boardHere(a) && screens.plan?.num === num
  return { next: showPlan(a, num), says: { message: here ? 'openPlanHere' : 'openPlan', values: { num, board: BOARD } } }
}

/** open:run 2: another run of the plan on the board. */
export function planOpenRun(a, step, screens = {}) {
  const n = Number(step.match?.values?.[1]?.value)
  const s = shown(screens)
  if (s.bad) return { next: null, says: s.bad }
  const p = s.plan
  if (!Number.isInteger(n) || n < 1 || n > p.latest) return { next: null, says: { message: 'planRunNone', values: { run: step.match?.values?.[1]?.value ?? '', runs: p.latest, num: p.num } } }
  if (n === p.n) return { next: null, says: { message: 'planRunHere', values: { run: n, num: p.num, board: BOARD } } }
  return { next: showPlan(a, p.num, n === p.latest ? null : n), says: { message: 'planRunOpen', values: { run: n, num: p.num } } }
}

/** open:201b, a branch that has not run yet: its steps on the Plan board. */
export function planOpenUnrun(a, arg, screens = {}) {
  const p = screens.plan
  const b = p && p.num === arg.num ? p.branches.find((x) => x.letter === arg.letter) : null
  if (!b || b.chatId) return null
  return { next: showPlan(a, p.num, p.n === p.latest ? null : p.n), says: { message: 'openBranchUnrun', values: { address: b.address, board: BOARD } } }
}

/**
 * A prompt typed with the Plan board addressed: a step at the end of the
 * picked branch in the last run. Nothing is sent (docket spec §5).
 * target: the plan as screens.plan has it.
 */
export function planPromptPreview(text, p) {
  if (p.none) return { ready: false, says: { message: 'planNone', values: { board: BOARD } } }
  const old = record(p)
  if (old) return { ready: false, says: old }
  const b = branchOf(p, null)
  if (b.bad) return { ready: false, says: b.bad }
  const values = { index: b.branch.steps.length + 1, address: b.branch.address, run: p.n }
  if (!String(text ?? '').trim()) return { ready: false, says: { message: 'planPromptEmpty', values } }
  return {
    ready: true,
    says: { message: 'planPromptStep', values, ...(held(b.branch) ? { also: [{ message: 'planStepHeld', values: { address: b.branch.address } }] } : {}) },
    act: { kind: 'planStep', docketId: p.docketId, num: p.num, n: p.n, letter: b.branch.letter, address: b.branch.address },
  }
}

/**
 * delete: of what has not been sent (C199): delete:201a 2, a step not yet
 * started, in the last run; delete:201c, a branch that has never run, out of
 * every run; delete:224, a plan with no chat. One Enter, and undo: brings it
 * back. null when the line names only what has been sent, which goes for
 * good after a second Enter (C137).
 */
export function planDeleteUnsent(step, screens = {}) {
  const vals = step.match?.values ?? []
  const rows = screens.records?.rows ?? []
  if (vals.length === 2 && vals[0].kind === 'address' && vals[1].kind === 'number') {
    const arg = vals[0]
    const s = shown(screens, arg.num)
    if (s.bad) return { says: s.bad, act: null }
    const p = s.plan
    const old = record(p)
    if (old) return { says: old, act: null }
    const b = branchOf(p, arg, rows)
    if (b.bad) return { says: b.bad, act: null }
    const index = Number(vals[1].value)
    const one = b.branch.steps[index - 1]
    const values = { index, address: b.branch.address, run: p.n }
    if (!one) return { says: { message: 'planNoStep', values }, act: null }
    if (!one.planned || (one.status !== STATUS.READY && one.status !== STATUS.WAITING)) return { says: { message: 'deleteStepStarted', values }, act: null }
    return {
      says: { message: 'deleteStep', values },
      act: { kind: 'planDelete', what: 'step', docketId: p.docketId, num: p.num, n: p.n, letter: b.branch.letter, stepId: one.stepId, index, address: b.branch.address },
    }
  }
  const named = vals.filter((v) => !(v.kind === 'word' && v.value === 'all')).flatMap((v) => (v.kind === 'list' ? v.items : [v]))
  const each = named.map((a) => unsentOf(a, screens, rows))
  if (!each.some(Boolean)) return null
  if (named.length > 1) return { says: { message: 'deleteApart' }, act: null }
  return each[0]
}

// One thing named to delete:, when it has not been sent; else null.
function unsentOf(a, screens, rows) {
  if (a.kind !== 'address') return null
  const p = screens.plan ?? null
  if (a.letter) {
    const address = `${a.num}${a.letter}`
    if (p && p.num === a.num) {
      if (!p.neverRan.includes(a.letter)) return null
      const last = p.branchCount <= 1
      return {
        says: { message: 'deleteBranch', values: { address, num: p.num }, ...(last ? { also: [{ message: 'deletePlanToo', values: { num: p.num } }] } : {}) },
        act: { kind: 'planDelete', what: 'branch', docketId: p.docketId, num: p.num, letter: a.letter, address },
      }
    }
    // Off the board: a plan's branch with no chat in Records has not run.
    const plan = rows.find((r) => r.kind === 'docket' && r.num === a.num)
    const chat = rows.find((r) => r.kind === 'chat' && r.docketNum === a.num && r.branch === a.letter)
    return plan && !chat ? { says: { message: 'planNotShown', values: { num: a.num, board: BOARD } }, act: null } : null
  }
  const row = rows.find((r) => r.kind === 'docket' && r.num === a.num)
  const empty = row ? !(row.chatNums ?? []).length : p?.num === a.num && p.neverRan.length === p.branchCount
  if (!empty) return null
  const docketId = row?.id ?? p.docketId
  return { says: { message: 'deletePlan', values: { num: a.num } }, act: { kind: 'planDelete', what: 'plan', docketId, num: a.num } }
}

// ── run: and stop: (stage 10, piece 3; almanac spec §5; C200) ──

const CENT = 0.01

/**
 * run:, run:201b (almanac spec §5). Names every step that goes, who answers
 * each, and what it costs before any reply; each later step also sends the
 * replies before it, so the line says the cost is at least this. A run
 * cannot be taken back. screens.runFacts: { keyed, whoOf(model, chatId),
 * charsOf(chatId) }: what is known of keys, who answers a step (as
 * net.answererOf describes them), and how long a chat already is.
 */
export function planRun(step, screens = {}) {
  const [arg] = step.match?.values ?? []
  const s = shown(screens, arg?.num ?? null)
  if (s.bad) return { says: s.bad, act: null }
  const p = s.plan
  const old = record(p)
  if (old) return { says: old, act: null }
  const f = screens.runFacts
  if (!f) return null
  if (f.keyed == null) return { says: { message: 'promptChecking' }, act: null }
  const scope = runScope(p, { letter: arg?.letter ?? null })
  if (scope.bad) return { says: scope.bad, act: null }
  let count = 0
  let tokens = 0
  let total = 0
  let priced = true
  let local = false
  let iffy = 0
  let asking = 0
  let askingQuery = null
  const names = []
  for (const b of scope.branches) {
    let chars = b.chatId ? f.charsOf(b.chatId) : 0
    for (const [i, st] of b.steps.entries()) {
      const who = f.whoOf(st.model, b.chatId)
      const at = { index: i + 1, address: b.address, name: who.name }
      if (who.later) return { says: { message: 'runLater', values: at }, act: null }
      if (who.gone) return { says: { message: 'runGone', values: at }, act: null }
      if (who.needsKey) return { says: { message: 'runNeedsKey', values: { ...at, provider: who.providerName, command: `api:${who.provider}` } }, act: null }
      if (who.unchecked) return { says: { message: 'runUnchecked', values: { ...at, provider: who.providerName, command: `api:${who.provider}` } }, act: null }
      count += 1
      chars += String(st.text ?? '').length
      if (!names.includes(who.name)) names.push(who.name)
      // A step after the first that runs only on its condition (C201).
      if (i > 0 && (st.condition === 'failed' || st.condition === 'nothing')) iffy += 1
      if (who.group === 'source') {
        // Translated first for a source that reads only English (C85; C201).
        const q = f.queryOf?.(who.id) ?? null
        if (q) { asking += String(st.text ?? '').length; askingQuery = askingQuery ?? q }
        continue
      }
      if (who.group === 'local') { local = true; continue }
      const t = Math.ceil(chars / CHARS_PER_TOKEN)
      tokens += t
      const price = who.price?.over && t > who.price.over.promptTokens ? who.price.over : who.price
      const cost = inputCost(t, price?.inputPerMillion)
      if (cost == null) priced = false
      else total += cost
    }
  }
  const nums = scope.branches.map((b) => b.address)
  const also = [{ message: 'runTo', values: { answering: names } }]
  // With steps that may not run, the cost is what goes if every one does.
  const all = iffy ? 'All' : ''
  if (tokens) also.push(!priced ? { message: `runCost${all}Unpriced`, values: { tokens } } : total < CENT ? { message: `runCost${all}Cheap`, values: { tokens, cost: CENT } } : { message: `runCost${all}`, values: { tokens, cost: total } })
  if (iffy) also.push({ message: 'runIf', values: { count: iffy } })
  if (askingQuery) also.push(...queryLines(askingQuery, asking, f.nameOf ?? ((t) => t)))
  if (local) also.push({ message: 'runLocal' })
  if (scope.skipped) also.push({ message: 'runSkipped', values: { count: scope.skipped } })
  also.push({ message: 'runUndo' })
  const head = scope.newRun
    ? { message: 'runHeadNew', values: { count, run: scope.run, address: nums[0] } }
    : { message: nums.length > 1 ? 'runHeadMany' : 'runHead', values: { count, run: scope.run, nums, num: p.num } }
  // Warn before a costly run (settings spec §9; C203): above the amount set,
  // the line leads with what it costs.
  const costly = f.warn != null && priced && total >= f.warn
  return {
    says: costly ? { message: 'runCostly', values: { cost: total, warn: f.warn }, also: [head, ...also] } : { ...head, also },
    act: { kind: 'run', docketId: p.docketId, num: p.num, n: p.latest, letter: arg?.letter ?? null, letters: scope.branches.map((b) => b.letter), newRun: scope.newRun },
  }
}

/**
 * stop:, stop:201b, stop:201, stop:all (almanac spec §5). Stopping is not
 * undoing: what is done stays done and paid for, and the step running now
 * stops where it is. stop:all reaches every window. Alone, on the Plan
 * board, the plan; in a room, the reply arriving there. screens.runFacts:
 * { here: what runs in this tab, room: { chatId, num, streaming } }.
 */
export function planStop(step, screens = {}, addressed = null) {
  const [arg] = step.match?.values ?? []
  const f = screens.runFacts ?? {}
  if (arg?.kind === 'word' && arg.value === 'all') return { says: { message: 'stopAll' }, act: { kind: 'stop', scope: 'all' } }
  const p = screens.plan ?? null
  const runningIn = (num, letter = null) => {
    const here = (f.here ?? []).some((x) => x.num === num && (!letter || x.letter === letter))
    const stored = p && p.num === num && p.branches.some((b) => (!letter || b.letter === letter) && b.status === STATUS.RUNNING)
    return here || stored || !(p && p.num === num) // a plan not on the board may run in another tab
  }
  if (arg?.kind === 'address') {
    if (arg.letter) {
      const address = `${arg.num}${arg.letter}`
      if (!runningIn(arg.num, arg.letter)) return { says: { message: 'stopNothing', values: { what: address } }, act: null }
      return { says: { message: 'stopBranch', values: { address } }, act: { kind: 'stop', scope: 'branch', num: arg.num, letter: arg.letter } }
    }
    if (!runningIn(arg.num)) return { says: { message: 'stopNothing', values: { what: String(arg.num) } }, act: null }
    return { says: { message: 'stopPlan', values: { num: arg.num } }, act: { kind: 'stop', scope: 'docket', num: arg.num } }
  }
  if (addressed === 'docket' && p) {
    if (!runningIn(p.num)) return { says: { message: 'stopNothing', values: { what: String(p.num) } }, act: null }
    return { says: { message: 'stopPlan', values: { num: p.num } }, act: { kind: 'stop', scope: 'docket', num: p.num } }
  }
  const room = f.room ?? null
  if (room?.streaming) return { says: { message: 'stopReply', values: { num: room.num ?? '' } }, act: { kind: 'stopReply', chatId: room.chatId } }
  return { says: { message: 'stopNone' }, act: null }
}

// ── diff: (stage 10, piece 5; docket v12; C196 (a); C202) ──

/**
 * diff:, diff:1, diff:off. Two runs of the plan on the board side by side,
 * what differs marked in ink: a bar beside each line that differs, a wash
 * on the words. diff: sets the run shown beside the one before it (run 1
 * beside run 2); diff:1 beside run 1; diff:off shows one again.
 */
export function planDiff(a, step, screens = {}) {
  const [arg] = step.match?.values ?? []
  const s = shown(screens)
  if (s.bad) return { says: s.bad, next: null }
  const p = s.plan
  const shownRun = p.n === p.latest ? null : p.n
  if (arg?.kind === 'word' && arg.value === 'off') {
    if (!p.against) return { says: { message: 'diffNone' }, next: null }
    return { says: { message: 'diffOff', values: { run: p.n } }, next: showPlan(a, p.num, shownRun) }
  }
  if (p.latest < 2) return { says: { message: 'diffOneRun', values: { num: p.num } }, next: null }
  const other = arg?.kind === 'number' ? Number(arg.value) : p.n > 1 ? p.n - 1 : 2
  if (!Number.isInteger(other) || other < 1 || other > p.latest) return { says: { message: 'planRunNone', values: { run: arg?.value ?? '', runs: p.latest, num: p.num } }, next: null }
  if (other === p.n) return { says: { message: 'diffSame', values: { run: other } }, next: null }
  if (p.against === other) return { says: { message: 'diffHere', values: { run: p.n, other } }, next: null }
  return { says: { message: 'diffOn', values: { run: p.n, other } }, next: showPlan(a, p.num, shownRun, other) }
}

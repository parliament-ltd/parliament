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

const typed = (arg) => (arg?.kind === 'text' ? arg.value : arg?.text ?? '')
const BOARD = 'docket' // the Plan board, by name in what is said
const isWords = (arg) => arg && arg.kind !== 'address'

/** The Plan board's context, '201' or '201:2', as { num, run }. */
export function planKey(value) {
  const m = /^(\d+)(?::(\d+))?$/.exec(String(value ?? ''))
  return m ? { num: Number(m[1]), run: m[2] ? Number(m[2]) : null } : null
}
export const keyOf = (num, run = null) => (run ? `${num}:${run}` : String(num))

const boardHere = (a) => a.columns.flat().includes('docket') || a.popped.some((p) => p.board === 'docket')

/** The Plan board on the screen, the bar pointed at it, showing a plan. */
export function showPlan(a, num, run = null) {
  const next = boardHere(a) ? address(a, 'docket') : planOpen(a, 'docket').next
  return { ...next, context: { ...next.context, docket: keyOf(num, run) } }
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

const held = (b) => {
  const open = b.steps.filter((s) => s.planned)
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

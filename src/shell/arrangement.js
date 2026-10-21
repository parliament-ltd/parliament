// The arrangement: which boards are on this screen and where, which are in
// windows of their own, where the bar sits, and which board the bar is
// pointed at (refactor-plan.md §4 and stage 3; arrangements spec §2, §4,
// §7a and §8; Almanac v30 and Lab v7 for the behaviour; C102 to C105 for
// what the documents leave open).
//
// An arrangement is data, so it can be kept per device, compared and put
// back. Columns run left to right; a column can hold boards stacked one
// above the other. Each verb here is planned before it runs: `plan` returns
// the arrangement Enter would make and what the Enter line says, or a
// refusal with the reason, and changes nothing. Running a verb is keeping
// the plan.

import { boardEntry } from './boards'

/**
 * @typedef {{ board: string, display: number|null, side: 'left'|'right'|null, from: number }} Popped
 * @typedef {{ id: string, columns: string[][], popped: Popped[], addressed: string,
 *   bar: { at: 'top'|'bottom', side: 'left'|'center'|'right', popped: boolean },
 *   resting: 'search'|'prompt'|null, context: Record<string, string|number> }} Arrangement
 * @typedef {{ message: string, values?: object }} Says
 * @typedef {{ next: Arrangement|null, says: Says }} Plan  next is null when Enter would do nothing
 */

// The shipped arrangements and their suggested defaults, which reset: puts
// back. Rooms each keep their own, made from `room`.
export const SHIPPED = Object.freeze({
  almanac: { columns: [['almanac'], ['collection']], addressed: 'almanac', bar: 'top', resting: null },
  lab: { columns: [['library'], ['canvas'], ['blocks']], addressed: 'canvas', bar: 'top', resting: 'search' },
  room: { columns: [['room']], addressed: 'room', bar: 'bottom', resting: null },
  docket: { columns: [['docket']], addressed: 'docket', bar: 'bottom', resting: null },
  settings: { columns: [['settings']], addressed: 'settings', bar: 'top', resting: null },
  welcome: { columns: [['welcome']], addressed: 'welcome', bar: 'top', resting: null },
})

/** Which shipped arrangement an id comes from: 'room:mode_1' comes from 'room'. */
export const shippedFor = (id) => String(id ?? '').split(':')[0]

/**
 * A fresh copy of a shipped arrangement.
 * @param {string} id 'almanac', 'lab', 'room:<room id>' …
 * @returns {Arrangement}
 */
export function shipped(id, context = {}) {
  const base = SHIPPED[shippedFor(id)]
  if (!base) throw new Error(`No shipped arrangement for ${id}`)
  return {
    id,
    columns: base.columns.map((c) => [...c]),
    popped: [],
    addressed: base.addressed,
    bar: { at: base.bar, side: 'center', popped: false },
    resting: base.resting,
    context: { ...context },
  }
}

/** The field's resting mode here: the arrangement's own, else the addressed board's (C44). */
export const restingMode = (a) => a.resting ?? boardEntry(a.addressed)?.resting ?? 'search'

const onPage = (a) => a.columns.flat()
const isOnPage = (a, board) => onPage(a).includes(board)
const isPopped = (a, board) => a.popped.some((p) => p.board === board)
const columnOf = (a, board) => a.columns.findIndex((c) => c.includes(board))
const without = (columns, board) => columns.map((c) => c.filter((b) => b !== board)).filter((c) => c.length)
const copy = (a) => ({ ...a, columns: a.columns.map((c) => [...c]), popped: a.popped.map((p) => ({ ...p })), bar: { ...a.bar }, context: { ...a.context } })
const sameLayout = (x, y) => JSON.stringify([x.columns, x.popped, x.addressed, x.bar.at, x.bar.side, x.bar.popped, x.resting])
  === JSON.stringify([y.columns, y.popped, y.addressed, y.bar.at, y.bar.side, y.bar.popped, y.resting])
const refuse = (message, values) => ({ next: null, says: { message, values } })
const go = (next, message, values) => ({ next, says: { message, values } })

// After a board leaves the page, the bar points at the board that stood
// before it, or else the first one (Docket v12).
function readdress(a, gone, oldColumn) {
  if (a.addressed !== gone) return a.addressed
  const left = a.columns[Math.max(0, Math.min(oldColumn - 1, a.columns.length - 1))]
  return left?.[0] ?? onPage(a)[0] ?? a.popped[0]?.board ?? gone
}

// ── The verbs ───────────────────────────────────────────

/** open:<board>. Brings it onto this screen at the right, or points the bar at it if it is here. */
export function planOpen(a, board) {
  if (isOnPage(a, board)) {
    if (a.addressed === board) return refuse('openAddressed', { board })
    return go({ ...copy(a), addressed: board }, 'openHere', { board })
  }
  if (isPopped(a, board)) return go({ ...copy(a), addressed: board }, 'openPopped', { board })
  const next = copy(a)
  next.columns.push([board])
  next.addressed = board
  return go(next, 'openBoard', { board })
}

/** close: or close:<board>. Takes it off the screen, window included; nothing is lost. */
export function planClose(a, board = a.addressed) {
  const entry = boardEntry(board)
  if (!isOnPage(a, board) && !isPopped(a, board)) return refuse('closeNotHere', { board })
  if (entry && !entry.closable) return refuse('closeFixed', { board })
  if (isOnPage(a, board) && onPage(a).length === 1) return refuse('closeLast', { board })
  const oldColumn = columnOf(a, board)
  const next = copy(a)
  next.columns = without(next.columns, board)
  next.popped = next.popped.filter((p) => p.board !== board)
  next.addressed = readdress(next, board, oldColumn)
  return go(next, 'closeBoard', { board })
}

/** move:<board> left|right|middle. The board's column goes to that place; the others shift along. */
export function planMove(a, board, place) {
  if (!isOnPage(a, board)) return refuse(isPopped(a, board) ? 'moveIsPopped' : 'closeNotHere', { board })
  const rest = without(a.columns, board)
  const at = place === 'left' ? 0 : place === 'right' ? rest.length : Math.floor(rest.length / 2)
  const columns = [...rest.slice(0, at), [board], ...rest.slice(at)]
  if (JSON.stringify(columns) === JSON.stringify(a.columns)) return refuse('moveThere', { board, place })
  return go({ ...copy(a), columns, addressed: board }, 'moveBoard', { board, place })
}

/** swap:<board> <board>. The two change places. */
export function planSwap(a, first, second) {
  if (first === second) return refuse('swapSame')
  for (const b of [first, second]) if (!isOnPage(a, b)) return refuse('closeNotHere', { board: b })
  const columns = a.columns.map((c) => c.map((b) => (b === first ? second : b === second ? first : b)))
  return go({ ...copy(a), columns }, 'swapBoards', { first, second })
}

/** pop:<board> [display n]. Its own window; a board not open goes straight into one. */
export function planPop(a, board, display = null) {
  if (isPopped(a, board)) return refuse('popAlready', { board })
  if (isOnPage(a, board) && onPage(a).length === 1) return refuse('popLast', { board })
  const next = copy(a)
  const from = isOnPage(a, board) ? columnOf(a, board) : a.columns.length
  next.columns = without(next.columns, board)
  next.popped.push({ board, display, side: null, from })
  next.addressed = board
  return go(next, display ? 'popDisplay' : 'popBoard', { board, display })
}

/** pop:back, or pop:back <board>. Windows come back to where they stood. */
export function planPopBack(a, board = null) {
  const going = board ? a.popped.filter((p) => p.board === board) : a.popped
  if (!going.length) return refuse(board ? 'popNotPopped' : 'popNothing', { board })
  const next = copy(a)
  next.popped = a.popped.filter((p) => !going.includes(p))
  // Last popped comes back first, so each lands where it stood when it went.
  for (const p of [...going].reverse()) next.columns.splice(Math.min(p.from, next.columns.length), 0, [p.board])
  return board ? go(next, 'popBackOne', { board }) : go(next, 'popBackAll', { count: going.length })
}

/** pop:left, pop:right. Places the window of the board the bar is pointed at. */
export function planPopSide(a, side) {
  const p = a.popped.find((w) => w.board === a.addressed)
  if (!p) return refuse('popNotPopped', { board: a.addressed })
  if (p.side === side) return refuse('popSideThere', { board: p.board, side })
  const next = copy(a)
  next.popped.find((w) => w.board === p.board).side = side
  return go(next, 'popSide', { board: p.board, side })
}

/** pop:command and pop:back command: the bar in its own window, and back. */
export function planPopBar(a, popped) {
  if (a.bar.popped === popped) return refuse(popped ? 'barPoppedAlready' : 'barNotPopped')
  return go({ ...copy(a), bar: { ...a.bar, popped } }, popped ? 'popCommand' : 'popBackCommand')
}

/**
 * bar:<place>. Where the bar sits on the page: top or bottom, and on the
 * left, in the centre or on the right, which is also where its hexagon lands
 * (bar reference, 9 October; C43, C106). A popped bar comes back to the page.
 */
export function planBar(a, place) {
  const axis = place === 'top' || place === 'bottom' ? 'at' : 'side'
  if (a.bar[axis] === place && !a.bar.popped) return refuse('barThere', { place })
  return go({ ...copy(a), bar: { ...a.bar, [axis]: place, popped: false } }, 'barMove', { place })
}

/** reset:. This arrangement as shipped, its windows closed; what boards show stays. */
export function planReset(a) {
  const next = shipped(a.id, a.context)
  if (sameLayout(next, a)) return refuse('resetAlready')
  return go(next, 'resetArrangement', { count: a.popped.length })
}

/** Points the bar at a board on this screen or in a window, as a click on it does. */
export function address(a, board) {
  return isOnPage(a, board) || isPopped(a, board) ? { ...copy(a), addressed: board } : a
}

// ── From a command ──────────────────────────────────────

// The verbs this module answers. open: and pop: with a number wait for the
// stages that build what numbers open.
export const ARRANGEMENT_VERBS = Object.freeze(['open', 'close', 'move', 'swap', 'pop', 'reset', 'bar'])

const word = (arg) => (arg?.kind === 'word' ? arg.value : null)

/**
 * The plan for one command, from the registry's answer for it (its verb and
 * the arguments it matched), or null when this module does not answer that
 * form yet. Board names have been checked by the registry.
 * @param {Arrangement} a
 * @param {{ verb: string, match: { values: Array<object> } }} step
 * @returns {Plan|null}
 */
export function plan(a, step) {
  const args = step.match?.values ?? []
  const [first, second] = args.map(word)
  switch (step.verb) {
    case 'open':
      if (first === 'lab') return null // the Lab is an arrangement: lab: and open:lab come with the Lab
      return first && boardEntry(first) && args.length === 1 ? planOpen(a, first) : null
    case 'close':
      if (!args.length) return planClose(a)
      return first && boardEntry(first) ? planClose(a, first) : null
    case 'move':
      return first && boardEntry(first) ? planMove(a, first, second) : null
    case 'swap':
      return planSwap(a, first, second)
    case 'pop':
      if (first === 'command') return planPopBar(a, true)
      if (first === 'back') {
        if (second === 'command') return planPopBar(a, false)
        return planPopBack(a, second ?? null)
      }
      if (first === 'left' || first === 'right') return planPopSide(a, first)
      if (first && boardEntry(first)) {
        if (args.length === 1) return planPop(a, first)
        if (second === 'display' && args[2]?.kind === 'number') return planPop(a, first, args[2].value)
        return null // pop:settings keys: sections come with Settings
      }
      return null
    case 'reset':
      return planReset(a)
    case 'bar':
      return planBar(a, first)
    default:
      return null
  }
}

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

import { boardEntry, boardFor, isRoom, sectionOf } from './boards'

export { isRoom }

/**
 * @typedef {{ board: string, display: number|null, side: 'left'|'right'|null, from: number }} Popped
 * @typedef {{ id: string, columns: string[][], popped: Popped[], addressed: string,
 *   bar: { at: 'top'|'bottom'|'card', side: 'left'|'center'|'right', popped: boolean },
 *   resting: 'search'|'prompt'|null, context: Record<string, string|number>,
 *   widths?: Record<string, number>, focus?: object, recordsCols?: string[], lastRoom?: string }} Arrangement  widths: the shares the
 *   person has set, by board (C126); focus: while focus: holds, the space as it was before, for focus:off (stage 5);
 *   recordsCols: the columns Records shows, when the person has chosen (cols:, C141);
 *   lastRoom: the room the bar pointed at last, where a prompt goes while the bar points elsewhere (C175 (a))
 * @typedef {{ message: string, values?: object }} Says
 * @typedef {{ next: Arrangement|null, says: Says }} Plan  next is null when Enter would do nothing
 */

// The shipped arrangements and their suggested defaults. What is on screen
// is one space, edited by commands (C125, ruled 21 October): an
// arrangement's verb (alm:, sym:, tour:, lab:) brings its boards into the
// space beside what is there, and nothing switches to another screen. The
// space is kept on this device; reset: puts it back as shipped, which is
// the Almanac. The arrangements here say which boards each brings, until
// their owner edits them (the Lab, stage 13).
export const SPACE = 'space'
export const SHIPPED = Object.freeze({
  space: { columns: [['almanac'], ['collection']], addressed: 'almanac', bar: 'top', resting: null },
  almanac: { columns: [['almanac'], ['collection']], addressed: 'almanac', bar: 'top', resting: null },
  lab: { columns: [['library'], ['canvas'], ['blocks']], addressed: 'canvas', bar: 'top', resting: 'search' },
  room: { columns: [['room']], addressed: 'room', bar: 'bottom', resting: null },
  docket: { columns: [['docket']], addressed: 'docket', bar: 'bottom', resting: null },
  settings: { columns: [['settings']], addressed: 'settings', bar: 'top', resting: null },
  // The welcome page's field rests in its card, with no box, until bar:bottom
  // docks it at the foot (welcome spec §2, §5; C43).
  welcome: { columns: [['welcome']], addressed: 'welcome', bar: 'card', resting: null },
})

/** Which shipped arrangement an id comes from: 'room:mode_1' comes from 'room'. */
export const shippedFor = (id) => String(id ?? '').split(':')[0]

/** The boards an arrangement brings into the space, in order (C125). */
export function arrangementBoards(id) {
  const base = SHIPPED[shippedFor(id)]
  return base ? base.columns.flat() : []
}

// ── Rooms (C125; C175 (a), ruled 23 October) ─────────────
// The space holds any number of rooms, each showing a chat of its own, kept
// in the space's context by board: context.room for the first, context
// ['room-2'] for the next. A prompt goes to the current room: the one the
// bar points at, else the one it pointed at last, else the last on screen.

/** The rooms in the space, left to right, then those in windows. */
export const roomsIn = (a) => [...a.columns.flat(), ...a.popped.map((p) => p.board)].filter(isRoom)

/** The chat a room shows, or null for an empty room. */
export function chatIn(a, board) {
  const chat = a.context?.[board]
  return typeof chat === 'string' && chat ? chat : null
}

/** The room a prompt goes to, or null when the space has none. */
export function currentRoom(a) {
  const rooms = roomsIn(a)
  if (!rooms.length) return null
  if (rooms.includes(a.addressed)) return a.addressed
  if (rooms.includes(a.lastRoom)) return a.lastRoom
  return rooms[rooms.length - 1]
}

/** The room showing a chat, or null. */
export const roomShowing = (a, chat) => (chat ? roomsIn(a).find((b) => chatIn(a, b) === chat) ?? null : null)

/** The board a new room takes: 'room' when free, else the first free 'room-n'. */
function freeRoom(a) {
  // In the Lab, the rooms of the space before it are kept for done: too
  // (C245): a room tried there takes a board of its own.
  const before = a.lab ? [...(a.lab.columns ?? []).flat(), ...(a.lab.popped ?? []).map((p) => p.board)].filter(isRoom) : []
  const taken = new Set([...roomsIn(a), ...before])
  if (!taken.has('room')) return 'room'
  let n = 2
  while (taken.has(`room-${n}`)) n += 1
  return `room-${n}`
}

/**
 * The space as kept after a change: the room the bar points at is the one
 * it pointed at last, and a room no longer here is forgotten.
 */
export function settle(a) {
  const rooms = roomsIn(a)
  const last = isRoom(a.addressed) ? a.addressed : rooms.includes(a.lastRoom) ? a.lastRoom : null
  if ((a.lastRoom ?? null) === last) return a
  const next = { ...a }
  if (last) next.lastRoom = last
  else delete next.lastRoom
  return next
}

/**
 * The chat the current room shows: its id, null for an empty room whose
 * first prompt starts its chat, or undefined when the space has no room.
 */
export function roomOnScreen(a) {
  const room = currentRoom(a)
  return room ? chatIn(a, room) : undefined
}

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
    widths: {},
  }
}

/** The field's resting mode here: the arrangement's own, else the addressed board's (C44). */
export const restingMode = (a) => a.resting ?? boardEntry(a.addressed)?.resting ?? 'search'

const onPage = (a) => a.columns.flat()
const isOnPage = (a, board) => onPage(a).includes(board)
const isPopped = (a, board) => a.popped.some((p) => p.board === board)
const columnOf = (a, board) => a.columns.findIndex((c) => c.includes(board))
const without = (columns, board) => columns.map((c) => c.filter((b) => b !== board)).filter((c) => c.length)
const copy = (a) => ({
  ...a, columns: a.columns.map((c) => [...c]), popped: a.popped.map((p) => ({ ...p })), bar: { ...a.bar }, context: { ...a.context }, widths: { ...a.widths },
  ...(a.recordsCols ? { recordsCols: [...a.recordsCols] } : {}),
})
const go2 = (next, message, values) => ({ next: settle(next), says: { message, values } })
const sortedWidths = (a) => Object.entries(a.widths ?? {}).sort(([x], [y]) => (x < y ? -1 : 1))
const sameLayout = (x, y) => JSON.stringify([x.columns, x.popped, x.addressed, x.bar.at, x.bar.side, x.bar.popped, x.resting, sortedWidths(x), Boolean(x.focus), recordsColumns(x), Boolean(x.lab)])
  === JSON.stringify([y.columns, y.popped, y.addressed, y.bar.at, y.bar.side, y.bar.popped, y.resting, sortedWidths(y), Boolean(y.focus), recordsColumns(y), Boolean(y.lab)])
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

// Where a board brought into the space goes (changes `next` in place). The
// welcome card takes the left. A room goes beside the welcome card when it
// is there, else on the right. Other boards go on the right; beside the
// welcome card they stack in one column, on the right of the card and the
// chat (welcome spec §5).
function place(next, board) {
  if (board === 'welcome') { next.columns.unshift([board]); return }
  const withWelcome = next.columns.some((c) => c.includes('welcome'))
  // Another room goes beside the room the prompt goes to (C175 (a)).
  const beside = isRoom(board) ? currentRoom(next) : null
  const at = beside ? next.columns.findIndex((c) => c.includes(beside)) : -1
  if (at >= 0) { next.columns.splice(at + 1, 0, [board]); return }
  if (isRoom(board)) {
    const at = withWelcome ? next.columns.findIndex((c) => c.includes('welcome')) + 1 : next.columns.length
    next.columns.splice(at, 0, [board])
    return
  }
  const last = next.columns[next.columns.length - 1]
  if (withWelcome && next.columns.length > 1 && !last.includes('welcome') && !last.some(isRoom)) last.push(board)
  else next.columns.push([board])
}

/** open:<board>. Brings it into the space on the right, or points the bar at it if it is here. */
export function planOpen(a, board) {
  if (isOnPage(a, board)) {
    if (a.addressed === board) return refuse('openAddressed', { board })
    return go({ ...copy(a), addressed: board }, 'openHere', { board })
  }
  if (isPopped(a, board)) return go({ ...copy(a), addressed: board }, 'openPopped', { board })
  const next = copy(a)
  place(next, board)
  next.addressed = board
  return go(next, 'openBoard', { board })
}

/**
 * open:settings keys (settings spec §5; stage 9; C181). Settings in the
 * space, the bar pointed at it, and the section kept in the space's
 * context, which the board scrolls to.
 */
export function planOpenSettings(a, word) {
  const section = sectionOf(word)
  if (!section) return refuse('openSettingsNone', { word })
  const opened = planOpen(a, 'settings').next
  const next = copy(opened ?? a)
  next.addressed = 'settings'
  next.context.settings = section
  return go2(next, 'openSettingsAt', { board: 'settings', section })
}

/**
 * alm:, tour: (and lab: with the Lab). Brings an arrangement's boards into
 * the space beside what is there: those not here already, in its order
 * (C125). With all of them here, the bar points at the first.
 */
export function planBring(a, id) {
  const boards = arrangementBoards(id)
  const missing = boards.filter((b) => !isOnPage(a, b) && !isPopped(a, b))
  if (!missing.length) {
    if (!boards.length || a.addressed === boards[0]) return refuse('bringHere', { boards })
    return go({ ...copy(a), addressed: boards[0] }, 'openHere', { board: boards[0] })
  }
  const next = copy(a)
  for (const b of missing) place(next, b)
  next.addressed = missing[0]
  return go(next, 'bringBoards', { boards: missing })
}

/**
 * open:204, sym:, a prompt with no room. A chat opens in a room of its own
 * beside what is here (C175 (a)): in the room that shows it already, the
 * bar points there; an empty room here takes it. With `chat` null, an
 * empty room, the one here or a new one.
 */
export function planRoom(a, chat) {
  if (chat) {
    const shown = roomShowing(a, chat)
    if (shown) return shown === a.addressed ? refuse('roomHere') : go2({ ...copy(a), addressed: shown }, 'roomThere')
    const here = currentRoom(a)
    if (here && !chatIn(a, here)) {
      const next = copy(a)
      next.context[here] = chat
      next.addressed = here
      return go2(next, 'showRoom')
    }
    const next = copy(a)
    const board = freeRoom(a)
    place(next, board)
    next.context[board] = chat
    next.addressed = board
    return go2(next, 'goRoom')
  }
  const empty = roomsIn(a).find((b) => !chatIn(a, b))
  if (empty) return empty === a.addressed ? refuse('newRoomHere') : go2({ ...copy(a), addressed: empty }, 'roomThere')
  const next = copy(a)
  const board = freeRoom(a)
  place(next, board)
  delete next.context[board]
  next.addressed = board
  return go2(next, 'goNewRoom')
}

/**
 * The current room carries on with another chat, in place: to: a branch
 * other than its own moves the room to it (C174 (b)). With no room, as
 * planRoom.
 */
export function planShowInRoom(a, chat) {
  const here = currentRoom(a)
  if (!here) return planRoom(a, chat)
  const shown = roomShowing(a, chat)
  if (shown) return shown === a.addressed ? refuse('roomHere') : go2({ ...copy(a), addressed: shown }, 'roomThere')
  const next = copy(a)
  next.context[here] = chat
  next.addressed = here
  return go2(next, 'showRoom')
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
  // A room closed forgets its chat; the chat itself stays.
  if (isRoom(board)) delete next.context[board]
  // A room and the welcome card are named as what they are, not by the
  // boards' list name (C125).
  const said = isRoom(board) ? 'closeRoom' : board === 'welcome' ? 'closeWelcome' : 'closeBoard'
  return go2(next, said, { board })
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
 * left, in the centre or on the right, which is also where it lands when it folds into a circle
 * (bar reference, 9 October; C43, C106). A popped bar comes back to the page.
 */
export function planBar(a, place) {
  const axis = place === 'top' || place === 'bottom' ? 'at' : 'side'
  if (a.bar[axis] === place && !a.bar.popped) return refuse('barThere', { place })
  return go({ ...copy(a), bar: { ...a.bar, [axis]: place, popped: false } }, 'barMove', { place })
}

// ── Widths (C126) ───────────────────────────────────────
// Each column takes a share of the width. A board's usual share is 1, a
// main board's 2. The shares the person sets, by stretching an edge or with
// width:, are kept by board, so a board keeps its width when it moves and
// has it again when it comes back. A column's share is the largest of its
// boards'.

const MAIN = new Set(['almanac', 'canvas', 'room', 'docket', 'settings'])
export const WIDTH_RANGE = Object.freeze({ low: 10, high: 90 })
const round = (n) => Math.round(n * 1000) / 1000

/** A board's usual share of the width. */
export const usualShare = (board) => (MAIN.has(board) || isRoom(board) ? 2 : 1)

/** Each column's share of the width, left to right. */
export function columnShares(a) {
  return a.columns.map((column) => {
    const set = column.map((b) => a.widths?.[b]).filter((w) => typeof w === 'number')
    return set.length ? Math.max(...set) : Math.max(...column.map(usualShare))
  })
}

/** The space with the columns at these indexes given these shares, as a stretch makes it. */
export function withShares(a, shares) {
  const next = copy(a)
  for (const [i, share] of Object.entries(shares)) for (const b of next.columns[i] ?? []) next.widths[b] = round(share)
  return next
}

/** The space with the columns at these indexes back to their usual shares. */
export function withUsualShares(a, indexes) {
  const next = copy(a)
  for (const i of indexes) for (const b of next.columns[i] ?? []) delete next.widths[b]
  return next
}

/**
 * The share column k needs for `target` pixels of `total`, the others
 * keeping theirs, where a column below its least width is held there and
 * the rest share what is left. Null when it cannot be had.
 */
function shareFor(shares, least, k, target, total) {
  const held = new Set()
  for (let round = 0; round <= shares.length; round += 1) {
    const left = total - [...held].reduce((sum, i) => sum + least[i], 0)
    const others = shares.reduce((sum, s, i) => (i === k || held.has(i) ? sum : sum + s), 0)
    if (others <= 0 || left <= target) return null
    const share = (target * others) / (left - target)
    const unit = left / (share + others)
    const below = shares.map((s, i) => i !== k && !held.has(i) && s * unit < least[i])
    if (!below.some(Boolean)) return share
    below.forEach((b, i) => { if (b) held.add(i) })
  }
  return null
}

/**
 * width:60% (the board the bar points at) and width:library 30%. Gives the
 * board's column that part of the width; the others keep their shares of
 * the rest. `layout` is the space as drawn, when the shell has measured
 * it: each column's width and least width in pixels, and whether the
 * window is so narrow the boards are stacked. With it, a column held at
 * its least width is counted as it is drawn.
 * @param {{ columns: string[][], widths: number[], least: number[], stacked?: boolean }|null} [layout]
 */
export function planWidth(a, board, percent, named = false, layout = null) {
  if (!isOnPage(a, board)) return refuse(isPopped(a, board) ? 'widthPopped' : 'closeNotHere', { board })
  if (a.columns.length === 1) return refuse('widthAlone')
  if (!(percent >= WIDTH_RANGE.low && percent <= WIDTH_RANGE.high)) return refuse('widthRange', WIDTH_RANGE)
  const shares = columnShares(a)
  const k = columnOf(a, board)
  const drawn = layout && JSON.stringify(layout.columns) === JSON.stringify(a.columns) ? layout : null
  if (drawn?.stacked) return refuse('widthStacked')
  let share
  if (drawn) {
    const total = drawn.widths.reduce((sum, w) => sum + w, 0)
    if (Math.abs((drawn.widths[k] / total) * 100 - percent) < 0.5) return refuse('widthThere')
    const most = total - drawn.least.reduce((sum, w, i) => (i === k ? sum : sum + w), 0)
    if ((percent / 100) * total > most) return refuse('widthMost', { percent: Math.floor((most / total) * 100) })
    if ((percent / 100) * total < drawn.least[k]) return refuse('widthLeast', { percent: Math.ceil((drawn.least[k] / total) * 100) })
    share = shareFor(shares, drawn.least, k, (percent / 100) * total, total)
    if (share == null) return refuse('widthMost', { percent: Math.floor((most / total) * 100) })
  } else {
    const others = shares.reduce((sum, s, i) => (i === k ? sum : sum + s), 0)
    if (Math.abs((shares[k] / (shares[k] + others)) * 100 - percent) < 0.5) return refuse('widthThere')
    share = (percent / (100 - percent)) * others
  }
  const next = withShares(a, { [k]: share })
  next.addressed = board
  // A room is named as what it is, as close: names it (C125, C146 (c)).
  if (named && isRoom(board)) return go(next, 'widthRoom', { board, percent })
  return go(next, named ? 'widthSet' : 'widthIt', { board, percent })
}

/** width:even. Every board back to its usual share. */
export function planWidthEven(a) {
  if (!Object.keys(a.widths ?? {}).length) return refuse('widthEvenAlready')
  return go({ ...copy(a), widths: {} }, 'widthEven')
}

// ── focus: (welcome spec §7; stage 5, piece 6) ──────────
// The first form: the chat alone, and back. focus: closes every board but
// the room, windows included, docks the bar under it, and keeps the space
// as it was, so focus:off brings it back; nothing is lost. Your own focus
// sets (focus:room collection, focus:save) came with stage 14 (C253), each
// kept with its room.

/**
 * focus:. The room alone: the chat in the space's room, or the last chat
 * (`chat`) when the space has no room with a chat in it.
 */
export function planFocus(a, chat = null) {
  if (a.lab) return refuse('focusInLab')
  if (a.focus) return refuse('focusAlready')
  const here = roomOnScreen(a)
  const target = typeof here === 'string' ? here : chat
  if (!target) return refuse('focusNothing')
  // The room the prompt goes to stays; every other board goes, other rooms too.
  const room = currentRoom(a) ?? 'room'
  const closing = [...onPage(a), ...a.popped.map((p) => p.board)].filter((b) => b !== room)
  const next = copy(a)
  next.focus = { columns: a.columns.map((c) => [...c]), popped: a.popped.map((p) => ({ ...p })), addressed: a.addressed, bar: { ...a.bar } }
  next.columns = [[room]]
  next.popped = []
  next.addressed = room
  next.bar = { ...a.bar, at: 'bottom', popped: false }
  next.context[room] = target
  return go2(next, closing.length ? 'focusClosing' : 'focusAlone', { boards: closing.map((b) => (isRoom(b) ? 'room' : b)) })
}

/** The boards a focus set can hold (C253 (a)): those on the strip, in its order. */
export const FOCUS_BOARDS = Object.freeze(['room', 'collection', 'reflection', 'almanac', 'library', 'docket'])

/** The boards on screen, as a focus set names them: every room as 'room', in order, once each. */
export const focusBoardsOf = (a) => [...new Set(a.columns.flat().map((b) => (isRoom(b) ? 'room' : b)))].filter((b) => FOCUS_BOARDS.includes(b))

/**
 * focus:room collection, or focus: with a room's set (stage 14, piece 1;
 * C253): those boards, left to right, each in a column of its own; the rest
 * close, windows included, kept for focus:off. Already focused, the set
 * changes and focus:off still brings back what was there before.
 * @param {string[]} boards from FOCUS_BOARDS
 * @param {string|null} chat the last chat, when the space has no room with one
 */
export function planFocusSet(a, boards, chat = null) {
  if (a.lab) return refuse('focusInLab')
  const wantsRoom = boards.includes('room')
  const room = currentRoom(a) ?? 'room'
  const here = roomOnScreen(a)
  const target = typeof here === 'string' ? here : chat
  if (wantsRoom && !target) return refuse('focusNothing')
  const keys = boards.map((b) => (b === 'room' ? room : b))
  if (a.focus && JSON.stringify(a.columns) === JSON.stringify(keys.map((k) => [k])) && !a.popped.length) return refuse('focusSetAlready')
  const next = copy(a)
  next.focus = a.focus ? { ...a.focus } : { columns: a.columns.map((c) => [...c]), popped: a.popped.map((p) => ({ ...p })), addressed: a.addressed, bar: { ...a.bar } }
  next.columns = keys.map((k) => [k])
  next.popped = []
  next.addressed = wantsRoom ? room : keys[0]
  next.bar = { ...a.bar, at: 'bottom', popped: false }
  if (wantsRoom) next.context[room] = target
  return go2(next, 'focusSetGo', { focusBoards: boards })
}

/**
 * When something needs a board focus hides (finding a card; C253 piece 1):
 * focus turns off first, the space as it was, and the caller then brings
 * the board. Null when not focused or the board is on screen.
 */
export function outOfFocusFor(a, board) {
  if (!a.focus) return null
  if (a.columns.flat().includes(board) || a.popped.some((p) => p.board === board)) return null
  return planFocusOff(a).next
}

/** focus:off. The space as it was before focus:, windows and all. */
export function planFocusOff(a) {
  if (!a.focus) return refuse('focusOffNot')
  const before = a.focus
  const next = copy(a)
  delete next.focus
  next.columns = before.columns.map((c) => [...c])
  next.popped = before.popped.map((p) => ({ ...p }))
  next.addressed = before.addressed
  next.bar = { ...before.bar }
  const kept = a.columns.flat().find(isRoom)
  const back = [...before.columns.flat(), ...before.popped.map((p) => p.board)].filter((b) => b !== kept)
  return go2(next, back.length ? 'focusOff' : 'focusOffSame', { boards: back.map((b) => (isRoom(b) ? 'room' : b)) })
}

// ── The Lab (stage 13, piece 1; C238 (a), (c)) ─────────
// lab: keeps the space as it is and lays out the Lab's boards (the Library,
// the Canvas, the Blocks board, bar on top), the room in it named as the
// Canvas's context; done: brings the space back as it was. With the Lab
// open already, a room named moves into it.

/** lab:, edit:, new:room. The Lab, with this room on its Canvas (or none). */
export function planLabOpen(a, modeId = null) {
  const lab = SHIPPED.lab
  if (a.lab) {
    if ((a.context.canvas ?? null) === modeId) return refuse('labAlready')
    const next = copy(a)
    if (modeId) next.context.canvas = modeId
    else delete next.context.canvas
    next.addressed = 'canvas'
    return go2(next, 'labRoom')
  }
  const next = copy(a)
  next.lab = { columns: a.columns.map((c) => [...c]), popped: a.popped.map((p) => ({ ...p })), addressed: a.addressed, bar: { ...a.bar } }
  next.columns = lab.columns.map((c) => [...c])
  next.popped = []
  next.addressed = lab.addressed
  next.bar = { ...a.bar, at: lab.bar, popped: false }
  if (modeId) next.context.canvas = modeId
  else delete next.context.canvas
  return go2(next, 'labOpened')
}

/** done:. The space as it was before lab:. */
export function planLabDone(a) {
  if (!a.lab) return refuse('doneNotLab')
  const before = a.lab
  const next = copy(a)
  delete next.lab
  next.columns = before.columns.map((c) => [...c])
  next.popped = before.popped.map((p) => ({ ...p }))
  next.addressed = before.addressed
  next.bar = { ...before.bar }
  return go2(next, 'labLeft')
}

// ── cols: (Almanac v30; stage 6, piece 2; C141) ─────────
// Which columns Records shows. The title and the number always show
// (almanac spec §3); the board's width still drops what does not fit.
// Kept with the space, so reset: puts them back (v30).

/** Records' columns, in their order. */
export const RECORDS_COLUMNS = Object.freeze(['type', 'id', 'title', 'room', 'tags', 'created', 'active'])
const STAYING = new Set(['id', 'title'])
// The words cols: takes for each, v30's included (date, last).
const COLUMN_WORDS = Object.freeze({ type: 'type', id: 'id', title: 'title', room: 'room', tags: 'tags', tag: 'tags', created: 'created', date: 'created', active: 'active', last: 'active' })

/** The columns Records shows here, in order. */
export const recordsColumns = (a) => (Array.isArray(a?.recordsCols) ? a.recordsCols : RECORDS_COLUMNS)

/**
 * cols:-room +created. Bare cols: says which show. A minus hides a column,
 * a plus (or nothing) shows it again.
 * @param {Arrangement} a
 * @param {string[]} words as typed, in lower case
 */
export function planCols(a, words = []) {
  const now = recordsColumns(a)
  if (!words.length) return refuse('colsNow', { board: 'almanac', cols: now })
  let next = [...now]
  const hid = []
  const shown = []
  for (const w of words) {
    const name = w.replace(/^[-+]/, '')
    const col = COLUMN_WORDS[name]
    if (!col) return refuse('colsUnknown', { word: name, words: RECORDS_COLUMNS })
    if (w.startsWith('-')) {
      if (STAYING.has(col)) return refuse('colsStays', { col })
      if (next.includes(col)) { next = next.filter((c) => c !== col); hid.push(col) }
    } else if (!next.includes(col)) {
      next = RECORDS_COLUMNS.filter((c) => next.includes(c) || c === col)
      shown.push(col)
    }
  }
  if (!hid.length && !shown.length) return refuse('colsSame')
  const out = copy(a)
  if (next.length === RECORDS_COLUMNS.length) delete out.recordsCols
  else out.recordsCols = next
  const plan = go(out, hid.length ? 'colsHide' : 'colsShow', { cols: hid.length ? hid : shown })
  if (hid.length && shown.length) plan.says.also = [{ message: 'colsShow', values: { cols: shown } }]
  return plan
}

/** reset:. This arrangement as shipped, its windows closed; what boards show stays. */
export function planReset(a) {
  const next = shipped(a.id, a.context)
  if (sameLayout(next, a)) return refuse('resetAlready')
  return go(next, 'resetArrangement', { count: a.popped.length })
}

/** Points the bar at a board on this screen or in a window, as a click on it does. */
export function address(a, board) {
  return isOnPage(a, board) || isPopped(a, board) ? settle({ ...copy(a), addressed: board }) : a
}

// ── From a command ──────────────────────────────────────

// The verbs this module answers. open: and pop: with a number wait for the
// stages that build what numbers open.
export const ARRANGEMENT_VERBS = Object.freeze(['open', 'close', 'move', 'swap', 'pop', 'reset', 'bar', 'width', 'cols'])

const word = (arg) => (arg?.kind === 'word' ? arg.value : null)

/**
 * The plan for one command, from the registry's answer for it (its verb and
 * the arguments it matched), or null when this module does not answer that
 * form yet. Board names have been checked by the registry.
 * @param {Arrangement} a
 * @param {{ verb: string, match: { values: Array<object> } }} step
 * @param {object|null} [layout] the space as drawn, for width: (planWidth)
 * @returns {Plan|null}
 */
export function plan(a, step, layout = null) {
  const args = step.match?.values ?? []
  const [first, second] = args.map(word)
  // The boards the words name: records is the Almanac's board, plan the
  // docket's (C131). The word room names the room a prompt goes to; a room
  // found by its chat (close:204) comes as its board, exactly.
  const room = (b) => (b === 'room' && !step.exactBoard ? currentRoom(a) ?? 'room' : b)
  const one = room(boardFor(first))
  const two = room(boardFor(second))
  switch (step.verb) {
    case 'open':
      if (first === 'lab') return null // the Lab is an arrangement: lab: and open:lab come with the Lab
      // open:settings keys: a section of Settings (C181).
      if (one === 'settings' && args.length === 2) return planOpenSettings(a, second ?? args[1]?.text)
      return one && args.length === 1 ? planOpen(a, one) : null
    case 'close':
      if (!args.length) return planClose(a)
      return one ? planClose(a, one) : null
    case 'move':
      return one ? planMove(a, one, second) : null
    case 'swap':
      return planSwap(a, one ?? first, two ?? second)
    case 'pop':
      if (first === 'command') return planPopBar(a, true)
      if (first === 'back') {
        if (second === 'command') return planPopBar(a, false)
        return planPopBack(a, two ?? second ?? null)
      }
      if (first === 'left' || first === 'right') return planPopSide(a, first)
      if (one) {
        if (args.length === 1) return planPop(a, one)
        if (second === 'display' && args[2]?.kind === 'number') return planPop(a, one, args[2].value)
        return null // pop:settings keys: sections come with Settings
      }
      return null
    case 'reset':
      return planReset(a)
    case 'bar':
      return planBar(a, first)
    case 'cols':
      return planCols(a, args.map((arg) => String(arg.value ?? arg.text ?? '').toLowerCase()))
    case 'width': {
      if (first === 'even') return planWidthEven(a)
      const percent = args.find((arg) => arg?.kind === 'percent')?.value
      if (percent == null) return null
      if (args.length === 1) return planWidth(a, a.addressed, percent, false, layout)
      return one ? planWidth(a, one, percent, true, layout) : null
    }
    default:
      return null
  }
}

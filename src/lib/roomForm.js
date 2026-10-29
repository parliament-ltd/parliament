// How a room draws its side columns (C279 (b); C126). A room's own width
// decides, not the window's, and so does whether it has the screen to
// itself:
// - 'open': alone on screen (the only board, or popped into its own window)
//   and wide enough for both columns beside a chat. The columns are open, as
//   before, each with a button that closes it.
// - 'strips': sharing the screen, or alone but narrower than that (a focused
//   room, at 820px). The chat takes the room's width; each column with
//   blocks is a thin strip with a button that opens it over the chat's edge,
//   inside the room.
// - 'narrow': too narrow for a chat beside the strips, or on a phone. The
//   layout's narrow form: the conversation, with the columns behind the
//   buttons at its top.
// Open or closed is not remembered: each room starts as its form says.

/** Two side columns of 288px and a chat of about 360px. */
export const ROOM_OPEN = 940
/** The least a room needs for a chat at all, beside its strips. */
export const ROOM_CHAT = 600
/** The widths at which a room's form can change, rising. */
export const ROOM_EDGES = Object.freeze([ROOM_CHAT, ROOM_OPEN])

/**
 * @param {{ width: number, alone?: boolean, phone?: boolean }} at
 *   width: the room's own width in pixels; alone: no other board shares the
 *   screen; phone: a phone, or a room built for one
 * @returns {'open'|'strips'|'narrow'}
 */
export function roomForm({ width, alone = false, phone = false }) {
  if (phone) return 'narrow'
  if (!(width >= ROOM_CHAT)) return 'narrow'
  if (alone && width >= ROOM_OPEN) return 'open'
  return 'strips'
}

/**
 * The least width of each band useBand(ROOM_EDGES) answers with, which is
 * all roomForm reads of a width.
 * @param {number} band 0 under ROOM_CHAT, 1 under ROOM_OPEN, 2 at or past it
 */
export const bandWidth = (band) => [0, ...ROOM_EDGES][band] ?? ROOM_OPEN

/**
 * Which columns are open when a room takes a form: both when it is open,
 * neither otherwise.
 * @param {'open'|'strips'|'narrow'} form
 * @returns {{ left: boolean, right: boolean }}
 */
export const columnsAt = (form) => (form === 'open' ? { left: true, right: true } : { left: false, right: false })

/**
 * One column's button pressed. As strips, one column is open at a time:
 * opening one closes the other.
 * @param {{ left: boolean, right: boolean }} columns
 * @param {'left'|'right'} side
 * @param {'open'|'strips'|'narrow'} form
 * @returns {{ left: boolean, right: boolean }}
 */
export function toggleColumn(columns, side, form) {
  const next = !columns[side]
  if (form === 'strips') return { left: false, right: false, [side]: next }
  return { left: columns.left, right: columns.right, [side]: next }
}

// Indent and align (C304, ruled 16 November: "Yes, build it";
// parliament-indent-align-v1.html). How a line sits, never its words: a step
// in or out, up to three, and the centre or the right. Not an edit (SKIP),
// so nothing is struck or marked and no prompt carries it as one; Ctrl+Z
// takes it back, as it does any change. Kept on the line (indent, align).

import { SKIP } from './track'

export const MOST = 3
export const ALIGNS = Object.freeze(['center', 'right'])
// The lines that take a place: not a table, a chart or a code block.
const LAID = new Set(['paragraph', 'heading', 'list_item', 'quote'])

/** The lines the caret or the selection is in that take a place, with their positions. */
export function laidLines(state) {
  const out = []
  const { from, to } = state.selection
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isTextblock) return true
    if (LAID.has(node.type.name)) out.push({ node, pos })
    return false
  })
  return out
}

const changed = (state, next) => {
  const tr = state.tr
  let count = 0
  for (const { node, pos } of laidLines(state)) {
    const attrs = next(node.attrs)
    if (attrs.indent === (node.attrs.indent ?? 0) && attrs.align === (node.attrs.align ?? null)) continue
    tr.setNodeMarkup(pos, null, attrs)
    count += 1
  }
  return count ? { tr: tr.setMeta(SKIP, true), count } : null
}

/** The lines moved by steps in (1) or out (-1); null when none moves. */
export function shiftLines(state, by) {
  return changed(state, (a) => ({ ...a, indent: Math.max(0, Math.min(MOST, (a.indent ?? 0) + by)), align: a.align ?? null }))
}

/** The lines set at the centre, the right, or the left again (anything else); null when none changes. */
export function alignLines(state, align) {
  const to = ALIGNS.includes(align) ? align : null
  return changed(state, (a) => ({ ...a, indent: a.indent ?? 0, align: to }))
}

/** Backspace at the start of a line moved in: one step out, before it would join the line above. */
export function outdentAtStart(state, dispatch) {
  const { $from, empty } = state.selection
  if (!empty || $from.parentOffset !== 0) return false
  const node = $from.parent
  if (!LAID.has(node.type.name) || !(node.attrs.indent > 0)) return false
  if (dispatch) dispatch(state.tr.setNodeMarkup($from.before(), null, { ...node.attrs, indent: node.attrs.indent - 1 }).setMeta(SKIP, true))
  return true
}

/** A stored line's place, as read back: an indent of 1 to 3 and an alignment, or nothing. */
export function layOf(block) {
  return {
    ...([1, 2, 3].includes(block?.indent) ? { indent: block.indent } : {}),
    ...(ALIGNS.includes(block?.align) ? { align: block.align } : {}),
  }
}

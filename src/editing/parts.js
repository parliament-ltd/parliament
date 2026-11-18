// The parts of a room's one text (C311, piece 2, step 1; ruled 18 November).
//
// Your text, each prompt and each finished reply are sections of one editor,
// each its own message. A selection runs across them, and a change across
// them is made in each part it touches, never across the edge between two:
// no part is joined to another, and none is lost. Whether a part's words go
// or are struck is the editing rules' own, part by part (track.js): the
// changes made here are ordinary ones, one for each part.
//
// Pure, so it is tested alone.

import { Selection, TextSelection } from 'prosemirror-state'
import { schema } from './schema'
import { INTENT } from './track'

/** Marks a change made part by part, so it is not taken apart again. */
export const PARTS = 'editParts'

/**
 * A document's parts, in order: each section's message, its kind, and where
 * its content starts and ends.
 * @returns {Array<{ message: string|null, part: string, from: number, to: number }>}
 */
export function partsOf(doc) {
  const out = []
  doc.forEach((node, offset) => {
    if (node.type === schema.nodes.section) out.push({ message: node.attrs.message, part: node.attrs.part, from: offset + 1, to: offset + node.nodeSize - 1 })
  })
  return out
}

/** Whether two documents hold the same parts, in the same order. */
export function sameParts(a, b) {
  const x = partsOf(a)
  const y = partsOf(b)
  return x.length === y.length && x.every((p, i) => p.message === y[i].message && p.part === y[i].part)
}

/** The messages whose parts a change touches. */
export function touchedParts(tr) {
  const ids = new Set()
  tr.steps.forEach((step, i) => {
    const from = step.from ?? step.pos
    const to = step.to ?? step.pos
    if (typeof from !== 'number' || typeof to !== 'number') return
    for (const p of partsOf(tr.docs[i])) if (from <= p.to && to >= p.from) ids.add(p.message)
  })
  return [...ids]
}

/**
 * Ctrl+A in one text (C311, step 2): the part the caret is in first, and the
 * whole text once that part is selected already, so one Backspace after one
 * Ctrl+A never reaches further than the part being worked on.
 * @returns {{ tr: import('prosemirror-state').Transaction, whole: boolean }|null}
 *   null where the text has one part or none: the browser's own select all.
 */
export function selectPart(state) {
  const parts = partsOf(state.doc)
  if (parts.length < 2) return null
  const { from, to } = state.selection
  const ends = (p) => ({ start: Selection.near(state.doc.resolve(p.from), 1).from, end: Selection.near(state.doc.resolve(p.to), -1).to })
  const here = parts.find((p) => from >= p.from && from <= p.to)
  const mine = here ? ends(here) : null
  const within = mine && to <= here.to && !(from === mine.start && to === mine.end)
  if (within) return { tr: state.tr.setSelection(TextSelection.create(state.doc, mine.start, mine.end)), whole: false }
  const start = ends(parts[0]).start
  const end = ends(parts[parts.length - 1]).end
  return { tr: state.tr.setSelection(TextSelection.create(state.doc, start, end)), whole: true }
}

/**
 * The parts a selection covers whole, from the first word to the last (C311,
 * step 3): these are deleted from the chat as messages, not struck. Your own
 * text is never among them: emptied, it stays a page.
 */
export function wholeParts(state) {
  const { from, to, empty } = state.selection
  if (empty) return []
  return partsOf(state.doc).filter((p) => {
    if (p.part === 'writing') return false
    const start = Selection.near(state.doc.resolve(p.from), 1).from
    const end = Selection.near(state.doc.resolve(p.to), -1).to
    return from <= start && to >= end
  })
}

/**
 * A change that replaces a selection running across parts, taken apart: the
 * selection's words removed in each part, last part first, then the caret
 * put where the selection began and the typed words, if any, written there.
 * Each is made on the state the one before left. Pasted across parts, words
 * come in as plain text.
 *
 * null when the change is not one replacement of the whole selection, or the
 * selection lies in one part: it is then left as it is.
 * @param {import('prosemirror-state').EditorState} state
 * @param {import('prosemirror-state').Transaction} tr
 * @param {(message: string|null) => boolean} [plain] whether a part's words
 *   simply go (your own text no model has read); elsewhere they are struck,
 *   and the caret goes after them
 * @param {Set<string>} [leave] parts left as they are: those being deleted
 *   whole from the chat (step 3), whose words need no striking
 * @returns {Array<(state: import('prosemirror-state').EditorState) => import('prosemirror-state').Transaction>|null}
 */
export function acrossParts(state, tr, plain = () => false, leave = new Set()) {
  const { from, to } = state.selection
  if (tr.steps.length !== 1) return null
  const step = tr.steps[0]
  if (step.from !== from || step.to !== to || !step.slice || step.gapFrom != null) return null
  const reached = partsOf(state.doc).filter((p) => from < p.to && to > p.from)
  if (reached.length < 2) return null
  const parts = reached.filter((p) => !leave.has(p.message))
  if (!parts.length) return []
  const text = step.slice.content.textBetween(0, step.slice.content.size, ' ')
  // The ends of the selection inside one part, each within a line of text.
  const within = (doc, p) => {
    const a = Math.max(from, p.from)
    const b = Math.min(to, p.to)
    const start = a === p.from ? Selection.near(doc.resolve(a), 1).from : a
    const end = b === p.to ? Selection.near(doc.resolve(b), -1).to : b
    return { start, end }
  }
  const makes = [...parts].reverse().map((p) => (s) => {
    const { start, end } = within(s.doc, p)
    const made = s.tr.setMeta(PARTS, true)
    return start < end ? made.delete(start, end).setMeta(INTENT, 'range') : made
  })
  const first = parts[0]
  makes.push((s) => {
    // Where the words went, the caret is where they began; where they were
    // struck, after them, as when a selection in one part is typed over.
    const at = plain(first.message) ? Math.max(from, first.from) : Math.min(to, first.to)
    const pos = Math.min(Math.max(at, 0), s.doc.content.size)
    const made = s.tr.setSelection(TextSelection.near(s.doc.resolve(pos), -1)).setMeta(PARTS, true)
    return text ? made.insertText(text) : made
  })
  return makes
}

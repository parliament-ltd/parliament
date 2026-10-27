import { describe, it, expect } from 'vitest'
import { EditorState, TextSelection, NodeSelection } from 'prosemirror-state'
import { STRUCK, ADDED } from './schema'
import { replyFromMarkdown } from './fromMarkdown'
import { track, createIds, cursorMarks, undoEdit, collectEdits, INTENT } from './track'
import { commands, tableOp, cellsOf } from './keys'

// Stefan's try (C208): an undo from a card that left a strike behind. Random
// runs of what a person does, then every edit undone from its card: the
// reply's words must be back as they were, with no mark left anywhere.

function random(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const MD = 'The furnace had not gone out in **eleven years**, and old Ferro meant to keep it.\n\n## What they made\n\n- Coloured glass\n- Mirrors\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n\nThat winter a stranger came, asking for a mirror.'
const WORDS = ['nearly', 'a century', 'ghost', '百年', 'x', 'Tom and Ellen', 'é']

function inlinePositions(doc) {
  const out = []
  doc.descendants((node, pos) => {
    if (node.isTextblock) {
      for (let p = pos + 1; p <= pos + 1 + node.content.size; p++) out.push(p)
      return false
    }
    return true
  })
  return out
}

function marksLeft(doc) {
  let n = 0
  doc.descendants((node) => {
    if (node.attrs.struck != null || node.attrs.added != null) n += 1
    for (const m of node.marks) if (m.type === STRUCK || m.type === ADDED) n += 1
    return true
  })
  return n
}

function runOnce(seed, steps) {
  const r = random(seed)
  const pick = (list) => list[Math.floor(r() * list.length)]
  const ids = createIds(240)
  const original = replyFromMarkdown(MD, ids.block)
  let state = EditorState.create({ doc: original })
  const log = []
  const apply = (tr) => { state = state.apply(track(state, tr, { ids })) }
  const run = (command) => command(state, apply, { get state() { return state } })
  const caret = (p) => { state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, p))) }
  for (let i = 0; i < steps; i++) {
    const positions = inlinePositions(state.doc)
    const p = pick(positions)
    const kind = Math.floor(r() * 9)
    if (kind === 0) { // typing at a caret, its marks set as the page sets them
      caret(p)
      const marks = cursorMarks(state, ids)
      if (marks) state = state.apply(state.tr.setStoredMarks(marks))
      const w = pick(WORDS)
      log.push(`type ${JSON.stringify(w)} at ${p}`)
      apply(state.tr.insertText(w))
    } else if (kind === 1) { // typing over a selection, perhaps across blocks
      const q = pick(positions)
      const [a, b] = [Math.min(p, q), Math.max(p, q)]
      if (a === b) continue
      state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, a, b)))
      const w = pick(WORDS)
      log.push(`over ${a}-${b} with ${JSON.stringify(w)}`)
      apply(state.tr.insertText(w, a, b))
    } else if (kind === 2) {
      caret(p)
      log.push(`backspace at ${p}`)
      run(commands.backspace(true))
    } else if (kind === 3) {
      caret(p)
      log.push(`delete at ${p}`)
      run(commands.del())
    } else if (kind === 4) { // a selection struck with Backspace
      const q = pick(positions)
      const [a, b] = [Math.min(p, q), Math.max(p, q)]
      if (a === b) continue
      state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, a, b)))
      log.push(`strike ${a}-${b}`)
      run(commands.backspace(true))
    } else if (kind === 5) {
      caret(p)
      log.push(`enter at ${p}`)
      run(commands.enter(ids))
    } else if (kind === 8) { // a row or column added or struck, from / in a cell (C222 (b))
      const cells = cellsOf(state.doc)
      if (!cells.length) continue
      const c = pick(cells)
      caret(c.pos + 1)
      const key = pick(['rowBelow', 'colAfter', 'strikeRow', 'strikeCol'])
      log.push(key + ' at ' + (c.pos + 1))
      const tr = tableOp(state, key, ids)
      if (tr) state = state.apply(tr)
    } else if (kind === 6) { // the table struck whole, as after a click on it
      let at = null
      state.doc.forEach((node, offset) => { if (node.type.name === 'table' && node.attrs.struck == null) at = offset })
      if (at == null) continue
      state = state.apply(state.tr.setSelection(NodeSelection.create(state.doc, at)))
      log.push(`strike the table at ${at}`)
      apply(state.tr.deleteSelection().setMeta(INTENT, 'range'))
    } else { // a word composed with an input method, changing as it goes
      caret(p)
      const marks = cursorMarks(state, ids)
      if (marks) state = state.apply(state.tr.setStoredMarks(marks))
      log.push(`compose at ${p}`)
      apply(state.tr.insertText('か'))
      const at = state.selection.from
      apply(state.tr.insertText('漢字', at - 1, at))
    }
  }
  const edits = collectEdits(state.doc)
  for (const e of [...edits].reverse()) state = state.apply(undoEdit(state, e.id))
  return { state, original, log, edits: edits.length }
}

describe('undo from every card, after random editing', () => {
  it('brings every word back, with no strike or addition left', () => {
    const failures = []
    for (let seed = 1; seed <= 400; seed++) {
      const { state, original, log } = runOnce(seed, 25)
      const left = marksLeft(state.doc)
      const same = state.doc.textContent === original.textContent
      if (left || !same) failures.push({ seed, left, same, log: log.slice(-6), text: state.doc.textContent.slice(0, 120) })
      if (failures.length >= 3) break
    }
    expect(failures).toEqual([])
  })
})

import { describe, it, expect } from 'vitest'
import { EditorState, TextSelection } from 'prosemirror-state'
import { schema, STRUCK } from './schema'
import { track, createIds, SKIP } from './track'
import { partsOf, sameParts, touchedParts, acrossParts, PARTS } from './parts'

// Your text, a prompt and its reply, as the room's one text holds them (C311).
const para = (id, text) => schema.nodes.paragraph.create({ id }, text ? schema.text(text) : null)
const section = (part, message, ...blocks) => schema.nodes.section.create({ part, message }, blocks)
function setup() {
  const doc = schema.nodes.doc.create(null, [
    section('writing', 'w', para('t1', 'Notes on owls before the essay.')),
    section('prompt', 'p', para('t2', 'barn owl')),
    section('reply', 'r', para('t3', 'The barn owls are owls in the genus Tyto.'), para('t4', 'They are medium-sized.')),
  ])
  return EditorState.create({ doc })
}
const posOf = (state, text) => {
  let found = -1
  state.doc.descendants((node, pos) => { if (found < 0 && node.isText && node.text.includes(text)) found = pos + node.text.indexOf(text) })
  return found
}
const select = (state, a, b) => state.apply(state.tr.setSelection(TextSelection.create(state.doc, posOf(state, a), posOf(state, b) + b.length)))
// The words of each part, a struck run shown as [-words-].
const words = (doc) => partsOf(doc).map((p) => {
  const lines = []
  doc.nodeAt(p.from - 1).forEach((block) => {
    let line = ''
    block.forEach((n) => { line += n.marks.some((m) => m.type === STRUCK) ? `[-${n.text}-]` : n.text })
    lines.push(line)
  })
  return lines.join(' | ')
})
// The editor's own handling: each change made part by part, tracked unless its part is plain.
function run(state, tr, plain = () => false) {
  const ids = createIds(240)
  const steps = acrossParts(state, tr, plain)
  if (!steps) return null
  let s = state
  for (const make of steps) {
    const made = make(s)
    expect(made.getMeta(PARTS)).toBe(true)
    const touched = made.docChanged ? touchedParts(made) : []
    if (touched.length && touched.every(plain)) made.setMeta(SKIP, true)
    s = s.apply(track(s, made, { ids }))
  }
  return s
}

describe('the parts of one text (C311)', () => {
  it('lists each part with its message, in order', () => {
    const { doc } = setup()
    expect(partsOf(doc).map((p) => `${p.part}:${p.message}`)).toEqual(['writing:w', 'prompt:p', 'reply:r'])
    expect(sameParts(doc, doc)).toBe(true)
  })
  it('names the parts a change touches', () => {
    const state = setup()
    const at = posOf(state, 'barn owl')
    expect(touchedParts(state.tr.insertText('a ', at))).toEqual(['p'])
    expect(touchedParts(state.tr.delete(posOf(state, 'before'), posOf(state, 'genus')))).toEqual(['w', 'p', 'r'])
  })
  it('sees a part lost when a raw deletion runs across parts', () => {
    const state = setup()
    const raw = state.tr.delete(posOf(state, 'before'), posOf(state, 'genus'))
    expect(sameParts(state.doc, raw.doc)).toBe(false)
  })
  it('leaves a change within one part alone', () => {
    const state = select(setup(), 'genus', 'Tyto')
    expect(acrossParts(state, state.tr.deleteSelection())).toBe(null)
  })
  it('strikes the selected words in each part, and keeps every part', () => {
    const state = select(setup(), 'before', 'genus')
    const next = run(state, state.tr.delete(state.selection.from, state.selection.to))
    expect(sameParts(state.doc, next.doc)).toBe(true)
    expect(words(next.doc)).toEqual([
      'Notes on owls [-before the essay.-]',
      '[-barn owl-]',
      '[-The barn owls are owls in the genus-] Tyto. | They are medium-sized.',
    ])
  })
  it('removes the words of your own text no model has read, and strikes the rest', () => {
    const state = select(setup(), 'before', 'genus')
    const next = run(state, state.tr.delete(state.selection.from, state.selection.to), (m) => m === 'w')
    expect(sameParts(state.doc, next.doc)).toBe(true)
    expect(words(next.doc)).toEqual([
      'Notes on owls ',
      '[-barn owl-]',
      '[-The barn owls are owls in the genus-] Tyto. | They are medium-sized.',
    ])
    // The caret is where the selection began.
    expect(next.selection.empty).toBe(true)
    expect(next.selection.from).toBe(posOf(next, 'Notes on owls ') + 'Notes on owls '.length)
  })
  it('writes typed words where the selection began, in your own text', () => {
    const state = select(setup(), 'before', 'genus')
    const typed = state.tr.insertText('about', state.selection.from, state.selection.to)
    const next = run(state, typed, (m) => m === 'w')
    expect(words(next.doc)[0]).toBe('Notes on owls about')
    expect(sameParts(state.doc, next.doc)).toBe(true)
  })
  it('keeps a part whose every word was selected, empty or struck', () => {
    const state = select(setup(), 'Notes', 'medium-sized.')
    const next = run(state, state.tr.delete(state.selection.from, state.selection.to), () => true)
    expect(sameParts(state.doc, next.doc)).toBe(true)
    expect(words(next.doc)).toEqual(['', '', ''])
  })
})

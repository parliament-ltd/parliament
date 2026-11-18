import { describe, it, expect } from 'vitest'
import { EditorState, TextSelection, NodeSelection } from 'prosemirror-state'
import { schema, STRUCK } from './schema'
import { track, createIds, SKIP } from './track'
import { partsOf, sameParts, touchedParts, acrossParts, selectPart, wholeParts, PARTS } from './parts'
import { historyPlugin, undo } from './history'
import { editingPlugins } from './keys'

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

// As run, with some parts left alone: those being deleted whole.
function runLeaving(state, leave) {
  const ids = createIds(240)
  let s = state
  for (const make of acrossParts(state, state.tr.delete(state.selection.from, state.selection.to), () => false, leave)) s = s.apply(track(s, make(s), { ids }))
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
  it('selects the part the caret is in on Ctrl+A, and the whole text on a second', () => {
    let state = setup()
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, posOf(state, 'medium'))))
    const first = selectPart(state)
    expect(first.whole).toBe(false)
    state = state.apply(first.tr)
    expect(state.doc.textBetween(state.selection.from, state.selection.to, ' | ')).toBe('The barn owls are owls in the genus Tyto. | They are medium-sized.')
    const second = selectPart(state)
    expect(second.whole).toBe(true)
    state = state.apply(second.tr)
    expect(state.doc.textBetween(state.selection.from, state.selection.to, ' | ')).toBe('Notes on owls before the essay. | barn owl | The barn owls are owls in the genus Tyto. | They are medium-sized.')
    // A selection across parts already: the whole text.
    expect(selectPart(select(setup(), 'before', 'genus')).whole).toBe(true)
  })
  it('leaves Ctrl+A to the browser where the text is one part', () => {
    const doc = schema.nodes.doc.create(null, [section('writing', 'w', para('t1', 'Notes on owls.'))])
    expect(selectPart(EditorState.create({ doc }))).toBe(null)
  })
  it('takes a change across parts back as one step', () => {
    let clock = 1000
    const base = setup()
    let state = EditorState.create({ doc: base.doc, plugins: [historyPlugin({ now: () => clock })] })
    state = select(state, 'before', 'genus')
    const ids = createIds(240)
    const before = state.doc
    for (const make of acrossParts(state, state.tr.delete(state.selection.from, state.selection.to))) {
      state = state.apply(track(state, make(state), { ids }))
    }
    expect(words(state.doc)[1]).toBe('[-barn owl-]')
    clock += 5000
    undo(state, (tr) => { state = state.apply(tr) })
    expect(state.doc.eq(before)).toBe(true)
  })
  it('stops Backspace at the start of a part, and Delete at its end', () => {
    const ids = createIds(240)
    let state = EditorState.create({ doc: setup().doc, plugins: editingPlugins({ ids }) })
    const keymaps = state.plugins.filter((p) => p.props.handleKeyDown)
    const press = (key) => {
      let made = null
      const view = { state, dispatch: (tr) => { made = tr }, composing: false, endOfTextblock: () => true }
      for (const k of keymaps) if (k.props.handleKeyDown(view, { key, code: key, keyCode: key === 'Backspace' ? 8 : 46, preventDefault() {}, shiftKey: false, ctrlKey: false, metaKey: false, altKey: false })) break
      return made
    }
    // Within a part the key does change the text, so the stops below are the key's own.
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, posOf(state, 'genus'))))
    expect(press('Backspace')?.docChanged).toBe(true)
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, posOf(state, 'The barn owls'))))
    const back = press('Backspace')
    expect(back == null || !back.docChanged).toBe(true)
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, posOf(state, 'barn owl') + 'barn owl'.length)))
    const forward = press('Delete')
    expect(forward == null || !forward.docChanged).toBe(true)
  })
  it('names the parts a selection covers whole, never your own text', () => {
    expect(wholeParts(setup())).toEqual([])
    expect(wholeParts(select(setup(), 'barn owl', 'barn owl')).map((p) => p.message)).toEqual(['p'])
    expect(wholeParts(select(setup(), 'barn owl', 'medium-sized.')).map((p) => p.message)).toEqual(['p', 'r'])
    // Part of a reply is not the reply.
    expect(wholeParts(select(setup(), 'barn owl', 'genus')).map((p) => p.message)).toEqual(['p'])
    // All of the text selected: your own text stays a page.
    expect(wholeParts(select(setup(), 'Notes', 'medium-sized.')).map((p) => p.message)).toEqual(['p', 'r'])
  })
  it('changes the words beside a part being deleted, and leaves that part alone', () => {
    const state = select(setup(), 'before', 'genus')
    const next = runLeaving(state, new Set(['p']))
    expect(words(next.doc)).toEqual([
      'Notes on owls [-before the essay.-]',
      'barn owl',
      '[-The barn owls are owls in the genus-] Tyto. | They are medium-sized.',
    ])
  })
  describe('a fixed part: a list of results, a reply still arriving (step 4)', () => {
    // A prompt, a source's list of results, then a prompt and its reply.
    const withFixed = () => EditorState.create({ doc: schema.nodes.doc.create(null, [
      section('prompt', 'p1', para('t1', 'barn owl hunting')),
      schema.nodes.fixed.create({ message: 'list' }),
      section('prompt', 'p2', para('t2', 'why are their ears uneven')),
      section('reply', 'r2', para('t3', 'One ear sits higher than the other.')),
    ]) })
    it('is a part, with no words of its own', () => {
      const state = withFixed()
      expect(partsOf(state.doc).map((x) => `${x.part}:${x.message}`)).toEqual(['prompt:p1', 'fixed:list', 'prompt:p2', 'reply:r2'])
      expect(partsOf(state.doc)[1].fixed).toBe(true)
    })
    it('is left as it is by a change across the parts around it', () => {
      const state = select(withFixed(), 'hunting', 'why are')
      const next = run(state, state.tr.delete(state.selection.from, state.selection.to))
      expect(sameParts(state.doc, next.doc)).toBe(true)
      expect(next.doc.child(1).type).toBe(schema.nodes.fixed)
      expect(next.doc.child(0).textContent).toBe('barn owl hunting')
      expect(next.doc.child(0).firstChild.lastChild.marks.some((m) => m.type === STRUCK)).toBe(true)
    })
    it('is seen as lost when a raw change would remove it', () => {
      const state = select(withFixed(), 'hunting', 'why are')
      expect(sameParts(state.doc, state.tr.delete(state.selection.from, state.selection.to).doc)).toBe(false)
    })
    it('is named whole when the selection runs over it, or it is selected by itself', () => {
      expect(wholeParts(select(withFixed(), 'hunting', 'why are')).map((x) => x.message)).toEqual(['list'])
      expect(wholeParts(select(withFixed(), 'barn owl hunting', 'why are')).map((x) => x.message)).toEqual(['p1', 'list'])
      const state = withFixed()
      const at = partsOf(state.doc)[1].from
      const picked = state.apply(state.tr.setSelection(NodeSelection.create(state.doc, at)))
      expect(wholeParts(picked).map((x) => x.message)).toEqual(['list'])
    })
    it('is passed over by Ctrl+A, which selects the written parts', () => {
      let state = withFixed()
      state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, posOf(state, 'ears'))))
      const first = selectPart(state)
      expect(first.whole).toBe(false)
      state = state.apply(first.tr)
      expect(state.doc.textBetween(state.selection.from, state.selection.to)).toBe('why are their ears uneven')
      const all = selectPart(state)
      expect(all.whole).toBe(true)
    })
  })
  it('keeps a part whose every word was selected, empty or struck', () => {
    const state = select(setup(), 'Notes', 'medium-sized.')
    const next = run(state, state.tr.delete(state.selection.from, state.selection.to), () => true)
    expect(sameParts(state.doc, next.doc)).toBe(true)
    expect(words(next.doc)).toEqual(['', '', ''])
  })
})

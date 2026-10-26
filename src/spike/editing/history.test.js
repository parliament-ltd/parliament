import { describe, it, expect } from 'vitest'
import { EditorState, TextSelection } from 'prosemirror-state'
import { STRUCK, ADDED } from './schema'
import { replyFromMarkdown } from './fromMarkdown'
import { track, createIds, undoEdit } from './track'
import { editingPlugins } from './keys'
import { undo, redo, historyDepth } from './history'

// Ctrl+Z and Ctrl+Y on Parliament's own history (C209 (c), ruled 25 October).

function show(doc) {
  let out = ''
  doc.descendants((n) => {
    if (!n.isText) return true
    const s = n.marks.find((m) => m.type === STRUCK)
    const a = n.marks.find((m) => m.type === ADDED)
    out += s ? `[-${n.text}-]` : a ? `{+${n.text}+}` : n.text
    return false
  })
  return out
}

function setup(clock) {
  const ids = createIds(240)
  const doc = replyFromMarkdown('The furnace had not gone out in eleven years.', ids.block)
  const state = EditorState.create({ doc, plugins: editingPlugins({ ids, now: () => clock.t }) })
  return { ids, state }
}

const at = (state, text) => 1 + state.doc.textContent.indexOf(text)

describe('Ctrl+Z and Ctrl+Y (Parliament\'s own history)', () => {
  it('takes a change back exactly, strike and all, and puts it back', () => {
    const clock = { t: 0 }
    let { ids, state } = setup(clock)
    const original = state.doc
    const from = at(state, 'eleven years')
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, from, from + 12)))
    state = state.applyTransaction(track(state, state.tr.insertText('nearly a century', from, from + 12), { ids })).state
    const edited = state.doc
    expect(show(edited)).toBe('The furnace had not gone out in [-eleven years-]{+nearly a century+}.')
    undo(state, (tr) => { state = state.apply(tr) })
    expect(state.doc.eq(original)).toBe(true)
    expect(state.selection.from).toBe(from)
    expect(state.selection.to).toBe(from + 12)
    redo(state, (tr) => { state = state.apply(tr) })
    expect(state.doc.eq(edited)).toBe(true)
  })

  it('brings back typing done in one go as one step, and a pause starts another', () => {
    const clock = { t: 1000 }
    let { ids, state } = setup(clock)
    const type = (text) => { state = state.applyTransaction(track(state, state.tr.insertText(text), { ids })).state }
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, at(state, 'eleven'))))
    type('n'); clock.t += 100; type('e'); clock.t += 100; type('a'); clock.t += 100; type('r ')
    clock.t += 2000
    type('ly')
    expect(show(state.doc)).toBe('The furnace had not gone out in {+near ly+}eleven years.')
    expect(historyDepth(state).undo).toBe(2)
    undo(state, (tr) => { state = state.apply(tr) })
    expect(show(state.doc)).toBe('The furnace had not gone out in {+near +}eleven years.')
    undo(state, (tr) => { state = state.apply(tr) })
    expect(show(state.doc)).toBe('The furnace had not gone out in eleven years.')
  })

  it('ends what can be redone when a new change is made', () => {
    const clock = { t: 0 }
    let { ids, state } = setup(clock)
    state = state.applyTransaction(track(state, state.tr.insertText('Old ', 1), { ids })).state
    undo(state, (tr) => { state = state.apply(tr) })
    expect(historyDepth(state).redo).toBe(1)
    clock.t += 2000
    state = state.applyTransaction(track(state, state.tr.insertText('New ', 1), { ids })).state
    expect(historyDepth(state).redo).toBe(0)
  })

  it('brings an edit back with Ctrl+Z after its card undid it', () => {
    const clock = { t: 0 }
    let { ids, state } = setup(clock)
    const from = at(state, 'eleven years')
    state = state.applyTransaction(track(state, state.tr.insertText('nearly a century', from, from + 12), { ids })).state
    const edited = state.doc
    clock.t += 2000
    state = state.applyTransaction(undoEdit(state, 240)).state
    expect(show(state.doc)).toBe('The furnace had not gone out in eleven years.')
    undo(state, (tr) => { state = state.apply(tr) })
    expect(state.doc.eq(edited)).toBe(true)
  })

  it('does nothing, harmlessly, with nothing to undo or redo', () => {
    const clock = { t: 0 }
    let { state } = setup(clock)
    const before = state.doc
    expect(undo(state, (tr) => { state = state.apply(tr) })).toBe(true)
    expect(redo(state, (tr) => { state = state.apply(tr) })).toBe(true)
    expect(state.doc.eq(before)).toBe(true)
  })
})

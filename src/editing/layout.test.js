import { describe, it, expect } from 'vitest'
import { EditorState, TextSelection } from 'prosemirror-state'
import { replyFromMarkdown } from './fromMarkdown'
import { toBlocks, fromBlocks, wordsOf } from './blocks'
import { createIds } from './track'
import { shiftLines, alignLines, outdentAtStart, layOf } from './layout'

// Indent and align (C304, ruled 16 November; parliament-indent-align-v1.html).

const ids = createIds(500)
const stateOf = (md) => EditorState.create({ doc: replyFromMarkdown(md, ids.block) })
const all = (state) => state.apply(state.tr.setSelection(TextSelection.create(state.doc, 1, state.doc.content.size - 1)))
const lays = (state) => toBlocks(state.doc).map((b) => [b.indent ?? 0, b.align ?? null])

describe('how a line sits', () => {
  it('moves lines in and out, up to three steps, and no further', () => {
    let state = all(stateOf('One\n\nTwo'))
    for (let k = 0; k < 4; k += 1) state = state.apply(shiftLines(state, 1)?.tr ?? state.tr)
    expect(lays(state)).toEqual([[3, null], [3, null]])
    expect(shiftLines(state, 1)).toBe(null)
    state = state.apply(shiftLines(state, -1).tr)
    expect(lays(state)).toEqual([[2, null], [2, null]])
  })

  it('aligns lines to the centre, the right, and the left again', () => {
    let state = all(stateOf('# Moving plan\n\nAnna'))
    state = state.apply(alignLines(state, 'center').tr)
    expect(lays(state)).toEqual([[0, 'center'], [0, 'center']])
    state = state.apply(alignLines(state, 'right').tr)
    expect(alignLines(state, 'right')).toBe(null)
    state = state.apply(alignLines(state, null).tr)
    expect(lays(state)).toEqual([[0, null], [0, null]])
  })

  it('steps out at the start of a line moved in, before Backspace joins it', () => {
    let state = all(stateOf('One'))
    state = state.apply(shiftLines(state, 1).tr)
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 1)))
    let next = null
    expect(outdentAtStart(state, (tr) => { next = state.apply(tr) })).toBe(true)
    expect(lays(next)).toEqual([[0, null]])
    expect(outdentAtStart(next, () => {})).toBe(false)
  })

  it('is kept on the line, read back checked, and not an edit', () => {
    let state = all(stateOf('- Kitchen\n- Cupboards'))
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, state.doc.content.size - 2)))
    const out = shiftLines(state, 1)
    expect(out.tr.getMeta('editSkip')).toBe(true)
    state = state.apply(out.tr)
    const blocks = toBlocks(state.doc)
    expect(blocks.map((b) => b.indent ?? 0)).toEqual([0, 1])
    const again = fromBlocks(blocks, ids.block)
    expect(toBlocks(again).map((b) => b.indent ?? 0)).toEqual([0, 1])
    expect(layOf({ indent: 4, align: 'justify' })).toEqual({})
    expect(layOf({ indent: 2, align: 'center' })).toEqual({ indent: 2, align: 'center' })
  })

  it('sends a model a sub-item as a list inside a list, and no step or alignment for a plain line', () => {
    const blocks = [
      { id: 'a', type: 'list', kind: 'bullet', text: [{ text: 'Kitchen' }] },
      { id: 'b', type: 'list', kind: 'bullet', text: [{ text: 'Cupboards' }], indent: 1 },
      { id: 'c', type: 'paragraph', text: [{ text: 'Anna' }], align: 'right', indent: 1 },
    ]
    expect(wordsOf(blocks)).toBe('- Kitchen\n\n  - Cupboards\n\nAnna')
  })
})

import { describe, it, expect } from 'vitest'
import { EditorState, TextSelection, NodeSelection } from 'prosemirror-state'
import { replyFromMarkdown } from './fromMarkdown'
import { track, createIds, undoEdit, collectEdits, noteForModel, INTENT } from './track'
import { chartKind, moveCell, commands } from './keys'
import { toBlocks, fromBlocks } from './blocks'
import { chartNow, readNumber } from './charts'
import { schema } from './schema'

// Charts edited inside (stage 11, piece 6; C222 (f), ruled 26 October).

const DATA = JSON.stringify({
  type: 'bar', title: 'Furnaces on Murano',
  labels: ['1840s', '1850s', '1860s'],
  datasets: [{ label: 'Furnaces', values: [18, 14, 21] }],
})
const MD = `Before.\n\n\`\`\`chart\n${DATA}\n\`\`\`\n\nAfter.`

function setup() {
  const ids = createIds(240)
  const doc = replyFromMarkdown(MD, ids.block)
  return { ids, state: EditorState.create({ doc, selection: TextSelection.atStart(doc) }) }
}
const chart = (state) => state.doc.child(1)
const cellAt = (state, text) => {
  let pos = null
  state.doc.descendants((n, p) => {
    if (n.type.name === 'table_cell' && n.textContent === text && pos == null) pos = p + 1
    return pos == null
  })
  return pos
}
const apply = (state, tr, ids) => state.apply(track(state, tr, { ids }))
const caret = (state, pos) => state.apply(state.tr.setSelection(TextSelection.create(state.doc, pos)))
const note = (state) => noteForModel(state.doc, collectEdits(state.doc))

describe('a chart read from a reply', () => {
  it('is its title and its numbers, with what the model gave kept as it was', () => {
    const { state } = setup()
    const c = chart(state)
    expect(c.type).toBe(schema.nodes.chart)
    expect(c.firstChild.textContent).toBe('Furnaces on Murano')
    const rows = []
    c.lastChild.forEach((row) => { const r = []; row.forEach((x) => r.push(x.textContent)); rows.push(r) })
    expect(rows).toEqual([['', 'Furnaces'], ['1840s', '18'], ['1850s', '14'], ['1860s', '21']])
    expect(c.attrs.data).toBe(DATA)
    expect(chartNow(c).data).toEqual(JSON.parse(DATA))
  })
})

describe('its numbers edited', () => {
  it('redraw it from the numbers as they read now, and are told by label and series', () => {
    const { ids, state: s0 } = setup()
    const from = cellAt(s0, '14')
    const state = apply(s0, s0.tr.insertText('16', from, from + 2), ids)
    expect(chartNow(chart(state)).data.datasets[0].values).toEqual([18, 16, 21])
    expect(chart(state).attrs.data).toBe(DATA)
    expect(note(state)).toContain('- In the chart "Furnaces on Murano", row "1850s", column "Furnaces": "14" was struck, and "16" written in its place.')
  })

  it('leave out a row whose value is not a number, and name it', () => {
    const { ids, state: s0 } = setup()
    const from = cellAt(s0, '21')
    const state = apply(s0, s0.tr.insertText('many', from, from + 2), ids)
    const now = chartNow(chart(state))
    expect(now.data.labels).toEqual(['1840s', '1850s'])
    expect(now.left).toEqual(['1860s'])
  })

  it('reads numbers as people write them', () => {
    expect([readNumber('1,200'), readNumber('3,5'), readNumber('-4.25'), readNumber(' 12 '), readNumber('12a'), readNumber('')]).toEqual([1200, 3.5, -4.25, 12, null, null])
  })
})

describe('its kind and title', () => {
  it('a kind chosen is an edit, told, and undone; back to the model\'s it is none', () => {
    const { ids, state: s0 } = setup()
    let state = caret(s0, cellAt(s0, '18'))
    state = state.apply(chartKind(state, 'line', ids))
    expect(chart(state).attrs.kind).toBe('line')
    expect(chartNow(chart(state)).data.type).toBe('line')
    expect(note(state)).toContain('- In the chart "Furnaces on Murano": its kind was changed from bar to line.')
    const [e] = collectEdits(state.doc)
    const undone = state.apply(undoEdit(state, e.id))
    expect(undone.doc.eq(s0.doc)).toBe(true)
    state = state.apply(chartKind(state, 'bar', ids))
    expect(chart(state).attrs.kindEdit).toBeNull()
    expect(collectEdits(state.doc)).toHaveLength(0)
  })

  it('the title is a line: edited, told, and Enter in it goes to the numbers', () => {
    const { ids, state: s0 } = setup()
    const titleStart = s0.doc.child(0).nodeSize + 2
    let state = apply(s0, s0.tr.insertText('Glass f', titleStart, titleStart + 1), ids)
    expect(note(state)).toContain('- In the chart "Furnaces on Murano", its title: "Furnaces" was struck, and "Glass furnaces" written in its place.')
    state = caret(state, titleStart)
    commands.enter(ids)(state, (tr) => { state = apply(state, tr, ids) }, { get state() { return state } })
    expect(state.selection.$from.parent.type).toBe(schema.nodes.table_cell)
  })
})

describe('the chart as a whole', () => {
  it('is struck whole when selected, its earlier edits kept', () => {
    const { ids, state: s0 } = setup()
    const from = cellAt(s0, '14')
    let state = apply(s0, s0.tr.insertText('16', from, from + 2), ids)
    state = state.apply(state.tr.setSelection(NodeSelection.create(state.doc, state.doc.child(0).nodeSize)))
    state = apply(state, state.tr.deleteSelection().setMeta(INTENT, 'range'), ids)
    expect(chart(state).attrs.struck).not.toBeNull()
    expect(collectEdits(state.doc)).toHaveLength(2)
  })

  it('past its last row, Enter goes to the line after the chart', () => {
    const { ids, state: s0 } = setup()
    let state = caret(s0, cellAt(s0, '21'))
    moveCell(state, (tr) => { state = state.apply(tr) }, 'down', ids)
    expect(state.selection.$from.parent.textContent).toBe('After.')
  })

  it('comes back the same from its stored form; one stored before reads from what the model gave', () => {
    const { ids, state: s0 } = setup()
    const from = cellAt(s0, '14')
    let state = apply(s0, s0.tr.insertText('16', from, from + 2), ids)
    state = caret(state, cellAt(state, '18'))
    state = state.apply(chartKind(state, 'pie', ids))
    const blocks = JSON.parse(JSON.stringify(toBlocks(state.doc)))
    expect(blocks[1]).toMatchObject({ type: 'chart', data: DATA, kind: 'pie' })
    expect(fromBlocks(blocks, ids.block).eq(state.doc)).toBe(true)
    const old = fromBlocks([{ id: 'c1', type: 'chart', data: DATA }], ids.block)
    expect(old.child(0).firstChild.textContent).toBe('Furnaces on Murano')
    expect(chartNow(old.child(0)).data).toEqual(JSON.parse(DATA))
  })
})

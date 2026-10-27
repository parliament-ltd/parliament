import { describe, it, expect } from 'vitest'
import { EditorState, TextSelection } from 'prosemirror-state'
import { replyFromMarkdown } from './fromMarkdown'
import { track, createIds, cursorMarks, undoEdit, collectEdits, noteForModel, INTENT } from './track'
import { tableOp, moveCell, commands } from './keys'
import { toBlocks, fromBlocks, wordsOf } from './blocks'
import { editsIn } from './edits'
import { placeAnswer } from './answers'
import { schema } from './schema'

// Tables edited inside (stage 11, piece 6; C222, ruled 26 October).

const MD = 'Prices in 2025.\n\n| City | Price | Notes |\n| --- | --- | --- |\n| Oslo | **12** | cheap |\n| Turku | 9 | near |\n\nAfter.'

function setup() {
  const ids = createIds(240)
  const doc = replyFromMarkdown(MD, ids.block)
  return { ids, state: EditorState.create({ doc, selection: TextSelection.atStart(doc) }) }
}
// Where a cell's words start, by its text.
function cellAt(state, text) {
  let pos = null
  state.doc.descendants((n, p) => {
    if (n.type.name === 'table_cell' && n.textContent === text && pos == null) pos = p + 1
    return pos == null
  })
  return pos
}
const apply = (state, tr, ids) => state.apply(track(state, tr, { ids }))
const caret = (state, pos) => state.apply(state.tr.setSelection(TextSelection.create(state.doc, pos)))
const table = (state) => state.doc.child(1)
const cells = (state) => { const out = []; table(state).forEach((row) => { const r = []; row.forEach((c) => r.push(c.textContent)); out.push(r) }); return out }
const note = (state) => noteForModel(state.doc, collectEdits(state.doc))

describe('a table read from a reply', () => {
  it('is rows of cells, the model\'s bold kept, the first row the header', () => {
    const { state } = setup()
    expect(cells(state)).toEqual([['City', 'Price', 'Notes'], ['Oslo', '12', 'cheap'], ['Turku', '9', 'near']])
    expect(table(state).child(0).child(0).attrs.header).toBe(true)
    expect(table(state).child(1).child(1).firstChild.marks.map((m) => m.type.name)).toEqual(['bold'])
  })
})

describe('words in a cell', () => {
  it('are struck and typed over like any line, and told by row and column', () => {
    const { ids, state: s0 } = setup()
    const from = cellAt(s0, '12')
    const state = apply(s0, s0.tr.insertText('14', from, from + 2), ids)
    expect(cells(state)[1][1]).toBe('1214')
    expect(note(state)).toContain('- In the table after "Prices in 2025.", row "Oslo", column "Price": "12" was struck, and "14" written in its place.')
    const places = [...editsIn(state.doc).values()][0].places
    expect(places[0]).toMatchObject({ row: 1, col: 1, table: table(state).attrs.id })
  })

  it('a selection across cells strikes the words in each, and leaves the table as it was', () => {
    const { ids, state: s0 } = setup()
    const from = cellAt(s0, 'Oslo')
    const to = cellAt(s0, 'cheap') + 5
    const state = apply(caret(s0, from), s0.tr.delete(from, to).setMeta(INTENT, 'range'), ids)
    expect(cells(state)).toEqual(cells(s0))
    expect(collectEdits(state.doc)).toHaveLength(1)
  })

  it('a selection from a cell into the line after strikes, and keeps the structure', () => {
    const { ids, state: s0 } = setup()
    const from = cellAt(s0, 'near')
    let after = 0
    s0.doc.forEach((b, off, i) => { if (i === 2) after = off + 1 + 3 })
    const state = apply(s0, s0.tr.delete(from, after).setMeta(INTENT, 'range'), ids)
    expect(state.doc.textContent).toBe(s0.doc.textContent)
    expect(state.doc.childCount).toBe(3)
    const edits = collectEdits(state.doc)
    expect(edits).toHaveLength(1)
    expect(edits[0].struck).toContain('near')
    expect(edits[0].struck).toContain('Aft')
  })

  it('Backspace at a cell\'s start joins nothing', () => {
    const { ids, state: s0 } = setup()
    let state = caret(s0, cellAt(s0, 'cheap'))
    commands.backspace(true)(state, (tr) => { state = apply(state, tr, ids) })
    expect(cells(state)).toEqual(cells(s0))
  })
})

describe('rows and columns (C222 (b))', () => {
  it('a row added below is yours: what is typed in it is the same edit, and undo takes it out', () => {
    const { ids, state: s0 } = setup()
    let state = caret(s0, cellAt(s0, 'Turku'))
    state = state.apply(tableOp(state, 'rowBelow', ids))
    expect(cells(state)).toHaveLength(4)
    const marks = cursorMarks(state, ids)
    state = state.apply(state.tr.setStoredMarks(marks))
    state = apply(state, state.tr.insertText('Bergen'), ids)
    const edits = collectEdits(state.doc)
    expect(edits).toHaveLength(1)
    expect(note(state)).toContain('a row was added: "Bergen"')
    state = state.apply(undoEdit(state, edits[0].id))
    expect(cells(state)).toEqual(cells(s0))
  })

  it('a row and a column struck stay in place, are told as removed, and come back on undo', () => {
    const { ids, state: s0 } = setup()
    let state = caret(s0, cellAt(s0, 'Oslo'))
    state = state.apply(tableOp(state, 'strikeRow', ids))
    state = caret(state, cellAt(state, 'Notes'))
    state = state.apply(tableOp(state, 'strikeCol', ids))
    expect(cells(state)).toEqual(cells(s0))
    const told = note(state)
    expect(told).toContain('the row "Oslo" was removed.')
    expect(told).toContain('the column "Notes" was removed.')
    for (const e of collectEdits(state.doc).reverse()) state = state.apply(undoEdit(state, e.id))
    expect(state.doc.eq(s0.doc)).toBe(true)
    expect(wordsOf(toBlocks(s0.doc))).toContain('City | Price | Notes')
  })

  it('a column added after is yours, in every row; struck, it simply goes', () => {
    const { ids, state: s0 } = setup()
    let state = caret(s0, cellAt(s0, 'Price'))
    state = state.apply(tableOp(state, 'colAfter', ids))
    expect(cells(state).map((r) => r.length)).toEqual([4, 4, 4])
    expect(table(state).child(0).child(2).attrs).toMatchObject({ header: true })
    state = state.apply(tableOp(state, 'strikeCol', ids))
    expect(cells(state)).toEqual(cells(s0))
  })
})

describe('the stored form (C222 (d))', () => {
  it('keeps cells with their runs and marks, and reads a table of plain words as before', () => {
    const { ids, state: s0 } = setup()
    const from = cellAt(s0, '12')
    const state = apply(s0, s0.tr.insertText('14', from, from + 2), ids)
    const blocks = JSON.parse(JSON.stringify(toBlocks(state.doc)))
    const back = fromBlocks(blocks, ids.block)
    expect(back.eq(state.doc)).toBe(true)
    const old = fromBlocks([{ id: 't', type: 'table', rows: [['a', 'b'], ['1', '2']] }], ids.block)
    expect(old.child(0).child(0).child(0).attrs.header).toBe(true)
    expect(old.child(0).textContent).toBe('ab12')
    expect(wordsOf(blocks)).toContain('Oslo | 14 | cheap')
  })

  it('places an answer to an ask in a cell', () => {
    const { ids, state } = setup()
    const blocks = toBlocks(state.doc)
    blocks[1].rows[1][2].text = [{ text: 'cheap', ask: 'q1' }]
    const out = placeAnswer(blocks, 'q1', 'not so cheap', 'cheap')
    expect(out[1].rows[1][2].text).toEqual([{ text: 'cheap', ask: 'q1', replaced: 'q1' }, { text: 'not so cheap', answer: 'q1' }])
    expect(fromBlocks(out, ids.block)).not.toBeNull()
  })
})

describe('moving between cells', () => {
  it('Tab goes along the rows, Enter down, and past the last row to the line after', () => {
    const { ids, state: s0 } = setup()
    let state = caret(s0, cellAt(s0, 'Oslo'))
    const go = (dir) => moveCell(state, (tr) => { state = state.apply(tr) }, dir, ids)
    go('next')
    expect(state.selection.$from.parent.textContent).toBe('12')
    go('down')
    expect(state.selection.$from.parent.textContent).toBe('9')
    go('down')
    expect(state.selection.$from.parent.type).toBe(schema.nodes.paragraph)
    expect(state.selection.$from.parent.textContent).toBe('After.')
  })
})

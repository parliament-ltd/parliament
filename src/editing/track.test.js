import { describe, it, expect } from 'vitest'
import { EditorState, TextSelection, NodeSelection } from 'prosemirror-state'
import { Fragment, Slice } from 'prosemirror-model'
import { schema, STRUCK, ADDED } from './schema'
import { replyFromMarkdown } from './fromMarkdown'
import { track, createIds, cursorMarks, undoEdit, collectEdits, noteForModel, INTENT, SKIP } from './track'
import { commands, atLineStart, setBlock, BLOCK_CHOICES, editingPlugins } from './keys'
import { toBlocks } from './blocks'

// The reply as text, with each edit shown: [-struck-#id] and {+added+#id}.
function show(doc) {
  const out = []
  doc.forEach((block) => {
    if (block.isAtom) {
      out.push(`<${block.type.name}${block.attrs.struck ? ` struck #${block.attrs.struck}` : ''}>`)
      return
    }
    let line = ''
    block.forEach((n) => {
      const t = n.isText ? n.text : '\n'
      const s = n.marks.find((m) => m.type === STRUCK)
      const a = n.marks.find((m) => m.type === ADDED)
      line += s ? `[-${t}-#${s.attrs.edit}]` : a ? `{+${t}+#${a.attrs.edit}}` : t
    })
    out.push(line)
  })
  return out.join(' | ')
}

function setup(markdown = 'The furnace had not gone out in eleven years.') {
  const ids = createIds(240)
  const doc = replyFromMarkdown(markdown, ids.block)
  const state = EditorState.create({ doc, selection: TextSelection.atStart(doc) })
  return { ids, state }
}

// Where a piece of text starts in the reply's first block.
const at = (state, text, block = 0) => {
  let pos = 0
  state.doc.forEach((b, offset, index) => {
    if (index === block) pos = offset + 1 + b.textContent.indexOf(text)
  })
  return pos
}

const apply = (state, tr, ids) => state.apply(track(state, tr, { ids }))
const caret = (state, pos) => state.apply(state.tr.setSelection(TextSelection.create(state.doc, pos)))
// What dispatching a command does, through the rules, as the editor would.
function run(state, command, ids) {
  let s = state
  command(s, (tr) => { s = apply(s, tr, ids) }, { get state() { return s } })
  return s
}

describe('the rules of an edit (editing spec, "Editing replies")', () => {
  it('strikes the model\'s words instead of deleting them, and keeps the cursor before them', () => {
    const s0 = setup()
    const { ids } = s0
    let { state } = s0
    const end = at(state, '.')
    state = caret(state, end)
    state = apply(state, state.tr.delete(end - 1, end), ids)
    expect(show(state.doc)).toBe('The furnace had not gone out in eleven year[-s-#240].')
    expect(state.selection.from).toBe(end - 1)
    state = apply(state, state.tr.delete(end - 2, end - 1), ids)
    expect(show(state.doc)).toBe('The furnace had not gone out in eleven yea[-rs-#240].')
  })

  it('makes typing over a selection one edit: struck, then the new words straight after', () => {
    const s0 = setup()
    const { ids } = s0
    let { state } = s0
    const from = at(state, 'eleven years')
    const to = from + 'eleven years'.length
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, from, to)))
    state = apply(state, state.tr.insertText('nearly a century', from, to), ids)
    expect(show(state.doc)).toBe('The furnace had not gone out in [-eleven years-#240]{+nearly a century+#240}.')
    expect(state.selection.from).toBe(to + 'nearly a century'.length)
    expect(ids.peek()).toBe(241)
  })

  it('marks typed words as the person\'s, and lets a correctly marked change land untouched', () => {
    const s0 = setup()
    const { ids } = s0
    let { state } = s0
    state = caret(state, at(state, 'eleven'))
    const marks = cursorMarks(state, ids)
    state = state.apply(state.tr.setStoredMarks(marks))
    const tr = state.tr.insertText('nearly ')
    expect(track(state, tr, { ids })).toBe(tr)
    state = state.apply(tr)
    expect(show(state.doc)).toBe('The furnace had not gone out in {+nearly +#240}eleven years.')
  })

  it('marks typed words even when the cursor carried no marks', () => {
    const s0 = setup()
    const { ids } = s0
    let { state } = s0
    state = apply(state, state.tr.insertText('Old ', 1), ids)
    expect(show(state.doc)).toBe('{+Old +#240}The furnace had not gone out in eleven years.')
  })

  it('removes the person\'s own words when they are deleted', () => {
    const s0 = setup()
    const { ids } = s0
    let { state } = s0
    state = apply(state, state.tr.insertText('Old ', 1), ids)
    state = apply(state, state.tr.delete(1, 5), ids)
    expect(show(state.doc)).toBe('The furnace had not gone out in eleven years.')
  })

  it('keeps a word composed with an input method as one edit while it changes', () => {
    const s0 = setup()
    const { ids } = s0
    let { state } = s0
    const p = at(state, 'eleven')
    state = apply(state, state.tr.insertText('か', p), ids)
    const tr = state.tr.insertText('漢字', p, p + 1)
    expect(track(state, tr, { ids })).toBe(tr)
    state = state.apply(tr)
    expect(show(state.doc)).toBe('The furnace had not gone out in {+漢字+#240}eleven years.')
  })

  it('widens a word swapped in one go to the whole word, as the person meant it', () => {
    const s0 = setup('A short story.')
    const { ids } = s0
    let { state } = s0
    // The browser replaced "short" with "ghost"; ProseMirror sees "shor" to "ghos".
    const from = at(state, 'short')
    state = apply(state, state.tr.insertText('ghos', from, from + 4), ids)
    expect(show(state.doc)).toBe('A [-short-#240]{+ghost+#240} story.')
    expect(state.selection.from).toBe(from + 'short'.length + 'ghost'.length)
  })

  it('leaves a swap in Japanese as it came, with no spaces to widen to', () => {
    const s0 = setup('炉の火は消えた。')
    const { ids } = s0
    let { state } = s0
    const from = at(state, 'の')
    state = apply(state, state.tr.insertText('が', from, from + 1), ids)
    expect(show(state.doc)).toBe('炉[-の-#240]{+が+#240}火は消えた。')
  })

  it('strikes a selection before an input method writes, leaving the cursor after the strike', () => {
    const s0 = setup()
    const { ids } = s0
    let { state } = s0
    const from = at(state, 'eleven years')
    const to = from + 'eleven years'.length
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, from, to)))
    state = apply(state, state.tr.delete(from, to).setMeta(INTENT, 'range-end'), ids)
    expect(state.selection.from).toBe(to)
    const marks = cursorMarks(state, ids)
    state = state.apply(state.tr.setStoredMarks(marks))
    const tr = state.tr.insertText('百年')
    expect(track(state, tr, { ids })).toBe(tr)
    expect(show(state.apply(tr).doc)).toBe('The furnace had not gone out in [-eleven years-#240]{+百年+#240}.')
  })

  it('strikes across two blocks and keeps both', () => {
    const s0 = setup('First line here.\n\nSecond line here.')
    const { ids } = s0
    let { state } = s0
    const from = at(state, 'here.')
    const to = at(state, 'line', 1)
    state = apply(state, state.tr.delete(from, to).setMeta(INTENT, 'range'), ids)
    expect(show(state.doc)).toBe('First line [-here.-#240] | [-Second -#240]line here.')
  })

  it('types over a selection across two blocks as the browser reports it, leaving the rest of the line alone', () => {
    // Chrome joins the blocks itself and reports the change as everything to
    // the end of the joined line (found on the spike, 26 October).
    const s0 = setup('First line here.\n\nSecond line here.')
    const { ids } = s0
    let { state } = s0
    const from = at(state, 'here.')
    const to = at(state, 'line', 1)
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, from, to)))
    const joined = schema.nodes.paragraph.create({ id: state.doc.child(0).attrs.id }, schema.text('xline here.'))
    const tr = state.tr.replace(from, state.doc.content.size, new Slice(Fragment.from(joined), 1, 0))
    state = apply(state, tr, ids)
    expect(show(state.doc)).toBe('First line [-here.-#240] | [-Second -#240]{+x+#240}line here.')
    expect(state.selection.from).toBe(at(state, 'line here.', 1))
  })

  it('keeps a typed letter that matches the one after the selection as the person\'s', () => {
    const s0 = setup('First line here.\n\nSecond line here.')
    const { ids } = s0
    let { state } = s0
    const from = at(state, 'here.')
    const to = at(state, 'ine', 1)
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, from, to)))
    const joined = schema.nodes.paragraph.create({ id: state.doc.child(0).attrs.id }, schema.text('line here.'))
    state = apply(state, state.tr.replace(from, state.doc.content.size, new Slice(Fragment.from(joined), 1, 0)), ids)
    expect(show(state.doc)).toBe('First line [-here.-#240] | [-Second l-#240]{+l+#240}ine here.')
  })

  it('passes a split and a join through as formatting, not an edit', () => {
    const s0 = setup()
    const { ids } = s0
    let { state } = s0
    const tr = state.tr.split(at(state, 'eleven'))
    expect(track(state, tr, { ids })).toBe(tr)
    state = state.apply(tr)
    const join = state.tr.join(state.doc.child(0).nodeSize)
    expect(track(state, join, { ids })).toBe(join)
    expect(ids.peek()).toBe(240)
  })

  it('strikes a table as a whole block', () => {
    const md = 'Before.\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n\nAfter.'
    const s0 = setup(md)
    const { ids } = s0
    let { state } = s0
    const pos = state.doc.child(0).nodeSize
    state = state.apply(state.tr.setSelection(NodeSelection.create(state.doc, pos)))
    state = apply(state, state.tr.deleteSelection().setMeta(INTENT, 'range'), ids)
    expect(show(state.doc)).toBe('Before. | <table struck #240> | After.')
    expect(state.doc.child(1).attrs.rows).toEqual([['a', 'b'], ['1', '2']])
  })

  it('undoes an edit from its card, bringing the words back exactly', () => {
    const s0 = setup()
    const { ids } = s0
    let { state } = s0
    const original = state.doc
    const from = at(state, 'eleven years')
    state = apply(state, state.tr.insertText('nearly a century', from, from + 12), ids)
    state = state.apply(undoEdit(state, 240))
    expect(state.doc.eq(original)).toBe(true)
  })

  it('keeps one edit across a split, with a place in each block', () => {
    const s0 = setup()
    const { ids } = s0
    let { state } = s0
    const from = at(state, 'eleven years')
    state = apply(state, state.tr.insertText('nearly a century', from, from + 12), ids)
    state = state.apply(state.tr.split(from + 12 + 'nearly'.length, 1, [{ type: schema.nodes.paragraph, attrs: { id: ids.block() } }]).setMeta(SKIP, true))
    const edits = collectEdits(state.doc)
    expect(edits).toHaveLength(1)
    expect(edits[0]).toMatchObject({ id: 240, struck: 'eleven years', added: 'nearly a century' })
    expect(edits[0].parts.map((p) => p.index)).toEqual([0, 1])
  })

  it('tells the model each change once, as text only', () => {
    const s0 = setup('The furnace had **not gone out** in eleven years.')
    const { ids } = s0
    let { state } = s0
    const from = at(state, 'eleven years')
    state = apply(state, state.tr.insertText('nearly a century', from, from + 12), ids)
    const note = noteForModel(state.doc, collectEdits(state.doc), { what: 'your reply in 201a' })
    expect(note).toBe('The person edited your reply in 201a. Each change, told once:\n- In paragraph 1: "eleven years" was struck, and "nearly a century" written in its place.')
  })
})

describe('the keys (editing spec: Enter, Backspace, Delete)', () => {
  it('strikes past struck words with Backspace, as one edit', () => {
    const s0 = setup()
    const { ids } = s0
    let { state } = s0
    const end = at(state, '.')
    state = caret(state, end)
    state = run(state, commands.backspace(true), ids)
    state = run(state, commands.backspace(true), ids)
    expect(show(state.doc)).toBe('The furnace had not gone out in eleven yea[-rs-#240].')
    // From after the struck words, Backspace reaches past them.
    state = caret(state, end)
    state = run(state, commands.backspace(true), ids)
    expect(show(state.doc)).toBe('The furnace had not gone out in eleven ye[-ars-#240].')
  })

  it('removes a whole character, not half of one', () => {
    const s0 = setup('炉の火は消えた👍🏽')
    const { ids } = s0
    let { state } = s0
    state = caret(state, state.doc.child(0).nodeSize - 1)
    state = run(state, commands.backspace(true), ids)
    expect(show(state.doc)).toBe('炉の火は消えた[-👍🏽-#240]')
  })

  it('turns a formatted line plain with Backspace at its start, then joins it upward', () => {
    const s0 = setup('One.\n\n## Two')
    const { ids } = s0
    let { state } = s0
    state = caret(state, state.doc.child(0).nodeSize + 1)
    state = run(state, commands.backspace(true), ids)
    expect(state.doc.child(1).type.name).toBe('paragraph')
    state = run(state, commands.backspace(true), ids)
    expect(show(state.doc)).toBe('One.Two')
    expect(ids.peek()).toBe(240)
  })

  it('starts a new block with Enter, and leaves a list from an empty item', () => {
    const s0 = setup('- one')
    const { ids } = s0
    let { state } = s0
    state = caret(state, state.doc.child(0).nodeSize - 1)
    state = run(state, commands.enter(ids), ids)
    expect(state.doc.childCount).toBe(2)
    expect(state.doc.child(1).attrs.kind).toBe('bullet')
    state = run(state, commands.enter(ids), ids)
    expect(state.doc.child(1).type.name).toBe('paragraph')
  })
})

describe('block ids', () => {
  it('gives a line the browser split itself an id of its own', async () => {
    const { editingPlugins } = await import('./keys')
    const ids = createIds(240)
    const doc = replyFromMarkdown('One line here.', ids.block)
    let state = EditorState.create({ doc, plugins: editingPlugins({ ids }) })
    // A phone keyboard's Enter can arrive as a plain split, which copies the id.
    state = state.applyTransaction(state.tr.split(5)).state
    const blockIds = []
    state.doc.forEach((b) => blockIds.push(b.attrs.id))
    expect(blockIds).toHaveLength(2)
    expect(new Set(blockIds).size).toBe(2)
  })
})

describe('the reply read from Markdown', () => {
  it('keeps the model\'s formatting as marks and tables and charts as whole blocks', () => {
    const md = '# Title\n\nSome **bold** and [a link](https://example.org) and [a bad one](javascript:alert(1)).\n\n```chart\n{"title":"T","data":[{"label":"a","value":2}]}\n```\n\n- [x] done'
    const { state } = setup(md)
    expect(state.doc.child(0).type.name).toBe('heading')
    const para = state.doc.child(1)
    const linked = []
    para.forEach((n) => { for (const m of n.marks) if (m.type === schema.marks.link) linked.push(m.attrs.href) })
    // Kept as written, as every reply drawn as Markdown keeps it (safeUrl.js).
    expect(linked).toEqual(['https://example.org'])
    expect(state.doc.child(2).type.name).toBe('chart')
    expect(JSON.parse(state.doc.child(2).attrs.data).title).toBe('T')
    expect(state.doc.child(3).attrs).toMatchObject({ kind: 'check', checked: true })
  })
})

describe('where / opens the block menu (Stefan\'s try of piece 1)', () => {
  it('at a line\'s start, and after nothing but struck words, never after live ones', () => {
    const s0 = setup('First line here.\n\nThat winter a stranger came.')
    const { ids } = s0
    let { state } = s0
    const start = at(state, 'That', 1)
    expect(atLineStart(caret(state, start))).toBe(true)
    expect(atLineStart(caret(state, start + 4))).toBe(false)
    // "That winter" struck: the cursor after it is still at the line's start.
    state = apply(state, state.tr.delete(start, start + 'That winter'.length).setMeta(INTENT, 'range'), ids)
    expect(atLineStart(caret(state, start + 'That winter'.length))).toBe(true)
    expect(atLineStart(caret(state, start + 'That winter a'.length))).toBe(false)
  })
})

describe('/ over selected words (Stefan\'s try of piece 1)', () => {
  const heading = BLOCK_CHOICES.find((c) => c.key === 'h2')
  const kinds = (doc) => { const out = []; doc.forEach((b) => out.push(`${b.type.name}:${b.textContent}`)); return out }

  it('makes a word mid-sentence a line of its own of that kind, as layout', () => {
    const s0 = setup('The furnace had not gone out in eleven years.')
    const { ids } = s0
    let { state } = s0
    const from = at(state, 'eleven')
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, from, from + 'eleven'.length)))
    const tr = setBlock(state, heading, ids)
    expect(track(state, tr, { ids })).toBe(tr)
    state = state.apply(tr)
    expect(kinds(state.doc)).toEqual(['paragraph:The furnace had not gone out in ', 'heading:eleven', 'paragraph: years.'])
    expect(state.doc.child(1).attrs.level).toBe(2)
    expect(new Set([state.doc.child(0), state.doc.child(1), state.doc.child(2)].map((b) => b.attrs.id)).size).toBe(3)
    expect(collectEdits(state.doc)).toEqual([])
  })

  it('turns each line a selection touches', () => {
    const s0 = setup('One line.\n\nAnother line.\n\nA third.')
    const { ids } = s0
    let { state } = s0
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, at(state, 'line'), at(state, 'line', 1))))
    state = state.apply(setBlock(state, heading, ids))
    expect(kinds(state.doc)).toEqual(['heading:One line.', 'heading:Another line.', 'paragraph:A third.'])
  })
})

describe('a line opened in the space between two blocks', () => {
  const withPlugins = (md) => {
    const ids = createIds(240)
    const doc = replyFromMarkdown(md, ids.block)
    return { ids, state: EditorState.create({ doc, plugins: editingPlugins({ ids, blocks: true }) }) }
  }
  const open = (state, ids, at) => {
    const tr = state.tr.insert(at, schema.nodes.paragraph.create({ id: ids.block(), gap: true })).setMeta(SKIP, true)
    return state.apply(tr.setSelection(TextSelection.create(tr.doc, at + 1)))
  }

  it('is never stored while empty, and goes once the cursor leaves it', () => {
    let { state, ids } = withPlugins('First.\n\nSecond.')
    const between = state.doc.child(0).nodeSize
    state = open(state, ids, between)
    expect(state.doc.childCount).toBe(3)
    expect(toBlocks(state.doc)).toHaveLength(2)
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 2)))
    expect(state.doc.childCount).toBe(2)
  })

  it('becomes an ordinary line once something is typed in it', () => {
    let { state, ids } = withPlugins('First.\n\nSecond.')
    state = open(state, ids, state.doc.child(0).nodeSize)
    state = state.apply(track(state, state.tr.insertText('New'), { ids }))
    expect(state.doc.child(1).attrs.gap).toBe(false)
    expect(show(state.doc)).toBe('First. | {+New+#240} | Second.')
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 2)))
    expect(state.doc.childCount).toBe(3)
  })
})

// The keys and events a reply handles itself (stage 11, piece 1; C205)
// (editing spec, "Editing replies" and "Blocks and the / menu").
//
//   Enter          a new block; the text after the cursor moves into it.
//                  Enter on an empty list item leaves the list.
//   Backspace      at a line's start: a formatted block becomes plain text, a
//                  plain one joins the line above. Elsewhere: the character
//                  before, struck past any struck words (or removed, if it is
//                  the person's own).
//   Delete         the same, forwards.
//   Mod-Shift-x    strikethrough: the selection, struck.
//   Mod-z          Parliament's own undo: the last change, taken back
//                  exactly, strikes and all (C209 (c), ruled 25 October).
//                  The browser's own undo stays off: it does not know struck
//                  words. Each card still undoes its whole edit.
//   Mod-y, Mod-Shift-z  redo.
//   Mod-b, -i, -u  nothing: formatting from the model is shown, not applied.
//   paste          plain text only; over a selection it strikes the selection.
//   drop, drag     off (C210 (i)): moving words would be a strike and an
//                  addition at once.

import { keymap } from 'prosemirror-keymap'
import { Plugin, NodeSelection, TextSelection } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { Slice, Fragment } from 'prosemirror-model'
import { schema, STRUCK, ADDED, SUGGEST_OUT, SUGGEST_IN, isWholeBlock } from './schema'
import { SKIP, INTENT } from './track'
import { historyPlugin, undo, redo } from './history'

// A block taken whole: a chart or divider, or a table selected as one (C222).
const isBlockAtom = (sel) => sel instanceof NodeSelection && sel.node.isBlock && isWholeBlock(sel.node)

// Over a selection, an input method's word is to replace it: the selection is
// struck first, with the cursor after the strike, so the composition starts
// there and nothing is rewritten under it while it is composed (C208, found
// on Stefan's try: struck at compositionstart, the cursor jumped back).
function strikeBeforeComposing(view) {
  const sel = view.state.selection
  if (sel.empty || !(sel instanceof TextSelection)) return
  view.dispatch(view.state.tr.delete(sel.from, sel.to).setMeta(INTENT, 'range-end'))
}

const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null

// The length of the character before or after an offset in a string, as a
// reader counts it (a Japanese character, an emoji, an accented letter).
function charLength(text, offset, backwards) {
  if (segmenter) {
    let last = null
    for (const s of segmenter.segment(text)) {
      if (backwards && s.index < offset && s.index + s.segment.length >= offset) last = s
      if (!backwards && s.index >= offset) return s.segment.length
    }
    if (last) return offset - last.index
  }
  const code = text.charCodeAt(backwards ? offset - 1 : offset)
  return code >= 0xd800 && code <= 0xdfff ? 2 : 1
}

const isStruck = (node) => node?.marks.some((m) => m.type === STRUCK)

// From the cursor, the next character that is not struck, within the line.
// Returns its range, or { edge } when only struck words (or nothing) lie
// between the cursor and the line's edge; edge is where the cursor goes.
function nextLive(state, backwards) {
  const { $from } = state.selection
  const parent = $from.parent
  const start = $from.start()
  const pieces = []
  parent.forEach((node, at) => pieces.push({ node, from: at, to: at + node.nodeSize }))
  let off = $from.parentOffset
  for (;;) {
    const piece = backwards ? pieces.find((x) => x.from < off && off <= x.to) : pieces.find((x) => x.from <= off && off < x.to)
    if (!piece) return { edge: start + off }
    if (isStruck(piece.node)) {
      off = backwards ? piece.from : piece.to
      continue
    }
    const len = piece.node.isText ? charLength(piece.node.text, off - piece.from, backwards) : 1
    return backwards ? { from: start + off - len, to: start + off } : { from: start + off, to: start + off + len }
  }
}

/**
 * Whether the cursor is at its line's start as a reader sees it: nothing but
 * struck words, or nothing, before it in the line. Where "/" opens the block
 * menu (Stefan's try of piece 1, 26 October).
 */
export function atLineStart(state, pos = null) {
  // Where the text goes in, when given: the page can move the caret (Home)
  // a moment before the editor hears of it.
  if (pos != null && pos !== state.selection.from) {
    if (!state.doc.resolve(pos).parent.inlineContent) return false
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, pos)))
  }
  const sel = state.selection
  if (!sel.empty || !sel.$from.parent.inlineContent) return false
  return nextLive(state, true).edge != null
}

// A prompt and its reply drawn by one editor are two sections (piece 2;
// C214). The gap between them is crossed only by joining.
const isSection = (node) => node?.type === schema.nodes.section

// Where a line sits: its container (the document, or a section), its index
// there, and the depth of that container.
function placeOf($pos) {
  const depth = $pos.depth - 1
  return { depth, container: $pos.node(depth), index: $pos.index(depth) }
}

// Whether a position at a container's edge faces the next or previous section.
function facesSection(state, $pos, depth, forward) {
  if (depth < 1) return false
  const $edge = state.doc.resolve(forward ? $pos.after(depth) : $pos.before(depth))
  return isSection(forward ? $edge.nodeAfter : $edge.nodeBefore)
}

function backspace(blocks, onJoin) {
  const blk = typeof blocks === 'function' ? blocks : () => blocks
  return (state, dispatch) => {
    const sel = state.selection
    if (sel instanceof NodeSelection) {
      dispatch(state.tr.delete(sel.from, sel.to).setMeta(INTENT, 'range'))
      return true
    }
    if (!sel.empty) {
      dispatch(state.tr.delete(sel.from, sel.to).setMeta(INTENT, 'range'))
      return true
    }
    const $pos = sel.$from
    const live = nextLive(state, true)
    if (live.edge != null) {
      // Only struck words, or nothing, before the cursor in this line.
      if (live.edge !== $pos.pos) {
        dispatch(state.tr.setSelection(TextSelection.create(state.doc, live.edge)))
        return true
      }
      // A cell never joins the one before it, nor a chart's title (C222).
      if ($pos.parent.type === schema.nodes.table_cell || $pos.parent.type === schema.nodes.chart_title) return true
      const { depth, container, index } = placeOf($pos)
      // At a reply's start, under its prompt: the gap between them (C214 (a)).
      const atGap = index === 0 && isSection(container) && facesSection(state, $pos, depth, false)
      if (!blk(state)) {
        if (atGap) onJoin?.()
        return true
      }
      const block = $pos.parent
      if (block.type !== schema.nodes.paragraph) {
        dispatch(state.tr.setBlockType($pos.before(), $pos.after(), schema.nodes.paragraph, { id: block.attrs.id }).setMeta(SKIP, true))
        return true
      }
      if (index === 0) {
        if (atGap) onJoin?.()
        return true
      }
      const prev = container.child(index - 1)
      if (prev.isTextblock) {
        dispatch(state.tr.join($pos.before()).setMeta(SKIP, true))
        return true
      }
      dispatch(state.tr.setSelection(NodeSelection.create(state.doc, $pos.before() - prev.nodeSize)))
      return true
    }
    dispatch(state.tr.delete(live.from, live.to).setMeta(INTENT, 'backspace'))
    return true
  }
}

function del(onJoin) {
  return (state, dispatch) => {
    const sel = state.selection
    if (!sel.empty || sel instanceof NodeSelection) {
      dispatch(state.tr.delete(sel.from, sel.to).setMeta(INTENT, 'range'))
      return true
    }
    const live = nextLive(state, false)
    if (live.edge != null) {
      if (live.edge !== sel.from) {
        dispatch(state.tr.setSelection(TextSelection.create(state.doc, live.edge)))
        return true
      }
      // At a prompt's end, over its reply: the gap between them (C214 (a)).
      const { depth, container, index } = placeOf(sel.$from)
      if (index === container.childCount - 1 && isSection(container) && facesSection(state, sel.$from, depth, true)) onJoin?.()
      return true
    }
    dispatch(state.tr.delete(live.from, live.to).setMeta(INTENT, 'delete'))
    return true
  }
}

function enter(ids) {
  return (state, dispatch, view) => {
    if (isBlockAtom(state.selection)) {
      // A new line after a table, chart or divider: formatting, not an edit.
      const at = state.selection.to
      const tr = state.tr.insert(at, schema.nodes.paragraph.create({ id: ids.block() })).setMeta(SKIP, true)
      dispatch(tr.setSelection(TextSelection.create(tr.doc, at + 1)).scrollIntoView())
      return true
    }
    if (state.selection instanceof NodeSelection) return true
    // In a table, Enter goes to the cell below (C222 (a)); in a chart's
    // title, to its numbers (C222 (f)).
    if (cellDepth(state.selection.$from) != null) return moveCell(state, dispatch, 'down', ids)
    if (state.selection.$from.parent.type === schema.nodes.chart_title) {
      const $t = state.selection.$from
      const chart = $t.node($t.depth - 1)
      const tablePos = $t.before($t.depth - 1) + 1 + chart.firstChild.nodeSize
      const at = cellStart(chart.lastChild, tablePos, 0, 0)
      dispatch(state.tr.setSelection(TextSelection.create(state.doc, at + chart.lastChild.child(0).child(0).content.size)).scrollIntoView())
      return true
    }
    if (!state.selection.empty) {
      // Striking the selection first, then the new block after it.
      dispatch(state.tr.delete(state.selection.from, state.selection.to).setMeta(INTENT, 'range'))
      state = view.state
      const $end = state.doc.resolve(state.selection.to)
      dispatch(state.tr.setSelection(TextSelection.create(state.doc, $end.pos)))
      state = view.state
    }
    const { $from } = state.selection
    const block = $from.parent
    if (block.type === schema.nodes.code_block) {
      dispatch(state.tr.insertText('\n'))
      return true
    }
    if (block.type === schema.nodes.list_item && block.content.size === 0) {
      dispatch(state.tr.setBlockType($from.before(), $from.after(), schema.nodes.paragraph, { id: block.attrs.id }).setMeta(SKIP, true))
      return true
    }
    const atEnd = $from.parentOffset === block.content.size
    const type = block.type === schema.nodes.list_item ? block.type : atEnd ? schema.nodes.paragraph : block.type
    const attrs = type === schema.nodes.list_item ? { id: ids.block(), kind: block.attrs.kind, checked: false }
      : type === schema.nodes.heading ? { id: ids.block(), level: block.attrs.level } : { id: ids.block() }
    dispatch(state.tr.split($from.pos, 1, [{ type, attrs }]).setMeta(SKIP, true).scrollIntoView())
    return true
  }
}

/**
 * The plugins for an editable reply (blocks: true) or prompt (blocks: false);
 * blocks may also be a function of the state, true where the cursor is in a
 * reply (one editor for a prompt and its reply, piece 2). onJoin: called
 * when the gap between a prompt and its reply is crossed (C214).
 * @param {{ ids: object, blocks?: boolean, onSlash?: (view: object) => boolean, onNote?: (text: string) => void, menuKey?: (event: KeyboardEvent) => boolean, menuText?: (text: string) => boolean, log?: (line: string) => void, now?: () => number }} opts
 */
export function editingPlugins({ ids, blocks = true, onSlash, onNote, onJoin, onAsk, menuKey, menuText, log, now }) {
  const blk = typeof blocks === 'function' ? blocks : () => blocks
  const whenBlocks = (command) => (state, dispatch, view) => (blk(state) ? command(state, dispatch, view) : true)
  const wholeBlock = (node) => onNote?.(node.type === schema.nodes.table
    ? 'The whole table is selected: Backspace strikes it whole. Click into a cell to change its words.'
    : node.type === schema.nodes.chart
      ? 'The whole chart is selected: Backspace strikes it whole. Click into its title or numbers to change them.'
      : `A ${node.type.name} is one block for now: Backspace strikes it whole, and editing inside it comes later.`)
  const nothing = () => true
  const strike = (state, dispatch) => {
    const tr = strikeSelection(state)
    if (tr) dispatch(tr)
    return true
  }
  const keys = keymap({
    Enter: whenBlocks(enter(ids)),
    'Shift-Enter': whenBlocks(enter(ids)),
    Backspace: backspace(blk, onJoin),
    Delete: del(onJoin),
    'Mod-z': undo,
    'Mod-y': redo,
    'Shift-Mod-z': redo,
    'Mod-b': nothing,
    'Mod-i': nothing,
    'Mod-u': nothing,
    'Shift-Mod-x': strike,
    // Between a table's cells (C222 (a)); outside a table, Tab leaves the reply as usual.
    Tab: (state, dispatch) => moveCell(state, dispatch, 'next'),
    'Shift-Tab': (state, dispatch) => moveCell(state, dispatch, 'prev'),
    // An ask (piece 4; C218 (a)): Ctrl+K stays the bar's. In a reply only:
    // asks are for replies, the spec says, and a prompt says so.
    'Shift-Mod-k': (state, dispatch, view) => {
      if (!onAsk) return false
      if (!blk(state)) {
        onNote?.('Asks are for replies. In your prompt, strike or type over it.')
        return true
      }
      return onAsk(view)
    },
  })

  const events = new Plugin({
    props: {
      handleKeyDown(view, event) {
        log?.(`keydown ${event.key}${event.isComposing ? ' (composing)' : ''}`)
        // An input method's first key comes as 229 ("Process"), before it
        // starts composing: the moment to strike a selection it will replace.
        if ((event.keyCode === 229 || event.key === 'Process') && !view.composing) strikeBeforeComposing(view)
        return menuKey ? menuKey(event) : false
      },
      handleTextInput(view, from, to, text) {
        // While the block menu is open, typed text filters it. Text can come
        // with no key press (an input method, a phone keyboard), so the
        // filter reads text, not keys.
        if (menuText?.(text)) return true
        // Typing on a selected table, chart or divider changes nothing.
        if (isBlockAtom(view.state.selection)) {
          wholeBlock(view.state.selection.node)
          return true
        }
        // "/" with nothing but struck words before it in the line opens the
        // block menu (replies only): a line that starts with struck words
        // still starts there (Stefan's try of piece 1, 26 October).
        if (blk(view.state) && text === '/' && from === to && onSlash && atLineStart(view.state, from)) {
          if (view.state.selection.from !== from) view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, from)))
          return onSlash(view)
        }
        // "/" over selected words opens it too: they become a line of the
        // kind picked (setBlock), and nothing is typed over them.
        if (blk(view.state) && text === '/' && !view.state.selection.empty && view.state.selection instanceof TextSelection && onSlash) return onSlash(view)
        return false
      },
      handleDOMEvents: {
        beforeinput(view, event) {
          log?.(`beforeinput ${event.inputType}${event.data ? ` "${event.data}"` : ''}`)
          // Undo from the browser's menu goes to Parliament's history too.
          if (event.inputType === 'historyUndo' || event.inputType === 'historyRedo') {
            event.preventDefault()
            ;(event.inputType === 'historyUndo' ? undo : redo)(view.state, view.dispatch)
            return true
          }
          if (/^format/.test(event.inputType)) {
            event.preventDefault()
            return true
          }
          return false
        },
        compositionstart(view) {
          log?.('compositionstart')
          // Normally struck already, on the first key (229). This is for a
          // keyboard that sends no such key.
          strikeBeforeComposing(view)
          return false
        },
        compositionend(_view, event) {
          log?.(`compositionend "${event.data ?? ''}"`)
          return false
        },
        paste(view, event) {
          // Plain text only: the page never reads pasted HTML (the stage's
          // security rule), so nothing but words can come in.
          event.preventDefault()
          const text = event.clipboardData?.getData('text/plain') ?? ''
          log?.(`paste ${text.length} characters, as plain text`)
          if (!text) return true
          const { state } = view
          if (isBlockAtom(state.selection)) {
            wholeBlock(state.selection.node)
            return true
          }
          const lines = text.replace(/\r\n?/g, '\n').split('\n')
          const parentType = state.selection.$from.parent.type
          let slice
          if (lines.length === 1 || !blk(state) || parentType === schema.nodes.code_block) {
            const joined = blk(state) && parentType === schema.nodes.code_block ? text : lines.join(' ')
            slice = new Slice(Fragment.from(schema.text(joined)), 0, 0)
          } else {
            const paras = lines.map((l) => schema.nodes.paragraph.create({ id: ids.block() }, l ? schema.text(l) : null))
            slice = new Slice(Fragment.from(paras), 1, 1)
          }
          view.dispatch(state.tr.replaceSelection(slice).setMeta(INTENT, 'range').setMeta('uiEvent', 'paste').scrollIntoView())
          return true
        },
        drop(view, event) {
          event.preventDefault()
          log?.('drop: off')
          return true
        },
        dragstart(view, event) {
          event.preventDefault()
          return true
        },
        mousedown(view, event) {
          // A press inside a selection would start dragging it, which is off;
          // the cursor goes to the press instead, so a new selection starts
          // there (C208, found on Stefan's try: no selection could be made).
          const sel = view.state.selection
          if (event.button === 0 && !event.shiftKey && event.detail === 1 && sel instanceof TextSelection && !sel.empty) {
            const at = view.posAtCoords({ left: event.clientX, top: event.clientY })
            if (at && at.pos > sel.from && at.pos < sel.to) view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, at.pos)))
          }
          // A checklist box ticks in place; ticking is not an edit.
          const box = event.target instanceof Element ? event.target.closest('.pm-box') : null
          if (!box) return false
          event.preventDefault()
          const id = box.closest('[data-block]')?.getAttribute('data-block')
          let at = null
          view.state.doc.forEach((node, offset) => { if (node.attrs.id === id) at = { node, offset } })
          if (at) view.dispatch(view.state.tr.setNodeMarkup(at.offset, null, { ...at.node.attrs, checked: !at.node.attrs.checked }).setMeta(SKIP, true))
          return true
        },
      },
    },
  })
  // Every block keeps an id of its own: a split the browser makes itself (a
  // phone keyboard's Enter) copies the line's id, and anchors need them apart.
  const uniqueIds = new Plugin({
    appendTransaction(trs, _old, state) {
      if (!trs.some((t) => t.docChanged)) return null
      const seen = new Set()
      let tr = null
      for (const { node, pos } of [...linesOf(state.doc), ...cellsOf(state.doc)]) {
        if (node.attrs.id != null && !seen.has(node.attrs.id)) {
          seen.add(node.attrs.id)
          continue
        }
        tr = (tr ?? state.tr.setMeta(SKIP, true)).setNodeMarkup(pos, null, { ...node.attrs, id: ids.block() })
      }
      return tr
    },
  })
  return [events, keys, uniqueIds, ...(blocks ? [gapLines(ids)] : []), historyPlugin(now ? { now } : {})]
}

/** Every table cell of a document, with its position: each keeps an id of its own (C222). */
/**
 * The selection struck, as Ctrl+Shift+X does and strikethrough: in the bar
 * (C225 (c)): a deletion the editing rules turn into a strike. Null when
 * nothing is selected.
 * @param {import('prosemirror-state').EditorState} state
 */
export function strikeSelection(state) {
  if (state.selection.empty) return null
  return state.tr.delete(state.selection.from, state.selection.to).setMeta(INTENT, 'range')
}

/**
 * The ids of the strikes between two positions: struck words, and cells,
 * rows or blocks struck whole. Used to find the edit a strike made, by
 * comparing before and after (strikethrough:, C225 (c)).
 * @returns {Set<string>}
 */
export function struckIdsIn(doc, from, to) {
  const ids = new Set()
  doc.nodesBetween(Math.max(0, from), Math.min(doc.content.size, to), (node) => {
    if (node.attrs?.struck != null) ids.add(String(node.attrs.struck))
    for (const m of node.marks) if (m.type === STRUCK) ids.add(String(m.attrs.edit))
  })
  return ids
}

export function cellsOf(doc) {
  const out = []
  doc.descendants((node, pos) => {
    if (node.type === schema.nodes.table_cell) { out.push({ node, pos }); return false }
    return !node.isTextblock && !node.isAtom
  })
  return out
}

// The depth of the table cell a position is in, or null.
export function cellDepth($pos) {
  for (let d = $pos.depth; d > 0; d--) if ($pos.node(d).type === schema.nodes.table_cell) return d
  return null
}

// Where a cell's words start, by its row and column.
function cellStart(table, tablePos, r, c) {
  let pos = tablePos + 1
  for (let i = 0; i < r; i++) pos += table.child(i).nodeSize
  pos += 1
  const row = table.child(r)
  for (let j = 0; j < c; j++) pos += row.child(j).nodeSize
  return pos + 1
}

/**
 * The cursor to another cell (C222 (a)): 'next' and 'prev' along the rows,
 * 'down' to the cell below. Past the last row, 'down' goes to the line after
 * the table, opened if there is none; Tab past the last cell leaves the
 * table to the browser, so the keyboard is never caught.
 */
export function moveCell(state, dispatch, dir, ids = null) {
  const $from = state.selection.$from
  const d = cellDepth($from)
  if (d == null) return false
  const table = $from.node(d - 2)
  const tablePos = $from.before(d - 2)
  const r = $from.index(d - 2)
  const c = $from.index(d - 1)
  let row = r
  let col = c
  if (dir === 'next') {
    col += 1
    if (col >= table.child(r).childCount) { row += 1; col = 0 }
  } else if (dir === 'prev') {
    col -= 1
    if (col < 0) { row -= 1; col = row >= 0 ? table.child(row).childCount - 1 : 0 }
  } else row += 1
  if (row < 0) return false
  if (row >= table.childCount) {
    if (dir !== 'down') return false
    // Past the last row: the line after the table, or after its chart.
    const inChart = d >= 3 && $from.node(d - 3).type === schema.nodes.chart
    const after = inChart ? $from.after(d - 3) : tablePos + table.nodeSize
    const next = state.doc.resolve(after).nodeAfter
    if (next?.isTextblock) {
      dispatch(state.tr.setSelection(TextSelection.create(state.doc, after + 1)).scrollIntoView())
      return true
    }
    if (!ids) return true
    const tr = state.tr.insert(after, schema.nodes.paragraph.create({ id: ids.block() })).setMeta(SKIP, true)
    dispatch(tr.setSelection(TextSelection.create(tr.doc, after + 1)).scrollIntoView())
    return true
  }
  col = Math.min(col, table.child(row).childCount - 1)
  const start = cellStart(table, tablePos, row, col)
  const end = start + table.child(row).child(col).content.size
  dispatch(state.tr.setSelection(TextSelection.create(state.doc, end)).scrollIntoView())
  return true
}

/** Every block of a document, in a section or not, with its position. */
export function linesOf(doc) {
  const out = []
  doc.forEach((node, offset) => {
    if (isSection(node)) node.forEach((child, at) => out.push({ node: child, pos: offset + 1 + at, container: offset }))
    else out.push({ node, pos: offset, container: null })
  })
  return out
}

// The space between two blocks reads as a blank line. Clicking in it opens
// an empty line there to write in (Stefan's try of piece 1, 26 October). The
// arrow keys only move, as everywhere (Stefan, second try: opening a line
// with them "throws me off"). It is layout, not an edit: once something is
// typed in it, it is an ordinary line; left empty, it goes.
function gapLines(ids) {
  const gap = () => schema.nodes.paragraph.create({ id: ids.block(), gap: true })
  const isGap = (node) => node?.type === schema.nodes.paragraph && node.attrs.gap
  // Open a gap line at a position between two blocks of the same container.
  const openAt = (view, at) => {
    const tr = view.state.tr.insert(at, gap()).setMeta(SKIP, true)
    view.dispatch(tr.setSelection(TextSelection.create(tr.doc, at + 1)).scrollIntoView())
    return true
  }
  return new Plugin({
    props: {
      handleDOMEvents: {
        mousedown(view, event) {
          if (event.button !== 0) return false
          // Only a press on the space itself, not on a line: the editor's
          // own space, or a reply's within its card. Never the gap between
          // a prompt and its reply, which is crossed only by joining.
          const { doc } = view.state
          let container = null
          if (event.target === view.dom) {
            if (doc.firstChild && isSection(doc.firstChild)) return false
            container = { node: doc, start: 0 }
          } else {
            doc.forEach((node, offset) => {
              if (isSection(node) && view.nodeDOM(offset)?.querySelector?.('.pm-section-content') === event.target) container = { node, start: offset + 1 }
            })
            // A prompt takes no new lines, as Enter in it does nothing.
            if (!container || container.node.attrs.part !== 'reply') return false
          }
          const y = event.clientY
          let at = null
          let prevBottom = null
          container.node.forEach((node, offset) => {
            if (at != null) return
            const dom = view.nodeDOM(container.start + offset)
            if (!(dom instanceof Element)) return
            const box = dom.getBoundingClientRect()
            if (prevBottom != null && y > prevBottom && y < box.top) at = container.start + offset
            prevBottom = box.bottom
          })
          if (at == null) return false
          const before = view.state.doc.resolve(at).nodeBefore
          const after = view.state.doc.resolve(at).nodeAfter
          if (isGap(before) || isGap(after)) return false
          event.preventDefault()
          view.focus()
          return openAt(view, at)
        },
      },
    },
    // A gap line written in becomes an ordinary line; an empty one the
    // cursor has left goes.
    appendTransaction(trs, _old, state) {
      if (!trs.some((t) => t.docChanged || t.selectionSet)) return null
      let tr = null
      const here = state.selection.$from
      const gone = []
      const cursorIn = here.parent.isTextblock ? here.before(here.depth) : -1
      for (const { node, pos: offset } of linesOf(state.doc)) {
        if (!isGap(node)) continue
        if (node.content.size > 0) {
          tr = (tr ?? state.tr.setMeta(SKIP, true)).setNodeMarkup(offset, null, { ...node.attrs, gap: false })
        } else if (cursorIn !== offset) {
          gone.push(offset)
        }
      }
      for (const offset of gone.reverse()) {
        tr = tr ?? state.tr.setMeta(SKIP, true)
        tr.delete(tr.mapping.map(offset), tr.mapping.map(offset + 2))
      }
      return tr
    },
  })
}

/**
 * For a screen reader: unseen words at the edges of each mark, "removed:" and
 * "added:", as real text it reads in line (C208: Narrator read struck words
 * as ordinary text). On while isOn() says so. At a line's start or end a
 * label is drawn just outside its mark: inside, a line that starts with
 * struck words starts with the unseen label, the cursor cannot rest before
 * it, and goes to the line above (Stefan's try of piece 1, 26 October).
 */
// What is said at each kind of mark's edges; a suggestion's too (C229).
const SAID = {
  struck: [' removed: ', ' end of removed, '],
  added: [' added: ', ' end of added, '],
  out: [' suggested to remove: ', ' end of suggested removal, '],
  in: [' suggested: ', ' end of suggestion, '],
}
const kindOf = (m) => (m.type === STRUCK ? 'struck' : m.type === ADDED ? 'added' : m.type === SUGGEST_OUT ? 'out' : 'in')
const idOf = (m) => m.attrs.edit ?? m.attrs.suggestion

export function announcePlugin(isOn) {
  const said = (words) => () => {
    const span = document.createElement('span')
    span.className = 'pm-sr'
    span.textContent = words
    return span
  }
  return new Plugin({
    props: {
      decorations(state) {
        if (!isOn()) return null
        const decos = []
        state.doc.descendants((node, pos) => {
          if (!node.isTextblock) return !node.isAtom
          // At a line's edge a label goes outside its mark, so the cursor can
          // rest at the edge; between two marks, each stays inside its own,
          // so they are read in order.
          const lineStart = pos + 1
          const lineEnd = pos + 1 + node.content.size
          let run = null
          const close = () => {
            if (!run) return
            decos.push(Decoration.widget(run.to, said(SAID[run.kind][1]), { side: run.to === lineEnd ? 1 : -1, key: `e${run.kind}${run.to}` }))
            run = null
          }
          node.forEach((child, offset) => {
            const at = pos + 1 + offset
            const m = child.marks.find((x) => x.type === STRUCK || x.type === ADDED || x.type === SUGGEST_OUT || x.type === SUGGEST_IN)
            const key = m ? `${m.type.name}${idOf(m)}` : null
            if (run && run.key !== key) close()
            if (m && !run) {
              run = { key, kind: kindOf(m), to: at }
              decos.push(Decoration.widget(at, said(SAID[run.kind][0]), { side: at === lineStart ? -1 : 1, key: `s${run.kind}${at}` }))
            }
            if (run) run.to = at + child.nodeSize
          })
          close()
          return false
        })
        return DecorationSet.create(state.doc, decos)
      },
    },
  })
}

/** The commands, for tests. */
export const commands = { backspace, del, enter }

/** The block menu's choices (editing spec: the / menu). */
export const BLOCK_CHOICES = [
  { key: 'text', label: 'Text', type: 'paragraph' },
  { key: 'h1', label: 'Heading 1', type: 'heading', attrs: { level: 1 } },
  { key: 'h2', label: 'Heading 2', type: 'heading', attrs: { level: 2 } },
  { key: 'h3', label: 'Heading 3', type: 'heading', attrs: { level: 3 } },
  { key: 'bullet', label: 'Bulleted list', type: 'list_item', attrs: { kind: 'bullet' } },
  { key: 'number', label: 'Numbered list', type: 'list_item', attrs: { kind: 'number' } },
  { key: 'check', label: 'Checklist', type: 'list_item', attrs: { kind: 'check', checked: false } },
  { key: 'quote', label: 'Quote', type: 'quote' },
  { key: 'code', label: 'Code block', type: 'code_block' },
  { key: 'divider', label: 'Divider', type: 'divider' },
]

/** The block at the cursor turned into another kind: formatting, never an edit. */
export function setBlock(state, choice, ids) {
  const sel = state.selection
  const { $from } = sel
  const block = $from.parent
  const tr = state.tr.setMeta(SKIP, true)
  const type = schema.nodes[choice.type]
  if (choice.type !== 'divider' && !sel.empty && sel instanceof TextSelection) {
    // Selected words in one line become a line of their own of that kind:
    // the line is split before and after them (Stefan's try of piece 1: a
    // word mid-sentence made a heading). Across lines, each line touched
    // turns. Layout, never an edit.
    if ($from.sameParent(sel.$to) && block.isTextblock) {
      const atStart = $from.parentOffset === 0
      const atEnd = sel.$to.parentOffset === block.content.size
      const rest = () => [{ type: block.type, attrs: { ...block.attrs, id: ids.block(), gap: false } }]
      if (!atEnd) tr.split(sel.to, 1, rest())
      if (!atStart) tr.split(sel.from, 1, rest())
      const mid = atStart ? sel.from : sel.from + 2
      const midBlock = tr.doc.resolve(mid).parent
      tr.setBlockType(mid, mid, type, { id: midBlock.attrs.id, ...(choice.attrs ?? {}) })
      return tr
    }
    state.doc.nodesBetween(sel.from, sel.to, (node, pos) => {
      if (!node.isTextblock) return true
      tr.setBlockType(pos + 1, pos + 1, type, { id: node.attrs.id, ...(choice.attrs ?? {}) })
      return false
    })
    return tr
  }
  if (choice.type === 'divider') {
    const at = $from.after()
    const divider = schema.nodes.divider.create({ id: ids.block() })
    if (block.content.size === 0) {
      tr.replaceWith($from.before(), $from.after(), [divider, schema.nodes.paragraph.create({ id: block.attrs.id })])
      tr.setSelection(TextSelection.create(tr.doc, $from.before() + divider.nodeSize + 1))
    } else {
      tr.insert(at, divider)
    }
    return tr
  }
  tr.setBlockType($from.before(), $from.after(), schema.nodes[choice.type], { id: block.attrs.id, ...(choice.attrs ?? {}) })
  return tr
}

/** The depth of the chart a position is in, or null. */
export function chartDepth($pos) {
  for (let d = $pos.depth; d > 0; d--) if ($pos.node(d).type === schema.nodes.chart) return d
  return null
}

/** The / menu's choices in a chart (C222 (f)): its kind. */
export const CHART_CHOICES = [
  { key: 'bar', label: 'Bar chart', chart: true },
  { key: 'line', label: 'Line chart', chart: true },
  { key: 'area', label: 'Area chart', chart: true },
  { key: 'pie', label: 'Pie chart', chart: true },
]

/**
 * A chart's kind chosen (C222 (f)): an edit, told to the model, unless it is
 * back to the kind the model gave. null outside a chart.
 */
export function chartKind(state, kind, ids) {
  const $from = state.selection.$from
  const d = chartDepth($from)
  if (d == null) return null
  const chart = $from.node(d)
  const pos = $from.before(d)
  let model = 'bar'
  try {
    const t = JSON.parse(String(chart.attrs.data ?? '')).type
    if (typeof t === 'string') model = t
  } catch { /* the model's kind is bar */ }
  if (kind === chart.attrs.kind) return null
  let edit = null
  if (kind !== model) {
    edit = chart.attrs.kindEdit ?? ids.peek()
    if (edit === ids.peek()) ids.commit(edit)
  }
  return state.tr.setMeta(SKIP, true).setNodeMarkup(pos, null, { ...chart.attrs, kind, kindEdit: edit })
}

/** The / menu's choices in a table cell (C222 (b)). */
export const TABLE_CHOICES = [
  { key: 'rowBelow', label: 'Row below', table: true },
  { key: 'colAfter', label: 'Column after', table: true },
  { key: 'strikeRow', label: 'Strike row', table: true },
  { key: 'strikeCol', label: 'Strike column', table: true },
]

/**
 * A row or column added or struck, from the / menu in a cell (C222 (b)):
 * an edit, with an id of its own, carried by each cell it covers. A row or
 * column that is all yours goes, as your own words do when struck. null
 * outside a table.
 */
export function tableOp(state, key, ids) {
  const $from = state.selection.$from
  const d = cellDepth($from)
  if (d == null) return null
  const table = $from.node(d - 2)
  const tablePos = $from.before(d - 2)
  const r = $from.index(d - 2)
  const c = $from.index(d - 1)
  const id = ids.peek()
  ids.commit(id)
  const tr = state.tr.setMeta(SKIP, true)
  const rowPos = (doc, i) => {
    const t = doc.nodeAt(tablePos)
    let p = tablePos + 1
    for (let k = 0; k < i; k++) p += t.child(k).nodeSize
    return p
  }
  const newCell = (header = false) => schema.nodes.table_cell.create({ id: ids.block(), header, added: id })
  if (key === 'rowBelow') {
    const cells = Array.from({ length: table.child(r).childCount }, () => newCell(false))
    const at = rowPos(state.doc, r + 1)
    tr.insert(at, schema.nodes.table_row.create(null, cells))
    return tr.setSelection(TextSelection.create(tr.doc, at + 2))
  }
  if (key === 'colAfter') {
    for (let i = table.childCount - 1; i >= 0; i--) {
      const row = table.child(i)
      const j = Math.min(c, row.childCount - 1)
      tr.insert(cellStart(table, tablePos, i, j) - 1 + row.child(j).nodeSize, newCell(i === 0))
    }
    const t = tr.doc.nodeAt(tablePos)
    return tr.setSelection(TextSelection.create(tr.doc, cellStart(t, tablePos, r, Math.min(c + 1, t.child(r).childCount - 1))))
  }
  if (key === 'strikeRow' || key === 'strikeCol') {
    // The cells it covers: a row's, or the column's in every row.
    const covered = []
    if (key === 'strikeRow') table.child(r).forEach((cell, _at, j) => covered.push({ cell, i: r, j }))
    else table.forEach((row, _at, i) => { if (c < row.childCount) covered.push({ cell: row.child(c), i, j: c }) })
    if (covered.every((x) => x.cell.attrs.added != null)) {
      // All yours: it goes, last first.
      if (key === 'strikeRow' && table.childCount > 1) tr.delete(rowPos(state.doc, r), rowPos(state.doc, r) + table.child(r).nodeSize)
      else if (key === 'strikeCol') for (const x of [...covered].reverse()) {
        if (table.child(x.i).childCount > 1) tr.delete(cellStart(table, tablePos, x.i, x.j) - 1, cellStart(table, tablePos, x.i, x.j) - 1 + x.cell.nodeSize)
      }
      return tr
    }
    for (const x of covered) {
      if (x.cell.attrs.added != null || x.cell.attrs.struck != null) continue
      tr.setNodeMarkup(cellStart(table, tablePos, x.i, x.j) - 1, null, { ...x.cell.attrs, struck: id })
    }
    return tr
  }
  return null
}

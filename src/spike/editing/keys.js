// Stage 11 spike (C205): the keys and events a reply handles itself
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
//   Mod-z, Mod-y   nothing: undo is on each edit's card, because the
//                  browser's undo does not understand struck words.
//   Mod-b, -i, -u  nothing: formatting from the model is shown, not applied.
//   paste          plain text only; over a selection it strikes the selection.
//   drop, drag     off in the spike: moving words would be a strike and an
//                  addition at once.

import { keymap } from 'prosemirror-keymap'
import { Plugin, NodeSelection, TextSelection } from 'prosemirror-state'
import { Slice, Fragment } from 'prosemirror-model'
import { schema, STRUCK } from './schema'
import { SKIP, INTENT } from './track'

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

function backspace(blocks) {
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
      if (!blocks) return true
      const block = $pos.parent
      if (block.type !== schema.nodes.paragraph) {
        dispatch(state.tr.setBlockType($pos.before(), $pos.after(), schema.nodes.paragraph, { id: block.attrs.id }).setMeta(SKIP, true))
        return true
      }
      const index = $pos.index(0)
      if (index === 0) return true
      const prev = state.doc.child(index - 1)
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

function del() {
  return (state, dispatch) => {
    const sel = state.selection
    if (!sel.empty || sel instanceof NodeSelection) {
      dispatch(state.tr.delete(sel.from, sel.to).setMeta(INTENT, 'range'))
      return true
    }
    const live = nextLive(state, false)
    if (live.edge != null) {
      if (live.edge !== sel.from) dispatch(state.tr.setSelection(TextSelection.create(state.doc, live.edge)))
      return true
    }
    dispatch(state.tr.delete(live.from, live.to).setMeta(INTENT, 'delete'))
    return true
  }
}

function enter(ids) {
  return (state, dispatch, view) => {
    if (state.selection instanceof NodeSelection) return true
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
 * The plugins for an editable reply (blocks: true) or prompt (blocks: false).
 * @param {{ ids: object, blocks?: boolean, onSlash?: (view: object) => boolean, onUndoKey?: () => void, menuKey?: (event: KeyboardEvent) => boolean, menuText?: (text: string) => boolean, log?: (line: string) => void }} opts
 */
export function editingPlugins({ ids, blocks = true, onSlash, onUndoKey, menuKey, menuText, log }) {
  const nothing = () => true
  const undoKey = () => {
    onUndoKey?.()
    return true
  }
  const strike = (state, dispatch) => {
    if (state.selection.empty) return true
    dispatch(state.tr.delete(state.selection.from, state.selection.to).setMeta(INTENT, 'range'))
    return true
  }
  const keys = keymap({
    Enter: blocks ? enter(ids) : nothing,
    'Shift-Enter': blocks ? enter(ids) : nothing,
    Backspace: backspace(blocks),
    Delete: del(),
    'Mod-z': undoKey,
    'Mod-y': undoKey,
    'Shift-Mod-z': undoKey,
    'Mod-b': nothing,
    'Mod-i': nothing,
    'Mod-u': nothing,
    'Shift-Mod-x': strike,
  })

  const events = new Plugin({
    props: {
      handleKeyDown(view, event) {
        log?.(`keydown ${event.key}${event.isComposing ? ' (composing)' : ''}`)
        return menuKey ? menuKey(event) : false
      },
      handleTextInput(view, from, to, text) {
        // While the block menu is open, typed text filters it. Text can come
        // with no key press (an input method, a phone keyboard), so the
        // filter reads text, not keys.
        if (menuText?.(text)) return true
        // "/" at the start of a line opens the block menu (replies only).
        if (blocks && text === '/' && from === to && view.state.doc.resolve(from).parentOffset === 0 && onSlash) return onSlash(view)
        return false
      },
      handleDOMEvents: {
        beforeinput(view, event) {
          log?.(`beforeinput ${event.inputType}${event.data ? ` "${event.data}"` : ''}`)
          if (['historyUndo', 'historyRedo'].includes(event.inputType)) {
            event.preventDefault()
            onUndoKey?.()
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
          // Over a selection, the selection is struck before the input method
          // writes, so the composed word starts after the strike and nothing
          // is rewritten under it while it is being composed.
          const { state } = view
          if (!state.selection.empty && !(state.selection instanceof NodeSelection)) {
            view.dispatch(state.tr.delete(state.selection.from, state.selection.to).setMeta(INTENT, 'range-end'))
          }
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
          const lines = text.replace(/\r\n?/g, '\n').split('\n')
          const parentType = state.selection.$from.parent.type
          let slice
          if (lines.length === 1 || !blocks || parentType === schema.nodes.code_block) {
            const joined = blocks && parentType === schema.nodes.code_block ? text : lines.join(' ')
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
          log?.('drop: off in the spike')
          return true
        },
        dragstart(view, event) {
          event.preventDefault()
          return true
        },
        mousedown(view, event) {
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
      state.doc.forEach((node, offset) => {
        if (node.attrs.id != null && !seen.has(node.attrs.id)) {
          seen.add(node.attrs.id)
          return
        }
        tr = (tr ?? state.tr.setMeta(SKIP, true)).setNodeMarkup(offset, null, { ...node.attrs, id: ids.block() })
      })
      return tr
    },
  })
  return [events, keys, uniqueIds]
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
  const { $from } = state.selection
  const block = $from.parent
  const tr = state.tr.setMeta(SKIP, true)
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

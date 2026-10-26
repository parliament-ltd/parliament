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
import { schema, STRUCK, ADDED } from './schema'
import { SKIP, INTENT } from './track'
import { historyPlugin, undo, redo } from './history'

const isBlockAtom = (sel) => sel instanceof NodeSelection && sel.node.isBlock && sel.node.isAtom

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
export function atLineStart(state) {
  const sel = state.selection
  if (!sel.empty || !sel.$from.parent.inlineContent) return false
  return nextLive(state, true).edge != null
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
    if (isBlockAtom(state.selection)) {
      // A new line after a table, chart or divider: formatting, not an edit.
      const at = state.selection.to
      const tr = state.tr.insert(at, schema.nodes.paragraph.create({ id: ids.block() })).setMeta(SKIP, true)
      dispatch(tr.setSelection(TextSelection.create(tr.doc, at + 1)).scrollIntoView())
      return true
    }
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
 * @param {{ ids: object, blocks?: boolean, onSlash?: (view: object) => boolean, onNote?: (text: string) => void, menuKey?: (event: KeyboardEvent) => boolean, menuText?: (text: string) => boolean, log?: (line: string) => void, now?: () => number }} opts
 */
export function editingPlugins({ ids, blocks = true, onSlash, onNote, menuKey, menuText, log, now }) {
  const wholeBlock = (node) => onNote?.(`A ${node.type.name} is one block for now: Backspace strikes it whole, and editing inside it comes later.`)
  const nothing = () => true
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
    'Mod-z': undo,
    'Mod-y': redo,
    'Shift-Mod-z': redo,
    'Mod-b': nothing,
    'Mod-i': nothing,
    'Mod-u': nothing,
    'Shift-Mod-x': strike,
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
        if (blocks && text === '/' && from === to && onSlash && atLineStart(view.state)) return onSlash(view)
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
  return [events, keys, uniqueIds, historyPlugin(now ? { now } : {})]
}

/**
 * For a screen reader: unseen words at the edges of each mark, "removed:" and
 * "added:", as real text it reads in line (C208: Narrator read struck words
 * as ordinary text). On while isOn() says so. At a line's start or end a
 * label is drawn just outside its mark: inside, a line that starts with
 * struck words starts with the unseen label, the cursor cannot rest before
 * it, and goes to the line above (Stefan's try of piece 1, 26 October).
 */
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
            decos.push(Decoration.widget(run.to, said(run.kind === 'struck' ? ' end of removed, ' : ' end of added, '), { side: run.to === lineEnd ? 1 : -1, key: `e${run.kind}${run.to}` }))
            run = null
          }
          node.forEach((child, offset) => {
            const at = pos + 1 + offset
            const m = child.marks.find((x) => x.type === STRUCK || x.type === ADDED)
            const key = m ? `${m.type.name}${m.attrs.edit}` : null
            if (run && run.key !== key) close()
            if (m && !run) {
              run = { key, kind: m.type === STRUCK ? 'struck' : 'added', to: at }
              decos.push(Decoration.widget(at, said(run.kind === 'struck' ? ' removed: ' : ' added: '), { side: at === lineStart ? -1 : 1, key: `s${run.kind}${at}` }))
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

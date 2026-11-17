// Comments in the text (C301 (c); parliament-comments-v1.html, section 1): a
// comment on words is a purple tint over them, then a bubble and its words,
// small, after the passage; a long one shows its first line and "more".
// Decorations only, found as a highlight is found, by its words and which
// time they come in the message (C285): nothing is stored in the reply and
// nothing becomes an edit. A comment's words are set as text, never as HTML.
//
// Ctrl+Alt+M on selected words opens a box at the passage (useCommentBox);
// passageAt says what the selection is on, before it is kept.

import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { indexOfWord } from '../lib/textUtils'
import { firstLineOf } from '../lib/comments'
import { wordsOf } from './shown'
import { schema } from './schema'

export const commentsKey = new PluginKey('replyComments')
const SVG = 'http://www.w3.org/2000/svg'
const WORD = /[\p{L}\p{N}]/u

function bubble() {
  const svg = document.createElementNS(SVG, 'svg')
  svg.setAttribute('viewBox', '0 0 12 12')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('class', 'pm-cm-ico')
  const path = document.createElementNS(SVG, 'path')
  path.setAttribute('d', 'M2 2.5h8a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H6l-2.5 2v-2H2a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1z')
  path.setAttribute('fill', 'none')
  path.setAttribute('stroke', 'currentColor')
  path.setAttribute('stroke-width', '1.1')
  path.setAttribute('stroke-linejoin', 'round')
  svg.appendChild(path)
  return svg
}

/**
 * What the comment after its passage says: its words, the first line only
 * when long and not opened, and the word that opens or closes it, if any.
 * @returns {{ said: string, toggle: string|null }}
 */
export function saidOf(c, open, words) {
  const { line, more } = firstLineOf(c.text)
  return { said: open || !more ? c.text : line, toggle: more ? (open ? words.less : words.more) : null }
}

// The comment after its passage: the bubble, its words, and "more". Set as text, never HTML.
function widget(c, open, words) {
  return () => {
    const dom = document.createElement('span')
    dom.className = 'pm-cm'
    dom.contentEditable = 'false'
    dom.setAttribute('data-comment-of', String(c.num ?? ''))
    dom.setAttribute('dir', 'auto')
    dom.appendChild(bubble())
    const { said, toggle } = saidOf(c, open, words)
    const span = document.createElement('span')
    span.className = 'pm-cm-said'
    span.textContent = said
    dom.appendChild(span)
    if (toggle) {
      const b = document.createElement('button')
      b.type = 'button'
      b.className = 'pm-cm-more'
      b.setAttribute('data-comment-more', String(c.num ?? c.id))
      b.textContent = toggle
      dom.appendChild(b)
    }
    if (c.num != null) dom.title = words.label(c.num)
    return dom
  }
}

/**
 * The decorations for a document.
 * @param {import('prosemirror-model').Node} doc
 * @param {{ sections?: Record<string, Array<{ num: number|null, id: string, text: string, passage: string, nth: number }>>, list?: Array<object> }} shown
 *   each section's comments on words, by its message's id; list: a reply
 *   edited on its own, with no sections, its comments
 * @param {Set<string>} open the comments shown whole, by number or id
 * @param {{ more: string, less: string, label: (num: number) => string }} words
 */
export function commentDecorations(doc, shown = {}, open = new Set(), words = { more: 'more', less: 'less', label: () => '' }) {
  const sections = shown.sections ?? {}
  if (!(shown.list ?? []).length && !Object.values(sections).some((l) => (l ?? []).length)) return DecorationSet.empty
  const decos = []
  let list = shown.list ?? []
  let seen = list.map(() => 0)
  doc.descendants((node, pos) => {
    if (node.type.name === 'section') {
      list = sections[node.attrs.message] ?? []
      seen = list.map(() => 0)
      return true
    }
    if (!node.isTextblock) return true
    if (!list.length) return false
    const { text, at } = wordsOf(node, pos + 1)
    list.forEach((c, k) => {
      if (!c.passage) return
      for (let from = 0; ;) {
        const i = indexOfWord(text, c.passage, from)
        if (i === -1) break
        if (seen[k] === c.nth) {
          const start = at[i]
          const end = at[i + c.passage.length - 1] + 1
          const key = String(c.num ?? c.id)
          decos.push(Decoration.inline(start, end, { nodeName: 'span', class: 'pm-cm-at', 'data-comment': key }, { comment: key, words: true }))
          const isOpen = open.has(key)
          decos.push(Decoration.widget(end, widget(c, isOpen, words), { side: 1, key: `cm-${key}-${isOpen ? 1 : 0}-${c.text}`, ignoreSelection: true, marks: [], comment: key }))
        }
        seen[k] += 1
        from = i + c.passage.length
      }
    })
    return false
  })
  return DecorationSet.create(doc, decos)
}

// Whether every letter left in a stretch is struck: a comment on it is gone.
function allStruck(doc, from, to) {
  let kept = false
  doc.nodesBetween(from, to, (n) => {
    if (n.isText && !n.marks.some((m) => m.type.name === 'struck')) kept = true
    return !kept
  })
  return !kept
}

// The comments as mapped through a change: those whose words are all gone,
// or all struck, are dropped, with their boxes.
function carried(set, doc) {
  const all = set.find()
  const live = new Set(all.filter((d) => d.spec?.words && d.from < d.to && !allStruck(doc, d.from, d.to)).map((d) => d.spec.comment))
  const kept = all.filter((d) => !d.spec?.comment || (live.has(d.spec.comment) && (!d.spec.words || d.from < d.to)))
  return kept.length === all.length ? set : DecorationSet.create(doc, kept)
}

const WORDISH = /[\p{L}\p{N}]/u

/**
 * Where each comment on words is now, as drawn: its message, its words
 * widened to whole words (a letter typed at the end stays in it), and which
 * time those words come in its message. Stored back so the comment is drawn
 * there again, after the page reloads too (C304).
 * @returns {Array<{ key: string, message: string|null, passage: string, nth: number }>}
 */
export function anchorsOf(state) {
  const set = commentsKey.getState(state)?.set
  if (!set) return []
  const doc = state.doc
  const out = []
  for (const d of set.find()) {
    if (!d.spec?.words || d.from >= d.to) continue
    const $from = doc.resolve(d.from)
    let block = null
    let blockPos = 0
    let section = null
    let sectionPos = 0
    for (let depth = $from.depth; depth > 0; depth--) {
      const n = $from.node(depth)
      if (!block && n.isTextblock) { block = n; blockPos = $from.before(depth) }
      if (n.type.name === 'section') { section = n; sectionPos = $from.before(depth) }
    }
    if (!block) continue
    const { text, at } = wordsOf(block, blockPos + 1)
    let i = at.indexOf(d.from)
    let j = at.indexOf(d.to - 1)
    if (i < 0 || j < 0) continue
    while (i > 0 && WORDISH.test(text[i - 1])) i -= 1
    while (j < text.length - 1 && WORDISH.test(text[j + 1])) j += 1
    const passage = text.slice(i, j + 1)
    const scope = section ?? doc
    const base = section ? sectionPos + 1 : 0
    let nth = 0
    let found = false
    scope.descendants((n, p) => {
      if (found) return false
      if (!n.isTextblock) return true
      const w = wordsOf(n, base + p + 1)
      for (let from = 0; ;) {
        const k = indexOfWord(w.text, passage, from)
        if (k === -1) break
        if (w.at[k] === at[i]) { found = true; break }
        nth += 1
        from = k + passage.length
      }
      return false
    })
    if (found) out.push({ key: d.spec.comment, message: section?.attrs.message ?? null, passage, nth })
  }
  return out
}

/**
 * Comments over the text. Given anew with tr.setMeta(commentsKey, { sections });
 * "more" shows a comment whole, and "less" its first line again.
 * @param {{ words?: { more: string, less: string, label: (num: number) => string } }} [opts]
 */
export function commentsPlugin({ words } = {}) {
  const w = words ?? { more: 'more', less: 'less', label: () => '' }
  return new Plugin({
    key: commentsKey,
    state: {
      init: () => ({ shown: {}, open: new Set(), set: DecorationSet.empty }),
      apply(tr, value, _old, state) {
        const next = tr.getMeta(commentsKey)
        if (next?.toggle != null) {
          const open = new Set(value.open)
          if (open.has(next.toggle)) open.delete(next.toggle)
          else open.add(next.toggle)
          return { ...value, open, set: commentDecorations(state.doc, value.shown, open, w) }
        }
        if (next) return { shown: next, open: value.open, set: commentDecorations(state.doc, next, value.open, w) }
        if (!tr.docChanged) return value
        // Carried along as its words change, and gone only when all of them
        // are (C304; Stefan, 16 November: "let's not delete the comment
        // unless all letters are deleted"). Its new words are stored a moment
        // later (anchorsOf), and it is drawn from them again.
        return { ...value, set: carried(value.set.map(tr.mapping, tr.doc), tr.doc) }
      },
    },
    props: {
      decorations: (state) => commentsKey.getState(state).set,
      handleDOMEvents: {
        mousedown(view, event) {
          const more = event.target instanceof Element ? event.target.closest('[data-comment-more]') : null
          if (!more) return false
          event.preventDefault()
          view.dispatch(view.state.tr.setMeta(commentsKey, { toggle: more.getAttribute('data-comment-more') }))
          return true
        },
      },
    },
  })
}

/**
 * What a selection would be a comment on: its message, its words widened to
 * whole words, and which time those words come in the message, counted as
 * commentDecorations counts them. Null with nothing selected; a reason
 * where it cannot be one.
 * @param {import('prosemirror-state').EditorState} state
 * @param {string|null} [messageId] a reply edited on its own, with no sections: its message
 * @returns {null|{ why: 'block' }|{ messageId: string, passage: string, nth: number, from: number, to: number }}
 */
export function passageAt(state, messageId = null) {
  const { $from, $to, empty } = state.selection
  if (empty) return null
  if (!$from.parent.isTextblock || $from.parent !== $to.parent) return { why: 'block' }
  let section = null
  let sectionPos = -1
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type === schema.nodes.section) { section = $from.node(d); sectionPos = $from.before(d); break }
  }
  // A reply on its own: the whole document is its message.
  if (!section && messageId) { section = state.doc; sectionPos = -1 }
  const message = section?.type === schema.nodes.section ? section.attrs.message : messageId
  if (!section || !message) return { why: 'block' }
  const block = $from.parent
  const blockStart = $from.start()
  const { text, at } = wordsOf(block, blockStart)
  const index = (p) => {
    const i = at.findIndex((x) => x >= p)
    return i === -1 ? text.length : i
  }
  let a = index($from.pos)
  let b = index($to.pos)
  // Trimmed, then widened to whole words, as a passage is found by them.
  while (a < b && /\s/.test(text[a])) a++
  while (b > a && /\s/.test(text[b - 1])) b--
  while (a > 0 && WORD.test(text[a - 1]) && WORD.test(text[a])) a--
  while (b < text.length && WORD.test(text[b]) && WORD.test(text[b - 1])) b++
  if (a >= b) return null
  const passage = text.slice(a, b)
  // Which time these words come in the message: every time before this one.
  let nth = 0
  let counting = true
  section.descendants((node, offset) => {
    if (!counting) return false
    if (!node.isTextblock) return true
    const start = sectionPos + 1 + offset + 1
    const words = wordsOf(node, start)
    for (let from = 0; ;) {
      const i = indexOfWord(words.text, passage, from)
      if (i === -1) break
      if (start === blockStart && i >= a) { counting = false; break }
      nth += 1
      from = i + passage.length
    }
    return false
  })
  return { messageId: message, passage, nth, from: at[a], to: at[b - 1] + 1 }
}

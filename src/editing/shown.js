// What is drawn over a reply's words without changing them: highlights and
// quoted passages (C145 (a), (b)), found as the card always found them, by
// their words. Decorations only: nothing here is stored in the reply or
// becomes an edit.
//
// A highlight, once drawn, is carried along as its words change, as a
// comment is (C304), and its words as they now are are stored back. Quotes
// and terms are still found by their words each time.

import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { indexOfWord } from '../lib/textUtils'

export const shownKey = new PluginKey('replyShown')
const WORDISH = /[\p{L}\p{N}]/u

// A block's words, and the document position of each character in them.
export function wordsOf(block, start) {
  let text = ''
  const at = []
  block.forEach((child, offset) => {
    if (!child.isText) return
    for (let i = 0; i < child.text.length; i += 1) at.push(start + offset + i)
    text += child.text
  })
  return { text, at }
}

/** Whether every letter left in a stretch is struck: a highlight or a comment on it is gone. */
export function allStruck(doc, from, to) {
  let kept = false
  doc.nodesBetween(from, to, (n) => {
    if (n.isText && !n.marks.some((m) => m.type.name === 'struck')) kept = true
    return !kept
  })
  return !kept
}

/**
 * Where a stretch of words is now: its message, its words widened to whole
 * words (a letter typed at the end stays in them), and which time those
 * words come in its message, counted as they are found when drawn (C285).
 * Null where it is not in one block's words.
 * @returns {null|{ message: string|null, passage: string, nth: number }}
 */
export function anchorAt(doc, from, to) {
  if (from >= to) return null
  const $from = doc.resolve(from)
  let block = null
  let blockPos = 0
  let section = null
  let sectionPos = 0
  for (let depth = $from.depth; depth > 0; depth--) {
    const n = $from.node(depth)
    if (!block && n.isTextblock) { block = n; blockPos = $from.before(depth) }
    if (n.type.name === 'section') { section = n; sectionPos = $from.before(depth) }
  }
  if (!block) return null
  const { text, at } = wordsOf(block, blockPos + 1)
  let i = at.indexOf(from)
  let j = at.indexOf(to - 1)
  if (i < 0 || j < 0) return null
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
    for (let k = 0; ;) {
      const x = indexOfWord(w.text, passage, k)
      if (x === -1) break
      if (w.at[x] === at[i]) { found = true; break }
      nth += 1
      k = x + passage.length
    }
    return false
  })
  return found ? { message: section?.attrs.message ?? null, passage, nth } : null
}

/**
 * The decorations for a document.
 * @param {import('prosemirror-model').Node} doc
 * @param {{ terms?: Array<{ text: string, bg: string }>, quotes?: Array<{ num: number, text: string }>, whole?: string }} shown
 *   whole: the reply's own text; a quote of all of it is not a passage.
 *   sections[message].highlights: that message's highlights, each { id, text, bg, nth }: marked only
 *   where it was selected, the nth time its words come in the message (C285); one kept before has none, the first.
 */
export function shownDecorations(doc, shown = {}) {
  const { terms = [], sections = null } = shown
  const anyQuotes = (shown.quotes ?? []).length || Object.values(sections ?? {}).some((s) => (s.quotes ?? []).length || (s.highlights ?? []).length)
  if (!terms.length && !anyQuotes) return DecorationSet.empty
  const decos = []
  // A prompt and its reply as one: each section's quotes and highlights are its own message's.
  let quotes = shown.quotes ?? []
  let whole = shown.whole ?? ''
  let lights = []
  let seen = []
  let message = null
  doc.descendants((node, pos) => {
    if (node.type.name === 'section') {
      message = node.attrs.message
      const own = sections?.[node.attrs.message] ?? {}
      quotes = own.quotes ?? []
      whole = own.whole ?? ''
      lights = own.highlights ?? []
      seen = lights.map(() => 0)
      return true
    }
    if (!node.isTextblock) return true
    const { text, at } = wordsOf(node, pos + 1)
    const ranges = []
    for (const q of quotes) {
      if (!q.text || q.text === whole) continue
      const i = text.indexOf(q.text)
      if (i >= 0) ranges.push({ start: i, end: i + q.text.length, quote: q.num, title: q.title })
    }
    // A highlight: the one time its words come where it was selected, counted through the message.
    lights.forEach((h, k) => {
      if (!h.text) return
      let from = 0
      for (;;) {
        const i = indexOfWord(text, h.text, from)
        if (i === -1) break
        if (seen[k] === (Number.isInteger(h.nth) ? h.nth : 0)) ranges.push({ start: i, end: i + h.text.length, bg: h.bg, light: h.id ?? `${message}:${k}` })
        seen[k] += 1
        from = i + h.text.length
      }
    })
    for (const t of terms) {
      if (!t.text) continue
      let from = 0
      for (;;) {
        const i = indexOfWord(text, t.text, from)
        if (i === -1) break
        ranges.push({ start: i, end: i + t.text.length, bg: t.bg })
        from = i + t.text.length
      }
    }
    ranges.sort((a, b) => a.start - b.start)
    let end = -1
    for (const r of ranges) {
      if (r.start < end) continue
      end = r.end
      const from = at[r.start]
      const to = at[r.end - 1] + 1
      decos.push(r.quote != null
        ? Decoration.inline(from, to, { nodeName: 'mark', class: 'p-quoted', 'data-quote-num': String(r.quote), title: r.title ?? '' })
        : Decoration.inline(from, to, { nodeName: 'mark', class: 'pm-hl', style: `background-color: ${r.bg}; color: inherit` }, r.light != null ? { light: r.light } : undefined))
    }
    return false
  })
  return DecorationSet.create(doc, decos)
}

/**
 * Highlights and quotes over a reply. Given anew with
 * tr.setMeta(shownKey, shown); a click on a quoted passage finds its card,
 * as it always has (parliament-find-card).
 * @param {{ quotedTitle?: (num: number) => string }} [opts]
 */
export function shownPlugin({ quotedTitle = () => '' } = {}) {
  return new Plugin({
    key: shownKey,
    state: {
      init: () => ({ shown: {}, set: DecorationSet.empty }),
      apply(tr, value, _old, state) {
        // Each quote carries its title, the words that say where its card is.
        const titled = (list) => (list ?? []).map((q) => ({ ...q, title: quotedTitle(q.num) }))
        const draw = (shown) => shownDecorations(state.doc, {
          ...shown,
          quotes: titled(shown.quotes),
          ...(shown.sections ? { sections: Object.fromEntries(Object.entries(shown.sections).map(([k, s]) => [k, { ...s, quotes: titled(s.quotes) }])) } : {}),
        })
        const next = tr.getMeta(shownKey)
        if (next) return { shown: next, set: draw(next) }
        if (!tr.docChanged) return value
        // A highlight is carried along as its words change, and gone only
        // when all of them are, or all are struck (C304, as a comment is).
        // Its new words are stored a moment later (lightsOf), and it is
        // drawn from them again. Quotes and terms are found by their words.
        const lights = value.set.map(tr.mapping, tr.doc).find()
          .filter((d) => d.spec?.light != null && d.from < d.to && !allStruck(tr.doc, d.from, d.to))
        const unlit = value.shown.sections
          ? { ...value.shown, sections: Object.fromEntries(Object.entries(value.shown.sections).map(([k, s]) => [k, { ...s, highlights: [] }])) }
          : value.shown
        const rest = draw(unlit).find().filter((d) => !lights.some((l) => d.from < l.to && l.from < d.to))
        return { shown: value.shown, set: DecorationSet.create(state.doc, [...lights, ...rest]) }
      },
    },
    props: {
      decorations: (state) => shownKey.getState(state).set,
      handleDOMEvents: {
        click(view, event) {
          const mark = event.target instanceof Element ? event.target.closest('[data-quote-num]') : null
          if (!mark || window.getSelection()?.isCollapsed === false) return false
          window.dispatchEvent(new CustomEvent('parliament-find-card', { detail: { num: Number(mark.getAttribute('data-quote-num')) } }))
          return false
        },
      },
    },
  })
}

/**
 * Where each highlight is now, as drawn: its key (its id), its message, its
 * words widened to whole words, and which time they come in the message.
 * Stored back so it is drawn there again, after the page reloads too (C304).
 * @returns {Array<{ key: string, message: string|null, text: string, nth: number }>}
 */
export function lightsOf(state) {
  const set = shownKey.getState(state)?.set
  if (!set) return []
  const out = []
  for (const d of set.find()) {
    if (d.spec?.light == null) continue
    const a = anchorAt(state.doc, d.from, d.to)
    if (a) out.push({ key: String(d.spec.light), message: a.message, text: a.passage, nth: a.nth })
  }
  return out
}

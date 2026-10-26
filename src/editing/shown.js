// What is drawn over a reply's words without changing them: highlights and
// quoted passages (C145 (a), (b)), found as the card always found them, by
// their words. Decorations only: nothing here is stored in the reply or
// becomes an edit.

import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { indexOfWord } from '../lib/textUtils'

export const shownKey = new PluginKey('replyShown')

// A block's words, and the document position of each character in them.
function wordsOf(block, start) {
  let text = ''
  const at = []
  block.forEach((child, offset) => {
    if (!child.isText) return
    for (let i = 0; i < child.text.length; i += 1) at.push(start + offset + i)
    text += child.text
  })
  return { text, at }
}

/**
 * The decorations for a document.
 * @param {import('prosemirror-model').Node} doc
 * @param {{ terms?: Array<{ text: string, bg: string }>, quotes?: Array<{ num: number, text: string }>, whole?: string }} shown
 *   whole: the reply's own text; a quote of all of it is not a passage
 */
export function shownDecorations(doc, { terms = [], quotes = [], whole = '' } = {}) {
  if (!terms.length && !quotes.length) return DecorationSet.empty
  const decos = []
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true
    const { text, at } = wordsOf(node, pos + 1)
    const ranges = []
    for (const q of quotes) {
      if (!q.text || q.text === whole) continue
      const i = text.indexOf(q.text)
      if (i >= 0) ranges.push({ start: i, end: i + q.text.length, quote: q.num, title: q.title })
    }
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
        : Decoration.inline(from, to, { nodeName: 'mark', class: 'pm-hl', style: `background-color: ${r.bg}; color: inherit` }))
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
        const next = tr.getMeta(shownKey)
        if (next) {
          const quotes = (next.quotes ?? []).map((q) => ({ ...q, title: quotedTitle(q.num) }))
          return { shown: next, set: shownDecorations(state.doc, { ...next, quotes }) }
        }
        if (!tr.docChanged) return value
        const quotes = (value.shown.quotes ?? []).map((q) => ({ ...q, title: quotedTitle(q.num) }))
        return { shown: value.shown, set: shownDecorations(state.doc, { ...value.shown, quotes }) }
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

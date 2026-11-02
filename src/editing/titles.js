// Lines that are titles (C287): a line of an answer from a source that is,
// word for word, the title of a page the answer links to has a quiet "ask"
// after it. A click writes the title into the bar as a prompt, to send with
// Enter: Parliament never sends it for the person, and nothing goes to the
// source's website from here (the line under the answer links to the page).
// A click on the line's own words places the caret, as on any line.
//
// A decoration only: nothing here is stored in the reply or becomes an
// edit. The title is the source's text: it is written into the bar as a
// prompt, never read as a command, and drawn as text, never as HTML.

import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { lineTitle } from '../lib/linkedTitles'

export const titlesKey = new PluginKey('lineTitles')

// Words that are not standing: struck, or only suggested or waiting as an
// ask's answer. A line is read as it stands.
const NOT_STANDING = new Set(['struck', 'answer', 'suggest_in'])
function standing(block) {
  let text = ''
  block.forEach((child) => {
    if (child.isText && !child.marks.some((m) => NOT_STANDING.has(m.type.name))) text += child.text
  })
  return text
}

const asSet = (list) => new Set(Array.isArray(list) ? list.filter((t) => typeof t === 'string') : [])

/**
 * The lines of a document that are titles, each with a widget at its end.
 * @param {import('prosemirror-model').Node} doc
 * @param {{ titles?: string[], sections?: Record<string, string[]> }} titles
 *   titles: a reply's own, drawn on its own; sections: each message's, by
 *   its id, for a prompt and its reply drawn as one (only a reply has any)
 * @param {(title: string) => (() => Node)} [widget] the widget's drawing, for a title
 * @returns {DecorationSet}
 */
export function titleDecorations(doc, titles = {}, widget = () => () => null) {
  const sections = titles.sections ?? null
  const any = (titles.titles ?? []).length || Object.values(sections ?? {}).some((t) => (t ?? []).length)
  if (!any) return DecorationSet.empty
  const decos = []
  let known = asSet(titles.titles)
  doc.descendants((node, pos) => {
    if (node.type.name === 'section') {
      known = asSet(sections?.[node.attrs.message])
      return known.size > 0
    }
    if (!node.isTextblock) return true
    if (node.type.spec.code) return false
    const title = lineTitle(standing(node), known)
    if (title) {
      decos.push(Decoration.widget(pos + node.nodeSize - 1, widget(title), {
        side: 1, key: `title:${pos}:${title}`, title, stopEvent: () => true, ignoreSelection: true,
      }))
    }
    return false
  })
  return DecorationSet.create(doc, decos)
}

/** Writes a title into the bar as a prompt, shown in full, to send with Enter. */
export function askInBar(title) {
  window.dispatchEvent(new CustomEvent('parliament-prompt-draft', { detail: { value: title, focus: true, held: false } }))
}

const NO_WORDS = { ask: '', help: () => '' }

/**
 * The "ask" after each line that is a title.
 * @param {{
 *   titles: () => { titles?: string[], sections?: Record<string, string[]> },
 *   words?: { ask: string, help: (title: string) => string },
 *   onAsk?: (title: string) => void,
 * }} opts titles: read when the document is drawn; words: the marker's word
 *   and what it says it does
 */
export function titlesPlugin({ titles = () => ({}), words = NO_WORDS, onAsk = askInBar } = {}) {
  const widget = (title) => () => {
    const box = document.createElement('span')
    box.className = 'p-title-ask'
    box.contentEditable = 'false'
    const b = document.createElement('button')
    b.type = 'button'
    const help = words.help?.(title) ?? ''
    if (help) {
      b.title = help
      b.setAttribute('aria-label', help)
    }
    b.append(document.createTextNode(words.ask ?? ''))
    const arrow = document.createElement('span')
    arrow.className = 'p-title-arrow'
    arrow.setAttribute('aria-hidden', 'true')
    arrow.textContent = '→'
    b.append(arrow)
    // The caret stays where it is; the bar takes it on the click.
    b.addEventListener('mousedown', (e) => e.preventDefault())
    b.addEventListener('click', (e) => {
      e.preventDefault()
      onAsk(title)
    })
    box.append(b)
    return box
  }
  const draw = (doc) => titleDecorations(doc, titles() ?? {}, widget)
  return new Plugin({
    key: titlesKey,
    state: {
      init: (_, state) => draw(state.doc),
      apply: (tr, set, _old, state) => (tr.docChanged || tr.getMeta(titlesKey) ? draw(state.doc) : set),
    },
    props: { decorations: (state) => titlesKey.getState(state) },
  })
}

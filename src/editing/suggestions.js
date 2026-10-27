// Suggestions (stage 12, piece 1; the editing spec, "Ripple across branches"
// and "Sweeps"; C228, C229, ruled 27 October).
//
// A suggestion is the model's, made by Ripple (carrying an edit of yours to
// another branch) or by a sweep (a framework's instruction applied to a
// reply). It sits in place: the words it would strike, struck in its colour,
// and the words it suggests after them, with a marker "ripple 244: accept ·
// reject". It lands only on words that stand unmarked, found exactly once in
// one line (C229 (d)).
//
// Settling one: rejected, the suggested words go and the reply stays as it
// was; a sweep's accepted, the suggested words become the reply's and the
// struck ones go, as an accepted answer does; Ripple's accepted, it becomes
// an edit of yours, struck and added under a new edit id, by the editing
// rules themselves, so it reads and goes as any edit does (C229 (e)).

import { Plugin, PluginKey, TextSelection, EditorState } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { schema, SUGGEST_OUT, SUGGEST_IN, isEditMark, isAnswerMark, ASK } from './schema'
import { SKIP, track, createEditIds } from './track'
import { fromBlocks, toBlocks } from './blocks'
import { replyFromMarkdown } from './fromMarkdown'
import { editsIn, asksIn } from './edits'

export const suggestionsKey = new PluginKey('replySuggestions')

/** A new suggestion's id: short and random, as an edit's and an ask's are. */
export const newSuggestionId = () => `s${crypto.randomUUID().replace(/-/g, '').slice(0, 9)}`

// A character that is no word anyone can quote: a line break, an ask's point.
const BLOCKED = '\u0000'

// A line's text, one character per position, with every character on marked
// words (an edit, an ask, an answer, another suggestion) or on no word at all
// blocked, so a quote can only match words that stand unmarked.
function plainOf(block) {
  let text = ''
  block.forEach((child) => {
    if (!child.isText) { text += BLOCKED; return }
    const marked = child.marks.some((m) => isEditMark(m) || isAnswerMark(m) || m.type === ASK)
    text += marked ? BLOCKED.repeat(child.text.length) : child.text
  })
  return text
}

// Every place the quote stands unmarked: { from, to } in the document.
function findQuote(doc, quote) {
  const found = []
  if (!quote) return found
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true
    const text = plainOf(node)
    let at = text.indexOf(quote)
    while (at >= 0) {
      found.push({ from: pos + 1 + at, to: pos + 1 + at + quote.length })
      at = text.indexOf(quote, at + 1)
    }
    return false
  })
  return found
}

/**
 * Place suggestions in a document, one after another, each only where its
 * quote stands unmarked exactly once. Not an edit.
 * @param {import('prosemirror-state').EditorState} state
 * @param {Array<{ id: string, kind: 'ripple'|'sweep', quote: string, text: string }>} items
 * @returns {{ state: import('prosemirror-state').EditorState, placed: string[], missed: string[] }}
 */
export function placeSuggestions(state, items) {
  let s = state
  const placed = []
  const missed = []
  for (const item of items ?? []) {
    const quote = String(item?.quote ?? '')
    const text = String(item?.text ?? '')
    const where = findQuote(s.doc, quote)
    if (!item?.id || !quote || where.length !== 1 || quote === text) { missed.push(item?.id ?? null); continue }
    const { from, to } = where[0]
    const kind = item.kind === 'sweep' ? 'sweep' : 'ripple'
    const tr = s.tr.setMeta(SKIP, true)
    tr.addMark(from, to, SUGGEST_OUT.create({ suggestion: item.id, kind }))
    if (text) {
      // The suggested words keep the struck words' own look (bold, a link),
      // never an edit's or an ask's.
      const keep = s.doc.resolve(to).marks().filter((m) => !isEditMark(m) && !isAnswerMark(m) && m.type !== ASK)
      tr.insert(to, schema.text(text, [...keep, SUGGEST_IN.create({ suggestion: item.id, kind })]))
    }
    s = s.apply(tr)
    placed.push(item.id)
  }
  return { state: s, placed, missed }
}

/**
 * The same, on a reply's stored form; or, with no stored form yet, on one
 * built from its text, as editing does (C229 (c)). null when none is placed.
 * @param {object[]|null} blocks
 * @param {string} content the reply as the model wrote it
 * @returns {{ blocks: object[], placed: string[], missed: string[], suggestions: Map<string, object>, edits: Map, asks: Map }|null}
 */
export function placeInStored(blocks, content, items, nextBlockId = () => `b${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`) {
  const doc = (Array.isArray(blocks) ? fromBlocks(blocks, nextBlockId) : null) ?? replyFromMarkdown(String(content ?? ''), nextBlockId)
  if (!doc) return null
  const out = placeSuggestions(EditorState.create({ schema, doc }), items)
  if (!out.placed.length) return { blocks: null, placed: [], missed: out.missed, suggestions: new Map(), edits: new Map(), asks: new Map() }
  const after = out.state.doc
  return { blocks: toBlocks(after), placed: out.placed, missed: out.missed, suggestions: suggestionsIn(after), edits: editsIn(after), asks: asksIn(after) }
}

/**
 * The suggestions in a document, by id: their kind, the words they would
 * strike and suggest, and where they sit (a block's id, start and end).
 * @returns {Map<string, { kind: string, struck: string, suggested: string, places: Array<{ block: string, from: number, to: number }> }>}
 */
export function suggestionsIn(doc) {
  const out = new Map()
  doc.descendants((block) => {
    if (!block.isTextblock) return true
    block.forEach((child, offset) => {
      for (const m of child.marks) {
        if (m.type !== SUGGEST_OUT && m.type !== SUGGEST_IN) continue
        const id = m.attrs.suggestion
        if (!out.has(id)) out.set(id, { kind: m.attrs.kind === 'sweep' ? 'sweep' : 'ripple', struck: '', suggested: '', places: [] })
        const s = out.get(id)
        const text = child.isText ? child.text : ''
        if (m.type === SUGGEST_OUT) s.struck += text
        else s.suggested += text
        const p = s.places.find((x) => x.block === block.attrs.id)
        if (p) { p.from = Math.min(p.from, offset); p.to = Math.max(p.to, offset + child.nodeSize) }
        else s.places.push({ block: block.attrs.id, from: offset, to: offset + child.nodeSize })
      }
    })
    return false
  })
  return out
}

// Where a suggestion's two parts sit: the words it would strike, the words it suggests.
function partsOf(doc, id) {
  const parts = []
  let kind = 'ripple'
  doc.descendants((node, pos) => {
    if (!node.isInline) return true
    for (const m of node.marks) {
      if ((m.type === SUGGEST_OUT || m.type === SUGGEST_IN) && m.attrs.suggestion === id) {
        kind = m.attrs.kind === 'sweep' ? 'sweep' : 'ripple'
        parts.push({ part: m.type === SUGGEST_OUT ? 'out' : 'in', from: pos, to: pos + node.nodeSize, text: node.isText ? node.text : '' })
      }
    }
    return false
  })
  return { parts, kind }
}

/** Whether a document carries this suggestion. */
export const carriesSuggestion = (doc, id) => partsOf(doc, id).parts.length > 0

/**
 * Settle a suggestion, as transactions to apply in order (C229 (e)).
 * Rejected: the suggested words go, the marks go. A sweep's accepted: the
 * struck words go, the suggested ones stay as the reply's. Ripple's accepted:
 * the marks and the suggested words go (not an edit), then the struck words
 * are typed over with the suggested ones, which the editing rules make an
 * edit of yours: so the second transaction is not marked SKIP and must go
 * through them (the editor does; settleStored passes it to track).
 * @param {import('prosemirror-state').EditorState} state
 * @param {string} id
 * @param {'accept'|'reject'} how
 * @returns {Array<(s: import('prosemirror-state').EditorState) => import('prosemirror-state').Transaction>} [] when it is not here
 */
export function settleSuggestion(state, id, how) {
  const { parts, kind } = partsOf(state.doc, id)
  if (!parts.length) return []
  const outs = parts.filter((p) => p.part === 'out')
  const ins = parts.filter((p) => p.part === 'in')
  const suggested = ins.map((p) => p.text).join('')
  // The marks off, and what goes, from the end back so earlier positions hold.
  const clear = (goes) => (s) => {
    const tr = s.tr.setMeta(SKIP, true)
    for (const p of parts) tr.removeMark(p.from, p.to, p.part === 'out' ? SUGGEST_OUT : SUGGEST_IN)
    for (const p of parts.filter((x) => goes.includes(x.part)).sort((a, b) => b.from - a.from)) tr.delete(p.from, p.to)
    return tr
  }
  if (how !== 'accept') return [clear(['in'])]
  if (kind === 'sweep') return [clear(['out'])]
  const from = Math.min(...outs.map((p) => p.from))
  const to = Math.max(...outs.map((p) => p.to))
  return [
    clear(['in']),
    (s) => {
      const tr = s.tr.setSelection(TextSelection.create(s.doc, from, to))
      return suggested ? tr.insertText(suggested, from, to) : tr.delete(from, to)
    },
  ]
}

/**
 * A suggestion settled on a stored form, from outside its reply (accept: and
 * reject: from the bar or a card): the stored form after, with the edits and
 * asks it now holds, or null when the suggestion is not in it.
 */
export function settleStored(blocks, id, how, nextBlockId = () => `b${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`) {
  const doc = fromBlocks(blocks, nextBlockId)
  if (!doc || !id || !carriesSuggestion(doc, id)) return null
  let s = EditorState.create({ schema, doc })
  const ids = createEditIds()
  for (const make of settleSuggestion(s, id, how)) {
    const tr = make(s)
    s = s.apply(tr.getMeta(SKIP) ? tr : track(s, tr, { ids }))
  }
  return { blocks: toBlocks(s.doc), edits: editsIn(s.doc), asks: asksIn(s.doc), suggestions: suggestionsIn(s.doc) }
}

/**
 * The markers after each suggestion: "ripple 244: accept · reject". Given
 * anew with tr.setMeta(suggestionsKey, info), info a Map of suggestion id to
 * { num }; onSettle(id, 'accept'|'reject') when clicked.
 * @param {{ onSettle?: (id: string, how: 'accept'|'reject') => void, words?: { ripple: string, sweep: string, accept: string, reject: string } }} opts
 */
export function suggestionsPlugin({ onSettle, words = { ripple: 'ripple', sweep: 'sweep', accept: 'accept', reject: 'reject' } } = {}) {
  const marker = (id, kind, info) => () => {
    const box = document.createElement('span')
    box.className = `pm-sug-marker ${kind}`
    box.contentEditable = 'false'
    box.setAttribute('data-suggestion', id)
    const name = kind === 'sweep' ? words.sweep : words.ripple
    if (info?.num) {
      const find = document.createElement('button')
      find.type = 'button'
      find.className = 'pm-sug-find'
      find.textContent = `${name} ${info.num}`
      find.addEventListener('mousedown', (e) => e.preventDefault())
      find.addEventListener('click', () => window.dispatchEvent(new CustomEvent('parliament-find-card', { detail: { num: info.num } })))
      box.append(find)
    } else box.append(document.createTextNode(name))
    const button = (label, how) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.textContent = label
      b.addEventListener('mousedown', (e) => e.preventDefault())
      b.addEventListener('click', () => onSettle?.(id, how))
      return b
    }
    box.append(document.createTextNode(': '), button(words.accept, 'accept'), document.createTextNode(' · '), button(words.reject, 'reject'))
    return box
  }
  const draw = (doc, info) => {
    const ends = new Map()
    doc.descendants((node, pos) => {
      if (!node.isInline) return true
      for (const m of node.marks) {
        if (m.type !== SUGGEST_OUT && m.type !== SUGGEST_IN) continue
        const was = ends.get(m.attrs.suggestion)
        ends.set(m.attrs.suggestion, { at: Math.max(was?.at ?? 0, pos + node.nodeSize), kind: m.attrs.kind === 'sweep' ? 'sweep' : 'ripple' })
      }
      return false
    })
    const decos = [...ends].map(([id, e]) => {
      const i = info?.get?.(id) ?? null
      return Decoration.widget(e.at, marker(id, e.kind, i), { side: 1, key: `sug:${id}:${i?.num ?? ''}`, stopEvent: () => true, ignoreSelection: true })
    })
    return DecorationSet.create(doc, decos)
  }
  return new Plugin({
    key: suggestionsKey,
    state: {
      init: (_, state) => ({ info: new Map(), set: draw(state.doc, new Map()) }),
      apply(tr, value, _old, state) {
        const info = tr.getMeta(suggestionsKey)
        if (info) return { info, set: draw(state.doc, info) }
        if (!tr.docChanged) return value
        return { info: value.info, set: draw(state.doc, value.info) }
      },
    },
    props: { decorations: (state) => suggestionsKey.getState(state).set },
  })
}

// Asks (stage 11, piece 4; the editing spec, "Asks"; C218, ruled 26 October).
//
// An ask is an instruction in the person's own words, tied to a passage they
// select or to a point where the cursor is. Started with Ctrl+Shift+K or
// ask: (Ctrl+K stays the bar's, C218 (a)). It waits, like an edit, and goes
// with the next prompt to its branch. The model answers each in a block of
// its own, [ask 241] ... [/ask]; the answer lands in place, in green, with the
// passage struck in green, until the person accepts it (the answer becomes
// the reply's, the passage goes) or takes it back (the passage stays, the
// answer goes). Settling an ask is not an edit, and nothing is told of it.

import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { schema, ASK, ANSWER, REPLACED } from './schema'
import { SKIP } from './track'

export const asksKey = new PluginKey('replyAsks')

/** A new ask's id: short and random, as an edit's is. */
export const newAskId = () => `q${crypto.randomUUID().replace(/-/g, '').slice(0, 9)}`

/**
 * Start an ask with this id: on the selected words, or at the cursor; or on
 * a range given (the selection when the ASK box opened). Not an edit.
 */
export function startAsk(state, id, range = state.selection) {
  const max = state.doc.content.size
  const from = Math.min(range.from, max)
  const to = Math.min(range.to, max)
  const tr = state.tr.setMeta(SKIP, true)
  if (from === to) tr.insert(from, schema.nodes.ask_point.create({ ask: id }))
  else tr.addMark(from, to, ASK.create({ ask: id }))
  return tr
}

// Every place an ask touches: its passage, its point, its answer and what
// that would replace, each with its position.
function partsOf(doc, id) {
  const parts = []
  doc.descendants((node, pos) => {
    if (node.type === schema.nodes.ask_point) {
      if (node.attrs.ask === id) parts.push({ kind: 'point', from: pos, to: pos + node.nodeSize })
      return false
    }
    if (!node.isInline) return true
    for (const m of node.marks) {
      if (m.attrs?.ask !== id) continue
      if (m.type === ASK) parts.push({ kind: 'ask', from: pos, to: pos + node.nodeSize })
      if (m.type === ANSWER) parts.push({ kind: 'answer', from: pos, to: pos + node.nodeSize })
      if (m.type === REPLACED) parts.push({ kind: 'replaced', from: pos, to: pos + node.nodeSize })
    }
    return false
  })
  return parts
}

/**
 * Settle an answered ask: accept, and the answer becomes the reply's words
 * and the passage goes; undo, and the passage stays and the answer goes.
 * Either way the ask's marks go. Not an edit.
 */
export function settleAsk(state, id, how) {
  const tr = state.tr.setMeta(SKIP, true)
  const parts = partsOf(state.doc, id)
  const gone = how === 'accept' ? ['replaced', 'point'] : ['answer', 'point']
  for (const p of parts) {
    if (p.kind === 'ask') tr.removeMark(p.from, p.to, ASK)
    if (p.kind === 'answer' && how === 'accept') tr.removeMark(p.from, p.to, ANSWER)
    if (p.kind === 'replaced' && how !== 'accept') tr.removeMark(p.from, p.to, REPLACED)
  }
  // What goes, from the end back, so the positions before it stay true.
  const cut = parts.filter((p) => gone.includes(p.kind)).sort((a, b) => b.from - a.from)
  for (const p of cut) tr.delete(p.from, p.to)
  return tr
}

/** Drop an ask not yet sent: its marks and its point go. Not an edit. */
export function dropAsk(state, id) {
  const tr = state.tr.setMeta(SKIP, true)
  const parts = partsOf(state.doc, id)
  for (const p of parts) if (p.kind === 'ask') tr.removeMark(p.from, p.to, ASK)
  for (const p of parts.filter((x) => x.kind === 'point').sort((a, b) => b.from - a.from)) tr.delete(p.from, p.to)
  return tr
}

/**
 * The markers after each ask: "ask 241" while it waits, "ask 241: accept ·
 * undo" once answered. Given anew with tr.setMeta(asksKey, info), info a Map
 * of ask id to { num, state }; onSettle(id, 'accept'|'undo') when clicked.
 * @param {{ onSettle?: (id: string, how: 'accept'|'undo') => void, words?: { ask: string, accept: string, undo: string } }} opts
 */
export function asksPlugin({ onSettle, words = { ask: 'ask', accept: 'accept', undo: 'undo' } } = {}) {
  const marker = (id, info, answered) => () => {
    const box = document.createElement('span')
    box.className = `pm-ask-marker${answered ? ' answered' : ''}`
    box.contentEditable = 'false'
    box.setAttribute('data-ask', id)
    // "ask 241" finds its card on the Collection (C220 (f)).
    if (info?.num) {
      const find = document.createElement('button')
      find.type = 'button'
      find.className = 'pm-ask-find'
      find.textContent = `${words.ask} ${info.num}`
      find.addEventListener('mousedown', (e) => e.preventDefault())
      find.addEventListener('click', () => window.dispatchEvent(new CustomEvent('parliament-find-card', { detail: { num: info.num } })))
      box.append(find)
    } else box.append(document.createTextNode(words.ask))
    if (answered) {
      const button = (label, how) => {
        const b = document.createElement('button')
        b.type = 'button'
        b.textContent = label
        b.addEventListener('mousedown', (e) => e.preventDefault())
        b.addEventListener('click', () => onSettle?.(id, how))
        return b
      }
      box.append(document.createTextNode(': '), button(words.accept, 'accept'), document.createTextNode(' · '), button(words.undo, 'undo'))
    }
    return box
  }
  const draw = (doc, info) => {
    const ends = new Map()
    const ids = new Set()
    doc.descendants((node, pos) => {
      if (node.type === schema.nodes.ask_point) {
        ids.add(node.attrs.ask)
        ends.set(node.attrs.ask, { at: pos + node.nodeSize, answered: ends.get(node.attrs.ask)?.answered ?? false })
        return false
      }
      if (!node.isInline) return true
      for (const m of node.marks) {
        if (m.type !== ASK && m.type !== ANSWER && m.type !== REPLACED) continue
        const id = m.attrs.ask
        ids.add(id)
        const was = ends.get(id)
        ends.set(id, { at: Math.max(was?.at ?? 0, pos + node.nodeSize), answered: (was?.answered ?? false) || m.type === ANSWER })
      }
      return false
    })
    const decos = [...ids].map((id) => {
      const e = ends.get(id)
      const i = info?.get?.(id) ?? null
      return Decoration.widget(e.at, marker(id, i, e.answered), { side: 1, key: `ask:${id}:${i?.num ?? ''}:${e.answered}`, stopEvent: () => true, ignoreSelection: true })
    })
    return DecorationSet.create(doc, decos)
  }
  return new Plugin({
    key: asksKey,
    state: {
      init: (_, state) => ({ info: new Map(), set: draw(state.doc, new Map()) }),
      apply(tr, value, _old, state) {
        const info = tr.getMeta(asksKey)
        if (info) return { info, set: draw(state.doc, info) }
        if (!tr.docChanged) return value
        return { info: value.info, set: draw(state.doc, value.info) }
      },
    },
    props: { decorations: (state) => asksKey.getState(state).set },
  })
}

// The answers in a reply, in the stored form: pure, kept apart (answers.js).
export { answersIn, withoutAnswers, placeAnswer } from './answers'

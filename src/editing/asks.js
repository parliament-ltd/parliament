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

const WORDS = { accept: 'accept', undo: 'reject', suggests: (name) => `${name} suggests`, someone: 'The model', title: (num) => String(num), asReply: 'as a reply' }

/**
 * What the marker after a prompt in the text says (C301 (d), (e);
 * parliament-markup-v1.html): while it waits, p> and its words, as the bar
 * writes a prompt; once answered, who suggests the answer, to accept or
 * reject. Words are the person's own and the model's name: set as text.
 * A prompt to be answered in the reply says so after its words (C301 (e)).
 * @returns {{ lead: string|null, said: string, settle: boolean, as: string|null }}
 */
export function markerOf(info, answered, words = WORDS) {
  if (answered) return { lead: null, said: words.suggests(info?.by || words.someone), settle: true, as: null }
  return { lead: 'p>', said: String(info?.question ?? ''), settle: false, as: info?.reply ? words.asReply ?? WORDS.asReply : null }
}

/**
 * The marks around each prompt in the text (an ask by its old name, C218):
 * corner brackets at its passage's ends while it waits, and the marker
 * after it. Given anew with tr.setMeta(asksKey, info), info a Map of ask id
 * to { num, state, question, by }; onSettle(id, 'accept'|'undo') when clicked.
 * @param {{ onSettle?: (id: string, how: 'accept'|'undo') => void, words?: { accept: string, undo: string, suggests: (name: string) => string, someone: string, title: (num: number) => string } }} opts
 */
export function asksPlugin({ onSettle, words: given } = {}) {
  const words = { ...WORDS, ...(given ?? {}) }
  const bracket = (side) => () => {
    const b = document.createElement('span')
    b.className = `pm-ask-bracket ${side}`
    b.setAttribute('aria-hidden', 'true')
    return b
  }
  const marker = (id, info, answered) => () => {
    const box = document.createElement('span')
    box.className = `pm-ask-marker${answered ? ' answered' : ''}`
    box.contentEditable = 'false'
    box.setAttribute('data-ask', id)
    box.setAttribute('dir', 'auto')
    // Its number, for calm's numbered dot (C255 (a)).
    if (info?.num) box.setAttribute('data-num', String(info.num))
    const { lead, said, as } = markerOf(info, answered, words)
    // A click finds its card on the Collection (C220 (f)).
    const find = document.createElement(info?.num ? 'button' : 'span')
    find.className = 'pm-ask-find'
    if (lead) {
      const b = document.createElement('b')
      b.textContent = lead
      find.append(b)
    }
    find.append(document.createTextNode(said))
    if (info?.num) {
      find.type = 'button'
      find.title = words.title(info.num)
      find.addEventListener('mousedown', (e) => e.preventDefault())
      find.addEventListener('click', () => window.dispatchEvent(new CustomEvent('parliament-find-card', { detail: { num: info.num } })))
    }
    box.append(find)
    if (as) {
      const how = document.createElement('span')
      how.className = 'pm-ask-as'
      how.textContent = ` · ${as}`
      box.append(how)
    }
    if (answered) {
      const button = (label, how) => {
        const b = document.createElement('button')
        b.type = 'button'
        b.textContent = label
        b.addEventListener('mousedown', (e) => e.preventDefault())
        b.addEventListener('click', () => onSettle?.(id, how))
        return b
      }
      box.append(document.createTextNode(' · '), button(words.accept, 'accept'), document.createTextNode(' · '), button(words.undo, 'undo'))
    }
    return box
  }
  const draw = (doc, info) => {
    const ends = new Map()
    const ids = new Set()
    // Each waiting passage's ends, for its brackets.
    const passages = new Map()
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
        if (m.type === ASK) {
          const p = passages.get(id)
          passages.set(id, { from: Math.min(p?.from ?? Infinity, pos), to: Math.max(p?.to ?? 0, pos + node.nodeSize) })
        }
        const was = ends.get(id)
        ends.set(id, { at: Math.max(was?.at ?? 0, pos + node.nodeSize), answered: (was?.answered ?? false) || m.type === ANSWER })
      }
      return false
    })
    const decos = []
    for (const id of ids) {
      const e = ends.get(id)
      const i = info?.get?.(id) ?? null
      const p = passages.get(id)
      if (p && !e.answered) {
        decos.push(Decoration.widget(p.from, bracket('open'), { side: -1, key: `ask-open:${id}`, ignoreSelection: true }))
        decos.push(Decoration.widget(p.to, bracket('close'), { side: 1, key: `ask-close:${id}`, ignoreSelection: true }))
      }
      decos.push(Decoration.widget(e.at, marker(id, i, e.answered), { side: 2, key: `ask:${id}:${i?.num ?? ''}:${e.answered}:${i?.question ?? ''}:${i?.by ?? ''}:${i?.reply ? 1 : 0}`, stopEvent: () => true, ignoreSelection: true }))
    }
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

// The edits in a reply, as the records kept in the edits list (C212 (c)).
//
// A record holds what the reply's marks say, in plain text, so a card and a
// search can read it without the reply: what was struck, what was added, and
// where each part sits (a block's id and the start and end inside it, the
// editing spec's anchors). Its number, held and sent are kept by the store.

import { collectEdits } from './track'

/**
 * What each edit in a reply says, by its id.
 * @returns {Map<string|number, { struck: string, added: string, places: Array<{ block: string, from: number, to: number }> }>}
 */
export function editsIn(doc) {
  const out = new Map()
  for (const e of collectEdits(doc)) {
    out.set(e.id, {
      struck: e.struck,
      added: e.added,
      places: e.parts.map((p) => ({ block: p.block, from: p.from, to: p.to })),
    })
  }
  return out
}

/**
 * The asks in a document, by their id (piece 4; C218): the passage as it
 * stands (or, for one at a point, the words just before it), where it sits,
 * whether it is at a point, and its answer while one waits.
 * @returns {Map<string, { passage: string, point: boolean, places: Array<{ block: string, from: number, to: number }>, answer: string }>}
 */
export function asksIn(doc) {
  const out = new Map()
  const at = (id) => {
    if (!out.has(id)) out.set(id, { passage: '', point: false, places: [], answer: '' })
    return out.get(id)
  }
  const visit = (block) => {
    if (!block.isTextblock) return
    let before = ''
    block.forEach((child, offset) => {
      if (child.type.name === 'ask_point') {
        const a = at(child.attrs.ask)
        a.point = true
        a.passage = before.trim().split(/\s+/).slice(-8).join(' ')
        a.places.push({ block: block.attrs.id, from: offset, to: offset })
        return
      }
      const text = child.isText ? child.text : ' '
      for (const m of child.marks) {
        if (m.type.name === 'ask') {
          const a = at(m.attrs.ask)
          // The passage as it reads now: struck words left out.
          if (!child.marks.some((x) => x.type.name === 'struck')) a.passage += text
          const p = a.places.find((x) => x.block === block.attrs.id)
          if (p) p.to = offset + child.nodeSize
          else a.places.push({ block: block.attrs.id, from: offset, to: offset + child.nodeSize })
        } else if (m.type.name === 'answer') at(m.attrs.ask).answer += text
      }
      if (!child.marks.some((m) => m.type.name === 'answer')) before += text
    })
  }
  doc.descendants((node) => {
    if (node.isTextblock) { visit(node); return false }
    return true
  })
  return out
}

/** Whether two descriptions of an edit say the same. */
export function sameEdit(a, b) {
  return a.struck === b.struck && a.added === b.added && JSON.stringify(a.places) === JSON.stringify(b.places)
}

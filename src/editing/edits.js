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

/** Whether two descriptions of an edit say the same. */
export function sameEdit(a, b) {
  return a.struck === b.struck && a.added === b.added && JSON.stringify(a.places) === JSON.stringify(b.places)
}

// A change to a reply's stored form made from outside its editor (stage 11,
// piece 5; C220 (d)): undo:242, accept:203, reject:203 and delete:203 from
// the bar or a card, whether or not the reply is on screen. The editor's own
// rules do the work (undoEdit, settleAsk, dropAsk), on the document read back
// from the stored form, so a change made here reads the same as one made in
// the reply.

import { EditorState } from 'prosemirror-state'
import { schema } from './schema'
import { fromBlocks, toBlocks } from './blocks'
import { undoEdit } from './track'
import { settleAsk, dropAsk } from './asks'
import { editsIn, asksIn } from './edits'
import { suggestionsIn } from './suggestions'

const newBlockId = () => `b${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`

// Whether a document still carries this edit or ask.
function carries(doc, how, id) {
  let found = false
  doc.descendants((node) => {
    if (found) return false
    if (how === 'undoEdit' && node.attrs?.struck === id) found = true
    if (node.type.name === 'ask_point' && node.attrs.ask === id) found = true
    for (const m of node.marks ?? []) {
      if (how === 'undoEdit' ? (m.type.name === 'struck' || m.type.name === 'added') && m.attrs.edit === id : m.attrs?.ask === id) found = true
    }
    return !found
  })
  return found
}

/**
 * The stored form after one change, with the edits and asks it now holds,
 * or null when the edit or ask is not in it.
 * @param {object[]} blocks the stored form
 * @param {'undoEdit'|'accept'|'undo'|'drop'} how
 * @param {string} id the edit's or ask's id (its marks carry it)
 * @returns {{ blocks: object[], edits: Map<string, object>, asks: Map<string, object> } | null}
 */
export function changeStored(blocks, how, id) {
  const doc = fromBlocks(blocks, newBlockId)
  if (!doc || !id || !carries(doc, how, id)) return null
  const state = EditorState.create({ schema, doc })
  const tr = how === 'undoEdit' ? undoEdit(state, id)
    : how === 'drop' ? dropAsk(state, id)
      : settleAsk(state, id, how === 'accept' ? 'accept' : 'undo')
  const after = state.apply(tr).doc
  return { blocks: toBlocks(after), edits: editsIn(after), asks: asksIn(after), suggestions: suggestionsIn(after) }
}

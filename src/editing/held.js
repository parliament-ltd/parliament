// Edits held back, drawn dashed (C301 (b); C298): in Suggesting, what you
// type is kept held back until you accept it (Let it go, or accept:all), or
// take it back (Undo, or reject:all). Held is the edit record's own state, so
// nothing new is stored; this only draws it, as the Collection's held card
// has a dashed edge. Decorations only: nothing here changes the reply.

import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'

export const heldKey = new PluginKey('heldEdits')

const EDIT_MARKS = new Set(['struck', 'added'])
const NONE = new Set()

/**
 * Inline decorations over the words of each held edit.
 * @param {import('prosemirror-model').Node} doc
 * @param {Set<string>} held the edit ids held back
 */
export function heldDecorations(doc, held) {
  if (!held?.size) return DecorationSet.empty
  const decos = []
  doc.descendants((node, pos) => {
    if (!node.isText) return true
    const on = node.marks.some((m) => EDIT_MARKS.has(m.type.name) && held.has(String(m.attrs.edit)))
    if (on) decos.push(Decoration.inline(pos, pos + node.nodeSize, { class: 'pm-held' }))
    return false
  })
  return decos.length ? DecorationSet.create(doc, decos) : DecorationSet.empty
}

/** The plugin; its set of held ids comes in as a transaction's meta. */
export function heldPlugin() {
  return new Plugin({
    key: heldKey,
    state: {
      init: () => ({ held: NONE, set: DecorationSet.empty }),
      apply(tr, was, _old, state) {
        const meta = tr.getMeta(heldKey)
        if (meta === undefined && !tr.docChanged) return was
        const held = meta instanceof Set ? meta : was.held
        return { held, set: heldDecorations(state.doc, held) }
      },
    },
    props: { decorations: (state) => heldKey.getState(state).set },
  })
}

// Parliament's own undo history (stage 11) (C209 (c), ruled 25 October:
// "Ctrl+Z undoes the last change with Parliament's own history, Ctrl+Y
// redoes, and the cards keep their undo").
//
// The browser's own undo stays off: it does not know struck words. Every
// change that lands in a reply or a prompt is kept here as the exact steps
// that take it back, so Ctrl+Z restores a strike, a word or a split as it
// was, one change at a time, and Ctrl+Y puts it back. Typing in one go
// (changes less than half a second apart) comes back as one step. An undo
// from a card is a change like any other, so Ctrl+Z after it brings the edit
// back. No package: ProseMirror's steps can be inverted.

import { Plugin, PluginKey } from 'prosemirror-state'
import { SKIP } from './track'

export const historyKey = new PluginKey('editHistory')
const ACTION = 'editHistoryAction'

// The steps that take a change back, newest first.
const inverse = (tr) => tr.steps.map((step, i) => step.invert(tr.docs[i])).reverse()

/**
 * @param {{ now?: () => number, groupMs?: number, depth?: number }} [opts]
 *   now: the clock (tests pass their own); groupMs: changes closer than this
 *   come back as one; depth: how many steps are kept
 */
export function historyPlugin({ now = () => Date.now(), groupMs = 500, depth = 200 } = {}) {
  return new Plugin({
    key: historyKey,
    state: {
      init: () => ({ done: [], undone: [], at: 0 }),
      apply(tr, h, before) {
        const action = tr.getMeta(ACTION)
        if (action) return action
        if (!tr.docChanged) return h
        const t = now()
        const last = h.done[h.done.length - 1]
        // A new change ends what can be redone.
        if (last && t - h.at < groupMs) {
          return { done: [...h.done.slice(0, -1), { steps: [...inverse(tr), ...last.steps], selection: last.selection }], undone: [], at: t }
        }
        return { done: [...h.done, { steps: inverse(tr), selection: before.selection.getBookmark() }].slice(-depth), undone: [], at: t }
      },
    },
  })
}

// Takes the newest entry off one stack, applies it, and keeps its inverse on
// the other. The change is not an edit: it restores, so the rules leave it be.
function move(from, to) {
  return (state, dispatch) => {
    const h = historyKey.getState(state)
    const entry = h?.[from][h[from].length - 1]
    if (!entry) return true
    const tr = state.tr
    try {
      for (const step of entry.steps) tr.step(step)
    } catch {
      return true
    }
    const back = { steps: inverse(tr), selection: state.selection.getBookmark() }
    try { tr.setSelection(entry.selection.resolve(tr.doc)) } catch { /* the mapped selection stands */ }
    const next = { [from]: h[from].slice(0, -1), [to]: [...h[to], back], at: 0 }
    dispatch?.(tr.setMeta(SKIP, true).setMeta(ACTION, next).scrollIntoView())
    return true
  }
}

/** Ctrl+Z: the last change, taken back exactly. */
export const undo = move('done', 'undone')
/** Ctrl+Y: what Ctrl+Z took back, put back. */
export const redo = move('undone', 'done')

/** How many steps can be undone and redone, for the page. */
export function historyDepth(state) {
  const h = historyKey.getState(state)
  return { undo: h?.done.length ?? 0, redo: h?.undone.length ?? 0 }
}

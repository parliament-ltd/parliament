// Your own text, written in a room (C301 (f); ruled 16 November). A message
// on your side of the chat with `writing: true`: never sent by itself, marked
// like any reply, its prompts answered in it. Pure, so it is tested alone.
//
// Until a model has read it, it is a draft: what you type in Editing is
// simply the text, and its stored words follow it. A change made in
// Suggesting is held back, and the words a model would read leave it out
// until it is accepted. Once a model has read it, its words stay as read and
// your changes are edits like any others.

import { wordsOf } from '../editing/blocks'

/**
 * Whether a message shows that a model has read the chat before it: a
 * model's reply, finished or not. An answer from a source does not count,
 * since a source reads none of your text.
 */
export const readIt = (m) => m?.role === 'assistant' && !m.source

/** Whether your own text is still a draft: no model has read it in its chat. */
export const isDraft = (message, messages) => message?.writing === true && !(messages ?? []).some(readIt)

/** The chat's own text, if it has one: its first message, when that is yours. */
export const writingOf = (messages) => (messages ?? []).find((m) => m?.writing === true) ?? null

const heldIn = (id, held) => id != null && held.has(String(id))

/**
 * Your text's words as a model would read them now: a change held back
 * (Suggesting) left out, its struck words standing and its added words gone;
 * anything else as it reads.
 * @param {unknown} blocks the stored form
 * @param {Set<string>|string[]} held the held edits' ids, as their marks carry them
 */
export function draftWords(blocks, held = []) {
  const ids = new Set([...(held ?? [])].map(String))
  if (!Array.isArray(blocks)) return ''
  if (!ids.size) return wordsOf(blocks)
  const line = (runs) => (Array.isArray(runs) ? runs : [])
    .filter((r) => !(r && typeof r === 'object' && heldIn(r.added, ids)))
    .map((r) => {
      if (!r || typeof r !== 'object' || !heldIn(r.struck, ids)) return r
      const rest = { ...r }
      delete rest.struck
      return rest
    })
  const out = blocks.map((b) => {
    if (!b || typeof b !== 'object') return b
    const next = { ...b }
    if (heldIn(b.struck, ids)) delete next.struck
    if (Array.isArray(b.text)) next.text = line(b.text)
    if (Array.isArray(b.title)) next.title = line(b.title)
    if (Array.isArray(b.rows)) {
      next.rows = b.rows.map((row) => (Array.isArray(row)
        ? row.filter((c) => !(c && typeof c === 'object' && heldIn(c.added, ids)))
          .map((c) => (c && typeof c === 'object' && Array.isArray(c.text) ? { ...c, text: line(c.text), ...(heldIn(c.struck, ids) ? { struck: null } : {}) } : c))
        : row))
    }
    return next
  })
  return wordsOf(out)
}

// Comments (C301 (c); Stefan, 15 November: "Yes, build comments"). Notes
// become comments by name; what is stored keeps its kind, note. A comment is
// for people and is never sent.
//
// A comment is on words in a message (a note with a passage, and which time
// those words come in the message, as a highlight has, C285), or on the
// whole of a message: a note on the message with no passage, or a note of
// its own quoting a quote of the whole message, as comment:reply and
// note:reply write it (C286 (b)). Pure: what a room draws, by message.

/**
 * @typedef {{ num: number|null, id: string, text: string, passage?: string, nth?: number }} Comment
 */

const words = (v) => (typeof v === 'string' ? v.trim() : '')
const byNum = (a, b) => (a.num ?? Infinity) - (b.num ?? Infinity)

/**
 * Each message's comments, on words in it and on the whole of it.
 * @param {{ notes?: object[], own?: object[], pins?: object[], messages?: object[], conversationId?: string|null }} s
 *   notes: the chat's notes; own: notes of their own (no chat); pins: the
 *   chat's quotes; messages: the chat's messages
 * @returns {Map<string, { words: Comment[], whole: Comment[] }>}
 */
export function commentsOf({ notes = [], own = [], pins = [], messages = [], conversationId = null } = {}) {
  const out = new Map()
  const at = (id) => {
    if (!out.has(id)) out.set(id, { words: [], whole: [] })
    return out.get(id)
  }
  for (const n of notes) {
    const text = words(n?.text)
    if (!n?.messageId || !text) continue
    const passage = typeof n.passage === 'string' && n.passage.trim() ? n.passage : null
    if (passage) at(n.messageId).words.push({ num: n.num ?? null, id: n.id, text, passage, nth: Number.isInteger(n.nth) && n.nth >= 0 ? n.nth : 0 })
    else at(n.messageId).whole.push({ num: n.num ?? null, id: n.id, text })
  }
  // A quote of a whole message here, by its number, as quote:reply keeps one.
  const content = new Map(messages.map((m) => [m.id, m.content]))
  const wholeOf = new Map()
  for (const p of pins) {
    if (!Number.isInteger(p?.num) || p.targetConversationId !== conversationId || !p.sourceMessageId) continue
    if (content.has(p.sourceMessageId) && p.content === content.get(p.sourceMessageId)) wholeOf.set(p.num, p.sourceMessageId)
  }
  // A note of its own quoting one such quote, and no summary.
  for (const n of own) {
    const text = words(n?.text)
    if (!text || n.conversationId != null || n.summary || !Array.isArray(n.quotes) || n.quotes.length !== 1) continue
    const id = wholeOf.get(n.quotes[0])
    if (id) at(id).whole.push({ num: n.num ?? null, id: n.id, text })
  }
  for (const c of out.values()) {
    c.words.sort(byNum)
    c.whole.sort(byNum)
  }
  return out
}

/**
 * A comment's first line, for the text: up to `most` characters, cut at a
 * word, and whether there is more.
 * @returns {{ line: string, more: boolean }}
 */
export function firstLineOf(text, most = 50) {
  const t = words(text)
  const nl = t.indexOf('\n')
  let line = (nl >= 0 ? t.slice(0, nl) : t).trimEnd()
  if ([...line].length > most) {
    const cut = [...line].slice(0, most).join('')
    const space = cut.lastIndexOf(' ')
    line = `${(space > most / 2 ? cut.slice(0, space) : cut).trimEnd()}…`
  }
  return { line, more: line !== t }
}

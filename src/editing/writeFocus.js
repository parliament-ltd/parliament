// The caret, carried from the empty room into your text once its chat is
// made (C301 (f)). The empty room's page makes the chat when you pause; the
// room is then drawn again with the chat in it, and its editor takes the
// caret at the end, with anything typed while the chat was being made.
// Kept in this tab only, for the one editor about to be drawn.

let pending = null

/**
 * Ask the editor of this message, when it is drawn, to take the caret, then
 * type what waits. typed: the words, or a function giving them when it does.
 */
export function focusWhenDrawn(messageId, typed = '') {
  pending = { messageId, typed }
}

/** Whether the editor of this message is asked to take the caret. */
export const wantsFocus = (messageId) => Boolean(pending && pending.messageId === messageId)

/**
 * For the editor of this message: what was asked of it, once, or null. typed
 * is read now, so keys pressed until this moment are in it.
 */
export function takeFocus(messageId) {
  if (!pending || pending.messageId !== messageId) return null
  const p = pending
  pending = null
  return { messageId: p.messageId, typed: String((typeof p.typed === 'function' ? p.typed() : p.typed) ?? '') }
}

// One message by command (C286 (b)): what the old strip on each card did,
// now that the strip is hidden (C280 (b)). A message has no number, so the
// words reply and prompt name it:
//
//   quote:reply            a quote of the whole reply, kept beside its chat
//   quote:reply 207        the same, kept in chat 207 (the old "Quote in a chat")
//   copy:reply             the reply on the clipboard, as Markdown
//   delete:reply           the reply deleted, after a second Enter, with 20
//                          seconds in the chat to bring it back
//   note:reply "…"         a note quoting the reply (its quote made first)
//   tagadd:favorite reply  the reply tagged, by tagging its quote (C147)
//
// The reply is the one in hand: where the caret or a selection was last, in
// the chat of the room on screen. With none in hand, the chat's last reply.
// prompt works the same way, for prompts. The Enter line quotes the words
// the message begins with, so it is plain which one goes.
//
// Pure: screens.hand(part) gives the message, read when the line is planned.

import { cleanTag, TAG_MAX, targetsOf } from './rowVerbs'
import { NOTE_MAX } from './cardActs'

export const MESSAGE_WORDS = Object.freeze(['reply', 'prompt'])
export const isMessageWord = (a) => a?.kind === 'word' && MESSAGE_WORDS.includes(a.value)

const OPENING_WORDS = 8
// How long a deleted message waits in its chat, to be brought back.
export const DELETE_UNDO_MS = 20_000

/** The words a message begins with, for the Enter line: at most eight, on one line. */
export function openingOf(text) {
  const words = String(text ?? '').replace(/<attached_file[\s\S]*?<\/attached_file>/g, ' ').replace(/[#>*_`[\]]/g, ' ').trim().split(/\s+/).filter(Boolean)
  if (!words.length) return ''
  const head = words.slice(0, OPENING_WORDS).join(' ')
  return words.length > OPENING_WORDS ? `${head}…` : head
}

const role = (part) => (part === 'prompt' ? 'user' : 'assistant')

/**
 * The message a command means, from a chat's messages as shown.
 * @param {object[]} messages the chat's messages, without hidden ones or ones being deleted
 * @param {string|null} heldId the message the caret or a selection was last in
 * @param {'reply'|'prompt'} part
 * @returns {{ message: object, inHand: boolean }|null}
 */
export function messageInHand(messages, heldId, part) {
  const list = (messages ?? []).filter((m) => m && m.content && !m.incomplete && (m.role === 'user' || m.role === 'assistant'))
  const want = role(part)
  const at = heldId ? list.findIndex((m) => m.id === heldId) : -1
  if (at >= 0) {
    const held = list[at]
    if (held.role === want) return { message: held, inHand: true }
    // The other card of the pair in hand: a prompt's reply follows it, a reply's prompt comes before.
    if (want === 'assistant') {
      if (list[at + 1]?.role === 'assistant') return { message: list[at + 1], inHand: true }
    } else {
      for (let i = at - 1; i >= 0; i--) if (list[i].role === 'user') return { message: list[i], inHand: true }
    }
  }
  for (let i = list.length - 1; i >= 0; i--) if (list[i].role === want) return { message: list[i], inHand: false }
  return null
}

/** The part a line names: its word, or reply when it names none. */
const partOf = (vals) => (vals.find(isMessageWord)?.value ?? 'reply')

/**
 * What screens.hand gives back for a part, or why there is nothing.
 * @returns {{ hand: object }|{ says: object }}
 */
function handOf(part, screens) {
  const h = screens.hand?.(part) ?? null
  if (!h || !h.room) return { says: { message: 'messageNoRoom', values: { part } } }
  if (!h.message) return { says: { message: 'messageNone', values: { part } } }
  return { hand: h }
}

// What the Enter line says of the message, shared by every verb here.
const named = (part, h) => ({ part, opening: openingOf(h.message.content), num: h.num ?? '' })
const target = (h) => ({ chatId: h.chatId, messageId: h.message.id, role: h.message.role, content: h.message.content })
// Said when nothing is in hand, so it is plain the last one goes.
const lastNote = (part, h) => (h.inHand ? [] : [{ message: 'messageLast', values: { part } }])

/** quote:reply, quote:prompt, quote:reply 207. quote: alone is quote:reply. */
export function planQuoteMessage(step, screens = {}) {
  const vals = step.match?.values ?? []
  const part = partOf(vals)
  const into = vals.find((v) => v.kind === 'address' || v.kind === 'number') ?? null
  const r = handOf(part, screens)
  if (r.says) return { says: r.says, act: null }
  const h = r.hand
  let intoChat = null
  if (into) {
    const t = targetsOf([into], screens.records?.rows ?? [])
    const row = t.rows?.[0]
    if (!row || row.kind !== 'chat' || !row.chatId) return { says: { message: 'quoteIntoWhich', values: { said: into.text ?? String(into.num ?? into.value) } }, act: null }
    intoChat = { id: row.chatId, num: into.text ?? String(row.num) }
  }
  const values = { ...named(part, h), into: intoChat?.num ?? '' }
  return {
    says: { message: intoChat ? 'quoteMessageInto' : 'quoteMessage', values, also: [...lastNote(part, h), { message: 'quoteNeverSent' }] },
    act: { kind: 'quoteMessage', ...target(h), into: intoChat?.id ?? null, intoNum: intoChat?.num ?? null, tag: null },
  }
}

/** copy:reply, copy:prompt: the message as Markdown, as it is stored. */
export function planCopyMessage(step, screens = {}) {
  const part = partOf(step.match?.values ?? [])
  const r = handOf(part, screens)
  if (r.says) return { says: r.says, act: null }
  const h = r.hand
  return { says: { message: 'copyMessage', values: named(part, h), also: lastNote(part, h) }, act: { kind: 'copyMessage', ...target(h), part } }
}

/** delete:reply, delete:prompt: after a second Enter, with 20 seconds to bring it back. */
export function planDeleteMessage(step, screens = {}) {
  const part = partOf(step.match?.values ?? [])
  const r = handOf(part, screens)
  if (r.says) return { says: r.says, act: null }
  const h = r.hand
  return {
    says: { message: 'deleteMessage', values: named(part, h), also: [...lastNote(part, h), { message: 'deleteMessageUndo' }] },
    act: { kind: 'deleteMessage', ...target(h), part, confirm: true, again: { message: 'deleteMessageAgain' } },
  }
}

/** note:reply "…": a note quoting the message, its quote made first if there is none. */
export function planNoteMessage(step, screens = {}) {
  const args = step.args ?? []
  const word = args.find(isMessageWord)
  const part = word?.value ?? 'reply'
  const last = args[args.length - 1]
  const text = String(last?.kind === 'text' ? last.value : '').trim()
  if (!text) return { says: { message: 'noteWords', values: { example: `note:${part} "…"` } }, act: null }
  if ([...text].length > NOTE_MAX) return { says: { message: 'noteLong', values: { max: NOTE_MAX } }, act: null }
  const r = handOf(part, screens)
  if (r.says) return { says: r.says, act: null }
  const h = r.hand
  return {
    says: { message: 'noteOnMessage', values: named(part, h), also: [...lastNote(part, h), { message: 'noteNeverSent' }] },
    act: { kind: 'noteMessage', ...target(h), text },
  }
}

/** tagadd:favorite reply: the message's quote tagged, made first if there is none (C147). */
export function planTagMessage(step, screens = {}) {
  const vals = step.match?.values ?? []
  const part = partOf(vals)
  const first = vals[0]
  const clean = cleanTag(first?.kind === 'text' ? first.value : first?.text ?? '')
  if (clean.error === 'long') return { says: { message: 'tagLong', values: { max: TAG_MAX } }, act: null }
  if (clean.error) return { says: { message: 'tagWords', values: { example: `tagadd:favorite ${part}` } }, act: null }
  const r = handOf(part, screens)
  if (r.says) return { says: r.says, act: null }
  const h = r.hand
  return {
    says: { message: 'tagMessage', values: { ...named(part, h), tag: clean.tag }, also: lastNote(part, h) },
    act: { kind: 'quoteMessage', ...target(h), into: null, intoNum: null, tag: clean.tag },
  }
}


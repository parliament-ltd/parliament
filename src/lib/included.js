// An answer from a source brought into a prompt on purpose (refactor-plan.md,
// stage 8, piece 5; C115; security notes §1.1 and §1.4; C176).
//
// Answers from sources stay out of what a model is sent unless the person
// acts on them (C115). include: is that act: it holds the answers named for
// the next prompt. On Enter each is read again, checked (invisible
// characters out, words that read like instructions found: sourceCheck.js,
// in a worker) and kept on the prompt as `included`, so later turns send it
// again as it went. Every provider sends it as labelled, untrusted data
// (providers/shared.js withIncluded). Pure.

import { withoutInvisible, lastSourceAnswer } from './translations'
import { instructionLike } from './injection'

// At most so many answers with one prompt, each at most so long.
export const INCLUDED_MOST = 5
export const INCLUDED_MAX_CHARS = 20_000
const PHRASES_MOST = 10

/**
 * The free check (security notes §1.4): the text with invisible characters
 * (zero-width and Unicode tag characters) taken out, how many were, and the
 * words in it that read like instructions to a model. A warning, never a block.
 */
export function checkText(text) {
  const raw = String(text ?? '')
  const clean = withoutInvisible(raw)
  return { text: clean, removed: raw.length - clean.length, phrases: instructionLike(clean).slice(0, PHRASES_MOST) }
}

/** Whether what a prompt carries is well formed (a backup's included). */
export function isIncluded(v) {
  const id = (x) => typeof x === 'string' && x.length > 0 && x.length <= 100
  const text = (x, max) => x == null || (typeof x === 'string' && x.length <= max)
  return Array.isArray(v) && v.length >= 1 && v.length <= INCLUDED_MOST && v.every((i) => i && typeof i === 'object' && !Array.isArray(i)
    && id(i.from)
    && i.source && typeof i.source === 'object' && !Array.isArray(i.source)
    && typeof i.source.id === 'string' && /^[a-z]{1,40}$/.test(i.source.id)
    && text(i.source.name, 100) && text(i.source.title, 300)
    && (i.source.url == null || (typeof i.source.url === 'string' && i.source.url.length <= 2000 && i.source.url.startsWith('https://')))
    && typeof i.text === 'string' && i.text.length > 0 && i.text.length <= INCLUDED_MAX_CHARS
    && (i.phrases == null || (Array.isArray(i.phrases) && i.phrases.length <= PHRASES_MOST && i.phrases.every((p) => typeof p === 'string' && p.length <= 200))))
}

/**
 * What a prompt keeps of an answer it brings in: where it came from, and
 * its words as checked, cut to the most one prompt carries.
 * @param {{ id: string, content: string, source: object }} message the answer
 * @param {{ text: string, phrases: string[] }} checked checkText's result for it
 */
export function includedOf(message, checked) {
  const s = message.source ?? {}
  return {
    from: message.id,
    source: {
      id: s.id, name: s.name ?? s.id,
      ...(s.title ? { title: String(s.title).slice(0, 300) } : {}),
      ...(typeof s.url === 'string' && s.url.startsWith('https://') ? { url: s.url } : {}),
    },
    text: checked.text.slice(0, INCLUDED_MAX_CHARS),
    ...(checked.phrases.length ? { phrases: checked.phrases } : {}),
  }
}

/** A branch's last answer from a source, as include: names it before Enter. */
export function answerFor(messages) {
  const l = lastSourceAnswer(messages)
  if (!l) return null
  const q = String(l.question ?? '').trim()
  return {
    messageId: l.message.id,
    source: l.message.source.name ?? l.message.source.id,
    question: q.length > 60 ? `${q.slice(0, 59)}…` : q,
    chars: Math.min(String(l.message.content).length, INCLUDED_MAX_CHARS),
    phrases: instructionLike(withoutInvisible(l.message.content)),
  }
}

const flat = (args = []) => args.flatMap((a) => (a.kind === 'list' ? a.items : [a]))

/**
 * include:, include:201b, include:201b, 201c, include:off (C176).
 * screens.including: { room, chatAnswer, members, held }: the chat the room
 * shows (undefined with no room), its last answer from a source
 * (answerFor), the branches on screen (branchView members, each with its
 * last answer from a source as `answer`), and what is held now
 * ({ room, items }).
 */
export function planInclude(step, screens = {}) {
  const inc = screens.including
  if (!inc || inc.room === undefined) return { says: { message: 'includeNoRoom' }, act: null }
  const held = inc.held && inc.held.room === (inc.room ?? null) ? inc.held : null
  const args = step.match?.values ?? []
  if (args.length === 1 && args[0].kind === 'word' && args[0].value === 'off') {
    if (!held) return { says: { message: 'includeNoneHeld' }, act: null }
    return { says: { message: 'includeOff', values: { count: held.items.length } }, act: { kind: 'include', room: inc.room ?? null, items: [], before: held.items } }
  }
  const members = inc.members ?? []
  let items
  if (!args.length) {
    const a = inc.chatAnswer
    if (!a) {
      const others = members.filter((m) => m.answer && m.chatId !== inc.room).map((m) => m.address).filter(Boolean)
      return { says: others.length ? { message: 'includeNothingTry', values: { example: `include:${others[0]}` } } : { message: 'includeNothing' }, act: null }
    }
    items = [{ chatId: inc.room, messageId: a.messageId, address: null, source: a.source, question: a.question, chars: a.chars, phrases: a.phrases }]
  } else {
    items = []
    for (const arg of flat(args)) {
      const said = String(arg.text ?? arg.value ?? '').toLowerCase()
      const m = members.find((x) => String(x.address ?? '').toLowerCase() === said)
      if (!m) {
        const nums = members.map((x) => x.address).filter(Boolean)
        return { says: nums.length ? { message: 'includeNotHere', values: { address: said, nums } } : { message: 'includeNoBranches', values: { address: said } }, act: null }
      }
      if (!m.answer) return { says: { message: 'includeNoAnswer', values: { address: m.address, name: m.name } }, act: null }
      if (!items.some((x) => x.messageId === m.answer.messageId)) {
        items.push({ chatId: m.chatId, messageId: m.answer.messageId, address: m.address, source: m.answer.source, question: m.answer.question, chars: m.answer.chars, phrases: m.answer.phrases })
      }
    }
  }
  if (items.length > INCLUDED_MOST) return { says: { message: 'includeMany', values: { most: INCLUDED_MOST } }, act: null }
  const ids = (list) => (list ?? []).map((x) => x.messageId).join('|')
  if (held && ids(held.items) === ids(items)) return { says: { message: 'includeSame' }, act: null }
  const phrases = [...new Set(items.flatMap((x) => x.phrases ?? []))]
  const also = phrases.length ? [{ message: 'includeFlagged', values: { phrases: phrases.slice(0, 3).map((p) => `“${p}”`) } }] : []
  also.push({ message: 'includeHow' })
  const act = { kind: 'include', room: inc.room ?? null, items, before: held?.items ?? null }
  const one = items[0]
  const says = items.length === 1
    ? (one.address
      ? { message: 'includeOneFrom', values: { source: one.source, address: one.address, question: one.question } }
      : { message: 'includeOne', values: { source: one.source, question: one.question } })
    : { message: 'includeSome', values: { sources: [...new Set(items.map((x) => x.source))], nums: items.map((x) => x.address).filter(Boolean), count: items.length } }
  return { says: { ...says, also }, act }
}

// Ripple (stage 12, piece 2; the editing spec, "Ripple across branches";
// C228, C231, ruled 27 October). Pure: what one check asks the helper, and
// how what it says lands as suggestions. The call itself goes through the
// gateway, from the shell.
//
// When edits go with a prompt to one branch, each is matched to the same
// turn in each other branch of the plan: an edit to the first prompt
// against the first prompt, one to the second reply against the second
// reply (C231 (a)). One call per branch carries them all, with those parts
// of that branch as they read now. A source's answer is never sent this way
// (C228 (d)).

import { wordsOf } from '../editing/blocks'
import { withoutAnswers } from '../editing/answers'
import { placeInStored, firstDocOf } from '../editing/suggestions'
import { addSuggestions } from './records'

const ROLE = { prompt: 'user', reply: 'assistant' }
const SYSTEM_CHARS = 1400
const turns = (messages, role) => (messages ?? []).filter((m) => m?.role === role && !m.summary)

/** Which turn a message is in its chat: its part, and its place among that part's messages. */
export function turnOf(messages, messageId) {
  const m = (messages ?? []).find((x) => x?.id === messageId)
  if (!m || !(m.role in { user: 1, assistant: 1 })) return null
  const n = turns(messages, m.role).indexOf(m)
  return n < 0 ? null : { part: m.role === 'user' ? 'prompt' : 'reply', n }
}

/** The message at a turn in another chat, or null. */
export const atTurn = (messages, turn) => turns(messages, ROLE[turn.part])[turn.n] ?? null

/** A message's words as they stand: an edited one's stored form, else what was written. */
export function standingText(m) {
  if (Array.isArray(m?.blocks)) return wordsOf(m.blocks)
  return m?.role === 'assistant' ? withoutAnswers(m.content) : String(m?.content ?? '')
}

// A line's words, before the person's edits or after them; never an answer
// or a suggestion waiting, which are not the reply's.
const said = (runs, when) => (Array.isArray(runs) ? runs : [])
  .filter((r) => r && typeof r === 'object' && r.answer == null && r.suggestIn == null && (when === 'before' ? r.added == null : r.struck == null))
  .map((r) => (r.break === true ? ' ' : typeof r.text === 'string' ? r.text : ''))
  .join('')

/** The line an edit sits in, before it and after it (a block's, or a table cell's). */
export function lineOf(blocks, place) {
  const id = place?.cell ?? place?.block
  for (const b of Array.isArray(blocks) ? blocks : []) {
    if (!b || typeof b !== 'object') continue
    if (b.id === id && Array.isArray(b.text)) return { before: said(b.text, 'before'), after: said(b.text, 'after') }
    for (const row of Array.isArray(b.rows) ? b.rows : []) {
      for (const c of Array.isArray(row) ? row : []) {
        if (c && typeof c === 'object' && c.id === id) return { before: said(c.text, 'before'), after: said(c.text, 'after') }
      }
    }
  }
  return { before: '', after: '' }
}

/**
 * One check: the edits, and the parts of another branch they match.
 * @param {{ edits: object[], from: object[], to: object[] }} args edit records
 *   going now; the edited chat's messages; the other branch's
 * @returns {{ request: object, parts: Map<string, object> }|null} parts: by
 *   the id the request gives it, the message; null when nothing matches
 */
export function rippleRequest({ edits, from, to }) {
  const parts = new Map()
  const idOf = new Map()
  const out = []
  for (const e of edits ?? []) {
    const turn = turnOf(from, e.messageId)
    if (!turn) continue
    const there = atTurn(to, turn)
    // A source's answer, or a reply still being written, is not checked into.
    if (!there || there.source || there.incomplete) continue
    let id = idOf.get(there.id)
    if (!id) {
      id = `${turn.part === 'prompt' ? 'p' : 'r'}${turn.n + 1}`
      idOf.set(there.id, id)
      parts.set(id, there)
    }
    const here = (from ?? []).find((m) => m.id === e.messageId)
    out.push({ num: e.num, matches: id, struck: String(e.struck ?? ''), added: String(e.added ?? ''), ...lineOf(here?.blocks, e.places?.[0]) })
  }
  if (!out.length) return null
  return {
    request: { edits: out, other: [...parts].map(([id, m]) => ({ id, part: m.role === 'user' ? 'prompt' : 'reply', text: standingText(m) })) },
    parts,
  }
}

/**
 * About how many characters one check sends, worked out before Enter from
 * the edited chat: each branch's parts are about as long as these (C231 (d)).
 */
export function rippleChars({ edits, from }) {
  const seen = new Set()
  // The instructions the helper is given, about this long (providers/shared.js).
  let n = SYSTEM_CHARS
  for (const e of edits ?? []) {
    n += 300 + String(e.struck ?? '').length + String(e.added ?? '').length
    if (seen.has(e.messageId)) continue
    seen.add(e.messageId)
    const m = (from ?? []).find((x) => x.id === e.messageId)
    if (m) n += Math.min(12_000, standingText(m).length)
  }
  return n
}


/**
 * What came back, as suggestions to place, by the message each goes in.
 * @param {Array<{ edit: number, in: string, quote: string, replace: string }>} found
 * @param {Map<string, object>} parts
 * @param {() => string} newId
 * @returns {Map<string, Array<{ id: string, kind: 'ripple', quote: string, text: string, edit: number }>>}
 */
export function landingsOf(found, parts, newId) {
  const out = new Map()
  for (const s of found ?? []) {
    const m = parts.get(s.in)
    if (!m) continue
    if (!out.has(m.id)) out.set(m.id, [])
    out.get(m.id).push({ id: newId(), kind: 'ripple', quote: s.quote, text: s.replace, edit: s.edit })
  }
  return out
}

/**
 * The checks for one prompt (C231): one call per other branch, with only the
 * edits and that branch's matching parts; what comes back lands as
 * suggestions. Resolves to what the bar says when all have ended. The calls
 * are given, so this is tested without a model: messagesOf(chatId), ask(request)
 * the helper's answer (null when unreadable), land(messageId, items) how many
 * landed and how many could not.
 * @param {{ going: object[], from: object[], branches: Array<{ chatId: string, address: string }>,
 *   messagesOf: (chatId: string) => Promise<object[]>, ask: (request: object) => Promise<object[]|null>,
 *   land: (messageId: string, items: object[]) => Promise<{ landed: number, missed: number }>, newId: () => string }} args
 */
export async function checkBranches({ going, from, branches, messagesOf, ask, land, newId }) {
  const outcomes = await Promise.all((branches ?? []).map(async (b) => {
    try {
      const made = rippleRequest({ edits: going, from, to: await messagesOf(b.chatId) })
      if (!made) return { address: b.address, landed: 0, missed: 0 }
      const found = await ask(made.request)
      if (!found) return { address: b.address, failed: true }
      let landed = 0
      let missed = 0
      for (const [messageId, items] of landingsOf(found, made.parts, newId)) {
        const got = await land(messageId, items)
        landed += got.landed
        missed += got.missed
      }
      return { address: b.address, landed, missed }
    } catch {
      return { address: b.address, failed: true }
    }
  }))
  const checked = outcomes.filter((o) => !o.failed)
  const failed = outcomes.filter((o) => o.failed).map((o) => o.address)
  if (!checked.length) return { message: 'rippleFailed', values: { nums: failed } }
  const also = []
  const missed = checked.reduce((n, o) => n + o.missed, 0)
  if (missed) also.push({ message: 'rippleMissed', values: { count: missed } })
  if (failed.length) also.push({ message: 'rippleFailed', values: { nums: failed } })
  const landed = checked.reduce((n, o) => n + o.landed, 0)
  return { message: 'rippleDone', values: { count: landed, nums: checked.filter((o) => o.landed).map((o) => o.address), checked: checked.length }, ...(also.length ? { also } : {}) }
}

/**
 * Suggestions for one message, placed where each quote stands unmarked once
 * (C229 (d)) and kept in one write; if the message changed while the helper
 * was asked, placed again on what it is now. Ripple's and sweeps' alike.
 * @param {import('idb').IDBPDatabase} db
 * @param {{ kind: 'ripple'|'sweep', model: string|null, fromOf: (item: object) => object }} how
 *   fromOf: where each came from, as its record keeps it (C229 (b))
 * @returns {Promise<{ landed: number, missed: number, blocks?: object[], conversationId?: string }>}
 */
export async function landSuggestions(db, messageId, items, { kind, model, fromOf }) {
  for (let tries = 0; tries < 2; tries++) {
    const m = await db.get('messages', messageId)
    if (!m) return { landed: 0, missed: items.length }
    const placed = placeInStored(m.blocks ?? null, firstDocOf(m), items)
    if (!placed?.placed.length) return { landed: 0, missed: items.length }
    const byId = new Map(items.map((i) => [i.id, i]))
    const list = placed.placed.map((mark) => {
      const s = placed.suggestions.get(mark)
      return { mark, kind, struck: s.struck, suggested: s.suggested, places: s.places, from: fromOf(byId.get(mark)), model }
    })
    try {
      await addSuggestions(db, messageId, { expect: m.blocks ?? null, blocks: placed.blocks, suggestions: list, part: m.role === 'user' ? 'prompt' : 'reply' })
      return { landed: list.length, missed: placed.missed.length, blocks: placed.blocks, conversationId: m.conversationId }
    } catch (err) {
      if (err?.name !== 'Changed') throw err
    }
  }
  return { landed: 0, missed: items.length }
}

/** Ripple's, carrying the edit each came from (C231 (h)). */
export const landRipple = (db, messageId, items, from) => landSuggestions(db, messageId, items, {
  kind: 'ripple', model: from.model, fromOf: (item) => ({ edit: item.edit, chat: from.chat, branch: from.branch }),
})

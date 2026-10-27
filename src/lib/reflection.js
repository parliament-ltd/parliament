// Reflection (stage 12, piece 4; the editing spec, "Reflection"; C228, C235,
// ruled 27 October). The board reads a chat and its plan's other branches
// with everything marked in them, and never writes to them (C228 (j)).
//
// This module only reads: rows Records already holds, and messages through a
// reader it is given. It may import no module that writes (the database,
// the records module, the stores); a lint rule and a test hold it to that.
// What Reflect and the talk send is built here; the calls go through the
// gateway, from the shell, and what comes back stays in the tab (C235 (g)).

import { wordsOf } from '../editing/blocks'
import { withoutAnswers } from '../editing/answers'

const fromSource = (r) => Boolean(r?.sources?.length) && !r?.models?.length
const addressOf = (r) => (r.docketNum != null && r.branch ? `${r.docketNum}${r.branch}` : String(r.num))
const READS = 24_000
const SYSTEM_CHARS = 1500
const CHARS_PER_TOKEN = 4

/**
 * What the board reads (C235 (b)): the room's chat and the other branches of
 * its plan, and what its head calls them. null with no chat in the room.
 * @returns {{ key: string, head: string, chats: Array<{ chatId: string, num: number, address: string, source: boolean }> }|null}
 */
export function reflectionScope(rows, roomChat) {
  const row = roomChat ? (rows ?? []).find((r) => r.kind === 'chat' && r.chatId === roomChat) : null
  if (!row) return null
  const plan = row.docketNum != null ? (rows ?? []).find((r) => r.kind === 'docket' && r.docketNum === row.docketNum) : null
  const chats = plan
    ? (rows ?? []).filter((r) => r.kind === 'chat' && r.docketNum === row.docketNum).sort((a, b) => String(a.branch).localeCompare(String(b.branch)))
    : [row]
  return {
    key: chats.map((r) => r.chatId).join('|'),
    head: plan ? String(plan.num) : String(row.num),
    chats: chats.map((r) => ({ chatId: r.chatId, num: r.num, address: addressOf(r), source: fromSource(r) })),
  }
}

const KINDS = ['edit', 'ask', 'suggestion', 'term', 'quote', 'note']

/** Marked so far (C235 (c)): each kind counted, and the branches with anything marked. No call. */
export function markedSoFar(rows, scope) {
  const counts = Object.fromEntries(KINDS.map((k) => [k, 0]))
  const branches = new Set()
  const byChat = new Map((scope?.chats ?? []).map((c) => [c.chatId, c.address]))
  for (const r of rows ?? []) {
    if (!KINDS.includes(r.kind) || !byChat.has(r.chatId)) continue
    counts[r.kind] += 1
    branches.add(byChat.get(r.chatId))
  }
  return { counts, branches: [...branches].sort() }
}

/** Session (C235 (c)): messages, tokens as the providers reported them, and the cost Records knows. No call. */
export function sessionOf(rows, scope, messagesByChat) {
  let messages = 0
  let tokens = 0
  for (const c of scope?.chats ?? []) {
    for (const m of messagesByChat?.get(c.chatId) ?? []) {
      if (m?.role !== 'user' && m?.role !== 'assistant') continue
      messages += 1
      tokens += (Number(m.usage?.input) || 0) + (Number(m.usage?.output) || 0)
    }
  }
  const costs = (scope?.chats ?? []).map((c) => (rows ?? []).find((r) => r.kind === 'chat' && r.chatId === c.chatId)?.cost)
  const cost = costs.length && costs.every((x) => typeof x === 'number') ? costs.reduce((a, b) => a + b, 0) : null
  return { messages, tokens, cost }
}

// A message's words as they read now: an edited one's stored form, else what was written.
const textOf = (m) => (Array.isArray(m?.blocks) ? wordsOf(m.blocks) : m?.role === 'assistant' ? withoutAnswers(m.content) : String(m?.content ?? ''))

// What each marking says, as text (C235 (d)).
function markText(r) {
  const c = r.change ?? {}
  if (r.kind === 'edit') return `${c.part === 'prompt' ? 'in their prompt, ' : ''}struck "${c.struck ?? ''}"${c.added ? `, wrote "${c.added}"` : ''}`
  if (r.kind === 'ask') return `asked about "${c.passage ?? ''}": ${c.question ?? ''}${c.answer?.text ? ` (answered: ${c.answer.text}; ${c.state ?? ''})` : ''}`
  if (r.kind === 'suggestion') return `${c.made === 'sweep' ? `a sweep under ${c.from?.name ?? 'a framework'}` : 'Ripple'} suggested "${c.struck ?? ''}" become "${c.suggested ?? ''}": ${c.state === 'open' ? 'not yet decided' : c.state}`
  return String(r.text ?? '')
}

/**
 * What Reflect and the talk send (C235 (d)): each branch's turns as they read
 * now, a source's marked; the markings; the frameworks there are.
 * @param {{ scope: object, rows: object[], messagesByChat: Map<string, object[]>, frameworks: Array<{ id: string, instruction: string }>, nameOf: (f: object) => string }} args
 */
export function reflectRequest({ scope, rows, messagesByChat, frameworks, nameOf }) {
  const byChat = new Map((scope?.chats ?? []).map((c) => [c.chatId, c.address]))
  return {
    branches: (scope?.chats ?? []).map((c) => ({
      address: c.address,
      turns: (messagesByChat?.get(c.chatId) ?? [])
        .filter((m) => (m?.role === 'user' || m?.role === 'assistant') && !m.incomplete && String(m.content ?? '').trim())
        .map((m) => ({ who: m.role === 'user' ? 'person' : m.source ? 'source' : 'model', text: textOf(m) })),
    })),
    marks: (rows ?? []).filter((r) => KINDS.includes(r.kind) && byChat.has(r.chatId))
      .map((r) => ({ kind: r.kind, branch: byChat.get(r.chatId), text: markText(r) })),
    frameworks: (frameworks ?? []).map((f) => ({ id: f.id, name: nameOf ? nameOf(f) : f.name ?? f.id, instruction: f.instruction })),
  }
}

/** About how many tokens a Reflect or a talk sends, from what Records holds of the chats. */
export function reflectTokens(rows, scope, extra = 0) {
  const chars = (scope?.chats ?? []).reduce((n, c) => n + String((rows ?? []).find((r) => r.kind === 'chat' && r.chatId === c.chatId)?.words ?? '').length, 0)
  return Math.ceil((SYSTEM_CHARS + Math.min(READS, chars) + 2000 + extra) / CHARS_PER_TOKEN)
}

/** Whether what is read goes past what is sent, so the oldest turns are left out (C235 (d)). */
export const reflectCut = (rows, scope) => (scope?.chats ?? []).reduce((n, c) => n + String((rows ?? []).find((r) => r.kind === 'chat' && r.chatId === c.chatId)?.words ?? '').length, 0) > READS

/**
 * The messages of the chats it reads, through the reader it is given: the
 * only way this module reaches stored data, and it only reads.
 * @param {{ chats: Array<{ chatId: string }> }} scope
 * @param {{ messagesOf: (chatId: string) => Promise<object[]> }} reader
 */
export async function readScope(scope, reader) {
  const out = new Map()
  for (const c of scope?.chats ?? []) out.set(c.chatId, await reader.messagesOf(c.chatId).catch(() => []))
  return out
}

const ready = (h) => Boolean(h) && !h.needsKey && !h.later && !h.gone && !h.unchecked
const priced = (tokens, h) => {
  const per = h?.price?.inputPerMillion
  return typeof per === 'number' ? (tokens * per) / 1_000_000 : null
}
const costSays = (prefix, values, tokens, h) => {
  const cost = priced(tokens, h)
  if (cost == null) return { message: `${prefix}Unpriced`, values: { ...values, tokens } }
  return { message: cost < 0.01 ? `${prefix}Cheap` : prefix, values: { ...values, cost: cost < 0.01 ? 0.01 : cost } }
}

/**
 * reflect: before Enter (C235 (d)). screens.reflecting: { scope, rows, helper, rules }
 * with rules the room chat's frameworks, by name.
 * @returns {{ says: object, act: object|null }}
 */
export function planReflect(step, screens = {}) {
  const r = screens.reflecting
  if (!r?.scope) return { says: { message: 'reflectNoRoom' }, act: null }
  if (!ready(r.helper)) return { says: { message: 'reflectNoKey', values: { head: r.scope.head } }, act: null }
  const values = { head: r.scope.head, count: r.scope.chats.length, model: r.helper.name }
  const says = costSays('reflectGo', values, reflectTokens(r.rows, r.scope), r.helper)
  const also = []
  if (r.rules?.length) also.push({ message: 'reflectUnder', values: { names: r.rules } })
  if (reflectCut(r.rows, r.scope)) also.push({ message: 'reflectCut' })
  return { says: also.length ? { ...says, also } : says, act: { kind: 'reflect', key: r.scope.key } }
}

/**
 * A prompt with Reflection addressed: the talk about the chat, never the
 * chat itself (C235 (f)).
 * @returns {{ ready: boolean, says: object }}
 */
export function reflectTalkPreview(text, r) {
  if (!r?.scope) return { ready: false, says: { message: 'reflectNoRoom' } }
  if (!ready(r.helper)) return { ready: false, says: { message: 'reflectNoKey', values: { head: r.scope.head } } }
  if (r.busy) return { ready: false, says: { message: 'reflectTalkBusy' } }
  if (!String(text ?? '').trim()) return { ready: false, says: { message: 'reflectTalkRest', values: { head: r.scope.head } } }
  const says = costSays('reflectTalkGo', { head: r.scope.head, model: r.helper.name }, reflectTokens(r.rows, r.scope, String(text).length + (r.talkChars ?? 0)), r.helper)
  return { ready: true, says: { ...says, also: [{ message: 'reflectNothingBack', values: { head: r.scope.head } }] } }
}

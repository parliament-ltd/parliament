// Sweeps (stage 12, piece 3; the editing spec, "Sweeps"; C228, C233).
// Pure, apart from landing: what sweep: names, its Enter line, what the
// helper is asked, and what comes back as suggestions. The call goes
// through the gateway, from the shell.
//
//   sweep:201a pushback   Push back on me applied to 201a's last reply
//   sweep:216 editor      the same by a chat's number, with one of your own
//   sweep:201a            names the chat's frameworks, to pick one
//   sweep:                the room's chat
//
// A source's answer is never swept: its words are the source's (C233 (b)).

import { findFrameworks } from './frameworks'
import { standingText } from './ripple'

const SYSTEM_CHARS = 1300
const READS = 12_000
const CHARS_PER_TOKEN = 4

const fromSource = (r) => Boolean(r?.sources?.length) && !r?.models?.length
const addressOf = (r) => (r.docketNum != null && r.branch ? `${r.docketNum}${r.branch}` : String(r.num))

/** The last reply a model wrote in a chat, or null: never a source's, a summary or one still being written. */
export function lastReply(messages) {
  const replies = (messages ?? []).filter((m) => m?.role === 'assistant' && !m.source && !m.summary && !m.incomplete && String(m.content ?? '').trim())
  return replies[replies.length - 1] ?? null
}

/** What the helper is asked: the rule, as the person keeps it, and the reply as it reads now. */
export const sweepRequest = (framework, name, reply) => ({ rule: { name, instruction: framework.instruction }, text: standingText(reply) })

/** What came back, as suggestions to place in the reply, each with a new id. */
export const sweepItems = (found, newId) => (found ?? []).map((s) => ({ id: newId(), kind: 'sweep', quote: s.quote, text: s.replace }))

/**
 * sweep: before Enter (C233 (b), (e)).
 * screens: records.rows; roomChat; frameworks { list, nameOf, now } (the
 * room chat's, now); rippling.helper (who checks, sweeps and reflects, C228 (c)).
 * @returns {{ says: object, act: object|null }}
 */
export function planSweep(step, screens = {}) {
  const rows = screens.records?.rows ?? []
  const vals = step.match?.values ?? []
  const fw = screens.frameworks ?? {}
  let row
  const at = vals[0]
  if (!at || at.kind !== 'address') {
    row = screens.roomChat ? rows.find((r) => r.kind === 'chat' && r.chatId === screens.roomChat) : null
    if (!row) return { says: { message: 'sweepNoRoom' }, act: null }
  } else if (at.letter) {
    row = rows.find((r) => r.kind === 'chat' && r.docketNum === at.num && r.branch === at.letter)
  } else {
    row = rows.find((r) => r.num === at.num)
    if (row?.kind === 'docket') return { says: { message: 'sweepWhichBranch', values: { num: at.num } }, act: null }
  }
  if (!row || row.kind !== 'chat') return { says: { message: 'sweepNotChat', values: { address: at?.text ?? String(at?.num ?? '') } }, act: null }
  const address = addressOf(row)
  if (fromSource(row)) return { says: { message: 'sweepSource', values: { address } }, act: null }
  const word = (at?.kind === 'address' ? vals[1] : vals[0])
  const said = word ? String(word.value ?? word.text ?? '') : ''
  const nameOf = fw.nameOf ?? ((f) => f.name ?? f.id)
  if (!said) {
    const here = row.chatId === screens.roomChat ? (fw.now ?? []) : []
    const names = (fw.list ?? []).filter((f) => here.includes(f.id)).map(nameOf)
    return { says: names.length ? { message: 'sweepPick', values: { address, names } } : { message: 'sweepPickAny', values: { address } }, act: null }
  }
  const found = findFrameworks(said, fw.list ?? [], nameOf)
  if (!found.length) return { says: { message: 'frameworkNone', values: { word: said } }, act: null }
  if (found.length > 1) return { says: { message: 'frameworkWhich', values: { word: said, names: found.map(nameOf) } }, act: null }
  const framework = found[0]
  const h = screens.rippling?.helper
  const ready = Boolean(h) && !h.needsKey && !h.later && !h.gone && !h.unchecked
  const name = nameOf(framework)
  if (!ready) return { says: { message: 'sweepNoKey', values: { address, name } }, act: null }
  const tokens = Math.ceil((SYSTEM_CHARS + framework.instruction.length + Math.min(READS, String(row.words ?? '').length || 2000)) / CHARS_PER_TOKEN)
  const per = h.price?.inputPerMillion
  const cost = typeof per === 'number' ? (tokens * per) / 1_000_000 : null
  const says = cost == null
    ? { message: 'sweepGoUnpriced', values: { address, name, model: h.name, tokens } }
    : { message: cost < 0.01 ? 'sweepGoCheap' : 'sweepGo', values: { address, name, model: h.name, cost: cost < 0.01 ? 0.01 : cost } }
  return {
    says,
    act: { kind: 'sweep', chatId: row.chatId, address, framework: { id: framework.id, name, instruction: framework.instruction }, helper: { id: h.id, provider: h.provider } },
  }
}

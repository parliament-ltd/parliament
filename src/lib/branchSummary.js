// open:203b summary (refactor-plan.md, stage 8, piece 4; branch slider v9;
// C60, C175). A new branch, the next letter of the plan, that starts from a
// summary of another instead of its whole history. The helper writes the
// summary in one call, named before Enter with what it costs and the room it
// frees; the estimate is worked out here, sending nothing. Pure.

import { withoutInvisible } from './translations'
import { CHARS_PER_TOKEN, inputCost } from '../shell/estimate'

// What the summary may come to, in tokens, and what the estimate counts it
// as once written (about 300 words).
export const BRANCH_SUMMARY_TOKENS = 800
export const BRANCH_SUMMARY_SIZE = 400
// The most of a chat a summary reads, in characters (about 100,000
// tokens): the latest part of a longer one.
export const BRANCH_SUMMARY_READS = 400_000
// Its instructions and the labels around each turn.
const INSTRUCTION_CHARS = 1000
const CENT = 0.01

/** Whether a message's summary note is well formed: the chat it summarizes and the last message it read. */
export const isSummaryNote = (s) => Boolean(s) && typeof s === 'object' && !Array.isArray(s)
  && typeof s.of === 'string' && s.of.length > 0 && s.of.length <= 100
  && typeof s.upTo === 'string' && s.upTo.length > 0 && s.upTo.length <= 100
  && Object.keys(s).every((k) => k === 'of' || k === 'upTo')

/**
 * The turns of a chat as the helper is given them, each labelled with who
 * wrote it: the person, a model by name, a source (its text fetched from a
 * website, marked as such), or an earlier summary. Invisible characters
 * are taken out. A chat longer than the summary reads gives its latest part.
 * @param {Array<{ role: string, content: string, model?: string, source?: object, summary?: object }>} messages oldest first
 * @param {{ modelName?: (id: string) => string|null }} [names]
 * @returns {{ turns: Array<{ label: string, text: string }>, chars: number, left: number }}
 */
export function summaryTurns(messages, { modelName = () => null } = {}) {
  const all = []
  for (const m of messages ?? []) {
    const text = withoutInvisible(String(m?.content ?? '')).trim()
    if (!text) continue
    let label
    if (m.role === 'user') label = 'person'
    else if (m.source) label = `source: ${m.source.name ?? m.source.id ?? 'unknown'}`
    else if (m.summary) label = 'summary of an earlier part'
    else label = modelName(m.model) ? `model: ${modelName(m.model)}` : 'model'
    all.push({ label, text })
  }
  let from = all.length
  let chars = 0
  while (from > 0 && chars + all[from - 1].text.length <= BRANCH_SUMMARY_READS) {
    from -= 1
    chars += all[from].text.length
  }
  // One turn longer than all the summary reads: its end.
  if (from === all.length && all.length) {
    const last = all[all.length - 1]
    return { turns: [{ ...last, text: last.text.slice(-BRANCH_SUMMARY_READS) }], chars: BRANCH_SUMMARY_READS, left: all.length - 1 }
  }
  return { turns: all.slice(from), chars, left: from }
}

/** Roughly how many tokens the helper is sent for a chat of so many characters. */
export const summaryTokens = (chars) => Math.ceil((Math.min(chars, BRANCH_SUMMARY_READS) + INSTRUCTION_CHARS) / CHARS_PER_TOKEN)

/**
 * At most what writing the summary costs at the helper's price: 0 on this
 * computer, null when the price is not known.
 */
export function branchSummaryCost(chars, price) {
  if (price?.type === 'free-local') return 0
  const inCost = inputCost(summaryTokens(chars), price?.inputPerMillion)
  const outCost = inputCost(BRANCH_SUMMARY_TOKENS, price?.outputPerMillion)
  return inCost == null || outCost == null ? null : inCost + outCost
}

/**
 * How much of what a model reads at once a chat fills now, and about what
 * the summary will, as whole percentages; null when how much it reads is
 * not known.
 * @param {number} chars the chat's characters
 * @param {number|null} window the tokens the model reads at once
 */
export function contextShare(chars, window) {
  if (!Number.isFinite(window) || window <= 0) return null
  const tokens = Math.ceil(Math.max(0, chars) / CHARS_PER_TOKEN)
  return { tokens, share: (tokens / window) * 100, after: (BRANCH_SUMMARY_SIZE / window) * 100 }
}

/** The context estimate in words: "Context 41% → 7%", with "under 1%" for less. */
export function contextLine(c, model) {
  if (!c) return null
  const under = (x) => x < 1
  const values = { model, share: under(c.share) ? 1 : Math.round(c.share), low: under(c.after) ? 1 : Math.round(c.after) }
  if (c.share > 100) return { message: 'openSummaryContextOver', values }
  const message = under(c.share) ? 'openSummaryContextSmall' : under(c.after) ? 'openSummaryContextUnder' : 'openSummaryContext'
  return { message, values }
}

/**
 * open:203b summary, said before Enter (C175).
 * @param {{ address: string, next: string|null, chatId: string, chars: number, sources?: string[],
 *   answerer?: { name: string, window: number|null, group: string }|null, helper: object|null,
 *   privacy?: string, localReads?: number }} f
 *   address: the branch summarized; next: the address the new branch will
 *   have, when known; chars: what the branch holds; sources: the sources
 *   that answered in it; answerer: who answers the new branch, and how much
 *   it reads at once; helper: who writes the summary (net.helperOf);
 *   privacy: the privacy filter as set.
 */
export function planBranchSummary(f) {
  const h = f.helper
  if (!h) return { says: { message: 'openSummaryNoOne', values: { address: f.address } }, act: null }
  if (h.needsKey) return { says: { message: 'byNeedsKey', values: { name: h.name, provider: h.providerName, command: `api:${h.provider}` } }, act: null }
  if (h.unchecked) return { says: { message: 'helperUnchecked', values: { name: h.name, command: `api:${h.provider}` } }, act: null }
  if (h.later || h.gone) return { says: { message: 'openSummaryNoOne', values: { address: f.address } }, act: null }
  if (!f.chars) return { says: { message: 'openSummaryEmpty', values: { address: f.address } }, act: null }
  const values = { address: f.address, next: f.next ?? '', name: h.name }
  const local = h.group === 'local'
  const tokens = summaryTokens(f.chars)
  const cost = branchSummaryCost(f.chars, h.price)
  const tail = f.next ? '' : 'Next'
  let says
  if (local) says = { message: `openSummaryLocal${tail}`, values }
  else if (cost == null) says = { message: `openSummaryUnpriced${tail}`, values: { ...values, tokens } }
  else says = { message: `openSummary${cost < CENT ? 'Cheap' : ''}${tail}`, values: { ...values, tokens, cost: cost < CENT ? CENT : cost } }
  const also = []
  const ctx = f.answerer && f.answerer.group !== 'source' ? contextLine(contextShare(f.chars, f.answerer.window), f.answerer.name) : null
  if (ctx) also.push(ctx)
  // Answers from sources stay out of what a model is sent unless the person
  // acts on them (C115): this is acting, so it is said.
  if (f.sources?.length) also.push({ message: 'openSummarySources', values: { sources: f.sources, name: h.name } })
  if (f.chars > BRANCH_SUMMARY_READS) also.push({ message: 'openSummaryLong', values: { reads: Math.ceil(BRANCH_SUMMARY_READS / CHARS_PER_TOKEN) } })
  if (local && f.localReads && tokens > f.localReads) also.push({ message: 'promptLocalLong', values: { name: h.name, tokens, reads: f.localReads, provider: h.providerName ?? 'Ollama' } })
  if (!local && f.privacy && f.privacy !== 'off') also.push({ message: 'openSummaryPrivacy' })
  return {
    says: { ...says, also },
    act: { kind: 'branchSummary', chatId: f.chatId, address: f.address, plan: f.plan ?? null, next: f.next ?? null, helper: { id: h.id, provider: h.provider, name: h.name, group: h.group } },
  }
}

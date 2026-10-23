// to: and the branches of the slider on screen (refactor-plan.md, stage 8,
// piece 3; branch slider v9; the editing spec's to:; C174). Planned before
// Enter: what the Enter line says, and what Enter does. Pure.
//
//   to:201b          the next prompts carry 201b on, until changed
//   to:201a, 201c    those two, each carrying its own on
//   to:all           every branch of the prompt

import { targetsOf } from './rowVerbs'
import { CHARS_PER_TOKEN, inputCost } from '../shell/estimate'

const flat = (args = []) => args.flatMap((a) => (a.kind === 'list' ? a.items : [a]))
const CENT = 0.01

/**
 * A chat's last prompt, for again: (C177): its id, its words as the Enter
 * line names them, its length, and the length of what went before it that a
 * model is sent (answers from sources stay out, C115). null with none.
 */
export function promptFacts(messages = []) {
  // A message's words with what it brought in from sources (C176).
  const charsOf = (x) => (typeof x?.content === 'string' && !x.source ? x.content.length : 0)
    + (Array.isArray(x?.included) ? x.included.reduce((n, i) => n + String(i?.text ?? '').length, 0) : 0)
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m?.role !== 'user' || typeof m.content !== 'string' || !m.content.trim()) continue
    const words = m.content.trim()
    const before = messages.slice(0, i).reduce((n, x) => n + charsOf(x), 0)
    const brought = Array.isArray(m.included) ? [...new Set(m.included.map((x) => x?.source?.name ?? x?.source?.id).filter(Boolean))] : []
    return { id: m.id, text: words.length > 60 ? `${words.slice(0, 59)}…` : words, chars: charsOf(m), before, ...(brought.length ? { brought } : {}) }
  }
  return null
}

/**
 * again:, again:203a (editing spec; stage 8, piece 5; C177): a branch's last
 * prompt asked again as a new branch, the plan's next letter, by who answers
 * that branch; its reply joins the tabs under that prompt. From the edited
 * prompt once editing comes (stage 11). screens.again: { room, rows,
 * factsOf(chatId) }: the chat the room shows (undefined with no room), the
 * rows of Records, and for a chat its address, plan, the next branch's
 * address, whether it is on screen, its last prompt (promptFacts) and who
 * answers it (as net.answererOf describes them).
 */
export function planAgain(step, screens = {}) {
  const g = screens.again
  if (!g) return { says: { message: 'later', values: { verb: 'again:' } }, act: null }
  const [arg] = step.match?.values ?? []
  let chatId
  if (!arg) {
    if (g.room === undefined) return { says: { message: 'againNoRoom' }, act: null }
    if (!g.room) return { says: { message: 'againEmpty' }, act: null }
    chatId = g.room
  } else {
    const t = targetsOf([arg], g.rows ?? [])
    if (t.bad) return { says: t.bad, act: null }
    const row = t.rows[0]
    chatId = row.kind === 'chat' || row.kind === 'docket' ? row.chatId : null
    if (!chatId) return { says: { message: 'againNotChat', values: { num: arg.text ?? String(row.num) } }, act: null }
  }
  const f = g.factsOf?.(chatId) ?? null
  if (!f || !f.next) return { says: { message: 'againNotChat', values: { num: f?.address ?? arg?.text ?? '' } }, act: null }
  if (!f.onScreen) return { says: { message: 'againNotOnScreen', values: { address: f.address } }, act: null }
  if (!f.prompt) return { says: { message: 'againNothing', values: { address: f.address } }, act: null }
  const w = f.answerer
  if (w.needsKey) return { says: { message: 'byNeedsKey', values: { name: w.name, provider: w.providerName, command: `api:${w.provider}` } }, act: null }
  if (w.unchecked) return { says: { message: 'helperUnchecked', values: { name: w.name, command: `api:${w.provider}` } }, act: null }
  if (w.later || w.gone) return { says: { message: 'againNoOne', values: { name: w.name, address: f.address } }, act: null }
  const values = { prompt: f.prompt.text, next: f.next, address: f.address, name: w.name }
  let says
  if (w.group === 'source') says = { message: 'againSource', values }
  else if (w.group === 'local') says = { message: 'againLocal', values }
  else {
    const tokens = Math.ceil((f.prompt.before + f.prompt.chars + (f.systemChars ?? 0)) / CHARS_PER_TOKEN)
    const cost = inputCost(tokens, w.price?.inputPerMillion)
    says = cost == null ? { message: 'againUnpriced', values: { ...values, tokens } }
      : cost < CENT ? { message: 'againCheap', values: { ...values, tokens, cost: CENT } }
        : { message: 'again', values: { ...values, tokens, cost } }
  }
  const also = [{ message: 'againTabs' }]
  // What that prompt brought in from sources goes again, to a model (C176).
  if (f.prompt.brought?.length && w.group !== 'source') also.unshift({ message: 'againIncluded', values: { sources: f.prompt.brought } })
  return {
    says: { ...says, also },
    act: { kind: 'again', chatId, promptId: f.prompt.id, address: f.address, plan: f.plan ?? null, next: f.next, answerer: { id: w.id, group: w.group, name: w.name } },
  }
}

/**
 * to: (C174). screens.branching: { shown, held }: the slider on screen
 * (branchView.lastShown(): its group, chats, line and members, each
 * { chatId, letter, address, name }) and what to: holds now.
 */
export function planTo(step, screens = {}) {
  const b = screens.branching
  const shown = b?.shown ?? null
  if (!shown) return { says: { message: 'toNone' }, act: null }
  const args = step.match?.values ?? []
  const before = b.held?.groupId === shown.groupId ? b.held.chats : null
  let ids
  if (args.length === 1 && args[0].kind === 'word' && args[0].value === 'all') {
    ids = [...shown.chats]
  } else {
    ids = []
    for (const a of flat(args)) {
      const said = String(a.text ?? a.value ?? '').toLowerCase()
      const m = shown.members.find((x) => String(x.address ?? '').toLowerCase() === said)
      if (!m) return { says: { message: 'toNotHere', values: { address: said, nums: shown.members.map((x) => x.address).filter(Boolean) } }, act: null }
      if (!ids.includes(m.chatId)) ids.push(m.chatId)
    }
  }
  if (before && before.length === ids.length && before.every((x, i) => x === ids[i])) return { says: { message: 'toSame' }, act: null }
  const act = { kind: 'replyTo', groupId: shown.groupId, chats: ids, before }
  const addressOf = (id) => shown.members.find((x) => x.chatId === id)?.address ?? ''
  if (ids.length === shown.chats.length && ids.length > 1) return { says: { message: 'toAll', values: { count: ids.length } }, act }
  if (ids.length > 1) return { says: { message: 'toSome', values: { nums: ids.map(addressOf) } }, act }
  const one = shown.members.find((x) => x.chatId === ids[0])
  return { says: { message: 'toOne', values: { address: one?.address ?? '', name: one?.name ?? '' } }, act }
}

// What Enter would do, for the field as it stands on this arrangement: the
// Enter line's sentence and the arrangement Enter would leave (bar
// reference, "The field"; C99). Pure, so it is tested without drawing.
//
// A line is planned whole before anything runs. If any command on it would
// refuse, the Enter line says why and Enter does nothing, so a line never
// stops half done.
//
// What is on screen is one space (C125, ruled 21 October). records:, room:
// and tour: bring their arrangement's boards into it beside what is there,
// like open: brings one board; nothing switches to another screen. So they
// share a line with the other layout commands (C99).
//
// A prompt goes to the room in the space (stage 4). Before Enter the
// line names who receives it and what it costs, worked out here from what
// the shell knows: no request is made to find out (C83).

import { enterLine } from '../commands/registry'
import { plan, planOpen, planBring, planRoom, planFocus, planFocusOff, roomOnScreen, ARRANGEMENT_VERBS } from '../shell/arrangement'
import { cleanRoomName, ROOM_NAME_MAX } from '../lib/roomNames'
import { CHARS_PER_TOKEN, inputCost, describeCost } from '../shell/estimate'
import { holdsKey } from '../commands/parse'

// Verbs whose actions exist in the shell so far; the rest come with their
// stages.
// Verbs that bring an arrangement, or a board, into the space (C95, C125).
const BRINGS = Object.freeze(['records', 'room', 'library', 'plan'])
// Verbs that act on what the bar points at, rather than only on the space:
// name: (C40), tour:, which also shows the welcome steps (A20), and
// inspect:, which shows one thing in detail under the bar, and api:, which
// opens the key panel there (stage 5).
const ACTS = Object.freeze(['name', 'tour', 'inspect', 'api'])
// focus: and focus:off, the first form (W §7; stage 5).
const FOCUS = 'focus'
export const BUILT = new Set([...ARRANGEMENT_VERBS, ...BRINGS, ...ACTS, FOCUS])

/** focus: clears the space to the chat alone; focus:off brings it back. Your own sets come with stage 14. */
function planFocusStep(a, step, screens = {}) {
  const [arg, ...more] = step.match?.values ?? []
  if (!arg) return planFocus(a, screens.lastRoom?.id ?? null)
  if (arg.kind === 'word' && arg.value === 'off' && !more.length) return planFocusOff(a)
  return null
}

// records: brings the Records arrangement, the Records board and the
// Collection, or whatever its owner has made it (C125, C131). room: brings
// the last room, or an empty room when there is no chat yet. library: and
// plan: are open:library and open:plan (C95). A room or a shelf by name
// comes later.
function bring(a, step, screens = {}) {
  const named = Boolean(step.match?.values?.length)
  if (step.verb === 'records') return planBring(a, 'almanac')
  if (step.verb === 'room') return named ? null : planRoom(a, screens.lastRoom?.id ?? null)
  if (step.verb === 'library') return named ? null : planOpen(a, 'library')
  if (step.verb === 'plan') return planOpen(a, 'docket')
  return null
}

const hasWelcome = (a) => a.columns.some((c) => c.includes('welcome'))

/**
 * tour: brings the welcome card back and shows its steps, from anywhere;
 * tour:off puts the steps away (A20). tour:advanced, the second list,
 * comes later. screens.stepsOff says whether the steps are put away now.
 * @returns {{ says: object, next?: object|null, act?: object|null }|null}
 */
function planTour(a, step, screens = {}) {
  const word = step.match?.values?.[0]?.value ?? null
  if (word === 'advanced') return null
  if (word === 'off') {
    if (!hasWelcome(a) || screens.stepsOff) return { says: { message: 'tourOffAlready' }, act: null }
    return { says: { message: 'tourOff' }, act: { kind: 'tourOff' } }
  }
  if (!hasWelcome(a)) return { says: { message: 'goWelcome' }, next: planBring(a, 'welcome').next, act: { kind: 'tourOn' } }
  if (screens.stepsOff) return { says: { message: 'tourOn' }, act: { kind: 'tourOn' } }
  return { says: { message: 'tourHere' }, act: null }
}

// open: and inspect: by number (stage 5, piece 3). screens.numbered holds
// every numbered thing the Almanac lists, by number. A branch (201a) and a
// thing by name come later.
const numberOf = (step) => {
  const [arg] = step.match?.values ?? []
  return arg?.kind === 'address' && !arg.letter && (step.match.values.length === 1) ? arg.num : null
}

// What planRoom says, said of a numbered chat.
const OPENED = {
  goRoom: 'openChat', showRoom: 'openChatHere', roomHere: 'openChatThere',
}
const OPENED_DOCKET = { goRoom: 'openDocket', showRoom: 'openDocketHere', roomHere: 'openChatThere' }

/**
 * open:204. A chat opens in the space's room, or in a room brought beside
 * what is here; a docket opens its first branch. Opening a note, a term or a
 * quote (a chat about it) comes later; inspect: shows it now.
 * @returns {{ next: object|null, says: object }|null}
 */
function openNumber(a, step, screens = {}) {
  const num = numberOf(step)
  if (num == null) return null
  const row = screens.numbered?.get(num)
  if (!row) return { next: null, says: { message: 'numNone', values: { num } } }
  if ((row.kind !== 'chat' && row.kind !== 'docket') || !row.chatId) return { next: null, says: { message: 'openNotYet', values: { num } } }
  const p = planRoom(a, row.chatId)
  const words = row.kind === 'docket' ? OPENED_DOCKET : OPENED
  const shown = row.kind === 'docket' ? row.chatNum ?? num : num
  return { next: p.next, says: { message: words[p.says.message] ?? p.says.message, values: { num: shown } } }
}

/** inspect:204 shows it in detail under the bar. */
function planInspect(a, step, screens = {}) {
  const num = numberOf(step)
  if (num == null) return null
  if (!screens.numbered?.get(num)) return { says: { message: 'numNone', values: { num } }, act: null }
  return { says: { message: 'inspectOne', values: { num } }, act: { kind: 'inspect', num } }
}

/**
 * api: opens the key panel under the field (settings spec §6; stage 5,
 * piece 5). A key goes only into the panel's password field, never into the
 * bar, so a key-shaped line is refused before this (registry). api:<provider>
 * opens that provider's field, for adding or replacing; api:new the first
 * without a key. screens.keys is each built provider that takes a key, with
 * whether it has one and its last four characters; screens.noKey names the
 * sources that need none.
 */
function planApi(a, step, screens = {}) {
  const status = screens.keys ?? []
  const [arg] = step.match?.values ?? []
  if (!arg) return { says: { message: 'apiList' }, act: { kind: 'keys', focus: null } }
  const word = String(arg.value ?? '').toLowerCase()
  if (word === 'new') {
    const free = status.find((k) => !k.has)
    if (!free) return { says: { message: 'apiAllKeyed', values: { words: status.map((k) => `api:${k.id}`) } }, act: null }
    return { says: { message: 'apiNew', values: { provider: free.name } }, act: { kind: 'keys', focus: free.id } }
  }
  const p = status.find((k) => k.id === word || k.name.toLowerCase() === word)
  if (p) {
    return p.has
      ? { says: { message: 'apiReplace', values: { provider: p.name, ending: p.ending } }, act: { kind: 'keys', focus: p.id } }
      : { says: { message: 'apiAdd', values: { provider: p.name } }, act: { kind: 'keys', focus: p.id } }
  }
  const keyless = (screens.noKey ?? []).find((n) => n.toLowerCase() === word)
  if (keyless) return { says: { message: 'apiNoKey', values: { provider: keyless } }, act: null }
  return { says: { message: 'apiUnknown', values: { word, words: [...status.map((k) => `api:${k.id}`), 'api:new'] } }, act: null }
}

// The words of an argument as typed: quoted text without its quotes, or a
// word as written (the parser lower-cases words).
const typed = (arg) => (arg?.kind === 'text' ? arg.value : arg?.text ?? '')

/**
 * name:"…" names what the bar points at (C40). Built for a room: its name
 * is the person's own words, kept on the room. A chat by number
 * (name:207 "…") and collections come with the Almanac and the Collection
 * (stage 6). screens.roomName is what the room on screen is called now.
 * @returns {{ says: object, act: object|null }|null}
 */
function planName(a, step, screens = {}) {
  const args = step.match?.values ?? []
  if (args.length !== 1 || a.addressed !== 'room') return null
  const chat = roomOnScreen(a)
  if (chat === undefined) return null
  if (chat === null) return { says: { message: 'nameNoChat' }, act: null }
  const clean = cleanRoomName(typed(args[0]))
  if (clean.error === 'empty') return { says: { message: 'nameEmpty' }, act: null }
  if (clean.error === 'long') return { says: { message: 'nameLong', values: { max: ROOM_NAME_MAX } }, act: null }
  if (screens.roomName?.own === clean.name) return { says: { message: 'nameSame' }, act: null }
  return { says: { message: 'nameRoom', values: { name: clean.name } }, act: { kind: 'nameRoom', chatId: chat, name: clean.name } }
}

/**
 * @param {string} value the whole field, leader included
 * @param {{ mode: string, arrangement: import('../shell/arrangement').Arrangement, built?: Set<string>,
 *   screens?: { lastRoom?: { id: string, num?: number|null }|null, roomName?: object|null, stepsOff?: boolean,
 *     measure?: () => object|null, numbered?: Map<number, object>, keys?: object[], noKey?: string[] } }} ctx
 *   measure: the space as drawn, for width: (C126); numbered: the Almanac's rows by number, for open: and
 *   inspect:; keys and noKey: for api: (planApi)
 * @returns {{ answer: object, says: { message: string, values?: object }, next: object|null, act?: object|null }}
 *   next is the space after Enter, or null when Enter changes none of it;
 *   act is what Enter does besides, to what the bar points at (name:) or to
 *   the welcome steps (tour:)
 */
export function preview(value, { mode, arrangement, built = BUILT, screens = {} }) {
  const answer = enterLine(value, { mode, board: arrangement.addressed, built })
  if (answer.state !== 'ready') return { answer, says: { message: answer.message, values: answer.values }, next: null }

  const acts = answer.steps.filter((s) => ACTS.includes(s.verb))
  if (acts.length) {
    if (answer.steps.length > 1) return { answer, says: { message: 'aloneNow', values: { verb: `${acts[0].verb}:` } }, next: null }
    const step = answer.steps[0]
    const plans = { tour: planTour, name: planName, inspect: planInspect, api: planApi }
    const p = plans[step.verb](arrangement, step, screens)
    if (!p) return { answer, says: { message: 'later', values: { verb: `${step.verb}:` } }, next: null }
    return { answer, says: p.says, next: p.next ?? null, act: p.act ?? null }
  }

  let a = arrangement
  let last = null
  for (const step of answer.steps) {
    const p = BRINGS.includes(step.verb) ? bring(a, step, screens)
      : step.verb === 'open' && numberOf(step) != null ? openNumber(a, step, screens)
        : step.verb === FOCUS ? planFocusStep(a, step, screens)
          : plan(a, step, screens.measure?.() ?? null)
    if (!p) return { answer, says: { message: 'later', values: { verb: `${step.verb}:` } }, next: null }
    if (!p.next) return { answer, says: p.says, next: null }
    a = p.next
    last = p.says
  }
  const says = answer.steps.length > 1 ? { message: answer.message, values: answer.values } : last
  // After focus: the field turns to prompt mode, under the chat (W §7).
  const last1 = answer.steps[answer.steps.length - 1]
  const after = last1?.verb === FOCUS && !(last1.match?.values ?? []).length ? 'prompt' : null
  return { answer, says, next: a, after }
}

// Below a cent, the line says "under" a cent rather than a fraction of one.
const CENT = 0.01

/**
 * What Enter would do with a prompt (stage 4; C83).
 * @param {string} text the prompt as typed
 * @param {{ room?: string|null, streaming?: boolean, keyed?: boolean|null, provider?: string, source?: string,
 *   historyChars?: number, systemChars?: number, perMillion?: number|null, hiddenOut?: number,
 *   sourcesOut?: { count: number, names: string[] }, resend?: boolean,
 *   describe?: { price: object|null }|null }} target
 *   room: the chat the screen's room shows, null for an empty room, undefined
 *   when no room is on the screen; keyed: whether there is a key for the
 *   provider, null while that is being checked; provider and source: names
 *   from the list; historyChars and systemChars: what would go along;
 *   perMillion: the model's input price; hiddenOut: messages of the chat
 *   that stay out, hidden or being deleted; sourcesOut: answers from
 *   sources that stay out, and the sources' names; describe: set when the first
 *   answer will be followed by the one request for its title, summary and
 *   tags (C62), with the price of the model it goes to; resend: the last
 *   reply here stalled, so an empty field offers to send it again without
 *   streaming (C114)
 * @returns {{ ready: boolean, says: { message: string, values?: object }|null }}
 *   ready: whether Enter sends; says: the line's sentence, null for none
 */
export function promptPreview(text, target = {}) {
  if (target.room === undefined) return { ready: false, says: { message: 'promptNoRoom' } }
  if (target.streaming) return { ready: false, says: { message: 'promptBusy' } }
  const prompt = String(text ?? '').trim()
  if (!prompt) {
    // The last reply here stalled: with nothing typed, Enter offers to send
    // it again without streaming, naming the cost. Never sent unasked (C114).
    if (target.resend && target.keyed) {
      const tokens = Math.ceil(((target.historyChars ?? 0) + (target.systemChars ?? 0)) / CHARS_PER_TOKEN)
      const cost = inputCost(tokens, target.perMillion)
      const offer = cost == null
        ? { message: 'promptResendUnpriced', values: { tokens } }
        : cost < CENT
          ? { message: 'promptResendCheap', values: { tokens, cost: CENT } }
          : { message: 'promptResend', values: { tokens, cost } }
      return { ready: true, resend: true, says: { message: 'promptStalled', also: [offer] } }
    }
    return { ready: false, says: null }
  }
  // A key in a prompt would go to the model, or to a source as a search.
  if (holdsKey(prompt)) return { ready: false, says: { message: 'promptKey' } }
  if (target.keyed == null) return { ready: false, says: { message: 'promptChecking' } }
  if (!target.keyed) return { ready: true, says: { message: 'promptSource', values: { source: target.source } } }

  const tokens = Math.ceil((prompt.length + (target.historyChars ?? 0) + (target.systemChars ?? 0)) / CHARS_PER_TOKEN)
  const cost = inputCost(tokens, target.perMillion)
  const values = { provider: target.provider, tokens }
  const also = []
  // After a chat's first answer, one request for its title, summary and
  // tags, unless turned off in Settings (C62).
  if (target.describe) {
    const extra = describeCost(prompt.length, target.describe.price)
    also.push(extra == null
      ? { message: 'promptDescribeUnpriced' }
      : extra < CENT
        ? { message: 'promptDescribeCheap', values: { cost: CENT } }
        : { message: 'promptDescribe', values: { cost: extra } })
  }
  // Answers from sources stay out unless the person acts on them (C115).
  if (target.sourcesOut?.count > 0) {
    also.push({ message: 'promptSourcesOut', values: { count: target.sourcesOut.count, sources: target.sourcesOut.names } })
  }
  // Hidden messages, and messages being deleted, stay out of what is sent.
  if (target.hiddenOut > 0) also.push({ message: 'promptHiddenOut', values: { count: target.hiddenOut } })
  const says = cost == null
    ? { message: 'promptSendUnpriced', values }
    : cost < CENT
      ? { message: 'promptSendCheap', values: { ...values, cost: CENT } }
      : { message: 'promptSend', values: { ...values, cost } }
  return { ready: true, says: also.length ? { ...says, also } : says }
}

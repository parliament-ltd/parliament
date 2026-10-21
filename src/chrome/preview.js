// What Enter would do, for the field as it stands on this arrangement: the
// Enter line's sentence and the arrangement Enter would leave (bar
// reference, "The field"; C99). Pure, so it is tested without drawing.
//
// A line is planned whole before anything runs. If any command on it would
// refuse, the Enter line says why and Enter does nothing, so a line never
// stops half done.
//
// alm: and sym: go to another screen (C95): each screen keeps its own
// arrangement (C102), so a switch runs on a line of its own, and Enter
// hands the shell the screen to go to instead of an arrangement.
//
// A prompt goes to the room the screen shows (stage 4). Before Enter the
// line names who receives it and what it costs, worked out here from what
// the shell knows: no request is made to find out (C83).

import { enterLine } from '../commands/registry'
import { plan, planOpen, ARRANGEMENT_VERBS, NEW_ROOM, roomArrangementId, roomChat } from '../shell/arrangement'
import { cleanRoomName, ROOM_NAME_MAX } from '../lib/roomNames'
import { CHARS_PER_TOKEN, inputCost, describeCost } from '../shell/estimate'

// Verbs whose actions exist in the shell so far; the rest come with their
// stages.
const SWITCHES = Object.freeze(['alm', 'sym'])
// Verbs that act on what the bar points at, rather than on the arrangement,
// or that go to the welcome page (tour:, A20).
const ACTS = Object.freeze(['name', 'tour'])
// Verbs that are the same as open: for their board (C95).
const OPENS = Object.freeze(['library'])
export const BUILT = new Set([...ARRANGEMENT_VERBS, ...SWITCHES, ...ACTS, ...OPENS])

// On the welcome page alm: opens the Almanac on the right of the card (W §5)
// rather than going to the Almanac's own screen (C124, to be ruled), and
// library: is the same as open:library everywhere (C95).
function opens(a, step) {
  if (step.verb === 'library' && !step.match?.values?.length) return planOpen(a, 'library')
  if (step.verb === 'alm' && a.id === 'welcome') return planOpen(a, 'almanac')
  return null
}

/**
 * tour: shows the welcome page with its steps, from anywhere; tour:off puts
 * the steps away (A20). tour:advanced, the second list, comes later.
 * screens.stepsOff says whether the steps are put away now.
 */
function planTour(a, step, screens = {}) {
  const word = step.match?.values?.[0]?.value ?? null
  if (word === 'advanced') return null
  if (word === 'off') {
    if (a.id !== 'welcome' || screens.stepsOff) return { says: { message: 'tourOffAlready' }, act: null }
    return { says: { message: 'tourOff' }, act: { kind: 'tourOff' } }
  }
  if (a.id !== 'welcome') return { says: { message: 'goWelcome' }, go: { id: 'welcome', context: {}, show: true } }
  if (screens.stepsOff) return { says: { message: 'tourOn' }, act: { kind: 'tourOn' } }
  return { says: { message: 'tourHere' }, act: null }
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
  const chat = roomChat(a.id)
  if (chat === undefined) return null
  if (chat === null) return { says: { message: 'nameNoChat' }, act: null }
  const clean = cleanRoomName(typed(args[0]))
  if (clean.error === 'empty') return { says: { message: 'nameEmpty' }, act: null }
  if (clean.error === 'long') return { says: { message: 'nameLong', values: { max: ROOM_NAME_MAX } }, act: null }
  if (screens.roomName?.own === clean.name) return { says: { message: 'nameSame' }, act: null }
  return { says: { message: 'nameRoom', values: { name: clean.name } }, act: { kind: 'nameRoom', chatId: chat, name: clean.name } }
}

/**
 * The screen a switch goes to, or a refusal. `sym:` goes back to the last
 * room, the chat most recently written in, or to an empty room when there
 * is none. A room by name comes with name: (stage 4, piece 6).
 * @returns {{ says: object, go: { id: string, context: object }|null }|null}
 */
function planSwitch(a, step, screens = {}) {
  if (step.verb === 'alm') {
    const values = { board: 'almanac' }
    return a.id === 'almanac'
      ? { says: { message: 'almHere', values }, go: null }
      : { says: { message: 'goAlmanac', values }, go: { id: 'almanac', context: {} } }
  }
  if (step.verb === 'sym') {
    if (step.match?.values?.length) return null
    const last = screens.lastRoom
    if (last) {
      const id = roomArrangementId(last.id)
      if (a.id === id) return { says: { message: 'roomHere' }, go: null }
      return { says: { message: 'goRoom' }, go: { id, context: last.num != null ? { room: last.num } : {} } }
    }
    if (a.id === NEW_ROOM) return { says: { message: 'newRoomHere' }, go: null }
    return { says: { message: 'goNewRoom' }, go: { id: NEW_ROOM, context: {} } }
  }
  return null
}

/**
 * @param {string} value the whole field, leader included
 * @param {{ mode: string, arrangement: import('../shell/arrangement').Arrangement, built?: Set<string>,
 *   screens?: { lastRoom?: { id: string, num?: number|null }|null, roomName?: object|null } }} ctx
 * @returns {{ answer: object, says: { message: string, values?: object }, next: object|null, go?: object|null, act?: object|null }}
 *   next is the arrangement after Enter, or null when Enter runs nothing; go
 *   is the screen Enter goes to, for alm: and sym:; act is what Enter does
 *   to what the bar points at, for name:
 */
export function preview(value, { mode, arrangement, built = BUILT, screens = {} }) {
  const answer = enterLine(value, { mode, board: arrangement.addressed, built })
  if (answer.state !== 'ready') return { answer, says: { message: answer.message, values: answer.values }, next: null }

  const acts = answer.steps.filter((s) => ACTS.includes(s.verb))
  if (acts.length) {
    if (answer.steps.length > 1) return { answer, says: { message: 'aloneNow', values: { verb: `${acts[0].verb}:` } }, next: null }
    const step = answer.steps[0]
    const p = step.verb === 'tour' ? planTour(arrangement, step, screens) : planName(arrangement, step, screens)
    if (!p) return { answer, says: { message: 'later', values: { verb: `${step.verb}:` } }, next: null }
    return { answer, says: p.says, next: null, act: p.act ?? null, go: p.go ?? null }
  }

  const switches = answer.steps.filter((s) => SWITCHES.includes(s.verb) && !opens(arrangement, s))
  if (switches.length) {
    if (answer.steps.length > 1) return { answer, says: { message: 'aloneSwitch', values: { verb: `${switches[0].verb}:` } }, next: null }
    const p = planSwitch(arrangement, answer.steps[0], screens)
    if (!p) return { answer, says: { message: 'later', values: { verb: `${answer.steps[0].verb}:` } }, next: null }
    return { answer, says: p.says, next: null, go: p.go }
  }

  let a = arrangement
  let last = null
  for (const step of answer.steps) {
    const p = opens(a, step) ?? plan(a, step)
    if (!p) return { answer, says: { message: 'later', values: { verb: `${step.verb}:` } }, next: null }
    if (!p.next) return { answer, says: p.says, next: null }
    a = p.next
    last = p.says
  }
  const says = answer.steps.length > 1 ? { message: answer.message, values: answer.values } : last
  return { answer, says, next: a }
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

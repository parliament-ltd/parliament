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
import { plan, ARRANGEMENT_VERBS, NEW_ROOM, roomArrangementId } from '../shell/arrangement'
import { CHARS_PER_TOKEN, inputCost, describeCost } from '../shell/estimate'

// Verbs whose actions exist in the shell so far; the rest come with their
// stages.
const SWITCHES = Object.freeze(['alm', 'sym'])
export const BUILT = new Set([...ARRANGEMENT_VERBS, ...SWITCHES])

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
 *   screens?: { lastRoom?: { id: string, num?: number|null }|null } }} ctx
 * @returns {{ answer: object, says: { message: string, values?: object }, next: object|null, go?: object|null }}
 *   next is the arrangement after Enter, or null when Enter runs nothing; go
 *   is the screen Enter goes to, for alm: and sym:
 */
export function preview(value, { mode, arrangement, built = BUILT, screens = {} }) {
  const answer = enterLine(value, { mode, board: arrangement.addressed, built })
  if (answer.state !== 'ready') return { answer, says: { message: answer.message, values: answer.values }, next: null }

  const switches = answer.steps.filter((s) => SWITCHES.includes(s.verb))
  if (switches.length) {
    if (answer.steps.length > 1) return { answer, says: { message: 'aloneSwitch', values: { verb: `${switches[0].verb}:` } }, next: null }
    const p = planSwitch(arrangement, answer.steps[0], screens)
    if (!p) return { answer, says: { message: 'later', values: { verb: `${answer.steps[0].verb}:` } }, next: null }
    return { answer, says: p.says, next: null, go: p.go }
  }

  let a = arrangement
  let last = null
  for (const step of answer.steps) {
    const p = plan(a, step)
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
 *   describe?: { price: object|null }|null }} target
 *   room: the chat the screen's room shows, null for an empty room, undefined
 *   when no room is on the screen; keyed: whether there is a key for the
 *   provider, null while that is being checked; provider and source: names
 *   from the list; historyChars and systemChars: what would go along;
 *   perMillion: the model's input price; hiddenOut: messages of the chat
 *   that stay out, hidden or being deleted; describe: set when the first
 *   answer will be followed by the one request for its title, summary and
 *   tags (C62), with the price of the model it goes to
 * @returns {{ ready: boolean, says: { message: string, values?: object }|null }}
 *   ready: whether Enter sends; says: the line's sentence, null for none
 */
export function promptPreview(text, target = {}) {
  if (target.room === undefined) return { ready: false, says: { message: 'promptNoRoom' } }
  if (target.streaming) return { ready: false, says: { message: 'promptBusy' } }
  const prompt = String(text ?? '').trim()
  if (!prompt) return { ready: false, says: null }
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
  // Hidden messages, and messages being deleted, stay out of what is sent.
  if (target.hiddenOut > 0) also.push({ message: 'promptHiddenOut', values: { count: target.hiddenOut } })
  const says = cost == null
    ? { message: 'promptSendUnpriced', values }
    : cost < CENT
      ? { message: 'promptSendCheap', values: { ...values, cost: CENT } }
      : { message: 'promptSend', values: { ...values, cost } }
  return { ready: true, says: also.length ? { ...says, also } : says }
}

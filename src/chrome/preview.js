// What Enter would do, for the field as it stands on this arrangement: the
// Enter line's sentence and the arrangement Enter would leave (bar
// reference, "The field"; C99). Pure, so it is tested without drawing.
//
// A line is planned whole before anything runs. If any command on it would
// refuse, the Enter line says why and Enter does nothing, so a line never
// stops half done.

import { enterLine } from '../commands/registry'
import { plan, ARRANGEMENT_VERBS } from '../shell/arrangement'

// Verbs whose actions exist in the shell so far; the rest come with their
// stages.
export const BUILT = new Set(ARRANGEMENT_VERBS)

/**
 * @param {string} value the whole field, leader included
 * @param {{ mode: string, arrangement: import('../shell/arrangement').Arrangement, built?: Set<string> }} ctx
 * @returns {{ answer: object, says: { message: string, values?: object }, next: object|null }}
 *   next is the arrangement after Enter, or null when Enter runs nothing
 */
export function preview(value, { mode, arrangement, built = BUILT }) {
  const answer = enterLine(value, { mode, board: arrangement.addressed, built })
  if (answer.state !== 'ready') return { answer, says: { message: answer.message, values: answer.values }, next: null }
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

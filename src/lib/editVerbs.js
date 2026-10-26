// hold: and hold:off for edits (stage 11, piece 3; C216 (f)). Planned before
// Enter: what the Enter line says, and what Enter does. Pure.
//
//   hold:242          edit 242 stays yours: it does not go with the next prompt
//   hold:242, 245     those two
//   hold:off 242      lets it go again
//
// A plain number other than a plan's is an edit (planVerbs.js leaves those
// here). Only edits of the chat the room shows: screens.heldEdits.byNum, a
// Map of number to { id, held, sent }.

/**
 * @returns {null | { says: object, act: object|null }} null when the numbers
 *   are not edits here, so hold: reads them as branches
 */
export function planHoldEdits(step, screens = {}) {
  const known = screens.heldEdits?.byNum
  if (!known) return null
  const vals = step.match?.values ?? []
  const off = vals[0]?.kind === 'word' && vals[0].value === 'off'
  const listed = (off ? vals.slice(1) : vals).flatMap((v) => (v.kind === 'list' ? v.items : [v]))
  if (!listed.length || listed.some((v) => v.kind !== 'address' || v.letter)) return null
  const nums = [...new Set(listed.map((v) => v.num))]
  if (!nums.some((n) => known.has(n))) return null
  const unknown = nums.find((n) => !known.has(n))
  if (unknown != null) return { says: { message: 'holdEditNotHere', values: { num: unknown } }, act: null }
  const told = nums.find((n) => known.get(n).sent)
  if (told != null) return { says: { message: 'holdEditTold', values: { num: told } }, act: null }
  const moving = nums.filter((n) => Boolean(known.get(n).held) === off)
  if (!moving.length) return { says: { message: off ? 'holdEditNot' : 'holdEditAlready', values: { nums } }, act: null }
  return {
    says: { message: off ? 'holdEditOff' : 'holdEditOn', values: { nums: moving } },
    act: { kind: 'holdEdits', edits: moving.map((n) => ({ num: n, id: known.get(n).id, list: known.get(n).list ?? 'edits' })), held: !off },
  }
}

// ask: (stage 11, piece 4; C218 (a), option 2). Ctrl+K stays the bar's, so an
// ask starts with Ctrl+Shift+K in a reply, or here:
//
//   ask:                          opens the ASK box where the cursor was in the reply
//   ask:"Add the year it opened"  keeps that ask on the selected words, or at the cursor
//
// Which reply is the shell's to find, when Enter runs it: the one last in focus.
export const ASK_MAX = 1000

/** @returns {{ says: object, act: object|null }} */
export function planAsk(step) {
  const raw = String(step.match?.values?.[0] ?? '').trim()
  const question = raw.replace(/^"([\s\S]*)"$/, '$1').trim()
  if ([...question].length > ASK_MAX) return { says: { message: 'askLong', values: { max: ASK_MAX } }, act: null }
  if (!question) return { says: { message: 'askOpen' }, act: { kind: 'ask', question: null } }
  return { says: { message: 'askKeep' }, act: { kind: 'ask', question } }
}

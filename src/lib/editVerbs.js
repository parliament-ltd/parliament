import { TELL_MAX, TELLS_MOST } from '../editing/told'

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
  const known = knownChanges(screens)
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

// strikethrough: (stage 11, piece 7; C225 (c)): strikes the words selected in
// the reply last in focus, as Ctrl+Shift+X there. Which reply is the shell's
// to find when Enter runs it.

/** @returns {{ says: object, act: object }} */
export const planStrike = () => ({ says: { message: 'strikeGo' }, act: { kind: 'strike' } })

// tell: (stage 11, piece 7; C225 (d), option 1): a note in the person's own
// words that the model reads with the next prompt to the chat in the room,
// once. Held in the tab like include:, nothing stored until that prompt goes.
//
//   tell:"Keep it under a page"   held for the next prompt here
//
// screens.telling: { room, held } with room as roomOnScreen gives it
// (undefined with no room) and held the notes held for it.

/** @returns {{ says: object, act: object|null }} */
export function planTell(step, screens = {}) {
  const t = screens.telling
  if (!t || t.room === undefined) return { says: { message: 'tellNoRoom' }, act: null }
  const raw = String(step.match?.values?.[0] ?? '').trim()
  const text = raw.replace(/^"([\s\S]*)"$/, '$1').trim()
  if (!text) return { says: { message: 'tellEmpty' }, act: null }
  if ([...text].length > TELL_MAX) return { says: { message: 'tellLong', values: { max: TELL_MAX } }, act: null }
  const held = Array.isArray(t.held) ? t.held : []
  if (held.length >= TELLS_MOST) return { says: { message: 'tellMany', values: { most: TELLS_MOST } }, act: null }
  if (held.includes(text)) return { says: { message: 'tellSame' }, act: null }
  const notes = [...held, text]
  return {
    says: { message: 'tellHold', values: { count: notes.length } },
    act: { kind: 'tell', room: t.room ?? null, notes, before: held },
  }
}

// ripple:on and ripple:off (stage 12, piece 2; C231 (e)): Ripple for the
// plan of the chat in the room, kept on the plan, so every branch shares it.
// screens.rippling: { room, plan: { id, num, on, branches }|null, helper }
// with branches the other branches' addresses and helper who checks.

/** @returns {{ says: object, act: object|null }} */
export function planRipple(step, screens = {}) {
  const r = screens.rippling
  if (!r || r.room === undefined) return { says: { message: 'rippleNoRoom' }, act: null }
  const on = step.match?.values?.[0]?.value === 'on'
  const plan = r.plan
  if (!plan || !plan.branches?.length) return { says: { message: 'rippleNothing' }, act: null }
  if (plan.on === on) return { says: { message: on ? 'rippleOnAlready' : 'rippleOffAlready', values: { num: plan.num } }, act: null }
  const act = { kind: 'ripple', docketId: plan.id, num: plan.num, on }
  if (!on) return { says: { message: 'rippleOff', values: { num: plan.num } }, act }
  const h = r.helper
  const ready = h && !h.needsKey && !h.later && !h.gone && !h.unchecked
  return { says: { message: ready ? 'rippleOn' : 'rippleOnNoKey', values: { num: plan.num, nums: plan.branches, name: ready ? h.name : '' } }, act }
}

// Every edit and ask Records knows, from any board (C220 (d)); else the
// room's own, as piece 3 had it.
function knownChanges(screens) {
  const rows = (screens.records?.rows ?? []).filter((r) => (r.kind === 'edit' || r.kind === 'ask') && r.change)
  if (rows.length) return new Map(rows.map((r) => [r.num, { id: r.id, list: r.store, held: r.change.held, sent: Boolean(r.change.sent) }]))
  return screens.heldEdits?.byNum ?? null
}

// ── Edits and asks by number (stage 11, piece 5; C220 (d)) ──
//
//   undo:242           takes a waiting edit out: the struck words stand again, yours go
//   accept:203         an answer becomes part of the reply, its passage goes
//   reject:203         the answer goes, the passage stays (the marker's "undo")
//   accept:all         every answer waiting in the chat the room shows
//   delete:203         drops an ask not yet sent
//   accept:244         a suggestion taken (stage 12; C229 (e)): Ripple's becomes your edit,
//                      a sweep's becomes the reply's words
//   reject:244         the suggestion goes, the reply stays
//   accept:all         also every suggestion waiting in the room's chat and its plan's branches
//
// Each is a change to a message's stored form and its records, which undo:
// takes back. Rows come from Records (screens.records.rows), where edits and
// asks carry `change` (almanacRows.js).

const CHANGES = new Set(['edit', 'ask', 'suggestion'])
const numsOf = (vals) => vals.flatMap((v) => (v.kind === 'list' ? v.items : [v]))
const changeOf = (row, how) => ({ how, num: row.num, mark: row.change.mark, messageId: row.messageId, conversationId: row.chatId })

/** The edit and ask rows some numbers name, or why not. */
function changeRows(vals, rows) {
  const out = []
  for (const v of numsOf(vals)) {
    if (v.kind !== 'address' && v.kind !== 'number') return { bad: { message: 'byNumber' } }
    if (v.letter) return { bad: { message: 'changeNotThis', values: { num: v.text ?? String(v.num) } } }
    const num = v.kind === 'number' ? v.value : v.num
    const row = rows.find((r) => r.num === num)
    if (!row) return { bad: { message: 'numNone', values: { num: String(num) } } }
    if (!CHANGES.has(row.kind) || !row.change || !row.messageId) return { bad: { message: 'changeNotThis', values: { num: String(num) } } }
    if (!out.includes(row)) out.push(row)
  }
  return { rows: out }
}

/** undo:242. null when the number is not an edit or an ask, so undo: reads it as before. */
export function planUndoChange(step, screens = {}) {
  const vals = step.match?.values ?? []
  if (!vals.length) return null
  const rows = screens.records?.rows ?? []
  const t = changeRows(vals, rows)
  if (t.bad) return { says: t.bad.message === 'changeNotThis' ? { message: 'undoNotEdit', values: t.bad.values } : t.bad, act: null }
  const [row] = t.rows
  if (row.kind === 'suggestion') return { says: { message: 'undoSugUse', values: { num: row.num } }, act: null }
  if (row.kind === 'ask') {
    if (row.change.state === 'answered') return { says: { message: 'undoAskAnswered', values: { num: row.num } }, act: null }
    return { says: { message: 'undoAskUse', values: { num: row.num } }, act: null }
  }
  if (row.change.sent) return { says: { message: 'undoEditTold', values: { num: row.num } }, act: null }
  return { says: { message: 'undoEditOne', values: { num: row.num } }, act: { kind: 'storedChange', changes: [changeOf(row, 'undoEdit')] } }
}

/** accept: and reject: on asks answered (the marker's accept and undo), and on suggestions waiting (C229 (e)). */
export function planSettle(step, screens = {}, how = 'accept') {
  const vals = step.match?.values ?? []
  const rows = screens.records?.rows ?? []
  let picked
  if (vals[0]?.kind === 'word' && vals[0].value === 'all') {
    const room = screens.roomChat ?? null
    // An answer kept on its card only can be let go, never accepted.
    const asks = rows.filter((r) => r.kind === 'ask' && r.chatId && r.chatId === room && r.change?.state === 'answered' && (how !== 'accept' || r.change.answer?.inPlace))
    // Suggestions in the room's chat and its plan's other branches, where Ripple puts them.
    const plan = rows.find((r) => r.kind === 'chat' && r.chatId === room)?.docketNum ?? null
    const sugs = rows.filter((r) => r.kind === 'suggestion' && r.chatId && r.change?.state === 'open' && (r.chatId === room || (plan != null && r.docketNum === plan)))
    picked = [...asks, ...sugs]
    if (!picked.length) return { says: { message: 'settleNoneHere' }, act: null }
  } else {
    const t = changeRows(vals, rows)
    if (t.bad) return { says: t.bad.message === 'changeNotThis' ? { message: 'settleNotAsk', values: t.bad.values } : t.bad, act: null }
    picked = t.rows
    const notAsk = picked.find((r) => r.kind !== 'ask' && r.kind !== 'suggestion')
    if (notAsk) return { says: { message: 'settleNotAsk', values: { num: notAsk.num } }, act: null }
    const settled = picked.find((r) => r.kind === 'suggestion' && r.change.state !== 'open')
    if (settled) return { says: { message: 'settleSugDone', values: { num: settled.num, state: settled.change.state } }, act: null }
    const waiting = picked.find((r) => r.kind === 'ask' && r.change.state !== 'answered')
    if (waiting) return { says: { message: 'settleNotAnswered', values: { num: waiting.num, state: waiting.change.state } }, act: null }
    // An answer kept on its card only cannot go into the reply.
    const here = picked.find((r) => r.kind === 'ask' && how === 'accept' && !r.change.answer?.inPlace)
    if (here) return { says: { message: 'settleCardOnly', values: { num: here.num } }, act: null }
  }
  const asks = picked.filter((r) => r.kind === 'ask').map((r) => r.num)
  const sugs = picked.filter((r) => r.kind === 'suggestion')
  const ripple = sugs.filter((r) => r.change.made !== 'sweep').map((r) => r.num)
  const sweep = sugs.filter((r) => r.change.made === 'sweep').map((r) => r.num)
  const says = []
  if (asks.length) says.push({ message: how === 'accept' ? 'settleAccept' : 'settleReject', values: { nums: asks, count: asks.length } })
  if (how === 'accept' && ripple.length) says.push({ message: 'settleSugRipple', values: { nums: ripple, count: ripple.length } })
  if (how === 'accept' && sweep.length) says.push({ message: 'settleSugSweep', values: { nums: sweep, count: sweep.length } })
  if (how !== 'accept' && sugs.length) says.push({ message: 'settleSugReject', values: { nums: sugs.map((r) => r.num), count: sugs.length } })
  const howOf = (r) => (r.kind === 'suggestion' ? (how === 'accept' ? 'acceptSuggestion' : 'rejectSuggestion')
    : how === 'accept' ? 'accept' : (r.change.answer?.inPlace ? 'undo' : 'undoHere'))
  return {
    says: { ...says[0], ...(says.length > 1 ? { also: says.slice(1) } : {}) },
    act: { kind: 'storedChange', changes: picked.map((r) => changeOf(r, howOf(r))) },
  }
}

/** delete:203 for an ask not yet sent; null when the numbers are not edits or asks. */
export function planDropAsks(step, screens = {}) {
  const vals = step.match?.values ?? []
  const rows = screens.records?.rows ?? []
  const named = numsOf(vals).filter((v) => v.kind === 'address' || v.kind === 'number')
  if (!named.length || named.length !== numsOf(vals).length) return null
  const found = named.map((v) => rows.find((r) => r.num === (v.kind === 'number' ? v.value : v.num)))
  if (!found.some((r) => r && CHANGES.has(r.kind))) return null
  const t = changeRows(vals, rows)
  if (t.bad) return { says: t.bad, act: null }
  const edit = t.rows.find((r) => r.kind === 'edit')
  if (edit) return { says: { message: 'deleteEditUse', values: { num: edit.num } }, act: null }
  const sug = t.rows.find((r) => r.kind === 'suggestion')
  if (sug) return { says: { message: 'deleteSugUse', values: { num: sug.num } }, act: null }
  const gone = t.rows.find((r) => r.change.sent || r.change.state !== 'open')
  if (gone) return { says: { message: 'deleteAskSent', values: { num: gone.num } }, act: null }
  const nums = t.rows.map((r) => r.num)
  return { says: { message: 'deleteAsks', values: { nums, count: nums.length } }, act: { kind: 'storedChange', changes: t.rows.map((r) => changeOf(r, 'drop')) } }
}

/** The line for a by-number command that does not act on edits and asks. */
export function changeRefused(rows, vals) {
  for (const v of numsOf(vals ?? [])) {
    if (v.kind !== 'address' && v.kind !== 'number') continue
    if (v.letter) continue
    const num = v.kind === 'number' ? v.value : v.num
    const row = rows.find((r) => r.num === num)
    if (row && CHANGES.has(row.kind)) return { message: 'changeNotThis', values: { num: String(num) } }
  }
  return null
}

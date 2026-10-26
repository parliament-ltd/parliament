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
//
// Each is a change to a message's stored form and its records, which undo:
// takes back. Rows come from Records (screens.records.rows), where edits and
// asks carry `change` (almanacRows.js).

const CHANGES = new Set(['edit', 'ask'])
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
  if (row.kind === 'ask') {
    if (row.change.state === 'answered') return { says: { message: 'undoAskAnswered', values: { num: row.num } }, act: null }
    return { says: { message: 'undoAskUse', values: { num: row.num } }, act: null }
  }
  if (row.change.sent) return { says: { message: 'undoEditTold', values: { num: row.num } }, act: null }
  return { says: { message: 'undoEditOne', values: { num: row.num } }, act: { kind: 'storedChange', changes: [changeOf(row, 'undoEdit')] } }
}

/** accept: and reject: on asks answered (the marker's accept and undo). */
export function planSettle(step, screens = {}, how = 'accept') {
  const vals = step.match?.values ?? []
  const rows = screens.records?.rows ?? []
  let picked
  if (vals[0]?.kind === 'word' && vals[0].value === 'all') {
    const room = screens.roomChat ?? null
    // An answer kept on its card only can be let go, never accepted.
    picked = rows.filter((r) => r.kind === 'ask' && r.chatId && r.chatId === room && r.change?.state === 'answered' && (how !== 'accept' || r.change.answer?.inPlace))
    if (!picked.length) return { says: { message: 'settleNoneHere' }, act: null }
  } else {
    const t = changeRows(vals, rows)
    if (t.bad) return { says: t.bad.message === 'changeNotThis' ? { message: 'settleNotAsk', values: t.bad.values } : t.bad, act: null }
    picked = t.rows
    const notAsk = picked.find((r) => r.kind !== 'ask')
    if (notAsk) return { says: { message: 'settleNotAsk', values: { num: notAsk.num } }, act: null }
    const waiting = picked.find((r) => r.change.state !== 'answered')
    if (waiting) return { says: { message: 'settleNotAnswered', values: { num: waiting.num, state: waiting.change.state } }, act: null }
    // An answer kept on its card only cannot go into the reply.
    const here = picked.find((r) => how === 'accept' && !r.change.answer?.inPlace)
    if (here) return { says: { message: 'settleCardOnly', values: { num: here.num } }, act: null }
  }
  const nums = picked.map((r) => r.num)
  return {
    says: { message: how === 'accept' ? 'settleAccept' : 'settleReject', values: { nums, count: nums.length } },
    act: { kind: 'storedChange', changes: picked.map((r) => changeOf(r, how === 'accept' ? 'accept' : (r.change.answer?.inPlace ? 'undo' : 'undoHere'))) },
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

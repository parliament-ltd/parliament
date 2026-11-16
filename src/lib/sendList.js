// What Enter sends, by branch (C301 (d), the list; ruled 16 November:
// "Yes, build the list"; parliament-prompts-list-v1.html). Pure: read from
// Records' rows and the room's branches, for the bar's list and its line.
//
// What waits in a branch is its prompts in the text (asks, by their old
// name) and its edits, not yet sent. One held back (C298) is listed, unticked,
// and stays behind. A branch with something going is sent to on Enter, with
// the room's own branch, unless to: has chosen the branches (C174).

/**
 * @typedef {{ num: number, question: string, passage: string, point: boolean, held: boolean }} WaitingPrompt
 * @typedef {{ num: number, struck: string, added: string, held: boolean }} WaitingEdit
 * @typedef {{ prompts: WaitingPrompt[], edits: WaitingEdit[] }} Waiting
 */

const byNum = (a, b) => a.num - b.num

/**
 * What waits in each of these chats, held back or not, from Records' rows.
 * @param {object[]} rows almanacRows
 * @param {string[]} chats
 * @returns {Map<string, Waiting>}
 */
export function waitingByChat(rows, chats) {
  const out = new Map((chats ?? []).map((c) => [c, { prompts: [], edits: [] }]))
  for (const r of rows ?? []) {
    const here = out.get(r?.chatId)
    const c = r?.change
    if (!here || !c || c.sent || !Number.isInteger(r.num)) continue
    if (r.kind === 'ask' && c.state === 'open') here.prompts.push({ num: r.num, question: c.question ?? '', passage: c.passage ?? '', point: Boolean(c.point), held: Boolean(c.held) })
    else if (r.kind === 'edit') here.edits.push({ num: r.num, struck: c.struck ?? '', added: c.added ?? '', held: Boolean(c.held) })
  }
  for (const w of out.values()) { w.prompts.sort(byNum); w.edits.sort(byNum) }
  return out
}

/** How many of a branch's prompts and edits go with the next Enter: those not held back. */
export function goingIn(w) {
  return { prompts: (w?.prompts ?? []).filter((x) => !x.held).length, edits: (w?.edits ?? []).filter((x) => !x.held).length }
}

/** The chats with something going, in the order given. */
export function chatsWaiting(by) {
  return [...(by ?? new Map())].filter(([, w]) => { const g = goingIn(w); return g.prompts + g.edits > 0 }).map(([c]) => c)
}

/** Whether what waits, held or not, is in more than one branch: the list then opens by itself. */
export function spansBranches(by) {
  return [...(by ?? new Map()).values()].filter((w) => w.prompts.length + w.edits.length > 0).length > 1
}

/**
 * Where the next prompt goes among a prompt's branches: as replyTargets says
 * (branchGroups.js; C174), and, unless to: chose them, every branch with
 * something going too, in the branches' order.
 * @param {{ chats: string[], why: string }|null} targets replyTargets' answer
 * @param {string[]} order the branches, in their order
 * @param {string[]} waiting the chats with something going
 */
export function withWaiting(targets, order, waiting) {
  if (!targets || targets.why === 'held') return targets
  const extra = (waiting ?? []).filter((c) => (order ?? []).includes(c) && !targets.chats.includes(c))
  if (!extra.length) return targets
  return { chats: order.filter((c) => targets.chats.includes(c) || extra.includes(c)), why: 'waiting' }
}

/**
 * The list's rows: each branch, whether Enter sends to it, who answers it,
 * and what waits there.
 * @param {{ members: Array<{ chatId: string, address: string|null, name: string }>, targets: string[],
 *   by: Map<string, Waiting>, room: string|null }} s
 */
export function listOf({ members = [], targets = [], by = new Map(), room = null }) {
  return members.map((m) => {
    const w = by.get(m.chatId) ?? { prompts: [], edits: [] }
    return { chatId: m.chatId, address: m.address ?? '', name: m.name ?? '', ticked: targets.includes(m.chatId), here: m.chatId === room, prompts: w.prompts, edits: w.edits, going: goingIn(w) }
  })
}

// About what a prompt or an edit adds to the note that tells the model of
// it, beyond its own words: for the line's estimate of the cost.
const NOTE_EACH = 80

/**
 * What goes to each branch Enter sends to, for the line: its address, who
 * answers it, how many prompts and edits go with it, and about how long the
 * note telling the model of them is.
 * @param {ReturnType<typeof listOf>} list
 */
export function goesTo(list) {
  return list.filter((b) => b.ticked).map((b) => {
    const prompts = b.prompts.filter((x) => !x.held)
    const edits = b.edits.filter((x) => !x.held)
    const chars = prompts.reduce((n, x) => n + x.question.length + x.passage.length + NOTE_EACH, 0)
      + edits.reduce((n, x) => n + x.struck.length + x.added.length + NOTE_EACH, 0)
    return { chatId: b.chatId, address: b.address, name: b.name, prompts: prompts.length, edits: edits.length, chars }
  })
}

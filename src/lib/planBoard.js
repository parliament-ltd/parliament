// What the Plan board shows of one plan at one run (stage 10, piece 2;
// Docket v12; C196 (a); C198), worked out from the stored plan. The board
// draws it; the plan commands read it (planVerbs.js, as screens.plan).

import { STATUS, isPlanned } from './docketModel'
import { letterAt } from './addresses'

/**
 * @param {{ docket: object, runs: object[] }} plan  as db.getPlan reads it
 * @param {object} o
 * @param {number|null} o.run  the run asked for; the last when null or gone
 * @param {(messageId: string) => string|undefined} o.textOf  a sent step's words
 * @param {(chatId: string) => { num?: number, roomId?: string|null, title?: string }|null} o.chatOf
 * @param {(roomId: string) => string|null} o.roomName  a room's name, as Records shows it
 * @param {string|null} o.selected  the branch picked on the board
 */
export function planBoardOf(plan, { run = null, textOf = () => undefined, chatOf = () => null, roomName = () => null, selected = null } = {}) {
  const { docket } = plan
  const runs = [...plan.runs].sort((a, b) => a.n - b.n)
  const latest = runs.at(-1)?.n ?? 1
  const shown = runs.find((r) => r.n === run) ?? runs.at(-1) ?? null
  const n = shown?.n ?? latest
  const named = new Map((docket.branches ?? []).filter((b) => !b.deletedAt).map((b) => [b.letter, b]))
  // A branch that has never run, in any run: nothing of it was sent (C199).
  const ran = (letter) => runs.some((r) => {
    const b = r.branches?.[letter]
    return Boolean(b?.chatId) || (b?.steps ?? []).some((s) => s.messageId)
  })
  const neverRan = [...named.keys()].filter((l) => !ran(l))
  const letters = (docket.order ?? []).filter((l) => named.has(l) && shown?.branches?.[l])
  const branches = letters.map((letter) => {
    const b = shown.branches[letter]
    const chat = b.chatId ? chatOf(b.chatId) : null
    const firstRun = runs.find((r) => r.branches?.[letter])?.n ?? n
    const steps = (b.steps ?? []).map((s, i) => ({
      id: s.id ?? s.messageId ?? `${letter}${i}`,
      stepId: s.id ?? null,
      index: i + 1,
      status: s.status,
      planned: isPlanned(s),
      text: isPlanned(s) ? String(s.prompt ?? '') : String(textOf(s.messageId) ?? s.prompt ?? ''),
      model: s.model ?? null,
      room: s.room ?? null,
      condition: s.condition ?? null,
      // One pip per run: whether that run reached this step (Docket v12).
      reached: runs.map((r) => ({ n: r.n, yes: (r.branches?.[letter]?.steps?.length ?? 0) > i })),
    }))
    return {
      letter,
      address: `${docket.num}${letter}`,
      name: named.get(letter).name || chat?.title || '',
      status: b.status ?? STATUS.READY,
      chatId: b.chatId ?? null,
      chatNum: chat?.num ?? null,
      everRan: ran(letter),
      room: (b.room ?? chat?.roomId) ? roomName(b.room ?? chat.roomId) || null : null,
      firstRun,
      steps,
    }
  })
  const open = (b) => b.steps.filter((s) => s.planned)
  return {
    num: docket.num,
    docketId: docket.id,
    title: docket.title ?? '',
    n,
    latest,
    runNums: runs.map((r) => r.n),
    next: Number.isInteger(docket.nextLetter) && docket.nextLetter >= 0 ? letterAt(docket.nextLetter) : null,
    order: [...(docket.order ?? [])],
    neverRan,
    branchCount: named.size,
    selected: letters.includes(selected) ? selected : null,
    branches,
    counts: {
      branches: branches.length,
      steps: branches.reduce((k, b) => k + b.steps.length, 0),
      held: branches.filter((b) => open(b).length && open(b).every((s) => s.status === STATUS.WAITING)).length,
    },
  }
}

/** The plan the board shows when none is asked for: the one changed last. */
export function latestPlan(rows) {
  let best = null
  for (const r of rows ?? []) {
    if (r.kind !== 'docket' || r.archived) continue
    if (!best || String(r.activeAt ?? '') > String(best.activeAt ?? '')) best = r
  }
  return best?.num ?? null
}

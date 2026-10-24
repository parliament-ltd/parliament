// This month's spending, as Settings shows it (settings spec §9; stage 10,
// piece 6; C203). In dollars, from the tokens each reply recorded, by the
// month it came. Pure: Records' rows in, the sentence's numbers and the
// costliest out.
//
// A run is one run of a plan: the chats of a plan of several branches, or
// of a plan with no chat at first, in one run, and any run past the first.
// A chat that is its own plan, run once, is a chat. A run's cost is its
// chats' this month; it is not known if one of theirs is not.

/**
 * @param {object[]} rows Records' rows (almanacRows)
 * @param {string} month 'YYYY-MM'
 * @returns {{ total: number, unknown: number, chats: number, runs: Array<{ num, run, title, cost }>, solo: Array<{ num, title, cost }> }}
 *   total: what is known to have been spent; unknown: chats whose cost is not known;
 *   chats: chats on their own that spent; runs and solo: each that spent, costliest first
 */
export function spendingOf(rows, month) {
  const plans = new Map((rows ?? []).filter((r) => r.kind === 'docket').map((r) => [r.num, r]))
  const chats = (rows ?? []).filter((r) => r.kind === 'chat' && r.monthCosts && Object.hasOwn(r.monthCosts, month))
  let total = 0
  let unknown = 0
  const runs = new Map()
  const solo = []
  for (const r of chats) {
    const cost = r.monthCosts[month]
    const known = typeof cost === 'number'
    if (known) total += cost
    else unknown += 1
    const run = Number.isInteger(r.run) ? r.run : 1
    if (r.docketNum != null && (plans.has(r.docketNum) || run > 1)) {
      const key = `${r.docketNum}:${run}`
      const at = runs.get(key) ?? { num: r.docketNum, run, title: plans.get(r.docketNum)?.title || r.title || '', cost: 0, known: true }
      if (known) at.cost += cost
      else at.known = false
      runs.set(key, at)
    } else if (known && cost > 0) {
      solo.push({ num: r.num, title: r.title ?? '', cost })
    }
  }
  const spent = [...runs.values()].filter((x) => x.cost > 0)
  return {
    total,
    unknown,
    chats: solo.length,
    runs: spent.sort((a, b) => b.cost - a.cost).map(({ num, run, title, cost }) => ({ num, run, title, cost })),
    solo: solo.sort((a, b) => b.cost - a.cost),
  }
}

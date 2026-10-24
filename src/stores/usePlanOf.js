import { useEffect, useState } from 'react'
import { getPlan } from '../lib/db'
import { onRecordsChanged } from '../lib/records'

// A plan as stored, by its id, read again whenever one of its runs or the
// plan itself changes, here or in another tab (stage 10, piece 5; C202).
// For blocks that show what a plan holds without reading the database
// themselves: the slider's waiting tab, the step list.

/** The plan { docket, runs } by its id, or by its number; null until it is read or when there is none. */
export function usePlanOf(docketId, num = null) {
  const [plan, setPlan] = useState(null)
  useEffect(() => {
    if (!docketId && !num) return undefined
    let live = true
    const read = () => getPlan(docketId ? { id: docketId } : { num }).then((p) => { if (live) setPlan(p ?? null) }, () => {})
    read()
    const off = onRecordsChanged((c) => { if (c.kind === 'run' || c.kind === 'docket' || c.kind === 'chat') read() })
    return () => { live = false; off() }
  }, [docketId, num])
  if (!plan) return null
  return (docketId ? plan.docket?.id === docketId : plan.docket?.num === num) ? plan : null
}

/**
 * For the slider (C202): the step a branch's chat holds for a prompt sent to
 * several one after another, while it has not been sent. { condition,
 * status, ended }, or null.
 */
export function waitingIn(plan, chatId, groupId) {
  for (const run of plan?.runs ?? []) {
    for (const b of Object.values(run.branches ?? {})) {
      if (b?.chatId !== chatId) continue
      const s = (b.steps ?? []).find((x) => x.group === groupId && !x.messageId)
      if (s) return { condition: s.condition ?? 'finished', status: s.status, ended: s.ended ?? null }
    }
  }
  return null
}

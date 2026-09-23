// Docket, branch, run and step (docket-spec-decisions.md §1, conflicts.md C1).
//
//   docket  a plan; permanent. Owns the branches' letters and names.
//   branch  an alternative path; lives in every run. { letter, name }.
//   run     one execution of the docket. Owns, per branch, the room, the
//           status and the steps.
//   step    one prompt in one branch in one run. Room only when it overrides.
//   chat    what running a branch in a run produced; a numbered row.
//
// Record shapes (IndexedDB stores `dockets` and `runs`, schema v6):
//
//   docket: { id, num, title, createdAt, updatedAt, pinned, tags, archived,
//             branches: [{ letter, name, createdAt, deletedAt?, forkedFrom? }],
//             order: [letter], nextLetter }
//           forkedFrom: { chatNum, step }   (docket-spec-decisions.md §3)
//           nextLetter only moves forward, so a letter is never reissued.
//
//   run:    { id, docketId, n, createdAt, cost,
//             branches: { [letter]: { status, room, chatId, steps: [step] } } }
//   step:   { status, model, room?, messageId? , prompt?, tokens?, cost? }
//           A step that produced a turn points at its user message
//           (messageId); a step not yet run carries its prompt text.

export const STATUS = Object.freeze({
  READY: 'ready',     // has not run yet; silent
  RUNNING: 'running', // happening now
  DONE: 'done',       // produced a turn; locked
  WAITING: 'waiting', // deliberately parked before it started
  PAUSED: 'paused',   // started, then halted; locked, and it cost something
})

export const STATUSES = Object.freeze(Object.values(STATUS))

/** A step is fixed once it has started: done, running and paused. */
export function isFixed(status) {
  return status === STATUS.DONE || status === STATUS.RUNNING || status === STATUS.PAUSED
}

/** A branch's status in a run, from its steps. */
export function branchStatus(steps) {
  if (!steps.length) return STATUS.READY
  if (steps.some((s) => s.status === STATUS.RUNNING)) return STATUS.RUNNING
  if (steps.some((s) => s.status === STATUS.PAUSED)) return STATUS.PAUSED
  if (steps.every((s) => s.status === STATUS.DONE)) return STATUS.DONE
  if (steps.every((s) => s.status === STATUS.WAITING)) return STATUS.WAITING
  return STATUS.READY
}

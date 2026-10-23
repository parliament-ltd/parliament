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
//   step:   { id?, status, model, room?, messageId?, prompt?, condition,
//             addedAt?, ended? }
//           A step that produced a turn points at its user message
//           (messageId); a step planned ahead carries its id and its prompt
//           text, and the message a run sends for it carries the step's id
//           (`step`), so the two are one step (stage 10, piece 1; C196 (j)).
//           A branch in a run has chatId null until it runs. ended: why a
//           paused step stopped (stopped, failed, stalled).

export const STATUS = Object.freeze({
  READY: 'ready',     // has not run yet; silent
  RUNNING: 'running', // happening now
  DONE: 'done',       // produced a turn; locked
  WAITING: 'waiting', // deliberately parked before it started
  PAUSED: 'paused',   // started, then halted; locked, and it cost something
})

export const STATUSES = Object.freeze(Object.values(STATUS))

// What may hold a later step back (A15; C196 (e)); null: none.
export const CONDITIONS = Object.freeze(['finished', 'failed', 'always', 'nothing'])

/** A step written ahead of any run, ready unless held. */
export function plannedStep({ id, prompt, model = null, room = null, condition = null, waiting = false, now }) {
  return {
    id, status: waiting ? STATUS.WAITING : STATUS.READY, prompt: String(prompt ?? ''), model,
    ...(room ? { room } : {}), condition, addedAt: now,
  }
}

/** Whether a step was planned ahead and has not been sent. */
export const isPlanned = (step) => !step?.messageId

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

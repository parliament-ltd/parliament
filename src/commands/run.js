// Running one line of commands (C99, ruled 20 October; to revisit once it
// can be tried live).
//
// Several commands may share a line. They run left to right; the first that
// fails stops the rest, and the result says which one stopped and which did
// not run, for the Enter line to say. The whole line is one undo step: the
// shell passes the undo history's begin and end, and undo: then takes back
// everything the line did.
//
// The registry has already refused a line that holds a command which sends
// something, or erase:, beside others, so here every step is one the screen
// can take back.

/**
 * @param {Array<{ verb: string }>} steps the Enter line's steps, in order
 * @param {(step: object) => Promise<{ ok: boolean, error?: * }> | { ok: boolean, error?: * }} act
 *   runs one step through its verb's action
 * @param {{ begin?: () => void, end?: (result: object) => void }} [undo]
 *   the undo history's hooks, so the line is one step
 * @returns {Promise<{ ok: true, done: object[] } | { ok: false, done: object[], stopped: object, error: *, skipped: object[] }>}
 */
export async function runLine(steps, act, undo = {}) {
  const done = []
  let result = null
  undo.begin?.()
  try {
    for (let i = 0; i < steps.length; i++) {
      let outcome
      try {
        outcome = await act(steps[i])
      } catch (error) {
        outcome = { ok: false, error }
      }
      if (!outcome?.ok) {
        result = { ok: false, done, stopped: steps[i], error: outcome?.error ?? null, skipped: steps.slice(i + 1) }
        return result
      }
      done.push(steps[i])
    }
    result = { ok: true, done }
    return result
  } finally {
    undo.end?.(result)
  }
}

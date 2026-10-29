// The ? reference's groups, shared by the panel under the bar and the
// command menu board (C279 (f); C280).

import { reference } from '../commands/registry'
import { isRoom } from '../shell/boards'

/** The groups, for a board, or one verb's forms with a topic. A second room (room-2) is a room to the commands that work in one, as on the Enter line. */
export function referenceGroups(board, topic = null) {
  return reference(isRoom(board) ? 'room' : board)
    .map((g) => ({ ...g, rows: topic ? g.rows.filter((r) => r.verb === topic) : g.rows }))
    .filter((g) => g.rows.length)
}

/** Whether any row is for another board, so the note beside the heading is needed. */
export const anyAway = (groups) => groups.some((g) => g.rows.some((r) => !r.here))

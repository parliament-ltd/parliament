// How a room draws the branches of a prompt sent to several (refactor-plan.md,
// stage 8, piece 2; branch slider v9; C172, C173).
//
// A room shows one chat, the line it carries on. Where a prompt in it went
// to several at once (its `group`), the replies are drawn as tabs in a
// slider, one tab per branch, in the order chosen. Each branch is a chat of
// its own (C172 (a)), so its messages are read from it.
//
// Slider v9: with nothing carried on, or only the line, the tabs hold each
// branch's reply, and the line carries on below them; once more than one
// branch has been carried on (a reply to all), each tab holds its branch's
// whole thread from that prompt, and nothing is drawn below.
//
// Pure: messages in, the list of things to draw out.

/** The messages of a branch from its prompt in a group: { prompt, reply, after }, or null when it has none. */
export function segmentOf(messages, groupId) {
  const at = messages.findIndex((m) => m.role === 'user' && m.group?.id === groupId)
  if (at < 0) return null
  const rest = messages.slice(at + 1)
  const next = rest.findIndex((m) => m.role === 'user')
  const reply = next < 0 ? rest : rest.slice(0, next)
  const after = next < 0 ? [] : rest.slice(next)
  return { prompt: messages[at], reply, after }
}

/**
 * What a room draws for its line: its messages in order, with a slider in
 * place of the replies to each prompt it sent to several.
 * @param {object[]} messages the line's messages, oldest first, as shown
 * @param {string} lineId the chat the room shows
 * @param {Map<string, object[]>} members the other branches' messages, by chat id, once loaded
 * @param {(chatId: string, groupId: string) => object|null} [waitingOf] a branch sent to one after
 *   another whose turn has not come, or whose condition was not met: { condition, status, ended } (C202)
 * @returns {Array<object>} each a message, or { kind: 'slider', key, groupId, mode, tabs }
 *   tabs: [{ chatId, line, loaded, reply, after, continued, waiting? }] in the order chosen;
 *   mode: 'below' (the line carries on below) or 'tabs' (each tab its whole thread)
 */
export function lineItems(messages, lineId, members = new Map(), waitingOf = null) {
  const items = []
  let i = 0
  while (i < messages.length) {
    const m = messages[i]
    const g = m.role === 'user' && m.group && Array.isArray(m.group.chats) && m.group.chats.length > 1 && m.group.chats.includes(lineId) ? m.group : null
    if (!g) { items.push(m); i++; continue }
    items.push(m)
    const own = segmentOf(messages.slice(i), g.id)
    const tabs = g.chats.map((chatId) => {
      if (chatId === lineId) return { chatId, line: true, loaded: true, reply: own.reply, after: own.after, continued: own.after.length > 0 }
      const theirs = members.get(chatId)
      if (!theirs) return { chatId, line: false, loaded: false, reply: [], after: [], continued: false }
      const seg = segmentOf(theirs, g.id)
      if (!seg) {
        // One after another (slider v9; C202): a branch whose turn has not
        // come, or whose condition was not met, shows as waiting.
        const waiting = waitingOf?.(chatId, g.id) ?? null
        if (waiting) return { chatId, line: false, loaded: true, reply: [], after: [], continued: false, waiting }
        // A branch removed since, or one whose prompt is gone: no tab.
        return null
      }
      return { chatId, line: false, loaded: true, reply: seg.reply, after: seg.after, continued: seg.after.length > 0 }
    }).filter(Boolean)
    const carried = tabs.filter((t) => t.continued)
    const mode = carried.length > 1 || (carried.length === 1 && !carried[0].line) ? 'tabs' : 'below'
    items.push({ kind: 'slider', key: `slider-${g.id}`, groupId: g.id, mode, tabs })
    if (mode === 'tabs') {
      // Each tab holds its whole thread. A later prompt in the line's own
      // thread that went to several (again:, C177) draws its tabs there.
      const lineTab = tabs.find((t) => t.line)
      if (lineTab && lineTab.after.length) lineTab.nested = lineItems(lineTab.after, lineId, members, waitingOf)
      break
    }
    // The line carries on below the slider.
    i += 1 + own.reply.length
  }
  return items
}

/** The other branches a line's messages name, for loading: chat ids, each once. */
export function membersOf(messages, lineId) {
  const out = new Set()
  for (const m of messages) {
    if (m.role !== 'user' || !m.group?.chats?.includes(lineId)) continue
    for (const id of m.group.chats) if (id !== lineId) out.add(id)
  }
  return [...out]
}

/**
 * Where the next prompt goes, among the branches of the slider on screen
 * (stage 8, piece 3; slider v9; C174).
 * - Held with to: (or a click in its picker): those, until changed.
 * - One branch carried on alone below the tabs: that line, whatever tab is
 *   viewed; another is carried on in a room of its own (open:201b).
 * - Otherwise: the tab being viewed, or the room's line.
 * @param {{ shown: { groupId: string, chats: string[], line: string, carried: boolean }|null,
 *   viewed: string|null, held: { groupId: string, chats: string[] }|null }} input
 * @returns {{ chats: string[], why: 'held'|'carried'|'viewed'|'line' }|null} null with no slider
 */
export function replyTargets({ shown, viewed = null, held = null }) {
  if (!shown) return null
  if (held && held.groupId === shown.groupId) {
    const chats = held.chats.filter((c) => shown.chats.includes(c))
    if (chats.length) return { chats, why: 'held' }
  }
  if (shown.carried) return { chats: [shown.line], why: 'carried' }
  const v = viewed && shown.chats.includes(viewed) ? viewed : shown.line
  return { chats: [v], why: v === shown.line ? 'line' : 'viewed' }
}

/** The tab one step along, or null at either end. */
export function stepFrom(chats, now, dir) {
  const at = Math.max(0, chats.indexOf(now))
  const next = at + dir
  return next >= 0 && next < chats.length ? chats[next] : null
}

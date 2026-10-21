// What a model receives of a chat (refactor-plan.md, stage 4). Pure, so it
// is tested without the app.
//
// The chat store has already left out what is hidden, waiting to be
// deleted, or empty (chatStore.sendable). Here each message becomes a turn:
// - An answer that came from a source (Wikipedia) stays out (C115, ruled
//   21 October): answers from different sources stay distinct unless the
//   person acts on them. The person's own prompts still go, so a follow-up
//   makes sense. Bringing an answer into a prompt is designed with
//   branches, for every source together (stage 8).
// - Turns of the same side next to each other are joined into one, so the
//   turns alternate as providers expect.
//
// And whether a reply came back whole: cut off by the length allowed for
// one reply, or by an error, is marked as cut off (request-path audit,
// item 9: these were stored as complete).

/** Whether a message is an answer from a source, which a model is not sent (C115). */
export const fromSource = (m) => Boolean(m?.source)

/**
 * @param {Array<{ role: string, content: string, source?: object }>} messages oldest first
 * @returns {Array<{ role: 'user'|'assistant', content: string }>}
 */
export function forModel(messages) {
  const turns = []
  for (const m of messages) {
    if (!m || typeof m.content !== 'string' || !m.content || fromSource(m)) continue
    const last = turns[turns.length - 1]
    if (last && last.role === m.role) last.content = `${last.content}\n\n${m.content}`
    else turns.push({ role: m.role, content: m.content })
  }
  return turns
}

/**
 * Whether a reply was cut off, from the provider's reason for stopping:
 * 'limit' when it reached the length allowed for one reply, 'error' when
 * the stream ended without saying why (a connection or a proxy cut it), or
 * null for a reply that finished.
 */
export function cutReason(stopReason) {
  if (stopReason === 'max_tokens') return 'limit'
  if (stopReason == null) return 'error'
  return null
}

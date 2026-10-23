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
// - A summary a branch starts from (open:203b summary, C175) goes on the
//   person's side, said to be a summary, so a model reads it as what came
//   before and not as its own words, and a chat never opens with a
//   model's turn.
// - Turns of the same side next to each other are joined into one, so the
//   turns alternate as providers expect.
//
// And whether a reply came back whole: cut off by the length allowed for
// one reply, or by an error, is marked as cut off (request-path audit,
// item 9: these were stored as complete).

/** Whether a message is an answer from a source, which a model is not sent (C115). */
export const fromSource = (m) => Boolean(m?.source)

// How a summary a branch starts from is introduced to the model that
// carries the chat on (open:203b summary, C175).
export const SUMMARY_LEAD = 'This conversation carries on from a summary of an earlier part of it, written by a model:'

/**
 * @param {Array<{ role: string, content: string, source?: object }>} messages oldest first
 * @returns {Array<{ role: 'user'|'assistant', content: string }>}
 */
export function forModel(messages) {
  const turns = []
  for (const m of messages) {
    if (!m || typeof m.content !== 'string' || !m.content || fromSource(m)) continue
    const role = m.summary ? 'user' : m.role
    const content = m.summary ? `${SUMMARY_LEAD}\n\n<summary>\n${m.content}\n</summary>` : m.content
    const last = turns[turns.length - 1]
    if (last && last.role === role) last.content = `${last.content}\n\n${content}`
    else turns.push({ role, content })
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

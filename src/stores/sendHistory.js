// What a model receives of a chat (refactor-plan.md, stage 4). Pure, so it
// is tested without the app.
//
// The chat store has already left out what is hidden, waiting to be
// deleted, or empty (chatStore.sendable). Here each message becomes a turn:
// - An answer that came from a source (Wikipedia) was not written by the
//   model, so it does not go as the model's own words. It goes on the
//   person's side, introduced by a line saying where it came from, so the
//   model knows it as quoted context (C115, built as suggested).
// - Turns of the same side next to each other are joined into one, so the
//   turns alternate as providers expect.

/**
 * @param {Array<{ role: string, content: string, source?: object }>} messages oldest first
 * @param {(source: object) => string} introduce the line that introduces a source's answer
 * @returns {Array<{ role: 'user'|'assistant', content: string }>}
 */
export function forModel(messages, introduce) {
  const turns = []
  for (const m of messages) {
    if (!m || typeof m.content !== 'string' || !m.content) continue
    const quoted = m.source && m.source.found !== false
    const role = quoted ? 'user' : m.role
    const content = quoted ? `${introduce(m.source)}\n\n${m.content}` : m.content
    const last = turns[turns.length - 1]
    if (last && last.role === role) last.content = `${last.content}\n\n${content}`
    else turns.push({ role, content })
  }
  return turns
}


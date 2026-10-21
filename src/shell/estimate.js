// What a prompt would cost to send, worked out on this device before Enter
// (refactor-plan.md, stage 4; C83). Nothing is sent to count: the estimate
// is the characters that would go, divided by four, and the price is the
// model's input price from the list of models. Real counts come from each
// reply afterwards. Pure, so it is tested without the app.

export const CHARS_PER_TOKEN = 4

/** Roughly how many tokens some texts come to: their characters over four. */
export function estimateTokens(...texts) {
  const chars = texts.reduce((n, t) => n + (typeof t === 'string' ? t.length : 0), 0)
  return Math.ceil(chars / CHARS_PER_TOKEN)
}

/**
 * The cost of sending so many tokens at a model's input price, in the
 * price's currency (US dollars), or null when the price is not known.
 * @param {number} tokens
 * @param {number|null|undefined} perMillion the input price per million tokens
 */
export function inputCost(tokens, perMillion) {
  if (typeof perMillion !== 'number' || !Number.isFinite(perMillion) || perMillion < 0) return null
  return (tokens * perMillion) / 1_000_000
}

/** The characters of what would go along with a prompt: the messages with text. */
export const historyChars = (messages = []) =>
  messages.reduce((n, m) => n + (typeof m?.content === 'string' ? m.content.length : 0), 0)

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

// The one request after a chat's first answer (C62): the first prompt and
// answer, each cut to 500 characters, with its instructions, and a short
// answer back. Worked out before the answer exists, so the answer counts at
// its most, 500 characters.
const DESCRIBE_SIDE_CHARS = 500
const DESCRIBE_INSTRUCTION_CHARS = 800
const DESCRIBE_OUT_TOKENS = 200

/**
 * At most what that request costs, for a prompt of so many characters, at
 * the price of the model it goes to; null when the price is not known.
 * @param {number} promptChars
 * @param {{ inputPerMillion?: number, outputPerMillion?: number }|null} price
 */
export function describeCost(promptChars, price) {
  const input = Math.ceil((Math.min(promptChars, DESCRIBE_SIDE_CHARS) + DESCRIBE_SIDE_CHARS + DESCRIBE_INSTRUCTION_CHARS) / CHARS_PER_TOKEN)
  const inCost = inputCost(input, price?.inputPerMillion)
  const outCost = inputCost(DESCRIBE_OUT_TOKENS, price?.outputPerMillion)
  return inCost == null || outCost == null ? null : inCost + outCost
}

// summarize: on the Collection (stage 6, piece 7; C145 (g)): the words of
// what is summarized, with its instructions, and a paragraph back.
const SUMMARY_INSTRUCTION_CHARS = 600
export const SUMMARY_OUT_TOKENS = 400

/**
 * At most what one summary costs, for so many characters summarized, at the
 * price of the model it goes to; null when the price is not known.
 * @param {number} chars
 * @param {{ inputPerMillion?: number, outputPerMillion?: number }|null} price
 */
export function summaryCost(chars, price) {
  const input = Math.ceil((chars + SUMMARY_INSTRUCTION_CHARS) / CHARS_PER_TOKEN)
  const inCost = inputCost(input, price?.inputPerMillion)
  const outCost = inputCost(SUMMARY_OUT_TOKENS, price?.outputPerMillion)
  return inCost == null || outCost == null ? null : inCost + outCost
}

// What a prompt would cost to send, worked out on this device before Enter
// (refactor-plan.md, stage 4; C83). Nothing is sent to count: the estimate
// is the characters that would go, divided by four, and the price is the
// model's input price from the list of models. Real counts come from each
// reply afterwards. Pure, so it is tested without the app.

export const CHARS_PER_TOKEN = 4

// How much of a chat a model on this computer reads by default where the
// computer has under 24 GB of graphics memory: Ollama drops the start of a
// longer one without saying so (C163 (e), ruled 22 October).
export const LOCAL_READS = 4000

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

/** The characters of what would go along with a prompt: the messages with text, and the answers brought into them (C176). */
export const historyChars = (messages = []) =>
  messages.reduce((n, m) => n + (typeof m?.content === 'string' ? m.content.length : 0)
    + (Array.isArray(m?.included) ? m.included.reduce((k, i) => k + String(i?.text ?? '').length, 0) : 0), 0)

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

// translate: (stage 7, piece 6; C166): the pieces translated, with their
// instructions, and about as much back, a little more since some languages
// run longer.
const TRANSLATE_INSTRUCTION_CHARS = 900
const TRANSLATE_GROWTH = 1.3

/**
 * At most what a translation of so many characters costs at the price of
 * the model that translates; null when the price is not known, 0 when it is
 * free (a model on this computer).
 * @param {number} chars
 * @param {{ type?: string, inputPerMillion?: number, outputPerMillion?: number }|null} price
 */
export function translateCost(chars, price) {
  if (price?.type === 'free-local') return 0
  const input = Math.ceil((chars + TRANSLATE_INSTRUCTION_CHARS) / CHARS_PER_TOKEN)
  const output = Math.ceil((chars * TRANSLATE_GROWTH) / CHARS_PER_TOKEN)
  const inCost = inputCost(input, price?.inputPerMillion)
  const outCost = inputCost(output, price?.outputPerMillion)
  return inCost == null || outCost == null ? null : inCost + outCost
}

/** Roughly how many tokens a translation of so many characters takes, there and back. */
export const translateTokens = (chars) => Math.ceil((chars + TRANSLATE_INSTRUCTION_CHARS + chars * TRANSLATE_GROWTH) / CHARS_PER_TOKEN)

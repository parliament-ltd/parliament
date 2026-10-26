// Answers to asks, in a reply and in the stored form (stage 11, piece 4;
// C218 (b)). Pure: no editor here, so the records can use it.

/**
 * The answers in a reply, by ask number: [ask 241] ... [/ask]. Text only.
 * @returns {Map<number, string>}
 */
export function answersIn(content) {
  const out = new Map()
  const re = /\[ask (\d{1,9})\]\s*([\s\S]*?)\s*\[\/ask\]/g
  for (const m of String(content ?? '').matchAll(re)) out.set(Number(m[1]), m[2].trim())
  return out
}

/** A reply as it is shown: its answers to asks taken out, since they land in place. */
export function withoutAnswers(content) {
  return String(content ?? '').replace(/\n?\[ask \d{1,9}\][\s\S]*?\[\/ask\]\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * A stored form with an ask's answer placed: after its passage, the passage
 * marked as what it would replace; or after its point. null when the ask is
 * not there, or its passage has changed since it was asked: then the answer
 * goes on its card only (C210 (g)).
 * @param {object[]} blocks
 * @param {string} id the ask's id
 * @param {string} text the answer, as text
 * @param {string} passage the passage as it was asked
 */
export function placeAnswer(blocks, id, text, passage) {
  if (!Array.isArray(blocks) || !text) return null
  // The paragraph the ask ends in, where its answer goes.
  let lastBlock = -1
  blocks.forEach((b, i) => { if (Array.isArray(b?.text) && b.text.some((r) => r?.ask === id || r?.point === id)) lastBlock = i })
  if (lastBlock < 0) return null
  let now = ''
  const out = blocks.map((b, i) => {
    if (!Array.isArray(b?.text) || !b.text.some((r) => r?.ask === id || r?.point === id)) return b
    const runs = b.text.map((r) => {
      if (r?.ask !== id) return r
      if (r.struck == null) now += r.text ?? ''
      return { ...r, replaced: id }
    })
    if (i === lastBlock) {
      const point = runs.findIndex((r) => r?.point === id)
      const last = point >= 0 ? point : runs.reduce((n, r, k) => (r?.ask === id ? k : n), -1)
      runs.splice(last + 1, 0, { text: point >= 0 ? ` ${text}` : text, answer: id })
    }
    return { ...b, text: runs }
  })
  // Changed since it was asked: the answer goes on its card only.
  if (passage != null && passage !== '' && now !== '' && now !== passage) return null
  return out
}

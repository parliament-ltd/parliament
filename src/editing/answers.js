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
  const has = (runs) => Array.isArray(runs) && runs.some((r) => r?.ask === id || r?.point === id)
  // The line the ask ends in, where its answer goes: a block's, or a table
  // cell's (piece 6; C222 (a)), counted in reading order.
  let count = 0
  let lastLine = -1
  forLines(blocks, (runs) => { if (has(runs)) lastLine = count; count += 1; return runs })
  if (lastLine < 0) return null
  let now = ''
  let n = 0
  const out = forLines(blocks, (runs) => {
    const at = n++
    if (!has(runs)) return runs
    const next = runs.map((r) => {
      if (r?.ask !== id) return r
      if (r.struck == null) now += r.text ?? ''
      return { ...r, replaced: id }
    })
    if (at === lastLine) {
      const point = next.findIndex((r) => r?.point === id)
      const last = point >= 0 ? point : next.reduce((k, r, i) => (r?.ask === id ? i : k), -1)
      next.splice(last + 1, 0, { text: point >= 0 ? ` ${text}` : text, answer: id })
    }
    return next
  })
  // Changed since it was asked: the answer goes on its card only.
  if (passage != null && passage !== '' && now !== '' && now !== passage) return null
  return out
}

// Every line of a stored form, in reading order: a block's runs, or each
// table cell's. fn(runs) gives the line's runs as they are to be; the
// blocks come back with them, a block or cell left alone when unchanged.
function forLines(blocks, fn) {
  return blocks.map((b) => {
    if ((b?.type === 'table' || b?.type === 'chart') && Array.isArray(b.rows)) {
      let changed = false
      // A chart's title is a line too, before its numbers (C222 (f)).
      let title = b.title
      if (b.type === 'chart' && Array.isArray(b.title)) {
        title = fn(b.title)
        if (title !== b.title) changed = true
      }
      const rows = b.rows.map((row) => (Array.isArray(row) ? row.map((c) => {
        if (!c || typeof c !== 'object') return c
        const next = fn(c.text)
        if (next === c.text) return c
        changed = true
        return { ...c, text: next }
      }) : row))
      return changed ? { ...b, rows, ...(b.type === 'chart' ? { title } : {}) } : b
    }
    if (!Array.isArray(b?.text)) return b
    const next = fn(b.text)
    return next === b.text ? b : { ...b, text: next }
  })
}

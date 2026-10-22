// What changed between two texts, word by word (stage 6, piece 7; C145 (i);
// collection board v3: "compare: shows the difference with no model call").
// Worked out here; nothing is sent.
//
// Words are matched, not the spaces between them, so two unrelated texts
// read as one taken out and one put in rather than shuffled together. The
// spaces are kept as typed: the parts put together give back each text.
// Pure.

// A word with the space after it, or space at the very start.
const TOKENS = /\S+\s*|\s+/g
// Past this many words on a side, the two are shown whole, one gone and one
// added, rather than holding the page while the table fills.
const MOST = 4000

const wordOf = (t) => t.trim()
const spaceOf = (t) => t.slice(t.trimEnd().length)

/**
 * @param {string} before
 * @param {string} after
 * @returns {Array<{ op: 'same'|'gone'|'added', text: string }>}
 */
export function wordDiff(before, after) {
  const a = String(before ?? '').match(TOKENS) ?? []
  const b = String(after ?? '').match(TOKENS) ?? []
  if (a.length > MOST || b.length > MOST) return merge([...(a.length ? [{ op: 'gone', text: a.join('') }] : []), ...(b.length ? [{ op: 'added', text: b.join('') }] : [])])

  // The longest run of words they share, from the end, one row at a time.
  const n = a.length
  const m = b.length
  const keep = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      keep[i][j] = wordOf(a[i]) === wordOf(b[j]) ? keep[i + 1][j + 1] + 1 : Math.max(keep[i + 1][j], keep[i][j + 1])
    }
  }
  const out = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (wordOf(a[i]) === wordOf(b[j])) {
      // The same word; the space after it may differ.
      const word = a[i].trimEnd()
      out.push({ op: 'same', text: word })
      const sa = spaceOf(a[i])
      const sb = spaceOf(b[j])
      if (sa === sb) out.push({ op: 'same', text: sa })
      else {
        if (sa) out.push({ op: 'gone', text: sa })
        if (sb) out.push({ op: 'added', text: sb })
      }
      i++
      j++
    } else if (keep[i + 1][j] >= keep[i][j + 1]) out.push({ op: 'gone', text: a[i++] })
    else out.push({ op: 'added', text: b[j++] })
  }
  while (i < n) out.push({ op: 'gone', text: a[i++] })
  while (j < m) out.push({ op: 'added', text: b[j++] })
  return merge(out.filter((p) => p.text))
}

// Runs of one kind as one part.
function merge(parts) {
  const out = []
  for (const p of parts) {
    const last = out[out.length - 1]
    if (last && last.op === p.op) last.text += p.text
    else out.push({ ...p })
  }
  return out
}

/** How many words were taken out and put in. */
export function diffCounts(parts) {
  const words = (t) => (t.match(/[^\s]+/g) ?? []).length
  return {
    gone: parts.filter((p) => p.op === 'gone').reduce((n, p) => n + words(p.text), 0),
    added: parts.filter((p) => p.op === 'added').reduce((n, p) => n + words(p.text), 0),
  }
}

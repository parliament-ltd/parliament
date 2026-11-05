// What changed between two texts, word by word (stage 6, piece 7; C145 (i);
// collection board v3: "compare: shows the difference with no model call").
// Worked out here; nothing is sent.
//
// Words are matched, not the spaces between them, so two unrelated texts
// read as one taken out and one put in rather than shuffled together. The
// spaces are kept as typed: the parts put together give back each text.
//
// Languages written without spaces (Chinese, Japanese, Thai and others) are
// split into words by the browser's own dictionary, Intl.Segmenter, which
// works offline (C290). Splitting only decides where the marks fall: the
// texts are never changed, and every difference is still marked. A browser
// without it compares their runs whole, and wordsFound says so.
// Pure, but for the browser's dictionary.

// A word with the space after it, or space at the very start.
const TOKENS = /\S+\s*|\s+/g
// Scripts written without spaces between words.
const UNSPACED = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u
// Past this many words on a side, the two are shown whole, one gone and one
// added, rather than holding the page while the table fills.
const MOST = 4000

const wordOf = (t) => t.trim()
const spaceOf = (t) => t.slice(t.trimEnd().length)

let segmenter
function words() {
  if (segmenter === undefined) {
    try {
      segmenter = typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'word' }) : null
    } catch {
      segmenter = null
    }
  }
  return segmenter
}

/** For tests: a dictionary to split words with, or null for a browser with none. */
export function _useSegmenter(s) {
  segmenter = s
}

/** A text's words, each with the space after it; unspaced runs split by the dictionary. */
export function tokensOf(text) {
  const tokens = String(text ?? '').match(TOKENS) ?? []
  const seg = words()
  if (!seg) return tokens
  return tokens.flatMap((t) => {
    if (!UNSPACED.test(t)) return [t]
    const word = t.trimEnd()
    const pieces = Array.from(seg.segment(word), (s) => s.segment)
    pieces[pieces.length - 1] += t.slice(word.length)
    return pieces
  })
}

/**
 * Whether a text's words can be told apart here: false only for a language
 * written without spaces, in a browser with no dictionary to split it.
 */
export const wordsFound = (text) => Boolean(words()) || !UNSPACED.test(String(text ?? ''))

/**
 * @param {string} before
 * @param {string} after
 * @returns {Array<{ op: 'same'|'gone'|'added', text: string }>}
 */
export function wordDiff(before, after) {
  const a = tokensOf(before)
  const b = tokensOf(after)
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

/** How many words were taken out, put in, and kept: a word has a letter or a number. */
export function diffCounts(parts) {
  const count = (t) => tokensOf(t).filter((w) => /[\p{L}\p{N}]/u.test(w)).length
  const of = (op) => parts.filter((p) => p.op === op).reduce((n, p) => n + count(p.text), 0)
  return { gone: of('gone'), added: of('added'), same: of('same') }
}

/**
 * How much of the longer text the two share, from 0 to 1 (C290): below a
 * third, the marks say little about how they differ.
 */
export function sharedShare({ gone, added, same }) {
  const most = Math.max(same + gone, same + added)
  return most ? same / most : 1
}

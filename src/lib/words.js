// The Dictionary board's words (C303 (b), ruled 16 November): looked up in
// lists shipped with Parliament (Open English WordNet, CC BY 4.0), split into
// pieces by a word's first two letters (scripts/words.mjs). Pure, so it is
// tested alone; the fetching is wordsWorker.js's, off the page's thread.

/** The piece a word is in: its first two letters, "a_" for a one-letter word, "0" for one not starting with a letter. */
export function shardOf(word) {
  const w = String(word ?? '').toLowerCase()
  if (!/^[a-z]/.test(w)) return '0'
  return w[0] + (/^[a-z]$/.test(w[1] ?? '') ? w[1] : '_')
}

/** The piece of a large two-letter piece a word is in: its first three letters, "_" for a word that ends there or goes on with no letter. */
export function splitShardOf(word) {
  const two = shardOf(word)
  if (two === '0' || two.endsWith('_')) return two
  const c = String(word).toLowerCase()[2] ?? ''
  return two + (/^[a-z]$/.test(c) ? c : '_')
}

/** The piece to fetch for a word, given the pieces there are (index.json): split, if its piece was. */
export function pieceFor(word, pieces) {
  const has = pieces instanceof Set ? pieces : new Set(pieces ?? [])
  const three = splitShardOf(word)
  if (has.has(three)) return three
  const two = shardOf(word)
  return has.has(two) ? two : null
}

/** A word as looked up: one word or a short phrase, its spaces made one, in lower case. */
export function wordOf(text) {
  const w = String(text ?? '').normalize('NFC').replace(/[’']/g, "'").replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').replace(/\s+/g, ' ').trim()
  return w.length > 0 && w.length <= 60 ? w.toLowerCase() : ''
}

/**
 * The forms a word might be listed under, the word first: "figures" as
 * "figure", "running" as "run", "happier" as "happy".
 */
export function formsOf(word) {
  const w = wordOf(word)
  if (!w) return []
  const out = [w]
  const add = (f) => { if (f && f.length > 1 && !out.includes(f)) out.push(f) }
  if (/ies$/.test(w)) add(w.replace(/ies$/, 'y'))
  if (/(s|x|z|ch|sh)es$/.test(w)) add(w.replace(/es$/, ''))
  if (/s$/.test(w) && !/ss$/.test(w)) add(w.replace(/s$/, ''))
  if (/ied$/.test(w)) add(w.replace(/ied$/, 'y'))
  if (/ed$/.test(w)) { add(w.replace(/ed$/, '')); add(w.replace(/d$/, '')); add(w.replace(/([b-df-hj-np-tv-z])\1ed$/, '$1')) }
  if (/ing$/.test(w)) { add(w.replace(/ing$/, '')); add(w.replace(/ing$/, 'e')); add(w.replace(/([b-df-hj-np-tv-z])\1ing$/, '$1')) }
  if (/ier$/.test(w)) add(w.replace(/ier$/, 'y'))
  if (/iest$/.test(w)) add(w.replace(/iest$/, 'y'))
  if (/er$/.test(w)) add(w.replace(/er$/, ''))
  if (/est$/.test(w)) add(w.replace(/est$/, ''))
  return out
}

/** How many letters to change, add, take away or swap with the next to make one word the other. */
export function distance(a, b) {
  if (a === b) return 0
  const m = a.length
  const n = b.length
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 0; j <= n; j++) d[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
      // "recieve" for "receive": two letters swapped is one slip.
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
    }
  }
  return d[m][n]
}

/** The words of a piece nearest a word not in it, at most two letters off, nearest first. */
export function nearest(word, words, most = 3) {
  const w = wordOf(word)
  if (!w) return []
  return [...words]
    .filter((x) => Math.abs(x.length - w.length) <= 2)
    .map((x) => [x, distance(w, x)])
    .filter(([, d]) => d > 0 && d <= 2)
    .sort((p, q) => p[1] - q[1] || p[0].localeCompare(q[0]))
    .slice(0, most)
    .map(([x]) => x)
}

const KINDS = { n: 'noun', v: 'verb', a: 'adjective', r: 'adverb' }

/**
 * What the board shows of a word found in a piece: its meanings grouped by
 * kind, in order, and the words that mean the same and the opposite.
 */
export function entryView(word, entry) {
  if (!entry) return null
  const groups = []
  for (const [kind, definition, example] of entry.m ?? []) {
    const name = KINDS[kind] ?? 'noun'
    let g = groups.find((x) => x.kind === name)
    if (!g) { g = { kind: name, meanings: [] }; groups.push(g) }
    g.meanings.push({ definition, example: example ?? null })
  }
  return { word: entry.w ?? word, groups, same: entry.s ?? [], opposite: entry.o ?? [] }
}

/** The lists' own name and licence, said under the board as they give them. */
export const SOURCE = Object.freeze({ source: 'Open English WordNet', licence: 'CC BY 4.0' })

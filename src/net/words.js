// The Dictionary board's word lists (C303 (b)): pieces from this site's own
// /words/en/, fetched one at a time when a word in them is looked up, and
// kept by the service worker after (vite.config.js, parliament-words-v1).
// No provider or source is asked anything. Read beside the page, by
// lib/wordsWorker.js.

const BASE = '/words/en/'

/** The list of pieces there are, and the lists' edition and licence; null if there are none. */
export async function wordIndex() {
  const r = await fetch(`${BASE}index.json`, { credentials: 'same-origin' })
  return r.ok ? r.json() : null
}

/** One piece, by its name (its first letters), or null. */
export async function wordPiece(name) {
  if (!/^[a-z0_]{1,3}$/.test(String(name))) return null
  const r = await fetch(`${BASE}p-${name}.json`, { credentials: 'same-origin' })
  return r.ok ? r.json() : null
}

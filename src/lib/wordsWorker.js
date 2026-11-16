// Looks words up in the Dictionary board's lists (C303 (b)), beside the page
// so a large piece never holds up typing. Each piece is fetched from
// Parliament's own address the first time a word in it is asked for, and
// kept here while the page is open; the browser keeps it after
// (vite.config.js, parliament-words-v1). Nothing is sent anywhere else.
import { pieceFor, formsOf, nearest, wordOf, entryView } from './words.js'
import { wordIndex, wordPiece } from '../net/words.js'

let index = null
const pieces = new Map()

async function indexOf() {
  if (!index) {
    index = wordIndex().then((j) => (j && Array.isArray(j.pieces) ? { ...j, set: new Set(j.pieces) } : null))
    index.catch(() => { index = null })
  }
  return index
}

async function pieceOf(name) {
  if (!pieces.has(name)) {
    const p = wordPiece(name)
    pieces.set(name, p)
    p.catch(() => pieces.delete(name))
  }
  return pieces.get(name)
}

// Only a piece's own words: never a name every object has, as "constructor".
const own = (piece, word) => (piece && Object.hasOwn(piece, word) ? piece[word] : null)

async function lookUp(text) {
  const word = wordOf(text)
  if (!word) return { word: '', found: null, near: [] }
  const idx = await indexOf()
  if (!idx) return { word, found: null, near: [], missing: true }
  for (const form of formsOf(word)) {
    const name = pieceFor(form, idx.set)
    if (!name) continue
    const entry = own(await pieceOf(name), form)
    if (entry) return { word, found: entryView(form, entry), near: [] }
  }
  const name = pieceFor(word, idx.set)
  const piece = name ? await pieceOf(name) : null
  return { word, found: null, near: piece ? nearest(word, Object.keys(piece)) : [] }
}

self.onmessage = async (event) => {
  const { id, word } = event.data ?? {}
  try {
    self.postMessage({ id, ok: true, ...(await lookUp(word)) })
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err?.message || err) })
  }
}

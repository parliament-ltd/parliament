// Numbers and addresses (almanac-spec-decisions.md §3, docket-spec-decisions.md §2,
// conflicts.md C17, C49, C56).
//
// Everything that takes a number shares one number space, counting up from
// FIRST_NUM and never reused, so a number alone says what it points at.
// Branches are addressed, not numbered: the docket's number plus a letter
// (201b). Letters are lower case (C49) and read in either case. They are
// assigned at creation, never reshuffled and never reissued. i and o are
// skipped, and past z they double (aa, ab, ...) with no limit. Steps are
// ordinals inside a branch; the address stops at two levels. A run is never
// part of an address.

export const FIRST_NUM = 201

// 24 letters: a to z without i and o.
export const LETTERS = 'abcdefghjklmnpqrstuvwxyz'

// Kinds that draw from the shared counter. Edits, asks and suggestions are
// numbered but appear in the Almanac only when filtered for, and so do terms
// and quotes (C56, A19).
export const NUMBERED_KINDS = Object.freeze(['chat', 'note', 'highlight', 'term', 'quote', 'docket', 'edit', 'ask', 'suggestion'])

/** 0 -> a, 23 -> z, 24 -> aa, 25 -> ab ... (bijective base 24). */
export function letterAt(index) {
  if (!Number.isInteger(index) || index < 0) throw new Error(`Bad letter index ${index}`)
  let n = index + 1
  let s = ''
  while (n > 0) {
    n -= 1
    s = LETTERS[n % LETTERS.length] + s
    n = Math.floor(n / LETTERS.length)
  }
  return s
}

/** Inverse of letterAt, in either case. Returns -1 for anything that is not a valid letter run. */
export function letterIndex(letters) {
  const low = String(letters || '').toLowerCase()
  if (!low) return -1
  let n = 0
  for (const ch of low) {
    const d = LETTERS.indexOf(ch)
    if (d < 0) return -1
    n = n * LETTERS.length + d + 1
  }
  return n - 1
}

// A number of three or more digits, optionally followed by letters from the
// 24-letter set. Case-insensitive. Nothing after the letters: no step, no run.
const ADDRESS = /^(\d{3,})([a-hj-np-z]+)?$/i

/** '201' -> { num: 201, letter: null }; '201B' -> { num: 201, letter: 'b' }; else null. */
export function parseAddress(text) {
  const m = ADDRESS.exec(String(text || '').trim())
  if (!m) return null
  const num = Number(m[1])
  if (num < FIRST_NUM) return null
  return { num, letter: m[2] ? m[2].toLowerCase() : null }
}

export function formatAddress({ num, letter = null }) {
  return `${num}${letter ? letter.toLowerCase() : ''}`
}

// Numbers and addresses (almanac-spec-decisions.md §3, docket-spec-decisions.md §2,
// conflicts.md C17).
//
// Chats, notes, highlights and dockets share one number space, counting up
// from FIRST_NUM and never reused, so a number alone says what it points at.
// Branches are addressed, not numbered: the docket's number plus a letter
// (201B). Letters are assigned at creation, never reshuffled and never
// reissued. I and O are skipped, and past Z they double (AA, AB, ...) with no
// limit. Steps are ordinals inside a branch; the address stops at two levels.
// A run is never part of an address.

export const FIRST_NUM = 201

// 24 letters: A to Z without I and O.
export const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'

export const NUMBERED_KINDS = Object.freeze(['chat', 'note', 'highlight', 'docket'])

/** 0 -> A, 23 -> Z, 24 -> AA, 25 -> AB ... (bijective base 24). */
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

/** Inverse of letterAt. Returns -1 for anything that is not a valid letter run. */
export function letterIndex(letters) {
  const up = String(letters || '').toUpperCase()
  if (!up) return -1
  let n = 0
  for (const ch of up) {
    const d = LETTERS.indexOf(ch)
    if (d < 0) return -1
    n = n * LETTERS.length + d + 1
  }
  return n - 1
}

// A number of three or more digits, optionally followed by letters from the
// 24-letter set. Case-insensitive. Nothing after the letters: no step, no run.
const ADDRESS = /^(\d{3,})([A-HJ-NP-Z]+)?$/i

/** '201' -> { num: 201, letter: null }; '201b' -> { num: 201, letter: 'B' }; else null. */
export function parseAddress(text) {
  const m = ADDRESS.exec(String(text || '').trim())
  if (!m) return null
  const num = Number(m[1])
  if (num < FIRST_NUM) return null
  return { num, letter: m[2] ? m[2].toUpperCase() : null }
}

export function formatAddress({ num, letter = null }) {
  return `${num}${letter || ''}`
}

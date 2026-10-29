// Letters from the one who made Parliament (C279 (c); welcome spec §14).
// They ship with each release, so nothing is fetched, and live in the copy
// table so they can be translated. Letter one is the welcome page's letter,
// in Stefan's own words, as he wrote it (C265). A new letter is one more
// entry here, numbered on, with its paragraphs in the copy table.
//
// letter: opens the newest, letter:1 one by its number, letter:all the list.
// Nothing announces them: letter: is in ? like any command. Which ones were
// read is kept on this device only, as the welcome steps are (C121).

import { COPY } from '../copy'

export const LETTERS = Object.freeze([
  Object.freeze({
    n: 1,
    date: '2026-10-28T12:00:00',
    paragraphs: Object.freeze([COPY.welcome.letter1, COPY.welcome.letter2, COPY.welcome.letter3, COPY.welcome.letter4, COPY.welcome.letter5]),
    closing: COPY.welcome.closing,
    signature: COPY.welcome.signature,
  }),
])

/** The setting that keeps which letters were read, on this device only. */
export const LETTERS_SETTING = 'lettersRead'

/** The letter with that number, or null. */
export const letterOf = (n) => LETTERS.find((l) => l.n === n) ?? null

/** The newest letter. */
export const newestLetter = () => LETTERS[LETTERS.length - 1]

/** Read letters as stored, made safe: numbers of letters that exist, in order. */
export function cleanRead(raw) {
  const list = Array.isArray(raw) ? raw : []
  return LETTERS.map((l) => l.n).filter((n) => list.includes(n))
}

/** The read list after a letter was opened; the same array when nothing changed. */
export const markRead = (read, n) => (read.includes(n) || !letterOf(n) ? read : cleanRead([...read, n]))

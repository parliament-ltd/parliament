// Lines that are titles (C287). An answer from Wikipedia comes as plain
// text, so the article's own links arrive as plain words: a line such as
// "List of Nintendo arcade video games" is the title of a page the article
// links to, and nothing more. Asked for in the same request, the titles of
// the pages it links to tell such a line apart from any other, and the line
// gets a quiet way to ask about it in the bar.
//
// Pure, and kept free of app imports, so it can be tested in Node.

/** Most titles a source's note keeps, and the longest one (validate.js reads these too). */
export const MOST_TITLES = 500
export const TITLE_CHARS = 300

/**
 * The title a line is, of the titles given, or null. The whole line, its
 * spaces at either end aside, must be the title, word for word and letter
 * for letter; a full stop at its end may be left off.
 * @param {string} line
 * @param {Set<string>|string[]|null|undefined} titles
 * @returns {string|null}
 */
export function lineTitle(line, titles) {
  if (typeof line !== 'string' || !titles) return null
  const known = titles instanceof Set ? titles : new Set(Array.isArray(titles) ? titles : [])
  if (!known.size) return null
  const text = line.trim()
  if (!text) return null
  if (known.has(text)) return text
  if (text.endsWith('.')) {
    const bare = text.slice(0, -1).trimEnd()
    if (bare && known.has(bare)) return bare
  }
  return null
}

/**
 * The titles that are lines of a text, each once, in the order their lines
 * come, at most MOST_TITLES: what a source's note keeps of the pages its
 * answer links to, so only the titles the answer can use are stored.
 * @param {string} text
 * @param {string[]|null|undefined} titles
 * @returns {string[]}
 */
export function titlesIn(text, titles) {
  if (typeof text !== 'string' || !Array.isArray(titles) || !titles.length) return []
  const known = new Set(titles.filter((t) => typeof t === 'string' && t.length > 0 && t.length <= TITLE_CHARS))
  const out = []
  const seen = new Set()
  for (const line of text.split('\n')) {
    const title = lineTitle(line, known)
    if (!title || seen.has(title)) continue
    seen.add(title)
    out.push(title)
    if (out.length >= MOST_TITLES) break
  }
  return out
}

/** Whether a value is a note's titles: a list of short strings, not too many. */
export const isTitleList = (v) => Array.isArray(v) && v.length <= MOST_TITLES
  && v.every((t) => typeof t === 'string' && t.length > 0 && t.length <= TITLE_CHARS)

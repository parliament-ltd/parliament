/* ── Case-insensitive text search utilities ──────────────── */

export function indexOfCI(str, search, fromIndex = 0) {
  return str.toLowerCase().indexOf(search.toLowerCase(), fromIndex)
}

export function includesCI(str, search) {
  return str.toLowerCase().includes(search.toLowerCase())
}

/**
 * Word-boundary-aware search: only matches if the found substring
 * is bounded by non-alphanumeric characters (or string edges).
 */
export function indexOfWord(str, search, fromIndex = 0) {
  const strLower    = str.toLowerCase()
  const searchLower = search.toLowerCase()
  let pos = fromIndex

  while (pos < strLower.length) {
    const idx = strLower.indexOf(searchLower, pos)
    if (idx === -1) return -1

    const charBefore = idx > 0 ? strLower[idx - 1] : ' '
    const charAfter  =
      idx + searchLower.length < strLower.length
        ? strLower[idx + searchLower.length]
        : ' '

    if (!/[a-z0-9]/.test(charBefore) && !/[a-z0-9]/.test(charAfter)) return idx
    pos = idx + 1
  }
  return -1
}

export function includesWord(str, search) {
  return indexOfWord(str, search) !== -1
}

/**
 * Count every word-boundary occurrence of `search` in `str`. Used by
 * highlights@1.0 to report the actual number of times a term appears
 * across a conversation, rather than the number of messages containing
 * it.
 */
export function countWordOccurrences(str, search) {
  if (!str || !search) return 0
  let n = 0
  let pos = 0
  while (pos < str.length) {
    const idx = indexOfWord(str, search, pos)
    if (idx === -1) break
    n++
    pos = idx + search.length
  }
  return n
}

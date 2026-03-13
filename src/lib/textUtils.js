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

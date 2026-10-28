// The changelog's newest entry (stage 15, piece 5; C272 (g)). The build
// writes it to /changelog.json, which the service worker does not keep, so a
// tab with an update waiting fetches the new version's entry, not its own.
// The text is Parliament's own file, and is shown as text.

/** The newest entry of CHANGELOG.md: { version, lines }, or null. */
export function newestEntry(markdown) {
  const text = String(markdown ?? '').replace(/\r\n/g, '\n')
  const at = text.search(/^## /m)
  if (at < 0) return null
  const rest = text.slice(at)
  const end = rest.slice(3).search(/^## /m)
  const section = end < 0 ? rest : rest.slice(0, end + 3)
  const [head, ...body] = section.split('\n')
  const version = head.replace(/^## /, '').trim()
  const lines = body.filter((l) => /^- /.test(l)).map((l) => l.slice(2).trim()).filter(Boolean)
  return version ? { version, lines } : null
}

/** What the update notice shows: the version's first few lines, as text. */
export function noticeLines(entry, max = 4) {
  if (!entry || typeof entry !== 'object' || !Array.isArray(entry.lines)) return null
  const all = entry.lines.filter((l) => typeof l === 'string' && l.length <= 300)
  const lines = all.slice(0, max)
  return lines.length ? { version: String(entry.version ?? '').slice(0, 60), lines, more: all.length > lines.length } : null
}

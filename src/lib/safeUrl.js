// Where a link or image in text from outside may point (security audit,
// item 10 and T8): web and mail addresses only. Anything else, a relative
// address into the app included, is no address at all. Used by the one
// Markdown component.

const SAFE = /^(https?:|mailto:)/i

/** A link or image address as it may be used: web and mail only, else ''. */
export function safeUrl(url) {
  const u = String(url ?? '').trim()
  return SAFE.test(u) ? u : ''
}

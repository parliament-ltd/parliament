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

/**
 * The address a link goes to, as the browser reads it: a look-alike name in
 * its xn-- form, so the words of a link cannot hide where it goes (security
 * notes §1.3; C146 (b)). null for an address that is not on the web.
 */
export function shownAddress(href) {
  try {
    const url = new URL(href)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.href
  } catch {
    return null
  }
}

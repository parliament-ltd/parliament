// Sources: answers from public sources, with no key and no tokens
// (refactor-plan.md, stage 4; A8, A14; C110).
//
// A source is a manifest with no code in it (src/net/sources/*.json): where
// to ask, what to ask, which parts of the answer to keep, its licence. This
// runner is the only code, and it is the same for every source, so adding a
// source adds data, not code.
//
// What comes back is plain text and is data: the person's words are sent as
// a search and nothing else, the request carries no credentials and no
// referrer, the answer's text is kept as text and must be shown as text,
// never as HTML, and it can never run a command. Every answer carries where
// it came from: the source, the page, its revision and its licence.
//
// The runner checks each address against the origins the list of providers
// and sources gives the source, so a manifest can never reach a host the
// connection policy does not name. Requests go out only through the gateway.

export class SourceError extends Error {
  constructor(reason, status = null) {
    super(`Source request failed: ${reason}${status ? ` (${status})` : ''}`)
    this.name = 'SourceError'
    this.reason = reason
    this.status = status
  }
}

// A value at a path in an object: 'query.pages', 'revisions.0.revid'.
function pick(obj, path) {
  return String(path).split('.').reduce((v, key) => (v == null ? undefined : v[key]), obj)
}

// Whether an address is covered by an origin, '*' standing for one label.
function allowed(url, origins) {
  return origins.some((origin) => {
    const o = new URL(origin.replace('*.', 'wildcard.'))
    if (o.protocol !== url.protocol || o.port !== url.port) return false
    if (!origin.includes('*.')) return o.hostname === url.hostname
    const base = o.hostname.slice('wildcard.'.length)
    const head = url.hostname.slice(0, -(base.length + 1))
    return url.hostname.endsWith(`.${base}`) && head.length > 0 && !head.includes('.')
  })
}

/** The source's language for an interface language: 'sv-FI' -> 'sv'. */
export function sourceLanguage(manifest, locale) {
  const base = String(locale ?? '').toLowerCase().split('-')[0]
  return new RegExp(manifest.language.pattern).test(base) ? base : manifest.language.fallback
}

/**
 * A source from its manifest.
 * @param {object} manifest
 * @param {{ origins: string[], fetch: typeof fetch }} deps the origins the list gives it, and fetch
 */
export function createSource(manifest, { origins, fetch: request }) {
  return {
    /**
     * Looks a question up. Returns { source, name, title, text, url,
     * revision, revisedAt, licence, lang }, or null when nothing was found.
     */
    async answer(question, { lang = manifest.language.fallback, signal } = {}) {
      const q = String(question ?? '').trim().slice(0, manifest.limits.queryChars)
      if (!q) return null
      const language = sourceLanguage(manifest, lang)
      const url = new URL(manifest.request.url.replace('{lang}', language))
      for (const [key, value] of Object.entries(manifest.request.query)) url.searchParams.set(key, value.replace('{q}', q))
      if (!allowed(url, origins)) throw new SourceError('address not allowed')

      let res
      try {
        res = await request(url.toString(), { credentials: 'omit', referrerPolicy: 'no-referrer', signal, headers: { Accept: 'application/json' } })
      } catch (err) {
        if (err?.name === 'AbortError') throw err
        throw new SourceError('unreachable')
      }
      if (!res.ok) throw new SourceError('refused', res.status)
      const data = await res.json()
      const list = pick(data, manifest.result.list)
      const item = Array.isArray(list) ? list[0] : null
      if (!item) return null

      const text = String(pick(item, manifest.result.text) ?? '').trim()
      if (!text) return null
      const field = (name) => {
        const v = pick(item, manifest.result[name])
        return v == null ? null : String(v)
      }
      return {
        source: manifest.id,
        name: manifest.name,
        title: field('title'),
        text: text.length > manifest.limits.textChars ? `${text.slice(0, manifest.limits.textChars)}…` : text,
        url: field('url'),
        revision: field('revision'),
        revisedAt: field('revisedAt'),
        licence: { ...manifest.licence },
        lang: language,
      }
    },
  }
}

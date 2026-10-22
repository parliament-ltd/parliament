// Sources: answers from public sources, with no key and no tokens
// (refactor-plan.md, stage 4 and stage 7; A8, A14; C110, C156).
//
// A source is a manifest with no code in it (src/net/sources/*.json): where
// to ask, what to ask, which parts of the answer to keep, its licence. This
// runner is the only code, and it is the same for every source, so adding a
// source adds data, not code.
//
// Two shapes (almanac spec §8): an article (Wikipedia: the first page found,
// its text, page, revision and licence), and a list of results (Hacker
// News, OpenAlex: up to a few, each a title, a link, a date, a few facts
// and perhaps a passage of text). A manifest names where each part is with
// a path ('query.pages', 'revisions.0.revid'), or with one of a fixed set of
// readers the runner knows (read(), below), so a manifest still holds no
// code.
//
// What comes back is plain text and is data: the person's words are sent as
// a search and nothing else, the request carries no credentials and no
// referrer, the answer's text is kept as text and must be shown as text,
// never as HTML, and it can never run a command. A source's HTML is never
// used. Every answer carries where it came from.
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

// The one header a manifest may ask for: naming Parliament to a source that
// asks automated clients to identify themselves, as Wikimedia does for
// browser tools (its User-Agent policy; C160). It names the app, the same
// for everyone, never the person.
const IDENTIFY_HEADERS = new Set(['Api-User-Agent'])

// Most results a list keeps, whatever a manifest asks.
const MOST = 10

// Text from an index of words to their places, as OpenAlex keeps an
// abstract: { "Barn": [0], "owls": [1, 9] } reads "Barn owls …".
function fromWordIndex(index) {
  if (!index || typeof index !== 'object' || Array.isArray(index)) return null
  const words = []
  for (const [word, places] of Object.entries(index)) {
    if (!Array.isArray(places)) continue
    for (const at of places) if (Number.isInteger(at) && at >= 0 && at < 5000) words[at] = word
  }
  const text = words.filter((w) => typeof w === 'string').join(' ').trim()
  return text || null
}

/**
 * One part of a result, as a manifest names it: a path, or one of these
 * readers, never code.
 *   { first: [paths] }            the first path that has a value
 *   { template: "…{path}…" }      a text with values put in ({objectID})
 *   { wordIndex: path }           text from an index of words to places
 *   { names: path, path, max }    up to max values from a list, joined
 * @returns {string|null}
 */
export function read(item, spec) {
  if (spec == null) return null
  const str = (v) => (v == null || v === '' || typeof v === 'object' ? null : String(v))
  if (typeof spec === 'string') return str(pick(item, spec))
  if (Array.isArray(spec.first)) {
    for (const p of spec.first) { const v = str(pick(item, p)); if (v) return v }
    return null
  }
  if (typeof spec.template === 'string') {
    let missing = false
    const out = spec.template.replace(/\{([\w.]+)\}/g, (_, p) => {
      const v = str(pick(item, p))
      if (v == null) missing = true
      return encodeURIComponent(v ?? '')
    })
    return missing ? null : out
  }
  if (typeof spec.wordIndex === 'string') return fromWordIndex(pick(item, spec.wordIndex))
  if (typeof spec.names === 'string') {
    const list = pick(item, spec.names)
    if (!Array.isArray(list)) return null
    const names = list.map((x) => str(pick(x, spec.path ?? ''))).filter(Boolean)
    const max = Math.max(1, Math.min(Number(spec.max) || 3, 10))
    return names.length ? names.slice(0, max).join(', ') + (names.length > max ? ' …' : '') : null
  }
  return null
}

const cut = (text, max) => (text && text.length > max ? `${text.slice(0, max)}…` : text)
// A link is kept only when it is a web address the person can open.
const webLink = (v) => (typeof v === 'string' && /^https:\/\/[^\s]+$/.test(v) && v.length <= 2000 ? v : null)

/** The source's language for an interface language: 'sv-FI' -> 'sv'. */
export function sourceLanguage(manifest, locale) {
  const base = String(locale ?? '').toLowerCase().split('-')[0]
  if (!manifest.language.pattern) return manifest.language.fallback
  return new RegExp(manifest.language.pattern).test(base) ? base : manifest.language.fallback
}

/**
 * A list's results as plain text: what the chat keeps as the answer, read by
 * search, copy: and export:. Only the source's own words, links and dates:
 * the facts with their words (points, authors) are drawn by the interface
 * from the note, so no word of the interface is stored (C86).
 */
export function listText(items) {
  return items.map((it) => [it.title, it.date, it.text, it.url ?? it.discussion].filter(Boolean).join('\n')).join('\n\n')
}

/**
 * A source from its manifest.
 * @param {object} manifest
 * @param {{ origins: string[], fetch: typeof fetch, identity?: string }} deps the origins the list gives it,
 *   fetch, and how Parliament names itself where a source asks (C160)
 */
export function createSource(manifest, { origins, fetch: request, identity = null }) {
  const identify = identity && IDENTIFY_HEADERS.has(manifest.identifyWith) ? { [manifest.identifyWith]: identity } : {}
  const list = manifest.shape === 'list'
  return {
    /**
     * Looks a question up. An article: { source, name, title, text, url,
     * revision, revisedAt, licence, lang }. A list: { source, name, shape:
     * 'list', items, text, licence, lang }, each item { title, url,
     * discussion, date, text, facts }. null when nothing was found.
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
        res = await request(url.toString(), { credentials: 'omit', referrerPolicy: 'no-referrer', signal, headers: { Accept: 'application/json', ...identify } })
      } catch (err) {
        if (err?.name === 'AbortError') throw err
        throw new SourceError('unreachable')
      }
      if (!res.ok) throw new SourceError('refused', res.status)
      const data = await res.json()
      const found = pick(data, manifest.result.list)
      const licence = manifest.licence ? { ...manifest.licence } : null

      if (list) {
        const spec = manifest.result.item
        const items = (Array.isArray(found) ? found : []).slice(0, Math.min(manifest.result.max ?? 5, MOST)).map((raw) => {
          const facts = {}
          for (const [key, s] of Object.entries(spec.facts ?? {})) {
            const v = read(raw, s)
            if (v != null) facts[key] = cut(v, 200)
          }
          return {
            title: cut(read(raw, spec.title), 300),
            url: webLink(read(raw, spec.url)),
            discussion: webLink(read(raw, spec.discussion)),
            date: cut(read(raw, spec.date), 40),
            text: cut(read(raw, spec.text), manifest.limits.itemChars ?? 600),
            facts,
          }
        }).filter((it) => it.title)
        if (!items.length) return null
        return { source: manifest.id, name: manifest.name, shape: 'list', items, text: listText(items), licence, lang: language }
      }

      const item = Array.isArray(found) ? found[0] : null
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
        licence,
        lang: language,
      }
    },
  }
}

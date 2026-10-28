// What the vault allows (research/vault-design.md §4; C267 (b)): for each
// provider that takes a key, its origins, the few paths Parliament uses, and
// the header the key goes in. The page names the provider and builds the
// request; the vault checks it against this list, its own, and puts the key
// in itself. Anything else is refused. A new provider or path is a vault
// deploy, reviewed.

export const PROVIDERS = Object.freeze({
  anthropic: Object.freeze({
    origins: ['https://api.anthropic.com'],
    paths: [['POST', '/v1/messages'], ['POST', '/v1/messages/count_tokens']],
    keyHeader: 'x-api-key',
    keyValue: (key) => key,
  }),
  mistral: Object.freeze({
    origins: ['https://api.mistral.ai', 'https://api.eu.mistral.ai', 'https://api.us.mistral.ai'],
    paths: [['POST', '/v1/chat/completions'], ['GET', '/v1/models']],
    keyHeader: 'authorization',
    keyValue: (key) => `Bearer ${key}`,
  }),
})

// The headers the page may send. The key's header is never taken from the
// page: the vault sets it.
export const HEADERS = Object.freeze(['content-type', 'accept', 'anthropic-version', 'anthropic-beta', 'anthropic-dangerous-direct-browser-access'])

export const BODY_MAX = 8 * 1024 * 1024

/**
 * Checks a request from the page. Returns { url, method, headers, body }
 * ready to send once the key is added, or { refused } saying why.
 * @param {{ provider: string, url: string, method?: string, headers?: Record<string,string>, body?: string|null }} req
 * @param {string|null} key the provider's key, from the store
 */
export function checkRequest(req, key) {
  const p = Object.hasOwn(PROVIDERS, req?.provider) ? PROVIDERS[req.provider] : null
  if (!p) return { refused: 'provider' }
  let url
  try { url = new URL(String(req.url)) } catch { return { refused: 'address' } }
  if (!p.origins.includes(url.origin) || url.username || url.password) return { refused: 'address' }
  const method = String(req.method ?? 'GET').toUpperCase()
  if (!p.paths.some(([m, path]) => m === method && path === url.pathname)) return { refused: 'path' }
  if (req.body != null && (typeof req.body !== 'string' || req.body.length > BODY_MAX)) return { refused: 'body' }
  if (method === 'GET' && req.body != null) return { refused: 'body' }
  if (!key) return { refused: 'no-key' }
  const headers = {}
  for (const [name, value] of Object.entries(req.headers ?? {})) {
    const n = String(name).toLowerCase()
    if (HEADERS.includes(n) && typeof value === 'string') headers[n] = value
  }
  headers[p.keyHeader] = p.keyValue(key)
  return { url: url.href, method, headers, body: req.body ?? null }
}

/** The origins the vault's own policy lets it connect to. */
export const connectOrigins = () => Object.values(PROVIDERS).flatMap((p) => p.origins)

// The network log, grouped by host (refactor-plan.md, stage 7, piece 2;
// privacy copy draft, items 16 and 17).
//
// Two records meet here. The page's own log (lib/networkLog.js) sees every
// request the page makes with fetch: when, where (host and path, never the
// query, so a search sent to a source never reaches it) and how it ended.
// The gateway's log (gateway.js) knows what made each request to a provider
// or source: a prompt, a key's check, the title request. Grouped by host,
// each host is named by the provider or source it belongs to on the list,
// and says what made its requests. A host on no list is said to be so: every
// host should be a provider or source the person uses.
//
// Pure: the two logs and the list are passed in.

// Whether a host is covered by an origin, '*' standing for one label.
export function hostOf(origin) {
  try {
    return new URL(origin.replace('*.', 'wildcard.')).host.replace(/^wildcard\./, '*.')
  } catch {
    return null
  }
}
function covers(origin, host) {
  const o = hostOf(origin)
  if (!o) return false
  if (!o.startsWith('*.')) return o === host
  const base = o.slice(2)
  const head = host.slice(0, -(base.length + 1))
  return host.endsWith(`.${base}`) && head.length > 0 && !head.includes('.')
}

/**
 * @param {{ entries: Array<{ host: string, timestamp: number, ok: boolean|null, status: number|null }>,
 *   requests?: Array<{ at: number, to: string, label: string }>, destinations: object[], self?: string }} input
 *   entries: the page's log; requests: the gateway's; self: this page's own host
 * @returns {Array<{ host: string, id: string|null, name: string|null, self: boolean, count: number, failed: number,
 *   last: number, labels: Array<{ label: string, count: number }> }>} the busiest host first
 */
export function requestsByHost({ entries = [], requests = [], destinations, self = null }) {
  const owner = (host) => destinations.find((d) => d.origins.some((o) => covers(o, host))) ?? null
  const groups = new Map()
  for (const e of entries) {
    const host = String(e.host ?? 'unknown')
    let g = groups.get(host)
    if (!g) {
      const d = owner(host)
      g = { host, id: d?.id ?? null, name: d?.name ?? null, self: host === self, count: 0, failed: 0, last: 0, labels: [] }
      groups.set(host, g)
    }
    g.count++
    if (e.ok === false) g.failed++
    g.last = Math.max(g.last, e.timestamp ?? 0)
  }
  // What made the requests to each provider or source, from the gateway.
  const made = new Map() // id -> Map(label -> count)
  for (const r of requests) {
    if (!made.has(r.to)) made.set(r.to, new Map())
    const m = made.get(r.to)
    m.set(r.label, (m.get(r.label) ?? 0) + 1)
  }
  for (const g of groups.values()) {
    const m = g.id ? made.get(g.id) : null
    g.labels = m ? [...m].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count) : []
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || b.last - a.last)
}

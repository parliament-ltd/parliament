// ─── Network Activity Log ────────────────────────────────
// Wraps window.fetch to record every outbound request made
// by the app. In-memory ring buffer (max 100 entries); resets
// on page reload. Powers the Network Activity card in Settings
// so users can verify that only Anthropic's API is contacted.

const MAX_ENTRIES = 100

const state = {
  entries: [],
  listeners: new Set(),
}

function emit() {
  // Replace array reference so useSyncExternalStore detects the change
  state.entries = state.entries.slice()
  for (const listener of state.listeners) listener()
}

function pushEntry(entry) {
  state.entries.push(entry)
  if (state.entries.length > MAX_ENTRIES) {
    state.entries.splice(0, state.entries.length - MAX_ENTRIES)
  }
  emit()
}

// Where a request went, without its query: a search sent to a source, or a
// provider that puts a key in the address, never reaches the log (request
// path audit, risk 8; stage 4).
function hostAndPath(url) {
  try {
    const u = new URL(url, window.location.href)
    return { host: u.host, path: u.pathname }
  } catch {
    return { host: 'unknown', path: String(url) }
  }
}

// ─── Public API ──────────────────────────────────────────

export function getEntries() {
  return state.entries
}

export function subscribe(listener) {
  state.listeners.add(listener)
  return () => state.listeners.delete(listener)
}

export function clearLog() {
  state.entries = []
  emit()
}

/**
 * A request the vault made for the page (stage 15; research/vault-design.md
 * §3): the page's own fetch never sees it, so the vault reports it here.
 */
export function noteVaultRequest({ method = 'POST', url, status = null }) {
  const { host, path } = hostAndPath(url)
  pushEntry({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, timestamp: Date.now(), method, host, path, status, ok: status != null ? status >= 200 && status < 300 : null, durationMs: null, via: 'vault' })
}

// ─── fetch wrapper ───────────────────────────────────────

let installed = false

export function installFetchLogger() {
  if (installed || typeof window === 'undefined' || !window.fetch) return
  installed = true

  const originalFetch = window.fetch.bind(window)

  window.fetch = async function loggedFetch(input, init) {
    const startedAt = performance.now()
    const method = (init?.method || (typeof input === 'object' && input?.method) || 'GET').toUpperCase()
    const url = typeof input === 'string' ? input : (input?.url || String(input))
    const { host, path } = hostAndPath(url)

    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      method,
      host,
      path,
      status: null,
      ok: null,
      durationMs: null,
      error: null,
    }

    try {
      const response = await originalFetch(input, init)
      entry.status = response.status
      entry.ok = response.ok
      entry.durationMs = Math.round(performance.now() - startedAt)
      pushEntry(entry)
      return response
    } catch (err) {
      entry.status = 0
      entry.ok = false
      entry.error = err?.message || 'Network error'
      entry.durationMs = Math.round(performance.now() - startedAt)
      pushEntry(entry)
      throw err
    }
  }
}

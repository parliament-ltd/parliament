// ─── Network Activity Log ────────────────────────────────
// Wraps window.fetch to record every outbound request made
// by the app. A ring buffer of the last 200, kept for the tab's session
// (C291 (m)): host, time and outcome only, so a reload within the tab keeps
// them and closing the tab forgets them. Powers the Network Activity card in Settings
// so people can check that only the providers and sources they use are
// contacted, and the requests the key vault makes for the page (C272 (h)).

import { sessionKeep } from './sessionKeep'

const MAX_ENTRIES = 200
const kept = sessionKeep('parliament-network', (e) => (e && typeof e.host === 'string'
  ? { id: String(e.id ?? ''), timestamp: Number(e.timestamp) || 0, method: String(e.method ?? '').slice(0, 10), host: e.host.slice(0, 255), path: '', status: Number.isInteger(e.status) ? e.status : null, ok: typeof e.ok === 'boolean' ? e.ok : null, durationMs: null, ...(e.via === 'vault' ? { via: 'vault' } : {}) }
  : null), MAX_ENTRIES)

const state = {
  entries: kept.read(),
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
  kept.write(state.entries)
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
  kept.write([])
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

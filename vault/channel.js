// The vault's side of the private channel (research/vault-design.md §3).
// One port, given by the page after each side has checked the other's exact
// address. Requests come in; the vault adds the key, sends, and passes the
// reply back in pieces. Never a key goes back.
//
// Pure apart from what it is given: the store, fetch, and the port.

import { checkRequest, PROVIDERS } from './allow'

export const KEYED = Object.freeze(Object.keys(PROVIDERS))

/**
 * @param {{ port: MessagePort, store: ReturnType<import('./store').createStore>, fetch: typeof fetch,
 *   typed?: () => { provider: string, key: string }|null, clearTyped?: () => void }} deps
 *   typed: the key the person typed into the vault's own field, if any
 */
export function serveChannel({ port, store, fetch, typed = () => null, clearTyped = () => {} }) {
  const running = new Map() // id -> AbortController
  const post = (m, transfer) => port.postMessage(m, transfer ?? [])
  const tellKeys = async () => post({ kind: 'keys', providers: await store.status(KEYED) })

  async function send(m) {
    // The key typed into the field, for its check, or the one kept.
    const t = m.typed ? typed() : null
    if (m.typed && (!t || t.provider !== m.provider)) { post({ id: m.id, kind: 'error', reason: 'no-key' }); return }
    const key = m.typed ? t.key : await store.get(m.provider)
    const req = checkRequest(m, key)
    if (req.refused) { post({ id: m.id, kind: 'error', reason: req.refused }); return }
    const control = new AbortController()
    running.set(m.id, control)
    try {
      const res = await fetch(req.url, { method: req.method, headers: req.headers, body: req.body, signal: control.signal, credentials: 'omit', referrerPolicy: 'no-referrer' })
      // For the page's network log: where it went and how it ended, never the key or the words.
      post({ kind: 'sent', provider: m.provider, method: req.method, url: `${new URL(req.url).origin}${new URL(req.url).pathname}`, status: res.status, at: Date.now() })
      const headers = {}
      for (const name of ['content-type', 'retry-after', 'request-id', 'x-request-id']) { const v = res.headers.get(name); if (v) headers[name] = v }
      post({ id: m.id, kind: 'head', status: res.status, headers })
      if (res.body) {
        const reader = res.body.getReader()
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          const bytes = value instanceof Uint8Array ? value : new Uint8Array(value)
          post({ id: m.id, kind: 'piece', bytes }, [bytes.buffer])
        }
      }
      post({ id: m.id, kind: 'end' })
    } catch (e) {
      post({ id: m.id, kind: 'error', reason: e?.name === 'AbortError' ? 'stopped' : 'unreached' })
    } finally {
      running.delete(m.id)
    }
  }

  async function handle(m) {
    switch (m?.kind) {
      case 'send': return send(m)
      case 'stop': running.get(m.id)?.abort(); return undefined
      case 'status': return tellKeys()
      // The typed key's check came back: keep it, or let it go.
      case 'decide': {
        const t = typed()
        // The keys' status goes first, so the page knows it when the answer arrives.
        if (m.keep && t && t.provider === m.provider) {
          const { fresh } = await store.put(m.provider, t.key, { save: m.save !== false })
          clearTyped()
          await tellKeys()
          post({ id: m.id, kind: 'decided', kept: true, fresh })
        } else {
          clearTyped()
          await tellKeys()
          post({ id: m.id, kind: 'decided', kept: false })
        }
        return undefined
      }
      // A key kept by the page before the vault, moved here once (C267 (d)).
      case 'move': {
        if (!KEYED.includes(m.provider) || typeof m.key !== 'string' || !m.key) { post({ id: m.id, kind: 'moved', ok: false }); return undefined }
        const already = await store.get(m.provider)
        if (!already) await store.put(m.provider, m.key, { save: m.save !== false })
        await tellKeys()
        post({ id: m.id, kind: 'moved', ok: true, kept: already ? 'vault' : 'moved' })
        return undefined
      }
      case 'remove': await store.remove(m.provider); await tellKeys(); post({ id: m.id, kind: 'done' }); return undefined
      case 'keep': await store.keep(m.save !== false, KEYED); await tellKeys(); post({ id: m.id, kind: 'done' }); return undefined
      // The lock's unreadable data key, lent or taken back (C267 (e)).
      case 'lock': await store.lock(m.key ?? null, m.on); await tellKeys(); post({ id: m.id, kind: 'done' }); return undefined
      case 'erase': await store.erase(); post({ id: m.id, kind: 'done' }); return undefined
      default: if (m?.id != null) post({ id: m.id, kind: 'error', reason: 'unknown' }); return undefined
    }
  }

  port.onmessage = (e) => { handle(e.data).catch(() => { if (e.data?.id != null) post({ id: e.data.id, kind: 'error', reason: 'failed' }) }) }
  return { tellKeys }
}

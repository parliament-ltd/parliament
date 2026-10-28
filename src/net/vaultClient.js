// The page's side of the key vault (stage 15, piece 3; research/vault-design.md
// §2, §3; C267). The vault, at its own address, alone holds the keys. This
// opens it in a frame, gives it one private channel once it has loaded, and:
//
// - turns a provider's fetch into a request the vault sends with the key,
//   and the pieces that come back into an ordinary Response, so provider
//   code cannot tell the difference;
// - keeps what the page may know about keys (has one, held for this tab,
//   its last four characters), as the vault reports it;
// - lays the frame over the key panel's field while a key is typed, so the
//   key is typed into the vault and never into the page.
//
// Never a key crosses, but the move of a key the page kept before the vault
// (C267 (d)) and the lock's unreadable data key (C267 (e)).

// What a provider's code puts where the key goes. The vault never reads it:
// it sets the key header itself. 'typed' means the key in the vault's field.
export const STAND_IN = 'vault:saved'
export const STAND_IN_TYPED = 'vault:typed'

const HELLO = 'parliament-vault:hello'
const READY_MS = 8000

function headerObject(h) {
  if (!h) return {}
  if (typeof h.forEach === 'function' && typeof h.get === 'function') { const o = {}; h.forEach((v, k) => { o[k] = v }); return o }
  if (Array.isArray(h)) return Object.fromEntries(h)
  return { ...h }
}

/**
 * @param {{ origin: string, doc?: Document, onSent?: (entry: object) => void }} options
 */
export function createVaultClient({ origin, doc = typeof document === 'undefined' ? null : document, onSent = () => {} }) {
  let frame = null
  let port = null
  let next = 1
  let status = []
  let readyResolve
  const ready = new Promise((resolve) => { readyResolve = resolve })
  const pending = new Map() // id -> handler(message)
  const listeners = { keys: new Set(), typed: new Set(), escape: new Set() }
  const emit = (kind, value) => listeners[kind].forEach((fn) => fn(value))

  function onMessage(e) {
    const m = e.data
    if (!m || typeof m !== 'object') return
    if (m.kind === 'ready') { readyResolve(true); return }
    if (m.kind === 'keys') { status = Array.isArray(m.providers) ? m.providers : []; emit('keys', status); return }
    if (m.kind === 'typed') { emit('typed', { provider: m.provider, empty: Boolean(m.empty) }); return }
    if (m.kind === 'escape') { emit('escape'); return }
    if (m.kind === 'sent') { onSent({ method: m.method, url: m.url, status: m.status }); return }
    pending.get(m.id)?.(m)
  }

  /** Opens the vault's frame, once. Out of sight until a key is typed. */
  function mount() {
    if (frame || !doc) return
    frame = doc.createElement('iframe')
    frame.title = 'Parliament keys'
    frame.src = `${origin}/`
    frame.setAttribute('aria-hidden', 'true')
    frame.tabIndex = -1
    frame.className = 'ch-vault'
    frame.addEventListener('load', () => {
      const channel = new MessageChannel()
      port = channel.port1
      port.onmessage = onMessage
      frame.contentWindow.postMessage(HELLO, origin, [channel.port2])
    })
    doc.body.appendChild(frame)
  }

  const whenReady = () => {
    if (!doc) return Promise.resolve(false) // no page here: tests, or a worker
    mount()
    return Promise.race([ready, new Promise((resolve) => setTimeout(() => resolve(false), READY_MS))])
  }

  /** One request to the vault, answered once. */
  async function ask(message) {
    if (!(await whenReady())) throw Object.assign(new Error('The key store did not open'), { vault: 'unreached' })
    const id = next++
    return new Promise((resolve) => {
      pending.set(id, (m) => { pending.delete(id); resolve(m) })
      port.postMessage({ id, ...message })
    })
  }

  /**
   * A fetch for one provider's code: the request goes to the vault, which
   * adds that provider's key. A request whose key header is STAND_IN_TYPED
   * uses the key typed into the vault's field, for its check.
   */
  function fetchFor(provider) {
    return async function vaultFetch(url, init = {}) {
      if (!(await whenReady())) throw new TypeError('The key store did not open')
      const headers = headerObject(init.headers)
      const typed = Object.values(headers).some((v) => String(v).includes(STAND_IN_TYPED))
      const id = next++
      const signal = init.signal
      let controller
      const body = new ReadableStream({ start(c) { controller = c } })
      return new Promise((resolve, reject) => {
        let headed = false
        const fail = (err) => { pending.delete(id); if (headed) controller.error(err); else reject(err) }
        if (signal) {
          if (signal.aborted) { reject(new DOMException('Aborted', 'AbortError')); return }
          signal.addEventListener('abort', () => { port.postMessage({ id, kind: 'stop' }); fail(new DOMException('Aborted', 'AbortError')) }, { once: true })
        }
        pending.set(id, (m) => {
          if (m.kind === 'head') { headed = true; resolve(new Response(body, { status: m.status, headers: m.headers })) }
          else if (m.kind === 'piece') controller.enqueue(new Uint8Array(m.bytes))
          else if (m.kind === 'end') { pending.delete(id); controller.close() }
          else if (m.kind === 'error') {
            if (m.reason === 'stopped') fail(new DOMException('Aborted', 'AbortError'))
            else fail(Object.assign(new TypeError(m.reason === 'no-key' ? 'No key for this provider' : 'The key store refused or could not send this request'), { vault: m.reason }))
          }
        })
        port.postMessage({ id, kind: 'send', typed, provider, url: String(url), method: init.method ?? 'GET', headers, body: init.body ?? null })
      })
    }
  }

  const statusOf = (provider) => status.find((s) => s.id === provider) ?? null

  return {
    STAND_IN,
    mount,
    ready: whenReady,
    fetchFor,
    /** What the page may know about each keyed provider's key. */
    status: () => status,
    statusOf,
    /** The stand-in, when the vault holds a usable key for the provider; else null. */
    async keyFor(provider) {
      if (!(await whenReady())) return null
      const s = statusOf(provider)
      return s?.has && !s.locked ? STAND_IN : null
    },
    subscribe(kind, fn) { listeners[kind].add(fn); return () => listeners[kind].delete(fn) },
    decide: (provider, { keep, save }) => ask({ kind: 'decide', provider, keep, save }),
    move: (provider, key, { save }) => ask({ kind: 'move', provider, key, save }),
    remove: (provider) => ask({ kind: 'remove', provider }),
    keep: (save) => ask({ kind: 'keep', save }),
    lock: (key, on) => ask({ kind: 'lock', key, on }),
    erase: () => ask({ kind: 'erase' }),

    /**
     * Lays the vault's frame over the key panel's field (a rect on the page),
     * or puts it away with rect null.
     */
    place(rect) {
      mount()
      if (!frame) return
      const s = frame.style
      if (rect) {
        Object.assign(s, { position: 'fixed', left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, border: '0', opacity: '1', pointerEvents: 'auto', zIndex: '60', background: 'transparent' })
        frame.removeAttribute('aria-hidden')
        frame.tabIndex = 0
      } else {
        Object.assign(s, { position: 'fixed', left: '0', top: '0', width: '0', height: '0', border: '0', opacity: '0', pointerEvents: 'none' })
        frame.setAttribute('aria-hidden', 'true')
        frame.tabIndex = -1
      }
    },
    /** What the field shows: a provider's, with its words and state, or none. */
    show(state) {
      mount()
      whenReady().then((ok) => { if (ok) port.postMessage({ kind: 'field', ...(state ?? { provider: null }) }) })
    },
  }
}

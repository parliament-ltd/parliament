// The vault page (research/vault-design.md §2, §5). Loaded by the page in a
// frame it lays over the key panel's field when a key is typed, and keeps
// out of sight otherwise. It answers only the page's exact address, over one
// private channel, and holds the key typed into its own field until the
// page's check says keep it or let it go.

import { createStore } from './store'
import { serveChannel } from './channel'

// The page's addresses: the site, and in development the app's local ones.
const PAGES = import.meta.env.DEV
  ? ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:4173']
  : (import.meta.env.VITE_PAGE_ORIGINS ?? 'https://www.parliament.ltd').split(',').map((s) => s.trim()).filter(Boolean)

const form = document.getElementById('field')
const input = document.getElementById('key')
const button = document.getElementById('save')
const store = createStore()

let typedKey = null // { provider, key }, until decided
let shown = null // the provider whose field shows
let port = null

const clearTyped = () => { typedKey = null; input.value = '' }

form.addEventListener('submit', (e) => {
  e.preventDefault()
  if (!port || !shown) return
  const key = input.value.trim()
  typedKey = key ? { provider: shown, key } : null
  port.postMessage({ kind: 'typed', provider: shown, empty: !key })
})
input.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && port) { e.preventDefault(); port.postMessage({ kind: 'escape' }) }
})

// The field's words and state come from the page; nothing it shows is a key.
function showField(m) {
  if (!m.provider) { form.hidden = true; shown = null; clearTyped(); return }
  if (shown !== m.provider) clearTyped()
  shown = m.provider
  form.hidden = false
  input.setAttribute('aria-label', String(m.label ?? ''))
  input.placeholder = String(m.placeholder ?? '')
  button.textContent = String(m.busy ? m.checking ?? '' : m.save ?? '')
  button.disabled = Boolean(m.busy)
  if (m.focus) input.focus()
}

window.addEventListener('message', (e) => {
  if (port || !PAGES.includes(e.origin) || e.source !== window.parent || e.data !== 'parliament-vault:hello' || !e.ports[0]) return
  port = e.ports[0]
  const served = serveChannel({ port, store, fetch: (...a) => window.fetch(...a), typed: () => typedKey, clearTyped })
  // The field's messages ride the same port; the channel handles the rest.
  const handle = port.onmessage
  port.onmessage = (ev) => { if (ev.data?.kind === 'field') showField(ev.data); else handle(ev) }
  served.tellKeys()
  port.postMessage({ kind: 'ready' })
})

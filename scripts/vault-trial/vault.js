// The vault's side of the trial: it answers only the page's exact address,
// over one private channel, and keeps a test value (never a key) in its own
// storage, to see whether the browser keeps it.

const PAGES = ['http://localhost:5190', 'http://127.0.0.1:5190']
const framed = window.top !== window
const out = document.getElementById('out')
const say = (line) => { out.textContent += `${line}\n` }

function openDb() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('vault-trial', 1)
    r.onupgradeneeded = () => r.result.createObjectStore('values')
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}
async function put(value) {
  const db = await openDb()
  await new Promise((resolve, reject) => {
    const t = db.transaction('values', 'readwrite')
    t.objectStore('values').put(value, 'token')
    t.oncomplete = resolve
    t.onerror = () => reject(t.error)
  })
  db.close()
  localStorage.setItem('vault-trial-token', value)
}
async function get() {
  const db = await openDb()
  const value = await new Promise((resolve, reject) => {
    const r = db.transaction('values').objectStore('values').get('token')
    r.onsuccess = () => resolve(r.result ?? null)
    r.onerror = () => reject(r.error)
  })
  db.close()
  return { indexedDB: value, localStorage: localStorage.getItem('vault-trial-token') }
}

async function answer(msg, port) {
  if (msg.kind === 'write') { await put(msg.value); port.postMessage({ id: msg.id, ok: true }) }
  else if (msg.kind === 'read') port.postMessage({ id: msg.id, ok: true, value: await get() })
  else if (msg.kind === 'persist') {
    const persisted = await navigator.storage?.persisted?.().catch(() => null)
    const asked = await navigator.storage?.persist?.().catch(() => null)
    port.postMessage({ id: msg.id, ok: true, value: { before: persisted, granted: asked } })
  } else if (msg.kind === 'stream') {
    // A reply coming back in pieces, as a provider's stream would.
    for (let i = 1; i <= 5; i++) port.postMessage({ id: msg.id, piece: `piece ${i}` })
    port.postMessage({ id: msg.id, ok: true, end: true })
  } else if (msg.kind === 'transfer') {
    // Whether this browser can hand a whole stream across instead.
    try {
      const stream = new ReadableStream({ start(c) { c.enqueue('a'); c.enqueue('b'); c.close() } })
      port.postMessage({ id: msg.id, ok: true, stream }, [stream])
    } catch (e) {
      port.postMessage({ id: msg.id, ok: false, error: String(e?.name ?? e) })
    }
  } else if (msg.kind === 'lend') {
    // A key the page cannot read out, lent for use: can the vault use it?
    try {
      const iv = crypto.getRandomValues(new Uint8Array(12))
      const sealed = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, msg.key, new TextEncoder().encode('sealed in the vault'))
      const back = new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, msg.key, sealed))
      port.postMessage({ id: msg.id, ok: true, value: { extractable: msg.key.extractable, roundTrip: back } })
    } catch (e) {
      port.postMessage({ id: msg.id, ok: false, error: String(e?.name ?? e) })
    }
  } else port.postMessage({ id: msg.id, ok: false, error: 'unknown' })
}

if (framed) {
  // The page sends one port, once; the vault checks who sent it.
  window.addEventListener('message', (e) => {
    if (!PAGES.includes(e.origin) || e.data !== 'vault-trial:hello' || !e.ports[0]) return
    const port = e.ports[0]
    port.onmessage = (m) => { answer(m.data, port).catch((err) => port.postMessage({ id: m.data?.id, ok: false, error: String(err) })) }
    say(`framed by ${e.origin}: channel open`)
  })
} else {
  // Opened on its own: show what this origin's own storage holds.
  get().then((v) => say(`opened directly. stored here: ${JSON.stringify(v)}`), (e) => say(`could not read: ${e}`))
}

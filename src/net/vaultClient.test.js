import 'fake-indexeddb/auto'
import { describe, it, expect } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import { createVaultClient, STAND_IN, STAND_IN_TYPED } from './vaultClient'
import { createStore } from '../../vault/store'
import { serveChannel } from '../../vault/channel'

const KEY = 'sk-ant-api03-' + 'k'.repeat(40) + 'LAST'

// A stand-in for the page's document: the frame "loads" at once, and its
// window hands the port to the vault's own channel code, as vault/main.js does.
function joined({ fetch, typed = () => null }) {
  const store = createStore({ idb: new IDBFactory() })
  const doc = {
    body: { appendChild: (el) => setTimeout(() => el.load()) },
    createElement: () => {
      const el = { style: {}, setAttribute() {}, removeAttribute() {}, className: '' }
      el.addEventListener = (kind, fn) => { if (kind === 'load') el.load = fn }
      el.contentWindow = {
        postMessage: (msg, origin, ports) => {
          expect(msg).toBe('parliament-vault:hello')
          expect(origin).toBe('https://keys.example')
          const served = serveChannel({ port: ports[0], store, fetch, typed })
          served.tellKeys().then(() => ports[0].postMessage({ kind: 'ready' }))
        },
      }
      return el
    },
  }
  const sent = []
  const client = createVaultClient({ origin: 'https://keys.example', doc, onSent: (e) => sent.push(e) })
  return { client, store, sent }
}

const stream = (...parts) => new ReadableStream({ start(c) { for (const p of parts) c.enqueue(new TextEncoder().encode(p)); c.close() } })

describe('the page and its vault (stage 15, piece 3)', () => {
  it('sends a provider\'s request through the vault, which adds the key, and hands back an ordinary reply', async () => {
    const seen = []
    const { client, store, sent } = joined({ fetch: async (url, init) => { seen.push(init.headers); return new Response(stream('data: a\n', 'data: b\n'), { status: 200, headers: { 'content-type': 'text/event-stream' } }) } })
    expect(await client.keyFor('anthropic')).toBeNull()
    await store.put('anthropic', KEY)
    await client.move('anthropic', 'ignored', { save: true }) // tells the page the keys again
    expect(await client.keyFor('anthropic')).toBe(STAND_IN)
    expect(client.statusOf('anthropic')).toMatchObject({ has: true, ending: 'LAST' })
    const res = await client.fetchFor('anthropic')('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': STAND_IN }, body: '{}' })
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('data: a\ndata: b\n')
    expect(seen[0]['x-api-key']).toBe(KEY)
    expect(sent[0]).toMatchObject({ method: 'POST', url: 'https://api.anthropic.com/v1/messages', status: 200 })
  })

  it('refuses through the vault what its list does not name, as a failed fetch', async () => {
    const { client, store } = joined({ fetch: async () => new Response('') })
    await store.put('anthropic', KEY)
    await expect(client.fetchFor('anthropic')('https://api.anthropic.com/v1/organizations/api_keys', { headers: { 'x-api-key': STAND_IN } })).rejects.toMatchObject({ vault: 'path' })
  })

  it('checks a key typed into the vault\'s field, then keeps it on the page\'s word', async () => {
    let typed = { provider: 'mistral', key: 'typed-mistral-key' }
    const seen = []
    const { client, store } = joined({ fetch: async (url, init) => { seen.push(init.headers); return new Response('{}', { status: 200 }) }, typed: () => typed })
    const res = await client.fetchFor('mistral')('https://api.mistral.ai/v1/models', { headers: { Authorization: `Bearer ${STAND_IN_TYPED}` } })
    expect(res.ok).toBe(true)
    expect(seen[0].authorization).toBe('Bearer typed-mistral-key')
    expect(await client.decide('mistral', { keep: true, save: true })).toMatchObject({ kept: true, fresh: true })
    expect(await store.get('mistral')).toBe('typed-mistral-key')
    typed = null
  })

  it('stops a request when its signal aborts', async () => {
    const { client, store } = joined({ fetch: (url, init) => new Promise((resolve, reject) => { init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))) }) })
    await store.put('anthropic', KEY)
    const control = new AbortController()
    const p = client.fetchFor('anthropic')('https://api.anthropic.com/v1/messages', { method: 'POST', headers: {}, body: '{}', signal: control.signal })
    setTimeout(() => control.abort(), 20)
    await expect(p).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('with no page to open a frame in, says the vault is not there', async () => {
    const client = createVaultClient({ origin: 'https://keys.example', doc: null })
    expect(await client.keyFor('anthropic')).toBeNull()
    await expect(client.fetchFor('anthropic')('https://api.anthropic.com/v1/messages', {})).rejects.toThrow()
  })
})

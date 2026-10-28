import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import { checkRequest, connectOrigins } from './allow'
import { createStore } from './store'
import { serveChannel, KEYED } from './channel'

const KEY = 'sk-ant-api03-' + 'x'.repeat(40) + 'WXYZ'

describe('what the vault allows (C267 (b))', () => {
  it('sends only to a provider\'s own addresses and paths, with the key it sets itself', () => {
    const ok = checkRequest({ provider: 'anthropic', url: 'https://api.anthropic.com/v1/messages', method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': 'vault:saved', 'anthropic-version': '2023-06-01', Cookie: 'x' }, body: '{}' }, KEY)
    expect(ok.headers).toEqual({ 'content-type': 'application/json', 'anthropic-version': '2023-06-01', 'x-api-key': KEY })
    expect(checkRequest({ provider: 'mistral', url: 'https://api.eu.mistral.ai/v1/models', method: 'GET', headers: { Authorization: 'Bearer vault:saved' } }, 'm-key').headers).toEqual({ authorization: 'Bearer m-key' })
  })
  it('refuses anything else', () => {
    const r = (req, key = KEY) => checkRequest(req, key).refused
    expect(r({ provider: 'anthropic', url: 'https://evil.example/v1/messages', method: 'POST' })).toBe('address')
    expect(r({ provider: 'anthropic', url: 'https://api.anthropic.com/v1/organizations/api_keys', method: 'GET' })).toBe('path')
    expect(r({ provider: 'anthropic', url: 'https://api.anthropic.com/v1/messages', method: 'GET' })).toBe('path')
    expect(r({ provider: 'anthropic', url: 'https://user:pw@api.anthropic.com/v1/messages', method: 'POST' })).toBe('address')
    expect(r({ provider: 'ollama', url: 'http://localhost:11434/api/chat', method: 'POST' })).toBe('provider')
    expect(r({ provider: 'mistral', url: 'https://api.anthropic.com/v1/messages', method: 'POST' })).toBe('address')
    expect(r({ provider: 'anthropic', url: 'https://api.anthropic.com/v1/messages', method: 'POST' }, null)).toBe('no-key')
    expect(connectOrigins()).toEqual(['https://api.anthropic.com', 'https://api.mistral.ai', 'https://api.eu.mistral.ai', 'https://api.us.mistral.ai'])
  })
})

describe('the vault\'s key store (C267 (e))', () => {
  let idb
  beforeEach(() => { idb = new IDBFactory() })

  it('keeps a key encrypted, held or saved, and says only its last four characters', async () => {
    const s = createStore({ idb })
    expect(await s.put('anthropic', KEY)).toEqual({ fresh: true })
    expect(await s.put('anthropic', KEY)).toEqual({ fresh: false })
    expect(await s.get('anthropic')).toBe(KEY)
    expect(await createStore({ idb }).get('anthropic')).toBe(KEY) // another frame, the same storage
    expect(await s.status(['anthropic', 'mistral'])).toEqual([
      { id: 'anthropic', has: true, held: false, ending: 'WXYZ', locked: false },
      { id: 'mistral', has: false, held: false, ending: null, locked: false },
    ])
    await s.put('mistral', 'mkey', { save: false })
    expect(await createStore({ idb }).get('mistral')).toBeNull() // held in that frame only
    await s.keep(false, ['anthropic', 'mistral'])
    expect(await createStore({ idb }).get('anthropic')).toBeNull()
    expect(await s.get('anthropic')).toBe(KEY)
  })

  it('seals saved keys under the lent lock key, and opens them again when the lock goes', async () => {
    const lock = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
    const s = createStore({ idb })
    await s.put('anthropic', KEY)
    await s.lock(lock, true)
    const other = createStore({ idb }) // a frame with no key lent: a locked tab, or a copied profile
    expect(await other.get('anthropic')).toBeNull()
    expect((await other.status(['anthropic']))[0]).toMatchObject({ has: true, locked: true, ending: null })
    await other.lock(lock, true)
    expect(await other.get('anthropic')).toBe(KEY)
    await s.lock(null)
    expect(await s.get('anthropic')).toBeNull()
    await s.lock(lock, false)
    expect(await createStore({ idb }).get('anthropic')).toBe(KEY)
  })

  it('erases everything', async () => {
    const s = createStore({ idb })
    await s.put('anthropic', KEY)
    await s.erase()
    expect(await createStore({ idb }).get('anthropic')).toBeNull()
  })
})

describe('the channel (research/vault-design.md §3)', () => {
  function pair() {
    const { port1, port2 } = new MessageChannel()
    const got = []
    port1.onmessage = (e) => got.push(e.data)
    const next = (pred) => new Promise((resolve) => {
      const look = () => { const i = got.findIndex(pred); if (i >= 0) resolve(got.splice(i, 1)[0]); else setTimeout(look, 5) }
      look()
    })
    return { page: port1, vaultPort: port2, got, next }
  }

  it('adds the key, streams the reply back in pieces, and never sends a key back', async () => {
    const { page, vaultPort, got, next } = pair()
    const store = createStore({ idb: new IDBFactory() })
    await store.put('anthropic', KEY)
    const seen = []
    const fetch = async (url, init) => {
      seen.push({ url, headers: init.headers })
      return new Response(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('data: one\n')); c.enqueue(new TextEncoder().encode('data: two\n')); c.close() } }), { status: 200, headers: { 'content-type': 'text/event-stream' } })
    }
    serveChannel({ port: vaultPort, store, fetch })
    page.postMessage({ id: 1, kind: 'send', provider: 'anthropic', url: 'https://api.anthropic.com/v1/messages', method: 'POST', headers: { 'x-api-key': 'vault:saved' }, body: '{}' })
    expect(await next((m) => m.kind === 'head')).toMatchObject({ id: 1, status: 200, headers: { 'content-type': 'text/event-stream' } })
    await next((m) => m.kind === 'end')
    expect(seen[0].headers['x-api-key']).toBe(KEY)
    expect(JSON.stringify(got)).not.toContain(KEY)
    page.close()
  })

  it('refuses what its list does not name, and checks a typed key only for its own provider', async () => {
    const { page, vaultPort, next } = pair()
    const store = createStore({ idb: new IDBFactory() })
    let typed = { provider: 'mistral', key: 'typed-key' }
    serveChannel({ port: vaultPort, store, fetch: async () => new Response('', { status: 200 }), typed: () => typed, clearTyped: () => { typed = null } })
    page.postMessage({ id: 2, kind: 'send', provider: 'anthropic', url: 'https://api.anthropic.com/v1/organizations/api_keys', method: 'GET' })
    expect(await next((m) => m.id === 2)).toMatchObject({ kind: 'error', reason: 'path' })
    page.postMessage({ id: 3, kind: 'send', typed: true, provider: 'anthropic', url: 'https://api.anthropic.com/v1/messages', method: 'POST', body: '{}' })
    expect(await next((m) => m.id === 3)).toMatchObject({ kind: 'error', reason: 'no-key' })
    page.postMessage({ id: 4, kind: 'decide', provider: 'mistral', keep: true, save: true })
    expect(await next((m) => m.id === 4)).toMatchObject({ kind: 'decided', kept: true, fresh: true })
    expect(await store.get('mistral')).toBe('typed-key')
    expect(typed).toBeNull()
    page.close()
  })

  it('takes a key kept by the page before, once, unless it already holds one', async () => {
    const { page, vaultPort, next } = pair()
    const store = createStore({ idb: new IDBFactory() })
    serveChannel({ port: vaultPort, store, fetch: async () => new Response('') })
    page.postMessage({ id: 5, kind: 'move', provider: 'anthropic', key: KEY })
    expect(await next((m) => m.id === 5)).toMatchObject({ ok: true, kept: 'moved' })
    page.postMessage({ id: 6, kind: 'move', provider: 'anthropic', key: 'older' })
    expect(await next((m) => m.id === 6)).toMatchObject({ ok: true, kept: 'vault' })
    expect(await store.get('anthropic')).toBe(KEY)
    expect(KEYED).toEqual(['anthropic', 'mistral'])
    page.close()
  })
})

import { describe, it, expect, vi } from 'vitest'
import { DESTINATIONS, destination, shipped, connectOrigins } from './list'
import { createKeyring } from './keyring'
import { createGateway, Refused } from './gateway'
import { CONTENT_SECURITY_POLICY } from '../lib/securityHeaders'

describe('the list of providers and sources', () => {
  it('names each once, with where its requests go', () => {
    const ids = DESTINATIONS.map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const d of DESTINATIONS) {
      expect(['model', 'local', 'source'], d.id).toContain(d.kind)
      expect(d.origins.length, d.id).toBeGreaterThan(0)
      for (const o of d.origins) expect(o, d.id).toMatch(/^https:\/\/|^http:\/\/localhost:\d+$/)
    }
  })

  it('keeps local models to this machine, by exact port, and sources keyless', () => {
    expect(destination('ollama').origins).toEqual(['http://localhost:11434'])
    for (const d of DESTINATIONS.filter((x) => x.kind === 'source')) expect(d.key, d.id).toBe(false)
  })

  it('lets only shipped entries into the connection policy, which is today\'s', () => {
    expect(shipped().map((d) => d.id)).toEqual(['anthropic'])
    expect(connectOrigins()).toEqual(['https://api.anthropic.com'])
    expect(CONTENT_SECURITY_POLICY).toContain("connect-src 'self' https://api.anthropic.com;")
  })
})

// A saved store held in a map, standing in for the encrypted one.
function savedStore() {
  const m = new Map()
  return {
    m,
    load: async (p) => m.get(p) ?? null,
    has: async (p) => m.has(p),
    save: async (p, k) => { m.set(p, k) },
    remove: async (p) => { m.delete(p) },
  }
}

describe('the key module', () => {
  it('saves a key by default, one per provider', async () => {
    const store = savedStore()
    const keys = createKeyring(store)
    await keys.put('anthropic', 'key-a')
    await keys.put('mistral', 'key-m')
    expect(await keys.get('anthropic')).toBe('key-a')
    expect(await keys.get('mistral')).toBe('key-m')
    expect(await keys.get('ollama')).toBeNull()
    expect(store.m.size).toBe(2)
  })

  it('holds a key for this tab only when asked not to save, and removes a saved copy', async () => {
    const store = savedStore()
    const keys = createKeyring(store)
    await keys.put('anthropic', 'saved-key')
    await keys.put('anthropic', 'held-key', { save: false })
    expect(await keys.get('anthropic')).toBe('held-key')
    expect(keys.isHeld('anthropic')).toBe(true)
    expect(store.m.has('anthropic')).toBe(false)
    keys.forgetHeld()
    expect(await keys.get('anthropic')).toBeNull()
  })

  it('says whether there is a key without reading a saved one', async () => {
    const store = savedStore()
    const load = vi.spyOn(store, 'load')
    const keys = createKeyring(store)
    await keys.put('anthropic', 'k')
    expect(await keys.has('anthropic')).toBe(true)
    expect(await keys.has('mistral')).toBe(false)
    expect(load).not.toHaveBeenCalled()
  })

  it('refuses an empty key, and removes held and saved together', async () => {
    const keys = createKeyring(savedStore())
    await expect(keys.put('anthropic', '  ')).rejects.toThrow()
    await keys.put('anthropic', 'k', { save: false })
    await keys.remove('anthropic')
    expect(await keys.has('anthropic')).toBe(false)
  })
})

describe('the gateway', () => {
  const list = {
    anthropic: { id: 'anthropic', key: true, ships: true },
    mistral: { id: 'mistral', key: true, ships: false },
    wikipedia: { id: 'wikipedia', key: false, ships: true },
  }
  const make = (keyFor = { anthropic: 'key-a' }) => {
    const anthropic = { sendMessage: vi.fn(async (key, text) => `${key}:${text}`) }
    const wikipedia = { search: vi.fn(async (q) => `found ${q}`) }
    const gateway = createGateway({
      destination: (id) => list[id] ?? null,
      keyring: { get: async (id) => keyFor[id] ?? null },
      implementation: (id) => ({ anthropic, wikipedia })[id] ?? null,
      now: () => 1000,
    })
    return { gateway, anthropic, wikipedia }
  }

  it('picks the key by the provider, so no caller hands it over', async () => {
    const { gateway, anthropic } = make()
    expect(await gateway.call('anthropic', 'sendMessage', ['hi'], { label: 'chat send' })).toBe('key-a:hi')
    expect(anthropic.sendMessage).toHaveBeenCalledWith('key-a', 'hi')
  })

  it('passes no key to a source', async () => {
    const { gateway, wikipedia } = make()
    expect(await gateway.call('wikipedia', 'search', ['owls'], { label: 'prompt' })).toBe('found owls')
    expect(wikipedia.search).toHaveBeenCalledWith('owls')
  })

  it('refuses what is unknown, not shipped, has no such method, or has no key', async () => {
    const { gateway } = make({})
    await expect(gateway.call('nowhere', 'x')).rejects.toMatchObject({ reason: 'unknown' })
    await expect(gateway.call('mistral', 'sendMessage')).rejects.toMatchObject({ reason: 'not-shipped' })
    await expect(gateway.call('wikipedia', 'delete')).rejects.toMatchObject({ reason: 'no-method' })
    await expect(gateway.call('anthropic', 'sendMessage', ['hi'])).rejects.toBeInstanceOf(Refused)
    await expect(gateway.call('anthropic', 'sendMessage', ['hi'])).rejects.toMatchObject({ reason: 'no-key' })
  })

  it('labels each request for the network log, with no key and no content', async () => {
    const { gateway } = make()
    const heard = vi.fn()
    gateway.subscribe(heard)
    await gateway.call('anthropic', 'sendMessage', ['private words'], { label: 'chat send' })
    expect(gateway.requests()).toEqual([{ at: 1000, to: 'anthropic', method: 'sendMessage', label: 'chat send' }])
    expect(JSON.stringify(gateway.requests())).not.toMatch(/key-a|private/)
    expect(heard).toHaveBeenCalledTimes(1)
  })
})

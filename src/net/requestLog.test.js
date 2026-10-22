import { describe, it, expect } from 'vitest'
import { requestsByHost, hostOf } from './requestLog'
import { DESTINATIONS } from './list'

describe('the network log, grouped by host (stage 7, piece 2)', () => {
  const entries = [
    { host: 'en.wikipedia.org', timestamp: 10, ok: true, status: 200 },
    { host: 'sv.wikipedia.org', timestamp: 20, ok: true, status: 200 },
    { host: 'en.wikipedia.org', timestamp: 30, ok: true, status: 200 },
    { host: 'hn.algolia.com', timestamp: 40, ok: false, status: 429 },
    { host: 'api.anthropic.com', timestamp: 50, ok: true, status: 200 },
    { host: 'localhost:5173', timestamp: 60, ok: true, status: 200 },
    { host: 'tracker.example', timestamp: 70, ok: true, status: 200 },
  ]
  const requests = [
    { at: 1, to: 'wikipedia', label: 'prompt' }, { at: 2, to: 'wikipedia', label: 'prompt' },
    { at: 3, to: 'anthropic', label: 'check key' }, { at: 4, to: 'hackernews', label: 'prompt' },
  ]
  const groups = requestsByHost({ entries, requests, destinations: DESTINATIONS, self: 'localhost:5173' })
  const by = (host) => groups.find((g) => g.host === host)

  it('groups the page\'s requests by host, the busiest first, with how many failed', () => {
    expect(groups[0]).toMatchObject({ host: 'en.wikipedia.org', count: 2, last: 30 })
    expect(by('hn.algolia.com')).toMatchObject({ count: 1, failed: 1 })
  })
  it('names each host by the provider or source it belongs to, every language edition included', () => {
    expect(by('sv.wikipedia.org')).toMatchObject({ id: 'wikipedia', name: 'Wikipedia' })
    expect(by('hn.algolia.com').name).toBe('Hacker News')
    expect(by('api.anthropic.com').name).toBe('Anthropic')
  })
  it('says what made the requests, from the gateway', () => {
    expect(by('api.anthropic.com').labels).toEqual([{ label: 'check key', count: 1 }])
    expect(by('en.wikipedia.org').labels).toEqual([{ label: 'prompt', count: 2 }])
  })
  it('marks this page\'s own host, and leaves a host on no list unnamed', () => {
    expect(by('localhost:5173')).toMatchObject({ self: true, name: null })
    expect(by('tracker.example')).toMatchObject({ self: false, id: null, name: null, labels: [] })
  })
  it('reads a host from an origin, a wildcard kept', () => {
    expect(hostOf('https://*.wikipedia.org')).toBe('*.wikipedia.org')
    expect(hostOf('http://localhost:11434')).toBe('localhost:11434')
  })
})

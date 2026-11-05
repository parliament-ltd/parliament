import { describe, it, expect, beforeEach } from 'vitest'
import { sessionKeep } from './sessionKeep'
import { kindsOf, REQUEST_KINDS } from '../net/requestLog'
import { COPY } from '../copy'

// The network log kept for the tab's session, and what each request was (C291 (m)).

describe('a list kept for the tab', () => {
  const store = new Map()
  beforeEach(() => {
    store.clear()
    globalThis.sessionStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) }
  })
  it('keeps only what clean allows, the newest, and survives a read', () => {
    const keep = sessionKeep('t', (e) => (e?.to ? { to: e.to, label: e.label } : null), 2)
    keep.write([{ to: 'a', label: 'prompt', content: 'secret words' }, { to: 'b', label: 'title' }, { nope: 1 }, { to: 'c', label: 'summary', key: 'sk-x' }])
    expect(keep.read()).toEqual([{ to: 'b', label: 'title' }, { to: 'c', label: 'summary' }])
    expect(store.get('t')).not.toMatch(/secret|sk-x/)
  })
  it('keeps nothing, and breaks nothing, when storage fails', () => {
    globalThis.sessionStorage = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
    const keep = sessionKeep('t', (e) => e)
    expect(() => keep.write([{ a: 1 }])).not.toThrow()
    expect(keep.read()).toEqual([])
  })
})

describe('what each request was', () => {
  it('names labels as kinds, merging counts, and every kind has words', () => {
    expect(kindsOf([{ label: 'chat send', count: 3 }, { label: 'prompt', count: 2 }, { label: 'check Ollama', count: 1 }, { label: 'something new', count: 1 }]))
      .toEqual([{ kind: 'prompt', count: 5 }, { kind: 'localCheck', count: 1 }, { kind: 'other', count: 1 }])
    for (const k of REQUEST_KINDS) expect(COPY.netKinds[k], k).toBeDefined()
  })
})

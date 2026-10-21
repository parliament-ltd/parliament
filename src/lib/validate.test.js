import { describe, it, expect } from 'vitest'
import { validateBackup } from './validate'

const at = '2026-10-21T10:00:00.000Z'
const chat = { id: 'c1', title: 'Barn owls', model: 'claude-sonnet', parentId: null, branchPoint: null, pinned: false, storageBytes: 0, createdAt: at, updatedAt: at }
const reply = (extra) => ({ id: 'm1', conversationId: 'c1', role: 'assistant', content: 'The barn owl', tokenCount: 0, incomplete: true, createdAt: at, ...extra })
const check = (message) => validateBackup({ conversations: [chat], messages: [message] })

describe('a backup with replies that stopped short', () => {
  it('accepts why a reply stopped: its chat was left, the length limit, or an error', () => {
    for (const stopReason of ['left', 'limit', 'error', null, undefined]) {
      expect(check(reply({ stopReason })), String(stopReason)).toEqual({ valid: true })
    }
  })

  it('refuses any other reason', () => {
    expect(check(reply({ stopReason: 'bogus' })).valid).toBe(false)
    expect(check(reply({ stopReason: 'constructor' })).valid).toBe(false)
  })

  it('accepts where an answer from a source came from, and refuses a link that is not https', () => {
    const source = { id: 'wikipedia', name: 'Wikipedia', title: 'Barn owl', url: 'https://en.wikipedia.org/wiki/Barn_owl', revision: '1', lang: 'en' }
    expect(check(reply({ incomplete: false, source })).valid).toBe(true)
    expect(check(reply({ incomplete: false, source: { ...source, url: 'javascript:alert(1)' } })).valid).toBe(false)
  })
})

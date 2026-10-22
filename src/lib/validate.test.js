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

describe('a backup with replies that recorded how they were made (C132 (h))', () => {
  it('accepts the model and the tokens in and out', () => {
    expect(check(reply({ model: 'claude-sonnet', usage: { input: 1200, output: 340 } }))).toEqual({ valid: true })
  })

  it('refuses tokens that are not counts, or anything else in usage', () => {
    expect(check(reply({ usage: { input: -1, output: 2 } })).valid).toBe(false)
    expect(check(reply({ usage: { input: 1.5, output: 2 } })).valid).toBe(false)
    expect(check(reply({ usage: { input: 1, output: 2, cost: 9 } })).valid).toBe(false)
    expect(check(reply({ usage: [1, 2] })).valid).toBe(false)
    expect(check(reply({ model: 7 })).valid).toBe(false)
  })
})

describe('a backup with pins, archive and tags on every kind (C143 (h))', () => {
  it('accepts them, and refuses what they cannot hold', () => {
    const c = (extra) => validateBackup({ conversations: [{ ...chat, ...extra }] })
    expect(c({ archived: true, tags: ['owls'], tagsMine: ['owls'] })).toEqual({ valid: true })
    expect(c({ archived: 'yes' }).valid).toBe(false)
    expect(c({ tagsMine: [7] }).valid).toBe(false)
    expect(c({ tags: [''] }).valid).toBe(false)
  })
})

describe('a backup with notes, keywords and quotes kept from an erased chat (C137 (c))', () => {
  const term = { id: 'h1', conversationId: null, messageId: null, text: 'Tyto', color: '#B8A070', createdAt: at, erasedFrom: 204 }
  const quote = { id: 'p1', targetConversationId: null, sourceConversationId: null, sourceMessageId: null, content: 'Hunts by sound', createdAt: at, erasedFrom: 204 }
  it('accepts them detached, with the number they came from', () => {
    expect(validateBackup({ conversations: [chat], highlights: [term], pins: [quote] })).toEqual({ valid: true })
  })
  it('refuses one detached without that number, or with a number that is not one', () => {
    expect(validateBackup({ highlights: [{ ...term, erasedFrom: undefined }] }).valid).toBe(false)
    expect(validateBackup({ pins: [{ ...quote, erasedFrom: 'x' }] }).valid).toBe(false)
  })
})

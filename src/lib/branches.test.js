import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { openDB } from 'idb'
import { setupI18n } from '@lingui/core'
import { upgradeSchema } from './schema'
import * as R from './records'
import { planRestore } from './restorePlan'
import { validateBackup } from './validate'
import { promptPreview } from '../chrome/preview'
import { say } from '../chrome/say'
import { messages as en } from '../locales/en/messages.mjs'

// A prompt to several at once (stage 8, piece 1; C172).

let n = 0
const newId = () => `id-${++n}`
let clock = 0
const at = () => new Date(Date.UTC(2026, 9, 22, 10, 0, clock++)).toISOString()
const chat = (extra = {}) => {
  const now = at()
  return { id: newId(), title: 'Owls', model: 'claude-sonnet-5-5', parentId: null, branchPoint: null, createdInMode: null, room: 'mode_1', pinned: false, storageBytes: 0, createdAt: now, updatedAt: now, ...extra }
}
const message = (conversationId, role, content, extra = {}) => ({ id: newId(), conversationId, role, content, tokenCount: 1, incomplete: false, createdAt: at(), ...extra })

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  n = 0
  clock = 0
})

describe('a branch made for a prompt to several', () => {
  let db
  beforeEach(async () => { db = await openDB('branches-test', 6, { upgrade: upgradeSchema }) })
  afterEach(() => db.close())

  it('copies the history whole, each copy pointing at the message it came from', async () => {
    const c = await R.createChat(db, chat())
    const q = await R.addMessageRecord(db, message(c.id, 'user', 'barn owl'))
    const a = await R.addMessageRecord(db, message(c.id, 'assistant', 'The barn owl is a bird.', { source: { id: 'wikipedia', name: 'Wikipedia', title: 'Barn owl' } }))
    const fork = await R.createBranchChat(db, { sourceId: c.id, branchAtMessageId: a.id, title: 'Owls', answerer: 'claude-opus-5-5', frameworks: ['pushback'], newId, now: at() })
    expect([fork.branch, fork.title, fork.answerer, fork.frameworks]).toEqual(['b', 'Owls', 'claude-opus-5-5', ['pushback']])
    const copies = (await db.getAllFromIndex('messages', 'conversationId', fork.id)).sort((x, y) => (x.createdAt < y.createdAt ? -1 : 1))
    expect(copies.map((m) => m.from)).toEqual([q.id, a.id])
    // An answer from a source stays one, so it is never sent as the model's own words (C115).
    expect(copies[1].source).toEqual({ id: 'wikipedia', name: 'Wikipedia', title: 'Barn owl' })
  })
})

describe('a restore keeps a branch’s links, and checks them', () => {
  it('rewrites the chats a prompt went to, and the message a copy came from, when ids change', () => {
    const flat = {
      conversations: [{ id: 'c1', title: 'Owls' }, { id: 'c2', title: 'Owls', parentId: 'c1' }],
      messages: [
        { id: 'm1', conversationId: 'c1', role: 'user', content: 'owls', createdAt: '2026-10-22T10:00:00Z', group: { id: 'g1', chats: ['c1', 'c2'] } },
        { id: 'm2', conversationId: 'c2', role: 'user', content: 'owls', createdAt: '2026-10-22T10:00:00Z', group: { id: 'g1', chats: ['c1', 'c2'] }, from: 'm1' },
      ],
    }
    // c1 is here with other words, so it comes in as a copy under a new id.
    const here = { chat: { id: 'c1', title: 'Something else' }, messages: [{ id: 'm1', conversationId: 'c1', role: 'user', content: 'other', createdAt: '2026-10-21T10:00:00Z' }], document: null }
    const existing = { chats: new Map([['c1', here]]), messages: new Set(['m1']), notes: new Map(), highlights: new Map(), favorites: new Map(), pins: new Map() }
    let k = 0
    const plan = planRestore(flat, { strategy: 'merge', existing, newId: () => `new-${++k}`, now: '2026-10-22T12:00:00Z' })
    const copy = plan.renamedConvIds.get('c1')
    const prompt = plan.writes.messages.find((m) => m.conversationId === 'c2')
    expect(prompt.group.chats).toEqual([copy, 'c2'])
    expect(prompt.from).toBe(plan.renamedMsgIds.get('m1'))
  })

  it('accepts only well-formed links', () => {
    const backup = (m) => ({
      conversations: [{ id: 'c1', title: 'Owls', model: 'x', pinned: false, storageBytes: 0, tags: [], createdAt: '2026-10-22T10:00:00Z', updatedAt: '2026-10-22T10:00:00Z' }],
      messages: [{ id: 'm1', conversationId: 'c1', role: 'user', content: 'x', tokenCount: 0, incomplete: false, createdAt: '2026-10-22T10:00:00Z', ...m }],
    })
    expect(validateBackup(backup({ group: { id: 'g1', chats: ['c1', 'c2'] }, from: 'm0' })).valid).toBe(true)
    expect(validateBackup(backup({ group: { id: 'g1', chats: [] } })).valid).toBe(false)
    expect(validateBackup(backup({ group: 'g1' })).valid).toBe(false)
  })
})

describe('the Enter line of a prompt to several (C172 (f))', () => {
  const i18n = setupI18n({ locale: 'en', messages: { en } })
  i18n.activate('en')
  const sonnet = { id: 'claude-sonnet-5-5', group: 'model', name: 'Sonnet 5.5', provider: 'anthropic', price: { type: 'metered', inputPerMillion: 2, outputPerMillion: 10 } }
  const opus = { id: 'claude-opus-5-5', group: 'model', name: 'Opus 5.5', provider: 'anthropic', price: { type: 'metered', inputPerMillion: 4, outputPerMillion: 20 } }
  const wiki = { id: 'wikipedia', group: 'source', name: 'Wikipedia' }
  const bonsai = { id: 'ollama:bonsai-2:9b', group: 'local', name: 'bonsai-2:9b' }
  const room = { room: 'c1', keyed: true, keyedBy: { anthropic: true }, historyChars: 0, systemChars: 0 }
  const line = (target, text = 'Why could Krakatoa be heard so far away?') => {
    const p = promptPreview(text, { ...room, ...target })
    return { ready: p.ready, text: p.says && say(i18n, p.says.message, p.says.values), also: (p.says?.also ?? []).map((x) => say(i18n, x.message, x.values)) }
  }

  it('names each, in the order chosen, with its cost, and the total', () => {
    const p = line({ many: [sonnet, wiki, opus, bonsai], describe: { price: null } })
    expect(p.ready).toBe(true)
    expect(p.text).toBe('Enter sends this one prompt to 4, each a branch of its own, side by side: under $0.01 in all to send')
    expect(p.also).toEqual([
      '1. Sonnet 5.5, about 10 tokens, under $0.01',
      '2. Wikipedia, no key and no cost',
      '3. Opus 5.5, about 10 tokens, under $0.01',
      '4. bonsai-2:9b, on this computer: nothing leaves it',
      'After the first answer, one small request names the chat, once for all of them',
    ])
  })

  it('sends to none unless each can answer', () => {
    const p = line({ many: [sonnet, { ...opus, needsKey: true, providerName: 'Anthropic' }] })
    expect(p.ready).toBe(false)
    expect(p.text).toBe('Opus 5.5 answers here and needs a key for Anthropic. api:anthropic adds one, by: chooses another')
  })
})

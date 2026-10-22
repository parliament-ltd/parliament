import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { openDB } from 'idb'
import { upgradeSchema } from './schema'
import * as R from './records'
import { factsOf, costOf, createFactsCache } from './chatFacts'
import { readAlmanac } from './almanacRows'

// What Records reads from inside each chat (stage 6, piece 1; C132).

const reply = (content, extra = {}) => ({ id: `m${Math.random()}`, role: 'assistant', content, ...extra })
const prompt = (content) => ({ id: `m${Math.random()}`, role: 'user', content })
const PRICES = { 'claude-sonnet': { inputPerMillion: 3, outputPerMillion: 15 }, 'claude-haiku': { inputPerMillion: 1, outputPerMillion: 5 } }
const priceOf = (id) => PRICES[id] ?? null

describe('what is inside a chat', () => {
  it('keeps its words in lower case, its document\'s too', () => {
    const f = factsOf({ model: 'claude-sonnet' }, [prompt('Barn OWL?'), reply('Tyto alba.')], { paragraphs: [{ text: 'A Draft' }, {}] })
    expect(f.words).toBe('barn owl?\ntyto alba.\na draft')
  })

  it('names who answered: a reply\'s own model, else the chat\'s last one (C132 (g)), and sources', () => {
    const f = factsOf({ model: 'claude-sonnet' }, [reply('old'), reply('new', { model: 'claude-haiku', usage: { input: 10, output: 5 } }), reply('From the encyclopedia', { source: { id: 'wikipedia' } })])
    expect(f.models.sort()).toEqual(['claude-haiku', 'claude-sonnet'])
    expect(f.sources).toEqual(['wikipedia'])
  })

  it('works out a cost only from recorded tokens, never guessed (C132 (h))', () => {
    const priced = factsOf({}, [reply('a', { model: 'claude-sonnet', usage: { input: 1_000_000, output: 100_000 } }), reply('b', { source: { id: 'wikipedia' } })])
    expect(costOf(priced, priceOf)).toBeCloseTo(4.5)
    const older = factsOf({ model: 'claude-sonnet' }, [reply('a', { model: 'claude-sonnet', usage: { input: 1, output: 1 } }), reply('b')])
    expect(older.unpriced).toBe(1)
    expect(costOf(older, priceOf)).toBeNull()
    const unknownModel = factsOf({}, [reply('a', { model: 'someone-else', usage: { input: 1, output: 1 } })])
    expect(costOf(unknownModel, priceOf)).toBeNull()
    expect(costOf(factsOf({}, [prompt('hello')]), priceOf)).toBe(0)
  })
})

describe('kept until the chat changes', () => {
  let db
  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory()
    db = await openDB('facts-test', 6, { upgrade: upgradeSchema })
  })
  afterEach(() => db.close())

  const now = () => new Date().toISOString()
  const newChat = (id) => R.createChat(db, { id, title: 'Owls', model: 'claude-sonnet', room: null, pinned: false, storageBytes: 0, createdAt: now(), updatedAt: now() })
  const say = (conversationId, id, content) => R.addMessageRecord(db, { id, conversationId, role: 'assistant', content, tokenCount: 0, incomplete: false, createdAt: now() })

  it('reads a chat once, and again after its messages change, here or in another tab', async () => {
    const cache = createFactsCache()
    await newChat('c1')
    await say('c1', 'm1', 'Barn owls')
    const chats = await db.getAll('conversations')
    expect((await cache.read(db, chats)).get('c1').words).toBe('barn owls')

    // Unchanged: kept, even if the store changes underneath without a word.
    await db.put('messages', { ...(await db.get('messages', 'm1')), content: 'Something else' })
    expect((await cache.read(db, chats)).get('c1').words).toBe('barn owls')

    // A change announced for one of its messages (records.js announces
    // { kind, op, id }) drops it, and it is read again.
    await R.updateMessageRecord(db, 'm1', { content: 'Tawny owls', model: 'claude-sonnet', usage: { input: 3, output: 4 } })
    cache.forget({ kind: 'message', op: 'updated', id: 'm1' })
    const f = (await cache.read(db, chats)).get('c1')
    expect(f.words).toBe('tawny owls')
    expect(f.usage).toEqual([{ model: 'claude-sonnet', input: 3, output: 4 }])

    // A chat's own change, or its document's, drops it too.
    await db.put('sbrd_documents', { conversationId: 'c1', paragraphs: [{ text: 'Draft' }] })
    cache.forget({ kind: 'document', op: 'created', id: 'c1' })
    expect((await cache.read(db, chats)).get('c1').words).toBe('tawny owls\ndraft')
  })

  it('lets Records filter by what is inside', async () => {
    await newChat('c1')
    await say('c1', 'm1', 'Barn owls hunt by sound')
    const { rows, rooms, collections } = await readAlmanac(db, { facts: createFactsCache(), priceOf })
    const chat = rows.find((r) => r.kind === 'chat')
    expect(chat.words).toContain('hunt by sound')
    expect(chat.models).toEqual(['claude-sonnet'])
    expect(chat.cost).toBeNull() // the reply recorded no tokens
    expect(rooms).toEqual([])
    expect(collections).toEqual([])
  })
})

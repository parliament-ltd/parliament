import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { openDB } from 'idb'
import { upgradeSchema } from './schema'
import * as R from './records'
import { favoritesOf, wholeQuoteOf, withFavorite, planFavoritesToTags, applyFavoritesToTags, readFavoritesSnapshot, convertFavoritesOnce, FAVORITES_TAGGED_SETTING } from './favoriteTags'

// Favourites as a tag (stage 6 checkpoint; C147).

describe('the rules', () => {
  const pin = (extra) => ({ id: 'p1', num: 230, targetConversationId: 'c1', sourceConversationId: 'c1', sourceMessageId: 'm1', content: 'A whole reply', tags: [], ...extra })

  it('a favourite is a quote tagged favorite, or an old record until converted', () => {
    const old = [{ id: 'f1', messageId: 'm2' }]
    const map = favoritesOf({ pins: [pin({ tags: ['Favorite'] })], oldFavorites: old, conversationId: 'c1' })
    expect([...map.keys()]).toEqual(['m2', 'm1'])
    expect(map.get('m1').kind).toBe('tag')
    expect(map.get('m2').kind).toBe('old')
    expect([...favoritesOf({ pins: [], oldFavorites: old, conversationId: 'c1', converted: true }).keys()]).toEqual([])
    // A quote kept in another chat is not this chat's favourite.
    expect(favoritesOf({ pins: [pin({ tags: ['favorite'], targetConversationId: 'c9' })], conversationId: 'c1' }).size).toBe(0)
  })

  it('finds the whole-message quote in its own chat, and adds or takes off the tag as the tag verbs do', () => {
    expect(wholeQuoteOf([pin()], 'c1', 'm1', 'A whole reply')?.id).toBe('p1')
    expect(wholeQuoteOf([pin()], 'c1', 'm1', 'A passage')).toBeNull()
    expect(withFavorite({ tags: ['essay'], tagsMine: [] }, true)).toEqual({ tags: ['essay', 'favorite'], tagsMine: ['favorite'] })
    expect(withFavorite({ tags: ['essay', 'favorite'], tagsMine: ['favorite'] }, false)).toEqual({ tags: ['essay'], tagsMine: [] })
  })

  it('plans each old favourite: a new quote, the tag on a quote already there, or nothing when its message is gone', () => {
    const plan = planFavoritesToTags({
      favorites: [{ id: 'f1', conversationId: 'c1', messageId: 'm1' }, { id: 'f2', conversationId: 'c1', messageId: 'm2' }, { id: 'f3', conversationId: 'c1', messageId: 'gone' }, { id: 'f4', conversationId: 'c1', messageId: 'm2' }],
      messages: [{ id: 'm1', content: 'A whole reply' }, { id: 'm2', content: 'Another' }],
      pins: [pin()],
    })
    expect(plan.tag.map((t) => t.pin.id)).toEqual(['p1'])
    expect(plan.create.map((c) => c.messageId)).toEqual(['m2'])
    expect(plan.gone.map((f) => f.id)).toEqual(['f3'])
  })
})

describe('the conversion, on a version 6 database', () => {
  let db
  let n = 0
  const at = '2026-10-22T10:00:00.000Z'
  beforeEach(async () => {
    globalThis.indexedDB = new IDBFactory()
    db = await openDB('favorites-test', 6, { upgrade: upgradeSchema })
  })
  afterEach(() => db.close())

  it('makes numbered quotes tagged favorite, tags the one already there, notes that it ran, and does nothing twice', async () => {
    const c = await R.createChat(db, { id: 'c1', title: 'Owls', model: 'claude-sonnet', parentId: null, branchPoint: null, room: null, pinned: false, storageBytes: 0, createdAt: at, updatedAt: at })
    await R.addMessageRecord(db, { id: 'm1', conversationId: c.id, role: 'assistant', content: 'Barn owls hunt by ear.', createdAt: at })
    await R.addMessageRecord(db, { id: 'm2', conversationId: c.id, role: 'assistant', content: 'Their faces gather sound.', createdAt: at })
    await R.addFavoriteRecord(db, { id: 'f1', conversationId: c.id, messageId: 'm1', createdAt: at })
    await R.addFavoriteRecord(db, { id: 'f2', conversationId: c.id, messageId: 'm2', createdAt: at })
    // m2 was already kept whole with "Quote in a chat".
    await R.addNumbered(db, 'pins', { id: 'p2', targetConversationId: c.id, sourceConversationId: c.id, sourceMessageId: 'm2', content: 'Their faces gather sound.', createdAt: at })

    const plan = planFavoritesToTags(await readFavoritesSnapshot(db))
    expect([plan.create.length, plan.tag.length]).toEqual([1, 1])
    const done = await applyFavoritesToTags(db, plan, { now: at, newId: () => `new-${++n}` })
    expect(done.created).toHaveLength(1)
    expect(done.tagged).toHaveLength(1)

    const pins = await db.getAll('pins')
    expect(pins.every((p) => p.tags.includes('favorite') && p.tagsMine.includes('favorite'))).toBe(true)
    expect(pins.find((p) => p.sourceMessageId === 'm1')).toMatchObject({ content: 'Barn owls hunt by ear.', kind: 'quote', createdAt: at })
    expect((await db.get('settings', FAVORITES_TAGGED_SETTING)).value).toBe(at)
    // The old records stay, readable by old backups.
    expect(await db.count('favorites')).toBe(2)

    const again = planFavoritesToTags(await readFavoritesSnapshot(db))
    expect([again.create.length, again.tag.length, again.already.length]).toEqual([0, 0, 2])
  })

  it('runs once on its own: notes that it ran even with nothing to convert, and never again', async () => {
    expect(await convertFavoritesOnce(db, { now: at, newId: () => `once-${++n}` })).toEqual({ created: [], tagged: [] })
    expect((await db.get('settings', FAVORITES_TAGGED_SETTING)).value).toBe(at)
    const c = await R.createChat(db, { id: 'c2', title: 'Owls', model: 'claude-sonnet', parentId: null, branchPoint: null, room: null, pinned: false, storageBytes: 0, createdAt: at, updatedAt: at })
    await R.addMessageRecord(db, { id: 'm9', conversationId: c.id, role: 'assistant', content: 'Later.', createdAt: at })
    await R.addFavoriteRecord(db, { id: 'f9', conversationId: c.id, messageId: 'm9', createdAt: at })
    expect(await convertFavoritesOnce(db, { now: at, newId: () => `once-${++n}` })).toBeNull()
    expect(await db.count('pins')).toBe(0)
  })

  it('runs inside the lock it is given', async () => {
    const names = []
    await convertFavoritesOnce(db, { now: at, newId: () => `lock-${++n}`, lock: (name, fn) => { names.push(name); return fn() } })
    expect(names).toEqual(['parliament-favorites-to-tags'])
  })
})

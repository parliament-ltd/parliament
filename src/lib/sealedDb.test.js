import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { describe, it, expect, beforeEach } from 'vitest'
import { openDB } from 'idb'
import { upgradeSchema } from './schema'
import { sealedDb, sealEverything, openEverything, StagedConflict } from './sealedDb'
import { sealRecord, openRecord, isSealed, SEALED_STORES } from './seal'
import { maybeSealed } from './__fixtures__/sealedHarness'
import * as R from './records'

// The database with the lock on (Lock Parliament, piece 2; C189, C192).

const open = (name) => openDB(name, 6, { upgrade: upgradeSchema })
const makeKey = () => globalThis.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
const now = '2026-10-23T12:00:00.000Z'
let n = 0
const id = () => `id-${++n}`
const chat = (extra = {}) => ({ id: id(), title: 'Barn owls of the river', model: 'm', parentId: null, branchPoint: null, room: 'mode_1', pinned: false, storageBytes: 0, createdAt: now, updatedAt: now, ...extra })
const words = (v) => JSON.stringify(v, (k, x) => (x instanceof Uint8Array ? '[bytes]' : x))
// The same, field order aside, bytes as numbers.
const plainOf = (v) => JSON.parse(JSON.stringify(v, (k, x) => (x instanceof ArrayBuffer ? [...new Uint8Array(x)] : ArrayBuffer.isView(x) ? [...new Uint8Array(x.buffer, x.byteOffset, x.byteLength)] : x)))

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  n = 0
})

describe('what lies on disk with the lock on', () => {
  it('keeps only the key and the indexed fields readable, and no word of yours', async () => {
    const raw = await open('disk')
    const db = sealedDb(raw, await makeKey())
    const c = chat({ tags: ['owls', 'rivers'] })
    await R.createChat(db, c)
    await R.addMessageRecord(db, { id: id(), conversationId: c.id, role: 'user', content: 'Where do barn owls nest?', createdAt: now })
    const stored = await raw.get('conversations', c.id)
    expect(isSealed(stored)).toBe(true)
    expect(Object.keys(stored).filter((k) => k !== 'sealed').sort()).toEqual(['createdAt', 'docketId', 'id', 'num', 'room', 'updatedAt'])
    const everything = words([await raw.getAll('conversations'), await raw.getAll('messages'), await raw.getAll('dockets'), await raw.getAll('runs')])
    expect(everything).not.toMatch(/owl|river|nest/i)
    // The app reads it back as it was.
    expect((await db.get('conversations', c.id)).title).toBe('Barn owls of the river')
    expect((await db.getAllFromIndex('messages', 'conversationId', c.id))[0].content).toBe('Where do barn owls nest?')
    // The tag index, which nothing queries, holds nothing.
    expect(await raw.getAllFromIndex('conversations', 'tags', 'owls')).toEqual([])
    raw.close()
  })

  it('seals a file’s bytes and gives them back as bytes', async () => {
    const raw = await open('files')
    const db = sealedDb(raw, await makeKey())
    const data = new TextEncoder().encode('secret spreadsheet').buffer
    await db.put('file_data', { fileId: 'f1', data })
    const stored = await raw.get('file_data', 'f1')
    expect(new TextDecoder().decode(new Uint8Array(stored.sealed.bin[0].data))).not.toContain('secret')
    const back = await db.get('file_data', 'f1')
    expect(back.data).toBeInstanceOf(ArrayBuffer)
    expect(new TextDecoder().decode(back.data)).toBe('secret spreadsheet')
    raw.close()
  })

  it('seals only the settings that hold your words', async () => {
    const raw = await open('settings')
    const db = sealedDb(raw, await makeKey())
    await db.put('settings', { key: 'scratchpad-text', value: 'call the archive' })
    await db.put('settings', { key: 'interfaceLanguage', value: 'sv' })
    expect(isSealed(await raw.get('settings', 'scratchpad-text'))).toBe(true)
    expect(await raw.get('settings', 'interfaceLanguage')).toEqual({ key: 'interfaceLanguage', value: 'sv' })
    expect((await db.get('settings', 'scratchpad-text')).value).toBe('call the archive')
    raw.close()
  })

  it('will not open a sealed record moved to another record or store', async () => {
    const key = await makeKey()
    const sealed = await sealRecord('notes', { id: 'n1', text: 'a note', conversationId: null }, key)
    await expect(openRecord('notes', { ...sealed, id: 'n2' }, key)).rejects.toMatchObject({ code: 'damaged' })
    await expect(openRecord('highlights', sealed, key)).rejects.toMatchObject({ code: 'damaged' })
    await expect(openRecord('notes', sealed, await makeKey())).rejects.toMatchObject({ code: 'damaged' })
    expect((await openRecord('notes', sealed, key)).text).toBe('a note')
  })
})

describe('a staged transaction', () => {
  it('sees its own writes, in stores and in indexes', async () => {
    const raw = await open('own')
    const db = sealedDb(raw, await makeKey())
    await db.put('notes', { id: 'a', conversationId: 'c1', text: 'first', createdAt: now })
    const tx = db.transaction(['notes'], 'readwrite')
    const s = tx.objectStore('notes')
    await s.put({ id: 'b', conversationId: 'c1', text: 'second', createdAt: now })
    await s.put({ id: 'a', conversationId: 'c2', text: 'moved', createdAt: now })
    expect((await s.index('conversationId').getAll('c1')).map((x) => x.id)).toEqual(['b'])
    expect((await s.get('a')).text).toBe('moved')
    await s.delete('b')
    expect((await s.getAll()).map((x) => x.id)).toEqual(['a'])
    await tx.done
    expect((await db.getAll('notes')).map((x) => [x.id, x.conversationId])).toEqual([['a', 'c2']])
    raw.close()
  })

  it('writes nothing, and fails with a conflict, when what it read changed meanwhile', async () => {
    const raw = await open('conflict')
    const key = await makeKey()
    const db = sealedDb(raw, key)
    await db.put('notes', { id: 'a', text: 'one', createdAt: now })
    const elsewhere = await sealRecord('notes', { id: 'a', text: 'changed in another tab', createdAt: now }, key)
    const tx = db.transaction(['notes'], 'readwrite')
    const before = await tx.objectStore('notes').get('a')
    tx.objectStore('notes').put({ ...before, text: 'two' })
    // Another tab writes before this one's commit reaches the database.
    raw.put('notes', elsewhere)
    await expect(tx.done).rejects.toBeInstanceOf(StagedConflict)
    expect((await db.get('notes', 'a')).text).toBe('changed in another tab')
    raw.close()
  })

  it('lets records.js work a change out again after a conflict', async () => {
    const raw = await open('retry')
    const db = sealedDb(raw, await makeKey())
    const c = chat()
    await R.createChat(db, c)
    // Two changes at once: both land, one of them worked out twice.
    await Promise.all([R.updateChat(db, c.id, { title: 'Owls' }), R.updateChat(db, c.id, { pinned: true })])
    const back = await db.get('conversations', c.id)
    expect(back.pinned).toBe(true)
    expect(back.title).toBe('Owls')
    raw.close()
  })

  it('finishes when the caller stops, as a real one does', async () => {
    const raw = await open('finish')
    const db = sealedDb(raw, await makeKey())
    const tx = db.transaction(['notes'], 'readwrite')
    tx.objectStore('notes').put({ id: 'x', text: 'kept', createdAt: now })
    await tx.done
    await new Promise((r) => setTimeout(r, 5))
    expect(() => tx.objectStore('notes').put({ id: 'y', text: 'late' })).toThrow()
    expect((await db.get('notes', 'x')).text).toBe('kept')
    raw.close()
  })
})

describe('turning the lock on and off (C192)', () => {
  it('seals everything in one save, and opens it all again, record for record', async () => {
    const raw = await open('rewrite')
    const c = chat()
    await R.createChat(raw, c)
    await R.addMessageRecord(raw, { id: id(), conversationId: c.id, role: 'assistant', content: 'They nest in old barns.', createdAt: now })
    await R.addOwnNote(raw, { id: id(), text: 'ask the farmer', now })
    await raw.put('file_data', { fileId: 'f', data: new Uint8Array([1, 2, 3]).buffer })
    const stores = Object.keys(SEALED_STORES).filter((s) => raw.objectStoreNames.contains(s))
    const snapshot = async (db) => Object.fromEntries(await Promise.all(stores.map(async (s) => [s, plainOf(await db.getAll(s))])))
    const before = await snapshot(raw)

    const key = await makeKey()
    const count = await sealEverything(raw, key)
    expect(count).toBeGreaterThan(4)
    expect(words(await Promise.all(stores.map((s) => raw.getAll(s))))).not.toMatch(/barn|farmer|nest/)
    expect(await snapshot(sealedDb(raw, key))).toEqual(before)
    // Twice does nothing more.
    await sealEverything(raw, key)
    expect(await snapshot(sealedDb(raw, key))).toEqual(before)

    await openEverything(raw, key)
    expect(await snapshot(raw)).toEqual(before)
    raw.close()
  })
})

describe('the sealed twins of the tests', () => {
  it('run through the sealed database', async () => {
    const raw = await open('twin')
    globalThis.__PARLIAMENT_SEALED__ = true
    try {
      expect((await maybeSealed(raw)).sealed).toBe(true)
    } finally {
      delete globalThis.__PARLIAMENT_SEALED__
    }
    expect(await maybeSealed(raw)).toBe(raw)
    raw.close()
  })
})

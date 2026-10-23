import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { openDB } from 'idb'
import { upgradeSchema } from './schema'
import { gatherContents, restoreInto } from './backupData'
import { contentsToFlatStores } from './backupFormat'
import { planV6Migration } from './migrations/v6Plan'

// Backups and restores end to end, against an IndexedDB held in memory.

const sample = JSON.parse(readFileSync(new URL('./__fixtures__/sample-v5.json', import.meta.url), 'utf8'))
const now = '2026-10-19T12:00:00.000Z'
let n = 0
const newId = () => `r-${++n}`
const open = (name, version = 6) => openDB(name, version, { upgrade: upgradeSchema })
const count = async (db, store) => db.count(store)

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  n = 0
})

describe('restoring the sample (format 1) into an empty database at version 6', () => {
  let db
  beforeEach(async () => { db = await open('empty') })
  afterEach(() => db.close())

  it('numbers and files everything as the upgrade would', async () => {
    const summary = await restoreInto(db, sample.contents, { strategy: 'merge', newId, now })
    expect(summary.chats).toEqual({ added: 8, copied: 0, skipped: 0 })
    expect(summary.leftOut.favorites).toBe(1) // a favourite of a message the file does not hold

    const planned = planV6Migration(contentsToFlatStores(sample.contents), { now })
    const chats = await db.getAll('conversations')
    expect(chats.every((c) => Number.isInteger(c.num) && c.docketId && c.branch)).toBe(true)
    expect(await count(db, 'dockets')).toBe(planned.dockets.length)
    const tower = (await db.getAll('dockets')).find((d) => d.title === 'Water tower history')
    expect(tower.order).toEqual(['a', 'b', 'c'])
    const nums = [...await db.getAll('dockets'), ...chats, ...await db.getAll('notes'), ...await db.getAll('highlights'), ...await db.getAll('pins')].map((r) => r.num).sort((a, b) => a - b)
    expect(nums[0]).toBe(201)
    expect(new Set(nums).size).toBe(nums.length)
    expect((await db.get('counters', 'num')).next).toBe(nums[nums.length - 1] + 1)
  })

  it('carries favourites, personas, the scratchpad and room templates over as the upgrade does', async () => {
    await restoreInto(db, sample.contents, { strategy: 'merge', newId, now })
    expect((await db.getFromIndex('collections', 'builtIn', 'favorites')).items).toHaveLength(2)
    expect((await db.getAll('collabs')).map((c) => [c.name, c.on])).toEqual([['Skeptic', false]])
    expect((await db.getAll('notes')).filter((x) => x.fromScratchpad).map((x) => x.text)).toEqual(['Ask about the 1950s renovation.'])
    expect((await db.get('modes', 'mode_ws')).meta.template).toBe('writing-studio@1.0')
    expect((await db.getAll('highlights')).every((h) => h.kind === 'term')).toBe(true)
    expect((await db.getAll('conversations')).filter((c) => c.tags?.length).every((c) => c.tagsBy === 'model')).toBe(true)
  })

  it('skips everything the second time, since it is all here and the same', async () => {
    await restoreInto(db, sample.contents, { strategy: 'merge', newId, now })
    const before = await count(db, 'conversations')
    const counter = (await db.get('counters', 'num')).next
    const again = await restoreInto(db, sample.contents, { strategy: 'merge', newId, now })
    expect(again.chats).toEqual({ added: 0, copied: 0, skipped: 8 })
    expect(again.annotations.added + again.annotations.copied).toBe(0)
    expect(await count(db, 'conversations')).toBe(before)
    expect((await db.get('counters', 'num')).next).toBe(counter)
  })

  it('brings a chat changed since the backup in as a copy with a new number', async () => {
    await restoreInto(db, sample.contents, { strategy: 'merge', newId, now })
    const grant = (await db.getAll('conversations')).find((c) => c.id === 'c4')
    await db.put('conversations', { ...grant, title: 'Grant, renamed here' })
    const again = await restoreInto(db, sample.contents, { strategy: 'merge', newId, now })
    expect(again.chats).toEqual({ added: 0, copied: 1, skipped: 7 })
    const copy = (await db.getAll('conversations')).find((c) => c.title === 'Grant application (from backup)')
    expect(copy.restoredFrom).toEqual({ at: now })
    expect(copy.num).toBeGreaterThan(grant.num)
    expect(await db.getAllFromIndex('messages', 'conversationId', copy.id)).toHaveLength(3)
    expect((await db.get('dockets', copy.docketId)).title).toBe('Grant application')
  })
})

describe('backups in format 2', () => {
  it('hold the version 6 lists, only allowed settings, and never the key', async () => {
    const db = await open('source')
    await restoreInto(db, sample.contents, { strategy: 'merge', newId, now })
    await db.put('settings', { key: 'parliament-api-key', value: { ciphertext: [1, 2], iv: [3] } })
    await db.put('settings', { key: 'browserFingerprint', value: 'abc' })
    const note = (await db.getAll('notes'))[0]
    await db.put('notes', { ...note, injected: '<img onerror=x>' })
    const contents = await gatherContents(db)
    db.close()

    expect(contents.dockets.dockets.length).toBeGreaterThan(0)
    expect(contents.collections).toHaveLength(1)
    expect(contents.collabs).toHaveLength(1)
    const keys = contents.preferences.map((s) => s.key)
    expect(keys).toContain('scratchpad-text')
    expect(keys).not.toContain('parliament-api-key')
    expect(keys).not.toContain('browserFingerprint')
    expect(JSON.stringify(contents)).not.toContain('ciphertext')
    expect(JSON.stringify(contents)).not.toContain('onerror')
  })

  it('restore with a "replace" keeping their numbers, and the saved key that was here', async () => {
    const source = await open('source2')
    await restoreInto(source, sample.contents, { strategy: 'merge', newId, now })
    const contents = await gatherContents(source)
    const numsBefore = (await source.getAll('conversations')).map((c) => [c.id, c.num]).sort()
    source.close()

    const target = await open('target2')
    await target.put('settings', { key: 'parliament-api-key', value: { ciphertext: [9] } })
    await target.put('conversations', { id: 'other', title: 'Will go', createdAt: now, updatedAt: now })
    await restoreInto(target, contents, { strategy: 'replace', newId, now })
    expect((await target.getAll('conversations')).map((c) => [c.id, c.num]).sort()).toEqual(numsBefore)
    expect((await target.getAll('notes')).filter((x) => x.fromScratchpad)).toHaveLength(1) // a note in no chat comes back too
    expect(await target.get('settings', 'parliament-api-key')).toBeTruthy()
    expect(await target.get('conversations', 'other')).toBeUndefined()
    const max = Math.max(...(await target.getAll('conversations')).map((c) => c.num), ...(await target.getAll('dockets')).map((d) => d.num), ...(await target.getAll('notes')).map((x) => x.num))
    expect((await target.get('counters', 'num')).next).toBeGreaterThan(max)
    target.close()
  })
})

describe('a restore that fails', () => {
  it('writes nothing at all', async () => {
    const db = await open('failing')
    const broken = { ...sample.contents, chats: [...sample.contents.chats, { id: 'bad', title: 42, messages: [] }] }
    await expect(restoreInto(db, broken, { strategy: 'merge', newId, now })).rejects.toThrow(/title/)
    expect(await count(db, 'conversations')).toBe(0)
    expect(await count(db, 'dockets')).toBe(0)
    db.close()
  })
})

describe('restoring at version 5', () => {
  it('writes records as before, without numbers or dockets', async () => {
    const db = await open('five', 5)
    const summary = await restoreInto(db, sample.contents, { strategy: 'merge', newId, now })
    expect(summary.chats.added).toBe(8)
    const chats = await db.getAll('conversations')
    expect(chats.some((c) => 'num' in c || 'docketId' in c)).toBe(false)
    expect(db.objectStoreNames.contains('dockets')).toBe(false)
    db.close()
  })
})

describe('window layouts in a backup (stage 9, piece 2; C182)', () => {
  const layout = { id: 'space', columns: [['almanac'], ['settings']], popped: [], context: { settings: 'data' } }

  it('go only when ticked, and come back checked', async () => {
    const source = await open('layouts-source')
    await source.put('arrangements', layout)
    expect((await gatherContents(source)).layouts).toBeUndefined()
    expect((await gatherContents(source, ['chats'])).layouts).toBeUndefined()
    const contents = await gatherContents(source, ['layouts'])
    source.close()
    expect(contents.layouts).toHaveLength(1)
    expect(contents.layouts[0].columns).toEqual([['almanac'], ['settings']])

    const target = await open('layouts-target')
    const summary = await restoreInto(target, { layouts: [...contents.layouts, { id: 'space', columns: [['nowhere']] }, { id: 'NOT AN ID', columns: [['almanac']] }] }, { strategy: 'replace', newId, now })
    expect(summary.layouts).toEqual({ added: 1, copied: 0, skipped: 0 })
    const back = await target.getAll('arrangements')
    expect(back.map((r) => [r.id, r.columns])).toEqual([['space', [['almanac'], ['settings']]]])
    target.close()
  })

  it('leave the layouts on this device when added to what is here', async () => {
    const db = await open('layouts-merge')
    await db.put('arrangements', { ...layout, columns: [['library']] })
    const summary = await restoreInto(db, { layouts: [layout] }, { strategy: 'merge', newId, now })
    expect(summary.layouts).toEqual({ added: 0, copied: 0, skipped: 1 })
    expect((await db.get('arrangements', 'space')).columns).toEqual([['library']])
    db.close()
  })

  it('leave this device alone on a replace from a file without them', async () => {
    const db = await open('layouts-kept')
    await db.put('arrangements', layout)
    await restoreInto(db, sample.contents, { strategy: 'replace', newId, now })
    expect(await db.get('arrangements', 'space')).toBeTruthy()
    db.close()
  })
})

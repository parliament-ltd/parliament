import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { openDB } from 'idb'
import { eraseEverything } from './eraseAll'

// Delete everything (stage 9, piece 3; C73; audit T5; C183), against an
// IndexedDB held in memory.

vi.mock('virtual:pwa-register/react', () => ({ useRegisterSW: () => ({ needRefresh: [false, () => {}], offlineReady: [false, () => {}], updateServiceWorker: () => {} }) }))

const make = async (name) => (await openDB(name, 1, { upgrade(db) { db.createObjectStore('x') } })).close()
const names = async () => (await indexedDB.databases()).map((d) => d.name).sort()

beforeEach(() => { globalThis.indexedDB = new IDBFactory() })

describe('Delete everything', () => {
  it('deletes every Parliament database, the caches, the offline worker and the page storage, and nothing else', async () => {
    for (const name of ['parliament', 'parliament-keystore', 'parliament-v6-trial', 'workbox-expiration', 'another-app']) await make(name)
    const cached = new Set(['workbox-precache-v2', 'runtime'])
    const caches = { keys: async () => [...cached], delete: async (k) => cached.delete(k) }
    const workers = { getRegistrations: async () => [{ unregister: async () => true }] }
    const kept = new Map([['parliament-dev-db', 'trial']])
    const done = await eraseEverything({ idb: indexedDB, caches, workers, stores: [{ clear: () => kept.clear() }], known: ['parliament', 'parliament-keystore'] })
    expect(done.databases.sort()).toEqual(['parliament', 'parliament-keystore', 'parliament-v6-trial', 'workbox-expiration'])
    expect(await names()).toEqual(['another-app'])
    expect(done).toMatchObject({ caches: 2, workers: 1 })
    expect(cached.size).toBe(0)
    expect(kept.size).toBe(0)
  })

  it('waits for a tab that holds a database open, says so, and finishes when it lets go', async () => {
    const held = await openDB('parliament', 1, { upgrade(db) { db.createObjectStore('x') } })
    const blocked = []
    await eraseEverything({ idb: indexedDB, caches: null, workers: null, stores: [], onBlocked: (name) => { blocked.push(name); held.close() } })
    expect(blocked).toEqual(['parliament'])
    expect(await names()).toEqual([])
  })

  it('deletes the names it knows when the browser cannot list its databases', async () => {
    await make('parliament')
    await make('parliament-keystore')
    const idb = { deleteDatabase: (name) => indexedDB.deleteDatabase(name) }
    const done = await eraseEverything({ idb, caches: null, workers: null, stores: [], known: ['parliament', 'parliament-keystore'] })
    expect(done.databases).toEqual(['parliament', 'parliament-keystore'])
    expect(await names()).toEqual([])
  })

  it('makes a tab with the database open let go, and not open it again', async () => {
    const { initDB, DB_NAME } = await import('./db')
    await initDB()
    const blocked = []
    await eraseEverything({ idb: indexedDB, caches: null, workers: null, stores: [], known: [DB_NAME], onBlocked: (name) => blocked.push(name) })
    expect(blocked).toEqual([])
    expect(await names()).toEqual([])
    await expect(initDB()).rejects.toThrow(/deleted/)
    expect(await names()).toEqual([])
  }, 30000)
})

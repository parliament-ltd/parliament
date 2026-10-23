import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { describe, it, expect, vi } from 'vitest'

// This tab and the lock, end to end against databases in memory (Lock
// Parliament, piece 3; C187 to C192).

// Opening the real database seeds the library: slow under a full run.
vi.setConfig({ testTimeout: 30000 })

vi.mock('virtual:pwa-register/react', () => ({ useRegisterSW: () => ({ needRefresh: [false, () => {}], offlineReady: [false, () => {}], updateServiceWorker: () => {} }) }))

const PASS = 'a long enough passphrase'
const FAST = { iterations: 1000 }
const now = '2026-10-23T12:00:00.000Z'
const words = (v) => JSON.stringify(v, (k, x) => (x instanceof Uint8Array ? '[bytes]' : x))

// Fresh modules and databases for each test: a new browser.
async function fresh() {
  globalThis.indexedDB = new IDBFactory()
  vi.resetModules()
  const db = await import('./db')
  const records = await import('./records')
  const session = await import('./lockSession')
  const crypto = await import('./crypto')
  const { DB_NAME } = db
  const { openDB } = await import('idb')
  const raw = async () => openDB(DB_NAME)
  return { db, records, session, crypto, raw }
}

const chat = (id, title) => ({ id, title, model: 'm', parentId: null, branchPoint: null, room: 'mode_1', pinned: false, storageBytes: 0, createdAt: now, updatedAt: now })

describe('turning the lock on', () => {
  it('seals what is stored and the saved keys; the app reads on as before', async () => {
    const { db, records, session, crypto, raw } = await fresh()
    await records.createChat(await db.initDB(), chat('c1', 'Barn owls of the river'))
    await crypto.saveApiKey('sk-test-not-a-real-key', 'persistent', 'anthropic')

    const draft = await session.prepareLock({ passphrase: PASS, ...FAST })
    expect(draft.recoveryCode).toMatch(/^[0-9A-Z]{4}(-[0-9A-Z]{4}){5}$/)
    await session.turnOn(draft)

    const r = await raw()
    expect(words(await r.getAll('conversations'))).not.toMatch(/owl|river/i)
    r.close()
    const keyDb = await crypto.keyDatabase()
    const savedRecord = await keyDb.get('encryption-keys', 'saved-key:anthropic')
    expect(savedRecord.sealed).toBeTruthy()
    expect(savedRecord.ciphertext).toBeUndefined()
    expect((await session.lockStatus())).toMatchObject({ on: true, open: true, finished: true, idle: '1h' })
    // Through the lock, all as it was.
    expect((await (await db.initDB()).get('conversations', 'c1')).title).toBe('Barn owls of the river')
    expect(await crypto.loadApiKey('persistent', 'anthropic')).toBe('sk-test-not-a-real-key')
    // A database opened on its own (the copy before an upgrade) reads through the lock too.
    const own = await raw()
    expect((await session.throughLock(own).get('conversations', 'c1')).title).toBe('Barn owls of the river')
    session.lockHere()
    expect((await session.throughLock(own).get('conversations', 'c1')).title).toBeUndefined()
    own.close()
    // The unlock screen's language, read without opening the database for an upgrade.
    await (await db.initDB()).put('settings', { key: 'interfaceLanguage', value: 'sv' })
    expect(await db.readPreferenceQuietly('interfaceLanguage')).toBe('sv')
  })
})

describe('a tab with the lock on', () => {
  it('reads nothing of yours until unlocked, and unlocks with the passphrase or the code', async () => {
    const { db, records, session, crypto } = await fresh()
    await records.createChat(await db.initDB(), chat('c1', 'Water tower history'))
    await crypto.saveApiKey('sk-test-not-a-real-key', 'persistent', 'anthropic')
    const draft = await session.prepareLock({ passphrase: PASS, ...FAST })
    await session.turnOn(draft)

    session.lockHere()
    expect(session.unlockedHere()).toBe(false)
    const locked = await (await db.initDB()).get('conversations', 'c1')
    expect(locked.title).toBeUndefined()
    expect(locked.sealed).toBeTruthy()
    expect(await crypto.loadApiKey('persistent', 'anthropic')).toBeNull()

    await expect(session.unlock('passphrase', 'not the passphrase')).rejects.toMatchObject({ code: 'wrong' })
    expect(await session.unlock('passphrase', PASS)).toBe(true)
    expect((await (await db.initDB()).get('conversations', 'c1')).title).toBe('Water tower history')
    expect(await crypto.loadApiKey('persistent', 'anthropic')).toBe('sk-test-not-a-real-key')

    session.lockHere()
    expect(await session.unlock('recovery', draft.recoveryCode.toLowerCase())).toBe(true)
    expect((await (await db.initDB()).get('conversations', 'c1')).title).toBe('Water tower history')
  })

  it('finishes a set-up that was cut short, at the next unlock', async () => {
    const { db, records, session, crypto, raw } = await fresh()
    await records.createChat(await db.initDB(), chat('c1', 'Grant application'))
    const draft = await session.prepareLock({ passphrase: PASS, ...FAST })
    // The record written, nothing sealed yet: as if the tab closed there.
    const { writeLock } = await import('./keyStore')
    await writeLock(await crypto.keyDatabase(), { ...draft.record, sealing: 'started' })
    expect((await session.lockStatus()).finished).toBe(false)

    await session.unlock('passphrase', PASS)
    const r = await raw()
    expect(words(await r.getAll('conversations'))).not.toMatch(/grant/i)
    r.close()
    expect((await session.lockStatus()).finished).toBe(true)
  })
})

describe('changing and removing the lock', () => {
  it('changes the passphrase and renews the code without rewriting anything', async () => {
    const { session } = await fresh()
    const draft = await session.prepareLock({ passphrase: PASS, ...FAST })
    await session.turnOn(draft)
    await expect(session.changePassphrase('wrong passphrase!', 'another long passphrase', FAST)).rejects.toMatchObject({ code: 'wrong' })
    await session.changePassphrase(PASS, 'another long passphrase', FAST)
    session.lockHere()
    await expect(session.unlock('passphrase', PASS)).rejects.toMatchObject({ code: 'wrong' })
    await session.unlock('passphrase', 'another long passphrase')
    const { recoveryCode } = await session.renewRecoveryCode('another long passphrase')
    session.lockHere()
    await expect(session.unlock('recovery', draft.recoveryCode)).rejects.toMatchObject({ code: 'wrong' })
    expect(await session.unlock('recovery', recoveryCode)).toBe(true)
    await session.setIdle('15m')
    expect((await session.lockStatus()).idle).toBe('15m')
    expect(session.idleMs('15m')).toBe(15 * 60e3)
    expect(session.idleMs('tab')).toBeNull()
  })

  it('turns off: everything opened again, the keys too, and the lock gone', async () => {
    const { db, records, session, crypto, raw } = await fresh()
    await records.createChat(await db.initDB(), chat('c1', 'Reading list'))
    await crypto.saveApiKey('sk-test-not-a-real-key', 'persistent', 'anthropic')
    await session.turnOn(await session.prepareLock({ passphrase: PASS, ...FAST }))
    await session.turnOff()
    expect(await session.lockStatus()).toEqual({ on: false })
    const r = await raw()
    expect((await r.get('conversations', 'c1')).title).toBe('Reading list')
    r.close()
    expect((await (await crypto.keyDatabase()).get('encryption-keys', 'saved-key:anthropic')).sealed).toBeUndefined()
    expect(await crypto.loadApiKey('persistent', 'anthropic')).toBe('sk-test-not-a-real-key')
    expect((await (await db.initDB()).get('conversations', 'c1')).title).toBe('Reading list')
  })
})

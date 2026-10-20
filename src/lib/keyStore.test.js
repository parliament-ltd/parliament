import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { describe, it, expect, beforeEach } from 'vitest'
import { openDB } from 'idb'
import { upgradeSchema } from './schema'
import { KEY_DB_NAME, KEY_DB_VERSION, upgradeKeyDb, readSavedKey, writeSavedKey, moveLegacyKey, LEGACY_SETTING } from './keyStore'

// The saved key leaves the settings list for the key database (ruled 19 October).

const encrypted = { ciphertext: [11, 22, 33, 44], iv: [1, 2, 3] }
let appDb
let keyDb

beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory()
  appDb = await openDB('parliament', 5, { upgrade: upgradeSchema })
  keyDb = await openDB(KEY_DB_NAME, KEY_DB_VERSION, { upgrade: upgradeKeyDb })
  // The browser's own key that encrypts saved keys lives in the same store.
  await keyDb.put('encryption-keys', { id: 'api-key-encryption', key: 'opaque' })
})

describe('moving a key saved the old way', () => {
  it('copies it, checks the copy, and only then removes the old one', async () => {
    await appDb.put('settings', { key: LEGACY_SETTING, value: encrypted })
    expect(await moveLegacyKey({ appDb, keyDb, now: 't' })).toBe('moved')
    expect(await readSavedKey(keyDb, 'anthropic')).toEqual(encrypted)
    expect(await appDb.get('settings', LEGACY_SETTING)).toBeUndefined()
    expect(await keyDb.get('encryption-keys', 'api-key-encryption')).toEqual({ id: 'api-key-encryption', key: 'opaque' })
  })

  it('does nothing when no key was saved the old way, and nothing the second time', async () => {
    expect(await moveLegacyKey({ appDb, keyDb })).toBe('none')
    await appDb.put('settings', { key: LEGACY_SETTING, value: encrypted })
    await moveLegacyKey({ appDb, keyDb })
    expect(await moveLegacyKey({ appDb, keyDb })).toBe('none')
  })

  it('finishes a move that was cut short after the copy', async () => {
    await writeSavedKey(keyDb, 'anthropic', encrypted)
    await appDb.put('settings', { key: LEGACY_SETTING, value: encrypted })
    expect(await moveLegacyKey({ appDb, keyDb })).toBe('moved')
    expect(await appDb.get('settings', LEGACY_SETTING)).toBeUndefined()
  })

  it('leaves the old copy alone when the key store already holds a different key', async () => {
    await writeSavedKey(keyDb, 'anthropic', { ciphertext: [9, 9], iv: [9] })
    await appDb.put('settings', { key: LEGACY_SETTING, value: encrypted })
    expect(await moveLegacyKey({ appDb, keyDb })).toBe('kept')
    expect((await appDb.get('settings', LEGACY_SETTING)).value).toEqual(encrypted)
  })
})

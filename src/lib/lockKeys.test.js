import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { describe, it, expect, beforeEach } from 'vitest'
import { openDB } from 'idb'
import {
  createLock, unlockWithPassphrase, unlockWithRecovery, unlockWithPasskey, addPasskey, removePasskey,
  changePassphrase, renewRecoveryCode, setIdle, formatRecoveryCode, parseRecoveryCode, LockError,
  PASSPHRASE_MIN, LOCK_ITERATIONS, IDLE_DEFAULT,
} from './lockKeys'
import { KEY_DB_NAME, KEY_DB_VERSION, KEY_STORE, upgradeKeyDb, readLock, writeLock, removeLock, writeSavedKey, readSavedKey } from './keyStore'

// Lock Parliament's keys (stage S4, piece 1; C187 to C192).

const FAST = { iterations: 1000 } // the real count is checked once, below
const PASS = 'correct horse battery staple'
const subtle = globalThis.crypto.subtle
const sealWith = async (key, text) => {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))
  return { iv, data: new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text))) }
}
const openWith = async (key, { iv, data }) => new TextDecoder().decode(await subtle.decrypt({ name: 'AES-GCM', iv }, key, data))
const code = async (p) => { try { await p } catch (e) { return e instanceof LockError ? e.code : `other: ${e.message}` } return 'opened' }

describe('a new lock', () => {
  it('opens with its passphrase and its recovery code, to the same data key', async () => {
    const { record, key, recoveryCode } = await createLock({ passphrase: PASS, ...FAST })
    const sealed = await sealWith(key, 'water tower history')
    expect(await openWith(await unlockWithPassphrase(record, PASS), sealed)).toBe('water tower history')
    expect(await openWith(await unlockWithRecovery(record, recoveryCode), sealed)).toBe('water tower history')
    expect(record.idle).toBe(IDLE_DEFAULT)
  })

  it('refuses a wrong passphrase or code, and a short passphrase', async () => {
    const { record, recoveryCode } = await createLock({ passphrase: PASS, ...FAST })
    expect(await code(unlockWithPassphrase(record, 'correct horse battery stapler'))).toBe('wrong')
    const other = recoveryCode.replace(/^./, (c) => (c === 'A' ? 'B' : 'A'))
    expect(await code(unlockWithRecovery(record, other))).toBe('wrong')
    expect(await code(unlockWithRecovery(record, 'not a code'))).toBe('wrong')
    expect(await code(createLock({ passphrase: 'x'.repeat(PASSPHRASE_MIN - 1), ...FAST }))).toBe('short')
  })

  it('keeps no key or passphrase as it is, and hands out keys that cannot be exported', async () => {
    const { record, key, recoveryCode } = await createLock({ passphrase: PASS, ...FAST })
    const text = JSON.stringify(record, (k, v) => (v instanceof Uint8Array ? [...v] : v))
    expect(text).not.toContain(PASS)
    expect(text).not.toContain(recoveryCode)
    expect(Object.keys(record).sort()).toEqual(['check', 'createdAt', 'id', 'idle', 'passkeys', 'passphrase', 'recovery', 'v'])
    await expect(subtle.exportKey('raw', key)).rejects.toThrow()
    await expect(subtle.exportKey('raw', await unlockWithPassphrase(record, PASS))).rejects.toThrow()
    // Only a change asks for a copy that can be wrapped again.
    expect((await subtle.exportKey('raw', await unlockWithPassphrase(record, PASS, { extractable: true }))).byteLength).toBe(32)
  })

  it('tells damage apart from a wrong passphrase', async () => {
    const { record } = await createLock({ passphrase: PASS, ...FAST })
    const damaged = { ...record, check: { ...record.check, data: record.check.data.map((b, i) => (i === 0 ? b ^ 1 : b)) } }
    expect(await code(unlockWithPassphrase(damaged, PASS))).toBe('damaged')
    expect(await code(unlockWithPassphrase({ ...record, v: 2 }, PASS))).toBe('version')
  })

  it('stretches the passphrase 600,000 times unless told otherwise', async () => {
    const { record } = await createLock({ passphrase: PASS })
    expect(record.passphrase.iterations).toBe(LOCK_ITERATIONS)
    expect(LOCK_ITERATIONS).toBe(600000)
  }, 30000)
})

describe('changing the lock', () => {
  it('adds and removes a passkey; the passphrase and code always remain', async () => {
    const { record } = await createLock({ passphrase: PASS, ...FAST })
    const open = await unlockWithPassphrase(record, PASS, { extractable: true })
    const credentialId = new Uint8Array([1, 2, 3, 4])
    const prfSalt = globalThis.crypto.getRandomValues(new Uint8Array(32))
    const prfBytes = globalThis.crypto.getRandomValues(new Uint8Array(32))
    const withKey = await addPasskey(record, open, { credentialId, prfSalt, prfBytes })
    expect(withKey.passkeys).toHaveLength(1)
    const sealed = await sealWith(open, 'a note')
    expect(await openWith(await unlockWithPasskey(withKey, credentialId, prfBytes), sealed)).toBe('a note')
    expect(await code(unlockWithPasskey(withKey, credentialId, prfBytes.map((b) => b ^ 255)))).toBe('wrong')
    expect(await code(unlockWithPasskey(withKey, new Uint8Array([9]), prfBytes))).toBe('noPasskey')
    const without = removePasskey(withKey, credentialId)
    expect(without.passkeys).toEqual([])
    expect(await code(unlockWithPassphrase(without, PASS))).toBe('opened')
  })

  it('changes the passphrase and renews the code without changing the data key', async () => {
    const { record, recoveryCode } = await createLock({ passphrase: PASS, ...FAST })
    const open = await unlockWithPassphrase(record, PASS, { extractable: true })
    const sealed = await sealWith(open, 'a plan')
    const changed = await changePassphrase(record, open, 'a different long phrase', FAST)
    expect(await code(unlockWithPassphrase(changed, PASS))).toBe('wrong')
    expect(await openWith(await unlockWithPassphrase(changed, 'a different long phrase'), sealed)).toBe('a plan')
    expect(await code(unlockWithRecovery(changed, recoveryCode))).toBe('opened')
    const renewed = await renewRecoveryCode(changed, open)
    expect(await code(unlockWithRecovery(renewed.record, recoveryCode))).toBe('wrong')
    expect(await openWith(await unlockWithRecovery(renewed.record, renewed.recoveryCode), sealed)).toBe('a plan')
    expect(setIdle(renewed.record, '8h').idle).toBe('8h')
    expect(setIdle(renewed.record, 'forever').idle).toBe(IDLE_DEFAULT)
  })
})

describe('the recovery code', () => {
  it('is 120 bits as six groups of four, read back however it is typed', () => {
    const raw = globalThis.crypto.getRandomValues(new Uint8Array(15))
    const shown = formatRecoveryCode(raw)
    expect(shown).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){5}$/)
    expect([...parseRecoveryCode(shown)]).toEqual([...raw])
    expect([...parseRecoveryCode(` ${shown.toLowerCase().replace(/-/g, ' ')} `)]).toEqual([...raw])
    // Letters a person may write for digits.
    const withOne = formatRecoveryCode(new Uint8Array(15)).replace(/^0/, 'O')
    expect([...parseRecoveryCode(withOne)]).toEqual(Array(15).fill(0))
    expect(parseRecoveryCode(shown.slice(0, -1))).toBeNull()
    expect(parseRecoveryCode('')).toBeNull()
  })
})

describe("the lock's record in the key database (C192)", () => {
  beforeEach(() => { globalThis.indexedDB = new IDBFactory() })

  it('sits beside the saved keys, with no new store or version, and goes when the lock goes', async () => {
    const db = await openDB(KEY_DB_NAME, KEY_DB_VERSION, { upgrade: upgradeKeyDb })
    await writeSavedKey(db, 'anthropic', { ciphertext: [1, 2, 3], iv: [4, 5, 6] })
    expect(await readLock(db)).toBeNull()
    const { record } = await createLock({ passphrase: PASS, ...FAST })
    await writeLock(db, record)
    const back = await readLock(db)
    expect(await code(unlockWithPassphrase(back, PASS))).toBe('opened')
    expect([...db.objectStoreNames]).toEqual([KEY_STORE])
    expect(db.version).toBe(KEY_DB_VERSION)
    expect(await readSavedKey(db, 'anthropic')).toEqual({ ciphertext: [1, 2, 3], iv: [4, 5, 6] })
    await expect(writeLock(db, { id: 'saved-key:anthropic' })).rejects.toThrow()
    await removeLock(db)
    expect(await readLock(db)).toBeNull()
    db.close()
  })
})

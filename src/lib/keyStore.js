// Where a saved key lives (refactor-plan.md, stage 2; ruled 19 October).
//
// A saved key is encrypted (crypto.js) and kept in the key database,
// 'parliament-keystore', beside the key the browser holds to encrypt it: one
// record per provider. It is not in the settings list, so no backup, restore
// or "replace" can carry it, copy it or wipe it.
//
// The key database keeps its version and its one store, so an older tab that
// still holds it open cannot block anything. A saved key's record id names
// its provider, which leaves room for the providers stage 7 adds.
//
// Kept free of app imports so it can be tested in Node.

export const KEY_DB_NAME = 'parliament-keystore'
export const KEY_DB_VERSION = 1
export const KEY_STORE = 'encryption-keys'
// Where keys were saved before: one encrypted key, in the app's settings list.
export const LEGACY_SETTING = 'parliament-api-key'

export function upgradeKeyDb(db) {
  if (!db.objectStoreNames.contains(KEY_STORE)) db.createObjectStore(KEY_STORE, { keyPath: 'id' })
}

const recordId = (provider) => `saved-key:${provider}`

/**
 * The saved key for a provider, still encrypted: { ciphertext, iv } as arrays
 * of bytes; with the lock on, { sealed } (crypto.js opens it); or null.
 */
export async function readSavedKey(keyDb, provider) {
  const record = await keyDb.get(KEY_STORE, recordId(provider))
  if (!record) return null
  return record.sealed ? { sealed: record.sealed } : { ciphertext: record.ciphertext, iv: record.iv }
}

export async function writeSavedKey(keyDb, provider, saved, now = new Date().toISOString()) {
  const body = saved.sealed ? { sealed: saved.sealed } : { ciphertext: [...saved.ciphertext], iv: [...saved.iv] }
  await keyDb.put(KEY_STORE, { id: recordId(provider), provider, ...body, savedAt: now })
}

/** Every saved key's record, for sealing them all or opening them all (Lock Parliament). */
export async function listSavedKeys(keyDb) {
  return (await keyDb.getAll(KEY_STORE)).filter((r) => String(r.id).startsWith('saved-key:'))
}

export async function putSavedKeyRecord(keyDb, record) {
  if (!String(record?.id).startsWith('saved-key:')) throw new Error('not a saved key')
  await keyDb.put(KEY_STORE, record)
}

export async function removeSavedKey(keyDb, provider) {
  await keyDb.delete(KEY_STORE, recordId(provider))
}

// Lock Parliament's record (stage S4; C192): one more entry beside the saved
// keys, so no new store and no new version. lockKeys.js makes and opens it.
const LOCK_ID = 'lock'

/** The lock's record, or null when the lock is off. */
export async function readLock(keyDb) {
  return (await keyDb.get(KEY_STORE, LOCK_ID)) ?? null
}

export async function writeLock(keyDb, record) {
  if (record?.id !== LOCK_ID) throw new Error('not a lock record')
  await keyDb.put(KEY_STORE, record)
}

export async function removeLock(keyDb) {
  await keyDb.delete(KEY_STORE, LOCK_ID)
}

const sameBytes = (a, b) => Boolean(a && b) && a.length === b.length && a.every((x, i) => x === b[i])
const sameKey = (a, b) => Boolean(a?.ciphertext && b?.ciphertext) && sameBytes([...a.ciphertext], [...b.ciphertext]) && sameBytes([...a.iv], [...b.iv])

/**
 * Move a key saved the old way, in the settings list, into the key database:
 * copy it, read the copy back, compare it byte for byte, and only then remove
 * the old copy. The two databases cannot share a transaction, so a move cut
 * short leaves both copies, and the next call finishes it.
 *
 * @returns 'none' (nothing saved the old way), 'moved', or 'kept' when the key
 *   database already holds a different key and the old copy is left alone
 */
export async function moveLegacyKey({ appDb, keyDb, provider = 'anthropic', now }) {
  const legacy = (await appDb.get('settings', LEGACY_SETTING))?.value
  if (!legacy?.ciphertext || !legacy?.iv) return 'none'
  const before = await readSavedKey(keyDb, provider)
  if (before && !sameKey(before, legacy)) return 'kept'
  if (!before) await writeSavedKey(keyDb, provider, legacy, now)
  const copy = await readSavedKey(keyDb, provider)
  if (!sameKey(copy, legacy)) throw new Error('The saved key could not be copied to the key store; it was left where it was.')
  await appDb.delete('settings', LEGACY_SETTING)
  return 'moved'
}

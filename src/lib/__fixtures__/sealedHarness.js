// For tests only: the database as the app sees it with the lock on, when a
// sealed twin of a test file has set the flag (Lock Parliament, piece 2).
// The same tests then run through sealedDb.js, so the lock changes nothing
// the app can tell.
import { sealedDb } from '../sealedDb'

let key = null

export async function maybeSealed(db) {
  if (!globalThis.__PARLIAMENT_SEALED__) return db
  key ??= await globalThis.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
  return sealedDb(db, key)
}

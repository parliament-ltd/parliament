import { initDB } from './db'
import {
  KEY_DB_NAME, KEY_DB_VERSION, KEY_STORE, LEGACY_SETTING, upgradeKeyDb,
  readSavedKey, writeSavedKey, removeSavedKey, moveLegacyKey, listSavedKeys, putSavedKeyRecord,
} from './keyStore'

const ENCRYPTION_KEY_STORE = KEY_STORE
const KEY_ID = 'api-key-encryption'
// The provider a key belongs to, when a caller does not say: the one with a
// key until stage 7. Keys are kept one per provider (keyStore.js), and the
// gateway always says which (src/net, stage 4).
const PROVIDER = 'anthropic'

// ─── Internal: Key Storage ───────────────────────────────
// The encryption key is stored in a separate IndexedDB database
// from the app data, so clearAllData() doesn't destroy it

let keyDB = null
// Set once Delete everything has run (C183): the key database is not opened
// again until the page reloads.
let keysGone = false

async function getKeyDB() {
  if (keyDB) return keyDB
  if (keysGone) throw new Error('Parliament was deleted from this browser. Reload to start again.')

  keyDB = await (await import('idb')).openDB(KEY_DB_NAME, KEY_DB_VERSION, {
    upgrade: upgradeKeyDb,
    // Another tab deleting everything (no version) or upgrading: let go,
    // so it can finish (C183).
    blocking(currentVersion, blockedVersion, event) {
      event.target.close()
      keyDB = null
      if (blockedVersion == null) keysGone = true
    },
  })

  return keyDB
}

/** The key database, for Lock Parliament's record (lockSession.js). */
export async function keyDatabase() {
  return getKeyDB()
}

// ─── Saved keys under the lock (Lock Parliament, piece 3; C189) ───
//
// With the lock on, a saved key's encrypted bytes are sealed again with the
// lock's data key, so a copied profile cannot use them: the device key that
// encrypts them travels with the profile, the data key does not.

let lockKey = null
/** The lock's data key for this tab, once unlocked; null otherwise. */
export function setSavedKeysLock(key) {
  lockKey = key ?? null
}

const savedAad = (provider) => new TextEncoder().encode(`parliament seal v1\u0000saved-key\u0000${provider}`)

async function sealSaved(provider, { ciphertext, iv }, key) {
  const sealIv = crypto.getRandomValues(new Uint8Array(12))
  const body = new TextEncoder().encode(JSON.stringify({ ciphertext: [...ciphertext], iv: [...iv] }))
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: sealIv, additionalData: savedAad(provider) }, key, body))
  return { sealed: { v: 1, iv: sealIv, data } }
}

async function openSaved(provider, sealed, key) {
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: sealed.iv, additionalData: savedAad(provider) }, key, sealed.data)
  return JSON.parse(new TextDecoder().decode(plain))
}

/** Seal every saved key with the lock's data key (turning the lock on). */
export async function sealSavedKeys(key) {
  const db = await getKeyDB()
  for (const r of await listSavedKeys(db)) {
    if (r.sealed) continue
    await putSavedKeyRecord(db, { id: r.id, provider: r.provider, savedAt: r.savedAt, ...(await sealSaved(r.provider, r, key)) })
  }
}

/** Open every saved key again (turning the lock off). */
export async function openSavedKeys(key) {
  const db = await getKeyDB()
  for (const r of await listSavedKeys(db)) {
    if (!r.sealed) continue
    await putSavedKeyRecord(db, { id: r.id, provider: r.provider, savedAt: r.savedAt, ...(await openSaved(r.provider, r.sealed, key)) })
  }
}

/** Let go of the key database for good in this tab, before Delete everything (C183). */
export function closeKeyDB() {
  keysGone = true
  try { keyDB?.close() } catch { /* already closed */ }
  keyDB = null
}

// ─── Encryption Key Management ───────────────────────────

export async function generateEncryptionKey() {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable
    ['encrypt', 'decrypt']
  )

  const db = await getKeyDB()
  await db.put(ENCRYPTION_KEY_STORE, { id: KEY_ID, key })

  return key
}

export async function getOrCreateEncryptionKey() {
  const db = await getKeyDB()
  const entry = await db.get(ENCRYPTION_KEY_STORE, KEY_ID)

  if (entry && entry.key) {
    return entry.key
  }

  return generateEncryptionKey()
}

// ─── API Key Encryption ─────────────────────────────────

export async function encryptApiKey(plaintext) {
  const key = await getOrCreateEncryptionKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  )

  return { ciphertext, iv }
}

export async function decryptApiKey(ciphertext, iv) {
  const key = await getOrCreateEncryptionKey()

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  )

  return new TextDecoder().decode(decrypted)
}

// ─── API Key Storage Modes ──────────────────────────────
//
// A saved key is kept encrypted in the key database (keyStore.js), not in
// the settings list (ruled 19 October). One saved the old way is moved the
// first time keys are read.

const STORAGE_KEY = LEGACY_SETTING

export async function saveApiKey(apiKey, mode = 'persistent', provider = PROVIDER) {
  switch (mode) {
    case 'persistent': {
      const { ciphertext, iv } = await encryptApiKey(apiKey)
      const saved = { ciphertext: Array.from(new Uint8Array(ciphertext)), iv: Array.from(iv) }
      // With the lock on, sealed again with its data key.
      await writeSavedKey(await getKeyDB(), provider, lockKey ? await sealSaved(provider, saved, lockKey) : saved)
      // A key saved now replaces one saved the old way.
      if (provider === PROVIDER) await (await initDB()).delete('settings', STORAGE_KEY)
      break
    }
    case 'memory': {
      // Held in memory by the key module (src/net/keyring.js), not here.
      break
    }
    default: {
      // Treat any unknown mode (including legacy 'session') as persistent
      return saveApiKey(apiKey, 'persistent', provider)
    }
  }
}

export async function loadApiKey(mode = 'persistent', provider = PROVIDER) {
  switch (mode) {
    case 'persistent': {
      const keyDb = await getKeyDB()
      let saved = null
      if (provider !== PROVIDER) {
        saved = await readSavedKey(keyDb, provider)
      } else {
        const appDb = await initDB()
        try {
          await moveLegacyKey({ appDb, keyDb, provider: PROVIDER })
          saved = await readSavedKey(keyDb, PROVIDER)
        } catch (err) {
          // The move failed: the key is still where it was, so read it there.
          if (import.meta.env.DEV) console.warn('[crypto] Saved key not moved:', err?.message)
          saved = (await appDb.get('settings', STORAGE_KEY))?.value || null
        }
      }
      if (!saved) return null
      if (saved.sealed) {
        // Sealed by the lock: readable only once this tab is unlocked.
        if (!lockKey) return null
        saved = await openSaved(provider, saved.sealed, lockKey)
      }

      const { ciphertext, iv } = saved
      try {
        return await decryptApiKey(
          new Uint8Array(ciphertext).buffer,
          new Uint8Array(iv)
        )
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn('[crypto] Failed to decrypt stored API key:', err?.message)
        }
        return null
      }
    }
    case 'memory': {
      return null
    }
    default: {
      // Treat any unknown mode (including legacy 'session') as persistent
      return loadApiKey('persistent', provider)
    }
  }
}

/** Whether a key is saved for a provider, without decrypting it. */
export async function hasSavedKey(provider = PROVIDER) {
  try {
    if (await readSavedKey(await getKeyDB(), provider)) return true
    // One saved the old way, not yet moved, counts too.
    return provider === PROVIDER && Boolean((await (await initDB()).get('settings', STORAGE_KEY))?.value)
  } catch {
    return false
  }
}

export async function deleteApiKey(provider = PROVIDER) {
  try {
    await removeSavedKey(await getKeyDB(), provider)
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[crypto] Failed to delete the saved key:', err?.message)
    }
  }
  // The old places only ever held the first provider's key.
  if (provider !== PROVIDER) return
  const db = await initDB()
  try {
    await db.delete('settings', STORAGE_KEY)
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[crypto] Failed to delete API key from IndexedDB:', err?.message)
    }
  }
  // Scrub any legacy session key left from older versions
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[crypto] Failed to scrub legacy session key:', err?.message)
    }
  }
}

// ─── Export Encryption (Passphrase-based) ────────────────

// Iteration count for new V2 backups. Per OWASP 2023 guidance — superseded
// the V1 default of 100k. Legacy V1 .apb files were encrypted at 100k; the
// import path reads `iterations` from the file header so old files still
// decrypt.
export const PBKDF2_ITERATIONS_V2 = 210000

// Iteration count for backups written from stage 9 on (audit T9; OWASP's
// guidance for PBKDF2 with SHA-256 is 600,000). The count is written in each
// file's header, so files made at 210,000 or 100,000 still open.
export const PBKDF2_ITERATIONS_V3 = 600000

// Legacy V1 default. Used only when a V1 .apb file lacks an iterations
// field (which is always — V1 didn't write one).
export const PBKDF2_ITERATIONS_V1 = 100000

export async function deriveKeyFromPassphrase(passphrase, salt, iterations = PBKDF2_ITERATIONS_V2) {
  const encoded = new TextEncoder().encode(passphrase)

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoded,
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

// V1 .apb format. Kept for compatibility with the legacy SettingsView export
// flow until that flow is retired in PR-10b. New code should use the V2
// backup module (src/lib/backup.js) instead.
export async function encryptExport(jsonString, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKeyFromPassphrase(passphrase, salt, PBKDF2_ITERATIONS_V1)

  const encoded = new TextEncoder().encode(jsonString)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  )

  return {
    salt: Array.from(salt),
    iv: Array.from(iv),
    ciphertext: Array.from(new Uint8Array(ciphertext)),
    version: 1,
  }
}

export async function decryptImport(encryptedData, passphrase) {
  const { salt, iv, ciphertext } = encryptedData

  const key = await deriveKeyFromPassphrase(
    passphrase,
    new Uint8Array(salt),
    PBKDF2_ITERATIONS_V1
  )

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      key,
      new Uint8Array(ciphertext)
    )

    const jsonString = new TextDecoder().decode(decrypted)
    return JSON.parse(jsonString)
  } catch {
    throw new Error('Incorrect passphrase or corrupted file')
  }
}
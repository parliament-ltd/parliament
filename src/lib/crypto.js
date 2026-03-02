import { initDB } from './db'

const ENCRYPTION_KEY_STORE = 'encryption-keys'
const KEY_ID = 'api-key-encryption'

// ─── Internal: Key Storage ───────────────────────────────
// The encryption key is stored in a separate IndexedDB database
// from the app data, so clearAllData() doesn't destroy it

let keyDB = null

async function getKeyDB() {
  if (keyDB) return keyDB

  keyDB = await (await import('idb')).openDB('apollo-keystore', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(ENCRYPTION_KEY_STORE)) {
        db.createObjectStore(ENCRYPTION_KEY_STORE, { keyPath: 'id' })
      }
    }
  })

  return keyDB
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

const STORAGE_KEY = 'apollo-api-key'

export async function saveApiKey(apiKey, mode = 'persistent') {
  switch (mode) {
    case 'persistent': {
      const { ciphertext, iv } = await encryptApiKey(apiKey)
      const db = await initDB()
      await db.put('settings', {
        key: STORAGE_KEY,
        value: {
          ciphertext: Array.from(new Uint8Array(ciphertext)),
          iv: Array.from(iv),
        }
      })
      break
    }
    case 'session': {
      sessionStorage.setItem(STORAGE_KEY, apiKey)
      break
    }
    case 'memory': {
      // Caller is responsible for holding this in React state
      // Nothing to persist
      break
    }
  }
}

export async function loadApiKey(mode = 'persistent') {
  switch (mode) {
    case 'persistent': {
      const db = await initDB()
      const entry = await db.get('settings', STORAGE_KEY)
      if (!entry || !entry.value) return null

      const { ciphertext, iv } = entry.value
      try {
        return await decryptApiKey(
          new Uint8Array(ciphertext).buffer,
          new Uint8Array(iv)
        )
      } catch {
        return null
      }
    }
    case 'session': {
      return sessionStorage.getItem(STORAGE_KEY) || null
    }
    case 'memory': {
      return null
    }
  }
}

export async function deleteApiKey() {
  // Clear from all possible locations
  const db = await initDB()
  try { await db.delete('settings', STORAGE_KEY) } catch {}
  try { sessionStorage.removeItem(STORAGE_KEY) } catch {}
}

// ─── Export Encryption (Passphrase-based) ────────────────

export async function deriveKeyFromPassphrase(passphrase, salt) {
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
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptExport(jsonString, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKeyFromPassphrase(passphrase, salt)

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
    new Uint8Array(salt)
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
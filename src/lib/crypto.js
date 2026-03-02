// API Key Encryption Module
// Uses Web Crypto API exclusively — no external libraries
//
// Storage modes:
//   persistent — encrypted in IndexedDB, survives browser restart
//   session    — sessionStorage, cleared on browser close
//   memory     — React state only, cleared on page refresh

const ENCRYPTION_KEY_NAME = 'apollo-encryption-key'

// Generate a non-extractable AES-GCM 256-bit key
export async function generateEncryptionKey() {
  // TODO: implement using crypto.subtle.generateKey
  // Store in IndexedDB, return the CryptoKey
}

// Retrieve existing key from IndexedDB or generate a new one
export async function getOrCreateEncryptionKey() {
  // TODO: implement
}

// Encrypt a plaintext string (the API key)
// Returns { ciphertext: ArrayBuffer, iv: Uint8Array }
export async function encryptApiKey(plaintext) {
  // TODO: implement using AES-GCM with a fresh IV each time
}

// Decrypt ciphertext back to plaintext string
export async function decryptApiKey(ciphertext, iv) {
  // TODO: implement
}

// ─── Export/Import Encryption ────────────────────────────
// Used for encrypted .apb backup files
// Different from API key encryption — this uses a user passphrase

// Derive an AES-256 key from a passphrase using PBKDF2
export async function deriveKeyFromPassphrase(passphrase, salt) {
  // TODO: implement — 100,000 iterations, SHA-256
}

// Encrypt a JSON payload for export
// Returns { salt, iv, ciphertext, version: 1 }
export async function encryptExport(jsonString, passphrase) {
  // TODO: implement
}

// Decrypt an imported .apb file
// Returns parsed JSON or throws on wrong passphrase
export async function decryptImport(encryptedData, passphrase) {
  // TODO: implement
}
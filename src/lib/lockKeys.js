// Lock Parliament's keys (stage S4, piece 1; research/lock-parliament-design.md;
// C187 to C192, ruled 23 October 2026). Web Crypto only.
//
// One random data key encrypts what the lock seals. It is never stored as it
// is: the lock's record keeps copies of it wrapped (AES-GCM) by keys that only
// their owner can make again:
//   - the passphrase, stretched with PBKDF2-SHA256 at 600,000 rounds;
//   - the recovery code, 120 random bits shown once, through HKDF;
//   - each passkey's PRF bytes, through HKDF (lockPasskey.js gets the bytes).
// Unlocked, the data key is a non-extractable key in this tab's memory only.
// Changing the passphrase, adding a passkey or making a new recovery code
// needs an extractable copy for a moment, opened again by the person.
//
// Pure apart from Web Crypto: no storage, no page. keyStore.js keeps the record.

export const LOCK_VERSION = 1
export const LOCK_ITERATIONS = 600000
// The lock guards everything, not one backup file (C190).
export const PASSPHRASE_MIN = 12
export const IDLE_CHOICES = Object.freeze(['15m', '1h', '8h', 'tab'])
export const IDLE_DEFAULT = '1h'

// Crockford's base 32: no I, L, O or U, so a written code cannot be misread.
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const CODE_BYTES = 15 // 120 bits: 24 characters in six groups of four
const enc = new TextEncoder()
const AAD = {
  wrap: enc.encode('parliament lock: data key v1'),
  check: enc.encode('parliament lock: check v1'),
}
const INFO = {
  recovery: enc.encode('parliament lock: recovery code v1'),
  passkey: enc.encode('parliament lock: passkey v1'),
}
const CHECK_TEXT = 'Parliament lock check'

/** Why an unlock or a change did not happen. code: wrong, short, damaged, version, noPasskey. */
export class LockError extends Error {
  constructor(code, message = code) {
    super(message)
    this.name = 'LockError'
    this.code = code
  }
}

const subtle = () => globalThis.crypto.subtle
const random = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n))
const bytes = (b) => (b instanceof Uint8Array ? b : new Uint8Array(b))

// ── Keys that wrap the data key ─────────────────────────

async function passphraseKek(passphrase, salt, iterations) {
  const base = await subtle().importKey('raw', enc.encode(String(passphrase).normalize('NFKC')), 'PBKDF2', false, ['deriveKey'])
  return subtle().deriveKey({ name: 'PBKDF2', salt: bytes(salt), iterations, hash: 'SHA-256' }, base,
    { name: 'AES-GCM', length: 256 }, false, ['wrapKey', 'unwrapKey'])
}

async function hkdfKek(material, salt, info) {
  const base = await subtle().importKey('raw', bytes(material), 'HKDF', false, ['deriveKey'])
  return subtle().deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: bytes(salt), info }, base,
    { name: 'AES-GCM', length: 256 }, false, ['wrapKey', 'unwrapKey'])
}

async function wrap(kek, dataKey) {
  const iv = random(12)
  const wrapped = new Uint8Array(await subtle().wrapKey('raw', dataKey, kek, { name: 'AES-GCM', iv, additionalData: AAD.wrap }))
  return { iv, wrapped }
}

async function unwrap(kek, { iv, wrapped }, extractable) {
  try {
    return await subtle().unwrapKey('raw', bytes(wrapped), kek, { name: 'AES-GCM', iv: bytes(iv), additionalData: AAD.wrap },
      { name: 'AES-GCM', length: 256 }, extractable, ['encrypt', 'decrypt'])
  } catch {
    // AES-GCM cannot tell a wrong key from a damaged copy: both fail here.
    throw new LockError('wrong')
  }
}

async function sealCheck(dataKey) {
  const iv = random(12)
  const data = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv, additionalData: AAD.check }, dataKey, enc.encode(CHECK_TEXT)))
  return { iv, data }
}

// The data key opened from a wrap is the one that sealed the check, so the
// record is whole; anything else is damage, told apart from a wrong passphrase.
async function verify(record, dataKey) {
  try {
    const plain = await subtle().decrypt({ name: 'AES-GCM', iv: bytes(record.check.iv), additionalData: AAD.check }, dataKey, bytes(record.check.data))
    if (new TextDecoder().decode(plain) !== CHECK_TEXT) throw new Error('mismatch')
  } catch {
    throw new LockError('damaged')
  }
  return dataKey
}

function usable(record) {
  if (!record || typeof record !== 'object' || record.id !== 'lock') throw new LockError('damaged')
  if (record.v !== LOCK_VERSION) throw new LockError('version')
  return record
}

// ── The recovery code ───────────────────────────────────

/** Bytes as the code a person writes down: ABCD-EFGH-…, six groups of four. */
export function formatRecoveryCode(code) {
  let bits = 0
  let value = 0
  let out = ''
  for (const b of bytes(code)) {
    value = (value << 8) | b
    bits += 8
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31]
  return out.match(/.{1,4}/g).join('-')
}

/** The code's bytes from what a person typed, or null. Spaces, dashes and case do not matter; I and L read as 1, O as 0. */
export function parseRecoveryCode(text) {
  const clean = String(text ?? '').toUpperCase().replace(/[\s-]/g, '').replace(/[IL]/g, '1').replace(/O/g, '0')
  if (clean.length !== Math.ceil((CODE_BYTES * 8) / 5) || /[^0-9A-HJKMNP-TV-Z]/.test(clean)) return null
  const out = new Uint8Array(CODE_BYTES)
  let bits = 0
  let value = 0
  let i = 0
  for (const ch of clean) {
    value = (value << 5) | ALPHABET.indexOf(ch)
    bits += 5
    if (bits >= 8) {
      if (i < CODE_BYTES) out[i++] = (value >>> (bits - 8)) & 255
      bits -= 8
    }
  }
  return out
}

async function recoveryWrap(dataKey) {
  const code = random(CODE_BYTES)
  const salt = random(16)
  const w = await wrap(await hkdfKek(code, salt, INFO.recovery), dataKey)
  return { code: formatRecoveryCode(code), recovery: { salt, ...w } }
}

// ── Making, opening and changing the lock ───────────────

/**
 * A new lock: its record, the data key opened for this tab, and the recovery
 * code to show once.
 * @returns {Promise<{ record: object, key: CryptoKey, recoveryCode: string }>}
 */
export async function createLock({ passphrase, idle = IDLE_DEFAULT, iterations = LOCK_ITERATIONS, now = new Date().toISOString() }) {
  if (String(passphrase ?? '').length < PASSPHRASE_MIN) throw new LockError('short')
  const dataKey = await subtle().generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
  const salt = random(16)
  const passphraseWrap = await wrap(await passphraseKek(passphrase, salt, iterations), dataKey)
  const { code, recovery } = await recoveryWrap(dataKey)
  const record = {
    id: 'lock',
    v: LOCK_VERSION,
    createdAt: now,
    idle: IDLE_CHOICES.includes(idle) ? idle : IDLE_DEFAULT,
    passphrase: { salt, iterations, ...passphraseWrap },
    recovery,
    passkeys: [],
    check: await sealCheck(dataKey),
  }
  // This tab's copy cannot be exported; the extractable one goes out of reach.
  const key = await unlockWithRecovery(record, code)
  return { record, key, recoveryCode: code }
}

/** The data key, from the passphrase. Throws LockError('wrong') for a wrong one. */
export async function unlockWithPassphrase(record, passphrase, { extractable = false } = {}) {
  const p = usable(record).passphrase
  return verify(record, await unwrap(await passphraseKek(passphrase, p.salt, p.iterations), p, extractable))
}

/** The data key, from the recovery code as typed. */
export async function unlockWithRecovery(record, typed, { extractable = false } = {}) {
  const code = parseRecoveryCode(typed)
  if (!code) throw new LockError('wrong')
  const r = usable(record).recovery
  return verify(record, await unwrap(await hkdfKek(code, r.salt, INFO.recovery), r, extractable))
}

/** The data key, from the PRF bytes a passkey gave (lockPasskey.js). */
export async function unlockWithPasskey(record, credentialId, prfBytes, { extractable = false } = {}) {
  const id = bytes(credentialId)
  const p = usable(record).passkeys.find((k) => sameBytes(bytes(k.credentialId), id))
  if (!p) throw new LockError('noPasskey')
  return verify(record, await unwrap(await hkdfKek(prfBytes, p.prfSalt, INFO.passkey), p, extractable))
}

/** The record with a passkey added; dataKey must be an extractable copy. */
export async function addPasskey(record, dataKey, { credentialId, prfSalt, prfBytes, now = new Date().toISOString() }) {
  const w = await wrap(await hkdfKek(prfBytes, prfSalt, INFO.passkey), dataKey)
  const id = bytes(credentialId)
  const others = usable(record).passkeys.filter((k) => !sameBytes(bytes(k.credentialId), id))
  return { ...record, passkeys: [...others, { credentialId: id, prfSalt: bytes(prfSalt), ...w, addedAt: now }] }
}

/** The record without a passkey. The passphrase and recovery code always remain. */
export function removePasskey(record, credentialId) {
  const id = bytes(credentialId)
  return { ...usable(record), passkeys: record.passkeys.filter((k) => !sameBytes(bytes(k.credentialId), id)) }
}

/** The record with a new passphrase; dataKey must be an extractable copy. */
export async function changePassphrase(record, dataKey, passphrase, { iterations = LOCK_ITERATIONS } = {}) {
  if (String(passphrase ?? '').length < PASSPHRASE_MIN) throw new LockError('short')
  const salt = random(16)
  const w = await wrap(await passphraseKek(passphrase, salt, iterations), dataKey)
  return { ...usable(record), passphrase: { salt, iterations, ...w } }
}

/** A new recovery code, the old one no longer opening the lock; dataKey must be an extractable copy. */
export async function renewRecoveryCode(record, dataKey) {
  const { code, recovery } = await recoveryWrap(dataKey)
  return { record: { ...usable(record), recovery }, recoveryCode: code }
}

/** The record with a new idle time. */
export function setIdle(record, idle) {
  return { ...usable(record), idle: IDLE_CHOICES.includes(idle) ? idle : IDLE_DEFAULT }
}

function sameBytes(a, b) {
  return a.length === b.length && a.every((x, i) => x === b[i])
}

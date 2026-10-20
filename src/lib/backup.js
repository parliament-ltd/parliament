// V2 Backup & Restore — `.parliament` file format.
//
// Spec: refactor/parliament_backup_restore_implementation.md
//
// File shape (unencrypted):
//   { format: "parliament-backup", version: 2, createdAt, parliamentVersion,
//     source, encrypted: false, contents: { ... }, manifest: { ... } }
//
// File shape (encrypted):
//   { format, version, createdAt, parliamentVersion, encrypted: true,
//     encryption: { algorithm: "AES-GCM", kdf: "PBKDF2-SHA256",
//                   iterations: 210000, salt, iv },
//     manifest, payload: base64(AES-GCM-encrypt(gzip(JSON.stringify(contents)))) }
//
// Unencrypted backups embed `contents` as a plain JSON object so they're
// inspectable in a text editor (per spec §10 testing checklist).
//
// Legacy V1 `.apb` files (encrypted with PBKDF2 100k, flat-store payload)
// are auto-migrated by the import path. V1 plaintext `.json` exports are
// also accepted.

import { initDB, getStorageEstimate } from './db'
import {
  deriveKeyFromPassphrase,
  decryptImport,
  PBKDF2_ITERATIONS_V2,
} from './crypto'
import { gatherContents, restoreInto, CATEGORIES } from './backupData'
import { backupReminderDue } from './backupReminder'
import { isStorageKept } from './storageKeep'
import {
  BACKUP_FORMAT, BACKUP_VERSION, MAX_KDF_ITERATIONS,
  bytesToBase64, base64ToBytes, arrayBufferToBase64, base64ToArrayBuffer,
  flatV1ToContents, liftToCurrent,
} from './backupFormat'

// The file format itself (parsing, older exports, validation) lives in
// backupFormat.js. Re-exported so callers keep importing from here.
export {
  BACKUP_FORMAT, BACKUP_VERSION, parseBackupFile, flatV1ToContents,
  contentsToFlatStores, validateContents,
} from './backupFormat'

const PARLIAMENT_VERSION = '0.5.0'

// Every category a backup can hold (backupData.js). The "preferences"
// category is off by default in the UI; the rest are on. Order here also
// drives display order in the modal.
export { CATEGORIES }

// ─── Compression (native CompressionStream) ──────────────

async function gzipString(text) {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))
  const buf = await new Response(stream).arrayBuffer()
  return new Uint8Array(buf)
}

async function gunzipToString(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
  const buf = await new Response(stream).arrayBuffer()
  return new TextDecoder().decode(buf)
}


// ─── Browser fingerprint (non-tracking) ──────────────────
// Stored in IndexedDB on first backup so we can show "From: This browser"
// in the restore preview. Hash-based, no userAgent leak.

async function getBrowserFingerprint(db = null) {
  db = db || await initDB()
  const existing = await db.get('settings', 'browserFingerprint')
  if (existing && existing.value) return existing.value
  const random = crypto.getRandomValues(new Uint8Array(8))
  const hex = Array.from(random).map((b) => b.toString(16).padStart(2, '0')).join('')
  await db.put('settings', { key: 'browserFingerprint', value: hex })
  return hex
}

// ─── Data gathering ──────────────────────────────────────

/**
 * Format 2 contents for the categories asked for, built from the allowlist
 * (backupData.js, backupSchema.js): known fields only, allowed settings only,
 * never the saved key. Each category stands alone.
 */
export async function gatherBackupContents(categories = CATEGORIES, db = null) {
  return gatherContents(db || await initDB(), categories)
}

// ─── Manifest + counts ───────────────────────────────────

export function buildManifest(contents) {
  const counts = {
    chats: contents.chats?.length || 0,
    rooms: contents.rooms?.length || 0,
    homepage: contents.homepage ? 1 : 0,
    notes: contents.annotations?.notes?.length || 0,
    highlights: contents.annotations?.highlights?.length || 0,
    favorites: contents.annotations?.favorites?.length || 0,
    pins: contents.annotations?.pins?.length || 0,
    layoutsInstalled: contents.library?.layouts?.length || 0,
    componentsInstalled: contents.library?.components?.length || 0,
    schemesInstalled: contents.library?.schemes?.length || 0,
  }
  const sizeBeforeCompression = JSON.stringify(contents).length
  return { counts, sizeBeforeCompression }
}

// ─── Filename ────────────────────────────────────────────

export async function buildFilename({ encrypted = false, date = new Date(), db = null } = {}) {
  const isoDate = date.toISOString().slice(0, 10)
  const enc = encrypted ? '-encrypted' : ''
  // De-dup against any backup already created today by counting same-prefix
  // entries in the metadata log. The user gets a -2, -3, etc. suffix.
  const base = `parliament-backup-${isoDate}${enc}`
  const log = (await getBackupLog(db)) || []
  const same = log.filter((e) => (e.filename || '').startsWith(base))
  const suffix = same.length === 0 ? '' : `-${same.length + 1}`
  return `${base}${suffix}.parliament`
}

// ─── Build backup file ───────────────────────────────────

/**
 * Build a downloadable .parliament file. Returns a Blob and a suggested
 * filename. Encrypted backups gzip+encrypt the contents into a base64
 * payload; unencrypted backups embed contents as plain JSON.
 */
export async function buildBackupFile({ contents, password = null, db = null }) {
  const manifest = buildManifest(contents)
  const fingerprint = await getBrowserFingerprint(db)
  const createdAt = new Date().toISOString()

  let envelope
  if (password) {
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const key = await deriveKeyFromPassphrase(password, salt, PBKDF2_ITERATIONS_V2)
    const compressed = await gzipString(JSON.stringify(contents))
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      compressed
    )
    envelope = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      createdAt,
      parliamentVersion: PARLIAMENT_VERSION,
      source: { browserFingerprint: fingerprint },
      encrypted: true,
      encryption: {
        algorithm: 'AES-GCM',
        kdf: 'PBKDF2-SHA256',
        iterations: PBKDF2_ITERATIONS_V2,
        salt: bytesToBase64(salt),
        iv: bytesToBase64(iv),
      },
      manifest,
      payload: arrayBufferToBase64(ciphertext),
    }
  } else {
    envelope = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      createdAt,
      parliamentVersion: PARLIAMENT_VERSION,
      source: { browserFingerprint: fingerprint },
      encrypted: false,
      manifest,
      contents,
    }
  }

  const json = JSON.stringify(envelope, null, password ? 0 : 2)
  const filename = await buildFilename({ encrypted: !!password, db })
  const blob = new Blob([json], { type: 'application/json' })
  return { blob, filename, manifest, createdAt }
}

/** Trigger a browser download for the given Blob. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Defer revoke so Safari has time to read the blob
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function decryptBackup(parsed, password = null) {
  const contents = await readContents(parsed, password)
  return liftToCurrent(parsed, contents)
}

async function readContents(parsed, password) {
  if (parsed.kind === 'v2') {
    const env = parsed.envelope
    if (!env.encrypted) return env.contents
    if (!password) throw new Error('Password required.')
    const { encryption, payload } = env
    const salt = base64ToBytes(encryption.salt)
    const iv = base64ToBytes(encryption.iv)
    const iterations = encryption.iterations || PBKDF2_ITERATIONS_V2
    // A file asking for more stretching than this could hold the tab for
    // minutes (audit T6), so it is not opened.
    if (!Number.isInteger(iterations) || iterations < 1 || iterations > MAX_KDF_ITERATIONS) {
      throw new Error('This backup asks for an unusual amount of work to unlock, so it was not opened.')
    }
    const key = await deriveKeyFromPassphrase(password, salt, iterations)
    let plain
    try {
      plain = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        base64ToArrayBuffer(payload)
      )
    } catch {
      throw new Error('Incorrect password. Try again.')
    }
    let jsonText
    try {
      jsonText = await gunzipToString(new Uint8Array(plain))
    } catch {
      throw new Error('Backup payload is corrupt.')
    }
    return JSON.parse(jsonText)
  }

  if (parsed.kind === 'v1-apb') {
    if (!password) throw new Error('Password required.')
    const flat = await decryptImport(parsed.envelope, password)
    return flatV1ToContents(flat)
  }

  if (parsed.kind === 'v1-json') {
    return flatV1ToContents(parsed.envelope)
  }

  throw new Error('Unsupported backup format.')
}

// ─── Restore ─────────────────────────────────────────────

/**
 * Apply a backup's contents to IndexedDB, in one transaction (backupData.js).
 *
 * strategy 'merge': an item already here with the same content is
 *   skipped; one with the same id and different content comes in as a copy
 *   under a new id, with every reference rewritten (restorePlan.js).
 *
 * strategy 'replace': everything is cleared first, except this browser's
 *   fingerprint, its backup log and the saved key, then the backup is
 *   written. Caller is responsible for the destructive-confirmation UX
 *   (REPLACE typed, etc.).
 *
 * Returns a summary of what was added, copied, skipped and left out.
 */
export async function restoreContents(contents, { strategy = 'merge' } = {}) {
  return restoreInto(await initDB(), contents, { strategy })
}

// ─── Backup metadata + status ────────────────────────────

const BACKUP_LOG_KEY = 'backupLog'
const BANNER_DISMISSED_KEY = 'backupBannerDismissedAt'

export async function getBackupLog(db = null) {
  db = db || await initDB()
  const entry = await db.get('settings', BACKUP_LOG_KEY)
  return entry?.value || []
}

export async function recordBackup({ filename, size, encrypted, categories, manifest }) {
  const db = await initDB()
  const log = (await getBackupLog()) || []
  log.push({
    backedUpAt: new Date().toISOString(),
    filename,
    size,
    encrypted: !!encrypted,
    categories,
    counts: manifest?.counts || null,
  })
  // Keep last 20 entries to bound storage
  const trimmed = log.slice(-20)
  await db.put('settings', { key: BACKUP_LOG_KEY, value: trimmed })
  // Hide the proactive banner immediately on success
  await db.put('settings', {
    key: BANNER_DISMISSED_KEY,
    value: new Date().toISOString(),
  })
}

/**
 * Status summary for the top-bar indicator and modal footer.
 *   color: 'gold' | 'amber' | 'red'
 *   - gold:  < 14 days OR never backed up but account < 7 days old
 *   - amber: 14–44 days OR never backed up
 *   - red:   45+ days
 */
export async function getBackupStatus() {
  const log = await getBackupLog()
  const last = log.length ? log[log.length - 1] : null
  const accountCreatedAt = await getOrInitAccountCreatedAt()
  const accountAgeDays = daysBetween(accountCreatedAt, new Date())

  if (!last) {
    return {
      lastBackedUpAt: null,
      daysSinceLast: null,
      color: accountAgeDays < 7 ? 'gold' : 'amber',
      label: 'Never backed up',
      browserFingerprint: await getBrowserFingerprint(),
    }
  }

  const days = daysBetween(last.backedUpAt, new Date())
  let color = 'gold'
  if (days >= 45) color = 'red'
  else if (days >= 14) color = 'amber'

  return {
    lastBackedUpAt: last.backedUpAt,
    daysSinceLast: days,
    color,
    label: days === 0
      ? 'Backed up today'
      : days === 1
        ? 'Backed up yesterday'
        : `Backed up ${days} days ago`,
    browserFingerprint: await getBrowserFingerprint(),
  }
}

// ─── Reminder banner threshold logic ─────────────────────

/**
 * Whether the reminder shows, and whether the data is at risk because the
 * browser has not agreed to keep it (backupReminder.js: spec §5.1, pushed
 * harder when at risk, C94).
 */
export async function backupReminderState() {
  const db = await initDB()
  const dismissed = await db.get('settings', BANNER_DISMISSED_KEY)
  const status = await getBackupStatus()
  return backupReminderDue({
    chatCount: await db.count('conversations'),
    roomCount: (await db.getAllFromIndex('modes', 'scope', 'room')).length,
    accountAgeDays: daysBetween(await getOrInitAccountCreatedAt(), new Date()),
    daysSinceLast: status.daysSinceLast,
    daysSinceDismissed: dismissed?.value ? daysBetween(dismissed.value, new Date()) : null,
    storageKept: await isStorageKept(),
  })
}

export async function shouldShowBackupBanner() {
  return (await backupReminderState()).show
}

export async function dismissBackupBanner() {
  const db = await initDB()
  await db.put('settings', {
    key: BANNER_DISMISSED_KEY,
    value: new Date().toISOString(),
  })
}

// ─── Account age ─────────────────────────────────────────

const ACCOUNT_CREATED_KEY = 'accountCreatedAt'

async function getOrInitAccountCreatedAt() {
  const db = await initDB()
  const existing = await db.get('settings', ACCOUNT_CREATED_KEY)
  if (existing?.value) return existing.value
  // First time we asked — try to anchor on the oldest conversation; if
  // there are none, anchor at "now".
  const all = await db.getAll('conversations')
  let anchor = new Date().toISOString()
  if (all.length) {
    const oldest = all.reduce((a, b) =>
      new Date(a.createdAt) < new Date(b.createdAt) ? a : b
    )
    anchor = oldest.createdAt
  }
  await db.put('settings', { key: ACCOUNT_CREATED_KEY, value: anchor })
  return anchor
}

function daysBetween(fromIso, toDate) {
  const from = typeof fromIso === 'string' ? new Date(fromIso) : fromIso
  const to = toDate
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
}

// ─── Public size estimate (for the modal "Everything" stats) ────

export async function getBackupStats() {
  const db = await initDB()
  const [chats, rooms, layouts, components, schemes, libraryRooms, libraryResources] = await Promise.all([
    db.count('conversations'),
    db.getAllFromIndex('modes', 'scope', 'room').then((m) => m.length),
    db.count('libraryLayouts'),
    db.count('libraryComponents'),
    db.count('librarySchemes'),
    db.count('libraryRooms'),
    db.count('libraryResources'),
  ])
  const storage = await getStorageEstimate()
  return {
    chats,
    rooms,
    libraryItems: layouts + components + schemes + libraryRooms + libraryResources,
    storageUsed: storage.usage || 0,
  }
}

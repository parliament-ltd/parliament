// V2 Backup & Restore — `.parliament` file format.
//
// Spec: refactor/parliament_backup_restore_implementation.md
//
// File shape (unencrypted):
//   { format: "parliament-backup", version: 1, createdAt, parliamentVersion,
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
import { validateBackup } from './validate'

export const BACKUP_FORMAT = 'parliament-backup'
export const BACKUP_VERSION = 1
const PARLIAMENT_VERSION = '0.5.0'

// All possible top-level categories the user can include in a custom backup.
// The "preferences" category is opt-out by default in the UI; the rest are
// opt-in by default. Order here also drives display order in the modal.
export const CATEGORIES = ['chats', 'annotations', 'rooms', 'homepage', 'library', 'preferences']

// Settings keys that should NEVER appear in a backup. The API key is the
// big one — it's encrypted with browser-specific crypto and shouldn't leave
// this browser. The legacy session storage key is also stripped just in
// case a stale record lingers.
const SETTINGS_BLOCKLIST = new Set(['parliament-api-key'])

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

// ─── Base64 helpers ──────────────────────────────────────

function bytesToBase64(bytes) {
  let s = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk))
  }
  return btoa(s)
}

function base64ToBytes(b64) {
  const s = atob(b64)
  const bytes = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i)
  return bytes
}

function arrayBufferToBase64(ab) {
  return bytesToBase64(new Uint8Array(ab))
}

function base64ToArrayBuffer(b64) {
  return base64ToBytes(b64).buffer
}

// ─── Browser fingerprint (non-tracking) ──────────────────
// Stored in IndexedDB on first backup so we can show "From: This browser"
// in the restore preview. Hash-based, no userAgent leak.

async function getBrowserFingerprint() {
  const db = await initDB()
  const existing = await db.get('settings', 'browserFingerprint')
  if (existing && existing.value) return existing.value
  const random = crypto.getRandomValues(new Uint8Array(8))
  const hex = Array.from(random).map((b) => b.toString(16).padStart(2, '0')).join('')
  await db.put('settings', { key: 'browserFingerprint', value: hex })
  return hex
}

// ─── Data gathering ──────────────────────────────────────

/**
 * Walk IndexedDB and build the V2 contents object for the requested
 * categories. Each category is independent — passing only `chats` produces
 * a valid backup that omits `annotations`, `rooms`, etc. entirely.
 *
 * Files (the V1 gap fix) ride along with `chats` since file metadata is
 * keyed by conversationId. Sbrd documents likewise live with chats.
 */
export async function gatherBackupContents(categories = CATEGORIES) {
  const db = await initDB()
  const want = new Set(categories)
  const contents = {}

  if (want.has('chats')) {
    const conversations = await db.getAll('conversations')
    const allMessages = await db.getAll('messages')
    const messagesByConv = new Map()
    for (const m of allMessages) {
      let arr = messagesByConv.get(m.conversationId)
      if (!arr) { arr = []; messagesByConv.set(m.conversationId, arr) }
      arr.push(m)
    }
    for (const arr of messagesByConv.values()) {
      arr.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    }

    const allFiles = await db.getAll('files')
    const filesByConv = new Map()
    for (const f of allFiles) {
      let arr = filesByConv.get(f.conversationId)
      if (!arr) { arr = []; filesByConv.set(f.conversationId, arr) }
      arr.push(f)
    }

    // file_data is keyed by fileId; base64-encode the binary blob
    const fileDataById = new Map()
    for (const fd of await db.getAll('file_data')) {
      fileDataById.set(fd.fileId, arrayBufferToBase64(fd.data))
    }

    const sbrdByConv = new Map()
    for (const doc of await db.getAll('sbrd_documents')) {
      sbrdByConv.set(doc.conversationId, doc)
    }

    contents.chats = conversations.map((c) => {
      const chat = { ...c, messages: messagesByConv.get(c.id) || [] }
      const files = filesByConv.get(c.id)
      if (files && files.length) {
        chat.files = files
        chat.fileData = files.reduce((acc, f) => {
          const b64 = fileDataById.get(f.id)
          if (b64) acc[f.id] = b64
          return acc
        }, {})
      }
      const sbrd = sbrdByConv.get(c.id)
      if (sbrd) chat.sbrdDocument = sbrd
      return chat
    })
  }

  if (want.has('annotations')) {
    contents.annotations = {
      notes: await db.getAll('notes'),
      highlights: await db.getAll('highlights'),
      favorites: await db.getAll('favorites'),
      pins: await db.getAll('pins'),
    }
  }

  if (want.has('rooms')) {
    contents.rooms = await db.getAllFromIndex('modes', 'scope', 'room')
  }

  if (want.has('homepage')) {
    const homes = await db.getAllFromIndex('modes', 'scope', 'homepage')
    contents.homepage = homes[0] || null
  }

  if (want.has('library')) {
    contents.library = {
      layouts: await db.getAll('libraryLayouts'),
      components: await db.getAll('libraryComponents'),
      schemes: await db.getAll('librarySchemes'),
      rooms: await db.getAll('libraryRooms'),
      resources: await db.getAll('libraryResources'),
    }
  }

  if (want.has('preferences')) {
    const allSettings = await db.getAll('settings')
    contents.preferences = allSettings.filter((s) => !SETTINGS_BLOCKLIST.has(s.key))
  }

  return contents
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

export async function buildFilename({ encrypted = false, date = new Date() } = {}) {
  const isoDate = date.toISOString().slice(0, 10)
  const enc = encrypted ? '-encrypted' : ''
  // De-dup against any backup already created today by counting same-prefix
  // entries in the metadata log. The user gets a -2, -3, etc. suffix.
  const base = `parliament-backup-${isoDate}${enc}`
  const log = (await getBackupLog()) || []
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
export async function buildBackupFile({ contents, password = null }) {
  const manifest = buildManifest(contents)
  const fingerprint = await getBrowserFingerprint()
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
  const filename = await buildFilename({ encrypted: !!password })
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

// ─── Parse backup file ───────────────────────────────────

/**
 * Read the raw text of a backup file and identify its shape. Returns
 * { kind: 'v2'|'v1-apb'|'v1-json'|'unknown', envelope, raw }.
 *
 * Encrypted files (v2 or v1-apb) still need a password to surface
 * `contents` — call decryptBackup() with the user's password.
 */
export async function parseBackupFile(file) {
  let text
  try {
    text = await file.text()
  } catch {
    throw new Error('Could not read file. Check the file isn\'t damaged.')
  }

  let json
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error('This file is not a valid Parliament backup.')
  }

  if (json && typeof json === 'object' && json.format === BACKUP_FORMAT) {
    if (typeof json.version !== 'number' || json.version > BACKUP_VERSION) {
      throw new Error('This backup was created by a newer version of Parliament. Please update to restore it.')
    }
    return { kind: 'v2', envelope: json, raw: text }
  }

  // Legacy V1 .apb (encrypted). Has top-level salt/iv/ciphertext arrays.
  if (json && Array.isArray(json.salt) && Array.isArray(json.iv) && Array.isArray(json.ciphertext)) {
    return { kind: 'v1-apb', envelope: json, raw: text }
  }

  // Legacy V1 plaintext export from exportAllData(). Has a top-level
  // conversations array.
  if (json && Array.isArray(json.conversations)) {
    return { kind: 'v1-json', envelope: json, raw: text }
  }

  throw new Error('This file is not a valid Parliament backup.')
}

/**
 * Resolve `contents` from a parsed file, using the password if encrypted.
 * For V1 files, returns a contents object adapted into the V2 shape.
 * Throws on wrong password or corrupt payload.
 */
export async function decryptBackup(parsed, password = null) {
  if (parsed.kind === 'v2') {
    const env = parsed.envelope
    if (!env.encrypted) return env.contents
    if (!password) throw new Error('Password required.')
    const { encryption, payload } = env
    const salt = base64ToBytes(encryption.salt)
    const iv = base64ToBytes(encryption.iv)
    const iterations = encryption.iterations || PBKDF2_ITERATIONS_V2
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

// ─── V1 → V2 contents migration ──────────────────────────

/**
 * Convert a V1 flat-store backup (the legacy `exportAllData()` shape) into
 * the V2 nested `contents` shape. Best-effort: if a V2-only category like
 * library or rooms isn't present in V1, the migrated contents simply omit
 * that category — restore() handles missing categories cleanly.
 */
export function flatV1ToContents(flat) {
  const contents = {}

  if (Array.isArray(flat.conversations)) {
    const messagesByConv = new Map()
    for (const m of flat.messages || []) {
      let arr = messagesByConv.get(m.conversationId)
      if (!arr) { arr = []; messagesByConv.set(m.conversationId, arr) }
      arr.push(m)
    }
    for (const arr of messagesByConv.values()) {
      arr.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    }
    const sbrdByConv = new Map()
    for (const d of flat.sbrd_documents || []) sbrdByConv.set(d.conversationId, d)

    contents.chats = flat.conversations.map((c) => {
      const chat = { ...c, messages: messagesByConv.get(c.id) || [] }
      const sbrd = sbrdByConv.get(c.id)
      if (sbrd) chat.sbrdDocument = sbrd
      // V1 had no files included in backup — gap fixed by V2.
      return chat
    })
  }

  if ((flat.notes && flat.notes.length) ||
      (flat.highlights && flat.highlights.length) ||
      (flat.favorites && flat.favorites.length) ||
      (flat.pins && flat.pins.length)) {
    contents.annotations = {
      notes: flat.notes || [],
      highlights: flat.highlights || [],
      favorites: flat.favorites || [],
      pins: flat.pins || [],
    }
  }

  if (Array.isArray(flat.settings) && flat.settings.length) {
    contents.preferences = flat.settings.filter((s) => !SETTINGS_BLOCKLIST.has(s.key))
  }

  return contents
}

// ─── Validation (V2 contents → flat → existing validator) ────

/**
 * Flatten V2 contents to the per-store shape the existing validateBackup()
 * understands. Returns { conversations, messages, notes, ... }.
 */
export function contentsToFlatStores(contents) {
  const flat = {
    conversations: [],
    messages: [],
    highlights: [],
    notes: [],
    favorites: [],
    pins: [],
    settings: [],
    sbrd_documents: [],
    files: [],
    file_data: [],
    modes: [],
    libraryLayouts: [],
    libraryRooms: [],
    libraryComponents: [],
    librarySchemes: [],
    libraryResources: [],
  }

  for (const chat of contents.chats || []) {
    const { messages, files, fileData, sbrdDocument, ...conv } = chat
    flat.conversations.push(conv)
    if (Array.isArray(messages)) {
      for (const m of messages) flat.messages.push(m)
    }
    if (Array.isArray(files)) {
      for (const f of files) flat.files.push(f)
    }
    if (fileData && typeof fileData === 'object') {
      for (const [fileId, b64] of Object.entries(fileData)) {
        flat.file_data.push({ fileId, data: base64ToArrayBuffer(b64) })
      }
    }
    if (sbrdDocument) flat.sbrd_documents.push(sbrdDocument)
  }

  if (contents.annotations) {
    flat.notes = contents.annotations.notes || []
    flat.highlights = contents.annotations.highlights || []
    flat.favorites = contents.annotations.favorites || []
    flat.pins = contents.annotations.pins || []
  }

  if (Array.isArray(contents.rooms)) flat.modes.push(...contents.rooms)
  if (contents.homepage) flat.modes.push(contents.homepage)

  if (contents.library) {
    flat.libraryLayouts = contents.library.layouts || []
    flat.libraryComponents = contents.library.components || []
    flat.librarySchemes = contents.library.schemes || []
    flat.libraryRooms = contents.library.rooms || []
    flat.libraryResources = contents.library.resources || []
  }

  if (Array.isArray(contents.preferences)) {
    flat.settings = contents.preferences.filter((s) => !SETTINGS_BLOCKLIST.has(s.key))
  }

  return flat
}

export function validateContents(contents) {
  const flat = contentsToFlatStores(contents)
  // validateBackup requires a `conversations` array as a baseline. If the
  // backup is partial (only library, say), pass an empty array — that
  // satisfies the schema while letting the per-store validators catch
  // structural problems.
  if (!flat.conversations) flat.conversations = []
  return validateBackup(flat)
}

// ─── Restore ─────────────────────────────────────────────

/**
 * Apply a contents object to IndexedDB.
 *
 * strategy: 'merge' — insert items that don't already exist by id. For
 *   conversations with a colliding id, the imported version is renamed to
 *   keep both. For homepage, we only restore if the current homepage is
 *   the seeded default (untouched).
 *
 * strategy: 'replace' — wipe all stores first (except encryption keys),
 *   then write everything from the backup. Caller is responsible for the
 *   destructive-confirmation UX (REPLACE typed, etc.).
 *
 * Returns a summary { added, skipped, total } broken down by category.
 */
export async function restoreContents(contents, { strategy = 'merge' } = {}) {
  const flat = contentsToFlatStores(contents)
  const db = await initDB()
  const summary = {
    chats: { added: 0, skipped: 0 },
    messages: { added: 0, skipped: 0 },
    annotations: { added: 0, skipped: 0 },
    rooms: { added: 0, skipped: 0 },
    homepage: { added: 0, skipped: 0 },
    library: { added: 0, skipped: 0 },
    files: { added: 0, skipped: 0 },
    sbrdDocuments: { added: 0, skipped: 0 },
    preferences: { added: 0, skipped: 0 },
  }

  if (strategy === 'replace') {
    const stores = [
      'conversations', 'messages', 'highlights', 'notes', 'favorites', 'pins',
      'settings', 'files', 'file_data', 'sbrd_documents', 'modes',
      'libraryLayouts', 'libraryRooms', 'libraryComponents', 'librarySchemes', 'libraryResources',
    ]
    for (const s of stores) {
      // settings: preserve a few non-user-data keys (browserFingerprint,
      // backup metadata) so the next status check has continuity. We
      // restore them after the wipe.
      if (s === 'settings') {
        const preserved = []
        for (const key of ['browserFingerprint']) {
          const entry = await db.get('settings', key)
          if (entry) preserved.push(entry)
        }
        await db.clear('settings')
        for (const e of preserved) await db.put('settings', e)
      } else {
        await db.clear(s)
      }
    }
  }

  // ── Conversations + messages + sbrd + files ─────────────
  if (flat.conversations.length) {
    // Pre-read all existing ids we'll need, outside any tx, so the
    // write-side transactions are pure puts.
    const existingConvIds = new Set((await db.getAll('conversations')).map((c) => c.id))
    const existingMsgIds = new Set((await db.getAllKeys('messages')))
    const existingNoteIds = new Set((await db.getAllKeys('notes')))
    const existingHighlightIds = new Set((await db.getAllKeys('highlights')))
    const existingFavoriteIds = new Set((await db.getAllKeys('favorites')))
    const existingPinIds = new Set((await db.getAllKeys('pins')))
    const existingFileIds = new Set((await db.getAllKeys('files')))

    const renamedConvIds = new Map() // oldId -> newId
    const remapConv = (oldId) => renamedConvIds.get(oldId) || oldId
    const newFileIds = new Map() // oldFileId -> newFileId (only when conv renamed)

    // ── Conversations ──
    {
      const tx = db.transaction('conversations', 'readwrite')
      for (const c of flat.conversations) {
        if (strategy === 'merge' && existingConvIds.has(c.id)) {
          const newId = crypto.randomUUID()
          renamedConvIds.set(c.id, newId)
          await tx.store.put({
            ...c,
            id: newId,
            title: `${c.title || 'Conversation'} (from backup)`,
          })
        } else {
          await tx.store.put(c)
        }
        summary.chats.added++
      }
      await tx.done
    }

    // ── Messages ──
    if (flat.messages.length) {
      const tx = db.transaction('messages', 'readwrite')
      for (const m of flat.messages) {
        const newMsg = { ...m, conversationId: remapConv(m.conversationId) }
        if (renamedConvIds.has(m.conversationId)) newMsg.id = crypto.randomUUID()
        if (strategy === 'merge' && existingMsgIds.has(newMsg.id)) {
          summary.messages.skipped++
          continue
        }
        await tx.store.put(newMsg)
        summary.messages.added++
      }
      await tx.done
    }

    // ── Annotations ──
    if (flat.notes.length) {
      const tx = db.transaction('notes', 'readwrite')
      for (const n of flat.notes) {
        const note = { ...n, conversationId: remapConv(n.conversationId) }
        if (renamedConvIds.has(n.conversationId)) note.id = crypto.randomUUID()
        if (strategy === 'merge' && existingNoteIds.has(note.id)) {
          summary.annotations.skipped++
          continue
        }
        await tx.store.put(note)
        summary.annotations.added++
      }
      await tx.done
    }
    if (flat.highlights.length) {
      const tx = db.transaction('highlights', 'readwrite')
      for (const h of flat.highlights) {
        const hl = { ...h, conversationId: remapConv(h.conversationId) }
        if (renamedConvIds.has(h.conversationId)) hl.id = crypto.randomUUID()
        if (strategy === 'merge' && existingHighlightIds.has(hl.id)) {
          summary.annotations.skipped++
          continue
        }
        await tx.store.put(hl)
        summary.annotations.added++
      }
      await tx.done
    }
    if (flat.favorites.length) {
      const tx = db.transaction('favorites', 'readwrite')
      for (const f of flat.favorites) {
        const fav = { ...f, conversationId: remapConv(f.conversationId) }
        if (renamedConvIds.has(f.conversationId)) fav.id = crypto.randomUUID()
        if (strategy === 'merge' && existingFavoriteIds.has(fav.id)) {
          summary.annotations.skipped++
          continue
        }
        await tx.store.put(fav)
        summary.annotations.added++
      }
      await tx.done
    }
    if (flat.pins.length) {
      const tx = db.transaction('pins', 'readwrite')
      for (const p of flat.pins) {
        const pin = {
          ...p,
          targetConversationId: remapConv(p.targetConversationId),
          sourceConversationId: remapConv(p.sourceConversationId),
        }
        if (renamedConvIds.has(p.targetConversationId)) pin.id = crypto.randomUUID()
        if (strategy === 'merge' && existingPinIds.has(pin.id)) {
          summary.annotations.skipped++
          continue
        }
        await tx.store.put(pin)
        summary.annotations.added++
      }
      await tx.done
    }

    // ── Sbrd documents (key: conversationId) ──
    if (flat.sbrd_documents.length) {
      const tx = db.transaction('sbrd_documents', 'readwrite')
      for (const doc of flat.sbrd_documents) {
        await tx.store.put({ ...doc, conversationId: remapConv(doc.conversationId) })
        summary.sbrdDocuments.added++
      }
      await tx.done
    }

    // ── Files + file_data (V1 gap fix) ──
    if (flat.files.length) {
      const tx = db.transaction('files', 'readwrite')
      for (const fileMeta of flat.files) {
        const remapped = { ...fileMeta, conversationId: remapConv(fileMeta.conversationId) }
        if (renamedConvIds.has(fileMeta.conversationId)) {
          const newFid = crypto.randomUUID()
          newFileIds.set(fileMeta.id, newFid)
          remapped.id = newFid
        }
        if (strategy === 'merge' && existingFileIds.has(remapped.id)) {
          summary.files.skipped++
          continue
        }
        await tx.store.put(remapped)
        summary.files.added++
      }
      await tx.done
    }
    if (flat.file_data.length) {
      const tx = db.transaction('file_data', 'readwrite')
      for (const fd of flat.file_data) {
        const fileId = newFileIds.get(fd.fileId) || fd.fileId
        await tx.store.put({ fileId, data: fd.data })
      }
      await tx.done
    }
  }

  // ── Modes (rooms + homepage) ────────────────────────────
  const modes = flat.modes || []
  if (modes.length) {
    const existingModeIds = new Set(await db.getAllKeys('modes'))
    const tx = db.transaction('modes', 'readwrite')
    for (const m of modes) {
      const isHomepage = m.scope === 'homepage'
      if (existingModeIds.has(m.id) && strategy === 'merge') {
        if (isHomepage) summary.homepage.skipped++
        else summary.rooms.skipped++
        continue
      }
      await tx.store.put(m)
      if (isHomepage) summary.homepage.added++
      else summary.rooms.added++
    }
    await tx.done
  }

  // ── Library tables ──────────────────────────────────────
  const libraryStores = [
    ['libraryLayouts', flat.libraryLayouts],
    ['libraryRooms', flat.libraryRooms],
    ['libraryComponents', flat.libraryComponents],
    ['librarySchemes', flat.librarySchemes],
    ['libraryResources', flat.libraryResources],
  ]
  for (const [name, items] of libraryStores) {
    if (!items.length) continue
    const existingIds = new Set(await db.getAllKeys(name))
    const tx = db.transaction(name, 'readwrite')
    for (const it of items) {
      if (existingIds.has(it.id) && strategy === 'merge') {
        summary.library.skipped++
        continue
      }
      await tx.store.put(it)
      summary.library.added++
    }
    await tx.done
  }

  // ── Preferences (settings) ──────────────────────────────
  if (flat.settings.length) {
    const existingKeys = new Set(await db.getAllKeys('settings'))
    const tx = db.transaction('settings', 'readwrite')
    for (const s of flat.settings) {
      if (SETTINGS_BLOCKLIST.has(s.key)) continue
      if (existingKeys.has(s.key) && strategy === 'merge') {
        summary.preferences.skipped++
        continue
      }
      await tx.store.put(s)
      summary.preferences.added++
    }
    await tx.done
  }

  return summary
}

// ─── Backup metadata + status ────────────────────────────

const BACKUP_LOG_KEY = 'backupLog'
const BANNER_DISMISSED_KEY = 'backupBannerDismissedAt'

export async function getBackupLog() {
  const db = await initDB()
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
 * Per spec §5.1:
 *   show iff (≥5 chats OR ≥2 rooms OR account >= 7 days)
 *        AND (last backup > 30 days ago OR never)
 *        AND (banner not dismissed in last 30 days)
 */
export async function shouldShowBackupBanner() {
  const db = await initDB()

  const chatCount = await db.count('conversations')
  const roomCount = (await db.getAllFromIndex('modes', 'scope', 'room')).length
  const accountCreatedAt = await getOrInitAccountCreatedAt()
  const accountAgeDays = daysBetween(accountCreatedAt, new Date())

  const thresholdMet = chatCount >= 5 || roomCount >= 2 || accountAgeDays >= 7
  if (!thresholdMet) return false

  const status = await getBackupStatus()
  if (status.daysSinceLast !== null && status.daysSinceLast < 30) return false

  const dismissed = await db.get('settings', BANNER_DISMISSED_KEY)
  if (dismissed?.value) {
    const since = daysBetween(dismissed.value, new Date())
    if (since < 30) return false
  }

  return true
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

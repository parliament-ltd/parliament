// The .parliament file format, without IndexedDB: parsing, conversion of
// older exports, flattening for validation, and lifting old versions.
// Kept free of app imports so it can be tested in Node. backup.js re-exports
// everything here, so callers import from backup.js as before.

import { validateBackup } from './validate'
import { CURRENT_BACKUP_VERSION, migrateContents } from './backupMigrations'
import { cleanFlat } from './backupSchema'

export const BACKUP_FORMAT = 'parliament-backup'
export const BACKUP_VERSION = CURRENT_BACKUP_VERSION

// Settings keys that should NEVER appear in a backup. The API key is the
// big one: it's encrypted with browser-specific crypto and shouldn't leave
// this browser.
export const SETTINGS_BLOCKLIST = new Set(['parliament-api-key'])

// Limits on what a file may ask of this browser (audit T6). A backup larger
// than this is not read; one whose password must be stretched more than this
// many times is not opened, since it could hold the tab for minutes.
export const MAX_BACKUP_BYTES = 512 * 1024 * 1024
export const MAX_KDF_ITERATIONS = 5_000_000

// ─── Base64 helpers ──────────────────────────────────────

export function bytesToBase64(bytes) {
  let s = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk))
  }
  return btoa(s)
}

export function base64ToBytes(b64) {
  const s = atob(b64)
  const bytes = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i)
  return bytes
}

export function arrayBufferToBase64(ab) {
  return bytesToBase64(new Uint8Array(ab))
}

export function base64ToArrayBuffer(b64) {
  return base64ToBytes(b64).buffer
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
  if (typeof file?.size === 'number' && file.size > MAX_BACKUP_BYTES) {
    throw new Error('This file is too large to be a Parliament backup.')
  }
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
    // A file with no version is format 1 (C35).
    if (json.version === undefined) json.version = 1
    if (!Number.isInteger(json.version) || json.version < 1 || json.version > BACKUP_VERSION) {
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
    // Format 2, from version 6 data.
    dockets: [],
    runs: [],
    collections: [],
    collabs: [],
    // Stage 11: a chat's edits and asks travel with it (C212 (g)).
    edits: [],
    asks: [],
    // Stage 12: and its suggestions (C229 (h)).
    suggestions: [],
  }

  for (const chat of contents.chats || []) {
    const { messages, files, fileData, sbrdDocument, edits, asks, suggestions, ...conv } = chat
    flat.conversations.push(conv)
    if (Array.isArray(edits)) flat.edits.push(...edits)
    if (Array.isArray(asks)) flat.asks.push(...asks)
    if (Array.isArray(suggestions)) flat.suggestions.push(...suggestions)
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

  if (contents.dockets) {
    flat.dockets = contents.dockets.dockets || []
    flat.runs = contents.dockets.runs || []
  }
  if (Array.isArray(contents.collections)) flat.collections = contents.collections
  if (Array.isArray(contents.collabs)) flat.collabs = contents.collabs

  return flat
}

// Checked after cleaning (backupSchema.js): what is left out is counted
// there, so a record pointing at something missing is no reason to refuse
// the whole file.
export function validateContents(contents) {
  const { flat } = cleanFlat(contentsToFlatStores(contents))
  // validateBackup requires a `conversations` array as a baseline. If the
  // backup is partial (only library, say), pass an empty array — that
  // satisfies the schema while letting the per-store validators catch
  // structural problems.
  if (!flat.conversations) flat.conversations = []
  return validateBackup(flat)
}

// ─── Format versions ─────────────────────────────────────

/**
 * Lift contents read from a parsed file to the current format version.
 * V1 exports (.apb and plain JSON) enter the chain at version 1.
 */
export function liftToCurrent(parsed, contents) {
  const fromVersion = parsed.kind === 'v2' ? (parsed.envelope.version ?? 1) : 1
  return migrateContents(contents, fromVersion).contents
}

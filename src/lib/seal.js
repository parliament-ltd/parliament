// Sealed records (Lock Parliament, stage S4, piece 2; C189, C192, ruled 23
// October 2026; research/lock-parliament-design.md).
//
// With the lock on, a record of a store below keeps only what the database
// itself needs to find it (its key and the fields its indexes read), and the
// rest of it is encrypted together with the data key:
//
//   { <key and index fields>, sealed: { v: 1, iv, data, bin } }
//
// `data` is the other fields as JSON, `bin` any bytes among them (a file's
// contents), each encrypted on its own. The store's name and the record's key
// are bound into each (AES-GCM's additional data), so a sealed record cannot
// be moved to another record or store without failing to open. Settings are
// sealed only where they hold your words.
//
// Pure apart from Web Crypto.

import { LockError } from './lockKeys'

export const SEAL_VERSION = 1

// Per store: the key path, and the fields left readable (the key and what the
// app's indexes read). Everything else is sealed. Tags are sealed, so the tag
// indexes, which nothing queries, hold nothing.
export const SEALED_STORES = Object.freeze({
  conversations: { key: 'id', clear: ['num', 'docketId', 'room', 'createdAt', 'updatedAt'] },
  messages: { key: 'id', clear: ['conversationId'] },
  highlights: { key: 'id', clear: ['conversationId', 'num', 'kind'] },
  notes: { key: 'id', clear: ['conversationId', 'num', 'createdAt'] },
  favorites: { key: 'id', clear: ['conversationId'] },
  pins: { key: 'id', clear: ['targetConversationId', 'num'] },
  files: { key: 'id', clear: ['conversationId'] },
  file_data: { key: 'fileId', clear: [] },
  sbrd_documents: { key: 'conversationId', clear: [] },
  dockets: { key: 'id', clear: ['num', 'updatedAt'] },
  runs: { key: 'id', clear: ['docketId'] },
  collections: { key: 'id', clear: ['builtIn', 'updatedAt'] },
  edits: { key: 'id', clear: ['num', 'conversationId'] },
  asks: { key: 'id', clear: ['num', 'conversationId'] },
  suggestions: { key: 'id', clear: ['num', 'conversationId'] },
  collabs: { key: 'id', clear: [] },
  savedSearches: { key: 'id', clear: [] },
  focusSets: { key: 'id', clear: [] },
  // Numbered by the database as they are added: bound to the store alone.
  commandHistory: { key: 'id', clear: ['at'], auto: true },
  sourceCache: { key: 'key', clear: ['fetchedAt'] },
  settings: { key: 'key', clear: [], only: (record) => sealedSetting(record?.key) },
})

// Settings that hold your words; the rest are preferences the unlock screen
// may need (language, text size).
const SEALED_SETTINGS = new Set(['parrotPersonas', 'scratchpad-text', 'backupLog'])
const SEALED_SETTING_PREFIXES = ['sbrd-ripple-manifest-']
export function sealedSetting(key) {
  const k = String(key ?? '')
  return SEALED_SETTINGS.has(k) || SEALED_SETTING_PREFIXES.some((p) => k.startsWith(p))
}

const enc = new TextEncoder()
const dec = new TextDecoder()
const subtle = () => globalThis.crypto.subtle
const random = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n))

/** Whether a store's records are sealed when the lock is on. */
export const isSealedStore = (store) => Object.hasOwn(SEALED_STORES, store)

/** Whether a stored value is a sealed record. */
export function isSealed(value) {
  return Boolean(value && typeof value === 'object' && value.sealed && value.sealed.v === SEAL_VERSION && value.sealed.iv instanceof Uint8Array)
}

function aad(store, spec, value, part) {
  const key = spec.auto ? '' : JSON.stringify(value?.[spec.key] ?? null)
  return enc.encode(`parliament seal v1\u0000${store}\u0000${key}\u0000${part}`)
}

// JSON that carries bytes beside it: each ArrayBuffer or typed array becomes
// { $bin: n } in the JSON, and its bytes are sealed apart.
function split(rest) {
  const bins = []
  const json = JSON.stringify(rest, (k, v) => {
    if (v instanceof ArrayBuffer) { bins.push({ type: 'ArrayBuffer', bytes: new Uint8Array(v) }); return { $bin: bins.length - 1 } }
    if (ArrayBuffer.isView(v) && !(v instanceof DataView)) {
      bins.push({ type: v.constructor.name, bytes: new Uint8Array(v.buffer, v.byteOffset, v.byteLength) })
      return { $bin: bins.length - 1 }
    }
    return v
  })
  return { json, bins }
}

const VIEWS = { Uint8Array, Int8Array, Uint16Array, Int16Array, Uint32Array, Int32Array, Float32Array, Float64Array, Uint8ClampedArray }
function join(json, bins) {
  return JSON.parse(json, (k, v) => {
    if (v && typeof v === 'object' && Number.isInteger(v.$bin) && Object.keys(v).length === 1) {
      const b = bins[v.$bin]
      if (!b) throw new LockError('damaged')
      const copy = b.bytes.slice().buffer
      return b.type === 'ArrayBuffer' ? copy : new (VIEWS[b.type] ?? Uint8Array)(copy)
    }
    return v
  })
}

async function encrypt(key, bytes, additionalData) {
  const iv = random(12)
  return { iv, data: new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv, additionalData }, key, bytes)) }
}

async function decrypt(key, { iv, data }, additionalData) {
  try {
    return new Uint8Array(await subtle().decrypt({ name: 'AES-GCM', iv, additionalData }, key, data))
  } catch {
    throw new LockError('damaged')
  }
}

/**
 * A record as stored with the lock on. Records of other stores, settings that
 * are preferences, and records already sealed, pass as they are.
 */
export async function sealRecord(store, value, key) {
  const spec = SEALED_STORES[store]
  if (!spec || value == null || typeof value !== 'object' || isSealed(value)) return value
  if (spec.only && !spec.only(value)) return value
  const keep = new Set([spec.key, ...spec.clear])
  const clear = {}
  const rest = {}
  for (const [k, v] of Object.entries(value)) (keep.has(k) ? clear : rest)[k] = v
  const { json, bins } = split(rest)
  const body = await encrypt(key, enc.encode(json), aad(store, spec, value, 'data'))
  const sealedBins = []
  for (let i = 0; i < bins.length; i++) {
    const b = await encrypt(key, bins[i].bytes, aad(store, spec, value, `bin${i}`))
    sealedBins.push({ type: bins[i].type, ...b })
  }
  return { ...clear, sealed: { v: SEAL_VERSION, iv: body.iv, data: body.data, bin: sealedBins } }
}

/** A record as the app knows it. Anything not sealed passes as it is. */
export async function openRecord(store, value, key) {
  if (!isSealed(value)) return value
  const spec = SEALED_STORES[store]
  if (!spec) throw new LockError('damaged')
  const { sealed, ...clear } = value
  const bins = []
  for (let i = 0; i < (sealed.bin ?? []).length; i++) {
    const b = sealed.bin[i]
    bins.push({ type: b.type, bytes: await decrypt(key, b, aad(store, spec, value, `bin${i}`)) })
  }
  const rest = join(dec.decode(await decrypt(key, sealed, aad(store, spec, value, 'data'))), bins)
  return { ...rest, ...clear }
}

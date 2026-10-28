// The vault's key store (research/vault-design.md §6; C267 (e)). Keys live
// here, at the vault's own address, and nowhere else.
//
// A saved key is encrypted with AES-GCM under a device key that the browser
// will not let anyone read out (non-extractable), kept beside it. With Lock
// Parliament on, the page lends its unlocked data key, also unreadable, and
// each saved key is sealed again under it, so a copied browser profile
// yields nothing. "Don't save" holds a key in this frame's memory only.

const DB = 'parliament-keys'
const STORE = 'keys'
const DEVICE = 'device'
const rec = (provider) => `key:${provider}`
const enc = new TextEncoder()
const dec = new TextDecoder()
const sealAad = (provider) => enc.encode(`parliament vault v1\u0000sealed-key\u0000${provider}`)
const keyAad = (provider) => enc.encode(`parliament vault v1\u0000key\u0000${provider}`)

const done = (r) => new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error) })

function openDb(idb) {
  const r = idb.open(DB, 1)
  r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE, { keyPath: 'id' }) }
  return done(r)
}

/**
 * @param {{ idb?: IDBFactory, subtle?: SubtleCrypto }} [env]
 */
export function createStore({ idb = globalThis.indexedDB, subtle = globalThis.crypto.subtle } = {}) {
  const held = new Map() // provider -> key, this frame only
  let lockKey = null
  let db = null
  const getDb = async () => {
    if (!db) {
      db = await openDb(idb)
      // Another tab deleting everything: let go, so it can finish.
      db.onversionchange = () => { db.close(); db = null }
    }
    return db
  }
  const tx = async (mode, fn) => {
    const d = await getDb()
    const t = d.transaction(STORE, mode)
    const out = await fn(t.objectStore(STORE))
    await new Promise((resolve, reject) => { t.oncomplete = resolve; t.onerror = () => reject(t.error); t.onabort = () => reject(t.error) })
    return out
  }
  const read = (id) => tx('readonly', (s) => done(s.get(id)))
  const all = () => tx('readonly', (s) => done(s.getAll()))
  const write = (value) => tx('readwrite', (s) => done(s.put(value)))
  const drop = (id) => tx('readwrite', (s) => done(s.delete(id)))

  async function device() {
    const found = await read(DEVICE)
    if (found?.key) return found.key
    const key = await subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
    await write({ id: DEVICE, key })
    return key
  }

  async function encrypt(provider, key) {
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const data = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv, additionalData: keyAad(provider) }, await device(), enc.encode(key)))
    return { iv, data }
  }
  const decrypt = async (provider, { iv, data }) =>
    dec.decode(await subtle.decrypt({ name: 'AES-GCM', iv, additionalData: keyAad(provider) }, await device(), data))

  async function seal(provider, inner, key) {
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const body = enc.encode(JSON.stringify({ iv: [...inner.iv], data: [...inner.data] }))
    return { iv, data: new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv, additionalData: sealAad(provider) }, key, body)) }
  }
  async function unseal(provider, sealed, key) {
    const plain = await subtle.decrypt({ name: 'AES-GCM', iv: sealed.iv, additionalData: sealAad(provider) }, key, sealed.data)
    const inner = JSON.parse(dec.decode(plain))
    return { iv: new Uint8Array(inner.iv), data: new Uint8Array(inner.data) }
  }

  /** A saved key, opened; null when there is none, or it is sealed and the lock's key is not here. */
  async function saved(provider) {
    const r = await read(rec(provider))
    if (!r) return null
    if (r.sealed) {
      if (!lockKey) return null
      return decrypt(provider, await unseal(provider, r.sealed, lockKey))
    }
    return decrypt(provider, r.inner)
  }

  async function save(provider, key) {
    const inner = await encrypt(provider, key)
    const body = lockKey ? { sealed: await seal(provider, inner, lockKey) } : { inner }
    await write({ id: rec(provider), provider, savedAt: new Date().toISOString(), ...body })
  }

  return {
    /** The key for a provider, held or saved, or null. Never leaves the vault. */
    async get(provider) {
      if (held.has(provider)) return held.get(provider)
      return saved(provider).catch(() => null)
    },

    /** What the page may know: has a key, held for this frame only, its last four characters. */
    async status(providers) {
      const out = []
      for (const id of providers) {
        const r = await read(rec(id)).catch(() => null)
        const key = held.get(id) ?? (r ? await saved(id).catch(() => null) : null)
        out.push({ id, has: held.has(id) || Boolean(r), held: held.has(id), ending: key ? key.slice(-4) : null, locked: Boolean(r?.sealed && !lockKey) })
      }
      return out
    },

    /** Keeps a key: saved by default, or held in this frame only, its saved copy removed. */
    async put(provider, key, { save: keep = true } = {}) {
      if (typeof key !== 'string' || !key.trim()) throw new Error('A key is needed')
      const before = await this.get(provider)
      if (keep) { await save(provider, key); held.delete(provider) } else { held.set(provider, key); await drop(rec(provider)) }
      return { fresh: before !== key }
    },

    async remove(provider) {
      held.delete(provider)
      await drop(rec(provider))
    },

    /** How every key is kept, when the choice changes: each moves between saved and held. */
    async keep(keep, providers) {
      for (const id of providers) {
        const key = await this.get(id)
        if (key) await this.put(id, key, { save: keep })
      }
    },

    /**
     * The lock's data key, lent by the page. on: the lock is on, so every
     * saved key not yet sealed is sealed. on === false with a key: the lock
     * is being turned off, so every sealed key is opened, then the key is let
     * go. key null: the page locked; the key is let go.
     */
    async lock(key, on) {
      if (!key) { lockKey = null; return }
      if (on) {
        lockKey = key
        for (const r of await all()) {
          if (r.id === DEVICE || r.sealed || !r.inner) continue
          await write({ ...r, inner: undefined, sealed: await seal(r.provider, r.inner, key) })
        }
      } else {
        for (const r of await all()) {
          if (r.id === DEVICE || !r.sealed) continue
          await write({ ...r, sealed: undefined, inner: await unseal(r.provider, r.sealed, key) })
        }
        lockKey = null
      }
    },

    /** Delete everything: the database goes, and every held key. */
    async erase() {
      held.clear()
      lockKey = null
      if (db) { db.close(); db = null }
      await done(idb.deleteDatabase(DB))
    },
  }
}

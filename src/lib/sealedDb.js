// The database with the lock on (Lock Parliament, stage S4, piece 2; C187,
// C192; research/lock-parliament-design.md, "How saving works").
//
// sealedDb(db, key) answers as the database does (the parts of idb's
// interface the app uses), opening sealed records on the way out and sealing
// on the way in (seal.js). A one-step read or write simply does that.
//
// A transaction cannot: the browser ends it the moment it waits for anything
// but the database, and encryption is something else. So a transaction here
// is staged, in three steps:
//   1. its reads are separate reads, opened before the caller sees them, and
//      remembered as they were stored;
//   2. its writes are kept aside (and seen by its own later reads);
//   3. when the caller has nothing more pending, the writes are sealed, and
//      one real transaction checks that nothing read has changed since, then
//      writes them all. If something has, nothing is written and the
//      transaction fails with a StagedConflict, which records.js retries.
// The caller's code is the same code that runs with the lock off.

import { isSealed, openRecord, sealRecord, SEALED_STORES } from './seal'

/** Something read in a staged transaction changed before it could commit. */
export class StagedConflict extends Error {
  constructor(store) {
    super(`changed meanwhile: ${store}`)
    this.name = 'StagedConflict'
  }
}

const hex = (b) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
// What a stored value was, to tell later whether it changed.
function token(value) {
  if (value === undefined) return '-'
  if (isSealed(value)) return `s:${hex(value.sealed.iv)}`
  return `p:${JSON.stringify(value, (k, v) => (v instanceof ArrayBuffer || ArrayBuffer.isView(v) ? hex(new Uint8Array(v.buffer ?? v, v.byteOffset ?? 0, v.byteLength)) : v))}`
}

const pathValue = (value, path) => (Array.isArray(path) ? path.map((p) => value?.[p]) : value?.[path])
const sameKey = (a, b) => indexedDB.cmp(a, b) === 0

// Whether a key matches what an index or store read asked for.
function matches(query, k) {
  if (query == null) return true
  if (typeof IDBKeyRange !== 'undefined' && query instanceof IDBKeyRange) return query.includes(k)
  try { return sameKey(query, k) } catch { return false }
}

/**
 * @param {import('idb').IDBPDatabase} db the database as opened
 * @param {CryptoKey} key the data key, opened for this tab
 */
export function sealedDb(db, key) {
  const shapes = new Map()
  // A store's key path and its indexes' paths, read once.
  function shape(store) {
    if (!shapes.has(store)) {
      const s = db.transaction(store).objectStore(store)
      const indexes = {}
      for (const name of s.indexNames) {
        const i = s.index(name)
        indexes[name] = { path: i.keyPath, multi: i.multiEntry }
      }
      shapes.set(store, { keyPath: s.keyPath, auto: s.autoIncrement, indexes })
    }
    return shapes.get(store)
  }
  const open = (store, v) => openRecord(store, v, key)
  const openAll = (store, list) => Promise.all(list.map((v) => open(store, v)))
  const seal = (store, v) => sealRecord(store, v, key)

  const wrapped = {
    get name() { return db.name },
    get version() { return db.version },
    get objectStoreNames() { return db.objectStoreNames },
    close: () => db.close(),
    addEventListener: (...a) => db.addEventListener(...a),
    removeEventListener: (...a) => db.removeEventListener(...a),
    sealed: true,

    get: async (store, query) => open(store, await db.get(store, query)),
    getAll: async (store, query, count) => openAll(store, await db.getAll(store, query, count)),
    getFromIndex: async (store, index, query) => open(store, await db.getFromIndex(store, index, query)),
    getAllFromIndex: async (store, index, query, count) => openAll(store, await db.getAllFromIndex(store, index, query, count)),
    getKey: (...a) => db.getKey(...a),
    getAllKeys: (...a) => db.getAllKeys(...a),
    getKeyFromIndex: (...a) => db.getKeyFromIndex(...a),
    getAllKeysFromIndex: (...a) => db.getAllKeysFromIndex(...a),
    count: (...a) => db.count(...a),
    countFromIndex: (...a) => db.countFromIndex(...a),
    put: async (store, value, k) => db.put(store, await seal(store, value), k),
    add: async (store, value, k) => db.add(store, await seal(store, value), k),
    delete: (...a) => db.delete(...a),
    clear: (...a) => db.clear(...a),
    transaction: (stores, mode = 'readonly') => staged(db, [].concat(stores), mode, { shape, open, openAll, seal }),
  }
  return wrapped
}

function staged(db, names, mode, { shape, open, openAll, seal }) {
  const log = [] // writes in order: { store, op: 'put'|'add'|'delete'|'clear', value?, key? }
  const reads = [] // what was read, as it was stored: { store, kind, args, seen }
  let pending = 0
  let state = 'active' // active, committing, done, aborted
  let resolveDone
  let rejectDone
  const done = new Promise((res, rej) => { resolveDone = res; rejectDone = rej })
  done.catch(() => {}) // a caller may never look

  const live = () => {
    if (state !== 'active') {
      const err = new Error('The transaction has finished.')
      err.name = 'TransactionInactiveError'
      throw err
    }
  }
  // An operation: counted while it runs, so the commit waits for it.
  const run = (fn) => {
    live()
    pending += 1
    const p = (async () => fn())()
    p.finally(() => { pending -= 1; settle() }).catch(() => {})
    return p
  }
  // Commit once the caller has nothing pending and has let a turn pass.
  function settle() {
    if (pending > 0 || state !== 'active') return
    setTimeout(() => { if (pending === 0 && state === 'active') commit() }, 0)
  }
  settle()

  // What this transaction's own writes make of a store's records.
  function overlay(store) {
    const { keyPath } = shape(store)
    let cleared = false
    const byKey = new Map()
    for (const w of log) {
      if (w.store !== store) continue
      if (w.op === 'clear') { cleared = true; byKey.clear() }
      else if (w.op === 'delete') byKey.set(JSON.stringify(w.key), { deleted: true, key: w.key })
      else if (w.op === 'put' || w.op === 'add') {
        const k = w.key ?? pathValue(w.value, keyPath)
        if (k !== undefined) byKey.set(JSON.stringify(k), { value: w.value, key: k })
        else byKey.set(`new:${byKey.size}`, { value: w.value, key: undefined })
      }
    }
    return { cleared, byKey, keyPath }
  }

  // Stored records merged with this transaction's writes, for a read.
  async function readMerged(store, index, query) {
    const { indexes } = shape(store)
    const raw = index == null ? await db.getAll(store, query) : await db.getAllFromIndex(store, index, query)
    reads.push({ store, kind: 'all', index, query, seen: raw.map(token) })
    const { cleared, byKey, keyPath } = overlay(store)
    const plain = await openAll(store, raw)
    const out = []
    if (!cleared) {
      for (const v of plain) if (!byKey.has(JSON.stringify(pathValue(v, keyPath)))) out.push(v)
    }
    for (const w of byKey.values()) {
      if (w.deleted) continue
      let hit
      if (index == null) hit = w.key === undefined ? query == null : matches(query, w.key)
      else {
        const { path, multi } = indexes[index]
        const iv = pathValue(w.value, path)
        hit = iv !== undefined && (multi && Array.isArray(iv) ? iv.some((x) => matches(query, x)) : matches(query, iv))
      }
      if (hit) out.push(w.value)
    }
    if (index == null) {
      // Stores answer in key order.
      out.sort((a, b) => indexedDB.cmp(pathValue(a, keyPath) ?? Infinity, pathValue(b, keyPath) ?? Infinity))
    }
    return out
  }

  const storeApi = (store) => {
    if (!names.includes(store)) {
      const err = new Error(`${store} is not in this transaction.`)
      err.name = 'NotFoundError'
      throw err
    }
    const api = {
      name: store,
      get keyPath() { return shape(store).keyPath },
      get: (query) => run(async () => {
        const { cleared, byKey } = overlay(store)
        const mine = byKey.get(JSON.stringify(query))
        if (mine) return mine.deleted ? undefined : mine.value
        if (cleared) return undefined
        const raw = await db.get(store, query)
        reads.push({ store, kind: 'get', query, seen: [token(raw)] })
        return open(store, raw)
      }),
      getAll: (query) => run(() => readMerged(store, null, query)),
      getKey: (query) => run(async () => {
        const all = await readMerged(store, null, query)
        return all.length ? pathValue(all[0], shape(store).keyPath) : undefined
      }),
      getAllKeys: (query) => run(async () => (await readMerged(store, null, query)).map((v) => pathValue(v, shape(store).keyPath))),
      count: (query) => run(async () => (await readMerged(store, null, query)).length),
      put: (value, k) => run(() => { if (mode !== 'readwrite') throw readOnly(); log.push({ store, op: 'put', value, key: k }); return k ?? pathValue(value, shape(store).keyPath) }),
      add: (value, k) => run(() => { if (mode !== 'readwrite') throw readOnly(); log.push({ store, op: 'add', value, key: k }); return k ?? pathValue(value, shape(store).keyPath) }),
      delete: (k) => run(() => { if (mode !== 'readwrite') throw readOnly(); log.push({ store, op: 'delete', key: k }) }),
      clear: () => run(() => { if (mode !== 'readwrite') throw readOnly(); log.push({ store, op: 'clear' }) }),
      index: (name) => ({
        name,
        get: (query) => run(async () => (await readMerged(store, name, query))[0]),
        getAll: (query) => run(() => readMerged(store, name, query)),
        getAllKeys: (query) => run(async () => (await readMerged(store, name, query)).map((v) => pathValue(v, shape(store).keyPath))),
        count: (query) => run(async () => (await readMerged(store, name, query)).length),
      }),
      openCursor: () => { throw new Error('Cursors are not available with the lock on.') },
    }
    return api
  }

  async function commit() {
    state = 'committing'
    try {
      if (mode !== 'readwrite' || !log.length) { state = 'done'; resolveDone(); return }
      // Step 3: seal everything first, then one real transaction.
      const writes = []
      for (const w of log) writes.push(w.op === 'put' || w.op === 'add' ? { ...w, value: await seal(w.store, w.value) } : w)
      const stores = [...new Set([...writes.map((w) => w.store), ...reads.map((r) => r.store)])]
      const tx = db.transaction(stores, 'readwrite')
      const checks = []
      for (const r of reads) {
        const s = tx.objectStore(r.store)
        const p = r.kind === 'get'
          ? s.get(r.query).then((v) => [token(v)])
          : (r.index == null ? s.getAll(r.query) : s.index(r.index).getAll(r.query)).then((list) => list.map(token))
        checks.push(p.then((now) => {
          if (now.length !== r.seen.length || now.some((t, i) => t !== r.seen[i])) throw new StagedConflict(r.store)
        }))
      }
      for (const w of writes) {
        const s = tx.objectStore(w.store)
        if (w.op === 'clear') checks.push(s.clear())
        else if (w.op === 'delete') checks.push(s.delete(w.key))
        else if (w.op === 'add') checks.push(s.add(w.value, w.key))
        else checks.push(s.put(w.value, w.key))
      }
      try {
        await Promise.all(checks)
      } catch (err) {
        try { tx.abort() } catch { /* already finished */ }
        await tx.done.catch(() => {})
        throw err
      }
      await tx.done
      state = 'done'
      resolveDone()
    } catch (err) {
      state = 'aborted'
      rejectDone(err)
    }
  }

  return {
    mode,
    objectStoreNames: names,
    objectStore: storeApi,
    get store() { return storeApi(names[0]) },
    get done() { return done },
    abort() {
      if (state !== 'active') return
      state = 'aborted'
      const err = new Error('The transaction was aborted.')
      err.name = 'AbortError'
      rejectDone(err)
    },
  }
}

function readOnly() {
  const err = new Error('The transaction is read-only.')
  err.name = 'ReadOnlyError'
  return err
}

/**
 * Seal every record of the sealed stores, in one save (turning the lock on).
 * Records already sealed stay as they are. Nothing else may write meanwhile.
 */
export async function sealEverything(db, key) {
  return rewriteAll(db, (store, v) => sealRecord(store, v, key))
}

/** Open every sealed record, in one save (turning the lock off). */
export async function openEverything(db, key) {
  return rewriteAll(db, (store, v) => openRecord(store, v, key))
}

async function rewriteAll(db, change) {
  const stores = Object.keys(SEALED_STORES).filter((s) => db.objectStoreNames.contains(s))
  // Read and change everything first: the save itself waits for nothing else.
  const plan = []
  for (const store of stores) {
    const records = await db.getAll(store)
    plan.push({ store, records: await Promise.all(records.map((v) => change(store, v))) })
  }
  const tx = db.transaction(stores, 'readwrite')
  for (const { store, records } of plan) for (const v of records) tx.objectStore(store).put(v)
  await tx.done
  return plan.reduce((n, p) => n + p.records.length, 0)
}

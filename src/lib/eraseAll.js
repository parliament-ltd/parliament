// Delete everything (stage 9, piece 3; settings spec §11; C73; audit T5;
// C183). Never a command: only the button in Settings reaches it, through
// deleteEverything.js.
//
// What goes: every Parliament database in this browser (the chats and all
// else, the keys and the key that encrypts them, the trial copy), the copies
// kept for working offline (Cache Storage and the service worker), and what
// the page keeps in local and session storage. Other tabs learn of it from
// the browser: deleting a database asks each open connection to close, and
// db.js and crypto.js close theirs and say so.
//
// Kept free of app imports so it can be tested in Node.

// Databases of this origin that are Parliament's: its own, and the one the
// offline worker keeps for its caches.
const OURS = /^(parliament|workbox)/

/**
 * @param {object} env
 * @param {IDBFactory} [env.idb]
 * @param {CacheStorage} [env.caches]
 * @param {ServiceWorkerContainer} [env.workers]
 * @param {Storage[]} [env.stores]   local and session storage
 * @param {string[]} [env.known]     names deleted even when the browser cannot list its databases
 * @param {(name: string) => void} [env.onBlocked] another tab still holds that database open
 * @returns {Promise<{ databases: string[], caches: number, workers: number }>}
 */
export async function eraseEverything({
  idb = globalThis.indexedDB,
  caches = globalThis.caches,
  workers = globalThis.navigator?.serviceWorker,
  stores = pageStores(),
  known = [],
  onBlocked,
} = {}) {
  const names = new Set(known)
  if (typeof idb?.databases === 'function') {
    for (const d of await idb.databases()) if (d?.name && OURS.test(d.name)) names.add(d.name)
  }
  const databases = []
  for (const name of names) {
    await new Promise((resolve, reject) => {
      const request = idb.deleteDatabase(name)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error ?? new Error(name))
      // The deletion waits for that tab; it finishes when the tab lets go.
      request.onblocked = () => onBlocked?.(name)
    })
    databases.push(name)
  }

  let cacheCount = 0
  if (typeof caches?.keys === 'function') {
    for (const key of await caches.keys()) if (await caches.delete(key)) cacheCount += 1
  }
  let workerCount = 0
  if (typeof workers?.getRegistrations === 'function') {
    for (const registration of await workers.getRegistrations()) if (await registration.unregister()) workerCount += 1
  }
  for (const store of stores) {
    try { store?.clear() } catch { /* not available here */ }
  }
  return { databases, caches: cacheCount, workers: workerCount }
}

function pageStores() {
  const out = []
  try { out.push(globalThis.localStorage) } catch { /* blocked */ }
  try { out.push(globalThis.sessionStorage) } catch { /* blocked */ }
  return out.filter(Boolean)
}

// Asking the browser to keep Parliament's storage (C88; ruled 19 October).
//
// A browser may clear a site's stored data when space runs low, and Safari
// may after a week without a visit, unless the site's storage is kept.
// Parliament asks once, from a click, after the first chat exists (the first
// prompt sent), and Settings shows the answer with a way to ask again.
// Chrome decides by itself; Firefox asks the person, which is why the
// question follows something they did.
//
// Kept free of app imports so it can be tested in Node.

export const ASKED_SETTING = 'storageKeepAsked'

/** True or false once the browser says; null where it cannot. */
export async function isStorageKept(storage = globalThis.navigator?.storage) {
  if (typeof storage?.persisted !== 'function') return null
  try {
    return await storage.persisted()
  } catch {
    return null
  }
}

/**
 * Ask the browser to keep this site's storage: once, unless `again`.
 * Call it from something the person did. The answer is remembered in a
 * setting of this browser's own, which no backup carries.
 * @returns 'kept' | 'not-kept' | 'asked-before' | 'unsupported'
 */
export async function askToKeepStorage({
  storage = globalThis.navigator?.storage, getSetting, setSetting, again = false, now = () => new Date().toISOString(),
}) {
  if (typeof storage?.persist !== 'function') return 'unsupported'
  if (await isStorageKept(storage)) return 'kept'
  if (!again && await getSetting(ASKED_SETTING)) return 'asked-before'
  let kept = false
  try {
    kept = await storage.persist()
  } catch {
    kept = false
  }
  await setSetting(ASKED_SETTING, { at: now(), kept })
  return kept ? 'kept' : 'not-kept'
}

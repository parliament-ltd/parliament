// A list kept in this tab's session storage (C291 (m)), so a reload within
// the tab keeps it and closing the tab forgets it. Each entry is cleaned on
// the way in and out: only what clean returns is kept, never content or a
// key. Storage that fails or is blocked keeps nothing, and nothing breaks.

/**
 * @param {string} key the session storage key
 * @param {(entry: unknown) => object|null} clean what of an entry may be kept, or null to drop it
 * @param {number} most how many to keep, the newest
 */
export function sessionKeep(key, clean, most = 200) {
  const store = () => (typeof sessionStorage === 'undefined' ? null : sessionStorage)
  return {
    read() {
      try {
        const raw = store()?.getItem(key)
        const list = raw ? JSON.parse(raw) : []
        return Array.isArray(list) ? list.map(clean).filter(Boolean).slice(-most) : []
      } catch {
        return []
      }
    },
    write(list) {
      try {
        store()?.setItem(key, JSON.stringify((list ?? []).map(clean).filter(Boolean).slice(-most)))
      } catch { /* nothing kept */ }
    },
  }
}

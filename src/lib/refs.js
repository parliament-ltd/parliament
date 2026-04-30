// Canonical ref normalization shared by the editor and any other site
// that needs to resolve `name@version` keys against the catalog.
//
// Mode files canonically use carets (`messages@^1.0`); registries keys
// use bare versions (`messages@1.0`). RoomShell has its own copy of
// this; whenever the editor compares a mode-file ref to a registry
// entry it should call normalizeRef() first.

export function normalizeRef(ref) {
  if (typeof ref !== 'string' || !ref.includes('@')) return ref
  const [name, versionSpec = ''] = ref.split('@', 2)
  const raw = versionSpec.replace(/^[\^~]/, '')
  const trimmed = raw.replace(/^(\d+\.\d+)\.0$/, '$1')
  return `${name}@${trimmed}`
}

/**
 * Find a catalog entry whose `name@version` matches `ref` after
 * normalization. Returns null when no entry matches.
 */
export function findCatalogEntry(entries, ref) {
  const norm = normalizeRef(ref)
  if (typeof norm !== 'string') return null
  return entries.find((e) => `${e.name}@${e.version}` === norm) || null
}

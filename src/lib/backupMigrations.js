// Backup format versioning (almanac-spec-decisions.md §10).
//
// Every .parliament file ever written must stay restorable. A file carries the
// format version it was written at; on import its contents are lifted one
// version at a time until they match what this build writes, and only then
// validated and restored.
//
// Rules for adding a version:
//   1. Bump CURRENT_BACKUP_VERSION.
//   2. Add MIGRATIONS[n], which takes version-n contents and returns
//      version-(n+1) contents. Pure: no IndexedDB, no network, no Date.now().
//   3. Commit a fixture of a version-n file under src/lib/__fixtures__/ and
//      extend backupMigrations.test.js to restore it.
//   Never edit or remove an existing step. Old files depend on it.
//
// Older V1 exports (.apb and plain JSON) are converted to version-1 contents
// by flatV1ToContents() in backup.js and enter the chain at version 1.

export const CURRENT_BACKUP_VERSION = 1

export const MIGRATIONS = Object.freeze({
  // 1: (contents) => contents lifted to version 2
})

/**
 * Lift contents written at `fromVersion` to `to`.
 * @returns {{ contents: object, from: number, to: number, steps: number[] }}
 */
export function migrateContents(contents, fromVersion, { to = CURRENT_BACKUP_VERSION, migrations = MIGRATIONS } = {}) {
  if (!Number.isInteger(fromVersion) || fromVersion < 1) {
    throw new Error('This backup has no readable format version.')
  }
  if (fromVersion > to) {
    throw new Error('This backup was created by a newer version of Parliament. Please update to restore it.')
  }
  let out = contents
  const steps = []
  for (let v = fromVersion; v < to; v++) {
    const step = migrations[v]
    if (typeof step !== 'function') {
      throw new Error(`No migration from backup format ${v} to ${v + 1}.`)
    }
    out = step(out)
    steps.push(v)
  }
  return { contents: out, from: fromVersion, to, steps }
}

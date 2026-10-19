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

export const CURRENT_BACKUP_VERSION = 2

export const MIGRATIONS = Object.freeze({
  // 1 to 2 (19 October 2026, C93). Format 2 is written from an allowlist
  // (backupSchema.js) and may also hold version 6 lists: dockets with their
  // runs, collections and collabs. A format 1 file has none of them and
  // every one of its fields is still readable, so its contents are already
  // format 2 contents. Cleaning to the allowlist happens on restore, for
  // every version alike.
  1: (contents) => ({ ...contents }),
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

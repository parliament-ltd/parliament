// Pre-migration backup (change plan 0.6).
//
// Before this build upgrades the IndexedDB schema, the app stops at
// UpgradeGate and offers a backup of the data as it is, read at its current
// version so nothing is upgraded while it is being saved.

import { openDB } from 'idb'
import { DB_NAME, DB_VERSION, TRIAL_DB_NAME, isTrialDb } from './db'

// The database this tab uses: Parliament's own, or in development the trial
// copy, so the upgrade screen can be tried on a copy as it would run for real.
const activeDbName = () => (isTrialDb() ? TRIAL_DB_NAME : DB_NAME)
import { CATEGORIES, gatherBackupContents, buildBackupFile } from './backup'

/** Pure decision: an existing database older than this build needs the gate. */
export function needsBackupGate(storedVersion, targetVersion = DB_VERSION) {
  return storedVersion > 0 && storedVersion < targetVersion
}

/**
 * The version the database is at now, or 0 if it does not exist.
 * Opening without a version never upgrades an existing database. If there is
 * no database, the open is aborted inside onupgradeneeded so none is created.
 */
export function readStoredVersion() {
  return new Promise((resolve) => {
    let req
    try {
      req = indexedDB.open(activeDbName())
    } catch {
      resolve(0)
      return
    }
    req.onupgradeneeded = () => req.transaction.abort()
    req.onsuccess = () => {
      const v = req.result.version
      req.result.close()
      resolve(v)
    }
    req.onerror = () => resolve(0)
    req.onblocked = () => resolve(0)
  })
}

/**
 * Build a .parliament backup of the database at `storedVersion`, without
 * upgrading it. Categories whose stores do not exist yet at that version
 * are left out.
 */
export async function buildPreUpgradeBackup(storedVersion, { password = null } = {}) {
  const db = await openDB(activeDbName(), storedVersion)
  try {
    const names = db.objectStoreNames
    const categories = CATEGORIES.filter((c) => {
      if (c === 'rooms' || c === 'homepage') return names.contains('modes')
      if (c === 'library') return names.contains('libraryLayouts')
      if (c === 'chats') return names.contains('files') && names.contains('sbrd_documents')
      return true
    })
    const contents = await gatherBackupContents(categories, db)
    return await buildBackupFile({ contents, password, db })
  } finally {
    db.close()
  }
}

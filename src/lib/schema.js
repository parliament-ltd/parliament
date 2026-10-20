// The database's name, versions and every schema step (v1 to v6).
//
// Kept free of app imports so it can be tested in Node, the way
// backupFormat.js is. db.js re-exports what callers used to import from it.

import { createV6Stores, migrateV6Data } from './migrations/v6Upgrade'

export const DB_NAME = 'parliament'
// Version 6, the one upgrade of the refactor, approved by Stefan at the
// stage 2 checkpoint on 19 October.
export const DB_VERSION = 6
// The version the trial copy is upgraded to (migrations/v6Trial.js); the
// same as DB_VERSION since the upgrade was approved.
export const DRAFT_DB_VERSION = 6

// Dev only: the throwaway copy the version 6 upgrade is tried on.
export const TRIAL_DB_NAME = 'parliament-v6-trial'

// Built-in library author shape, per refactor/parliament_v2_design_decisions.md §6.5
// canonical metadata. Used to seed every Parliament-shipped library row.
export const BUILTIN_AUTHOR = Object.freeze({
  name: 'Parliament',
  handle: 'parliament',
  verified: true,
})

// Why the last upgrade in this tab failed, for the upgrade screen. The open
// itself only reports that the browser abandoned the upgrade.
export let lastUpgradeFailure = null

// Dev only: make the version 6 upgrade fail on demand, to see the upgrade
// screen report it. Set sessionStorage 'parliament-dev-fail-upgrade' to '1'.
// Production builds drop this, and Node tests never set it.
function failureAskedFor() {
  try {
    return Boolean(import.meta.env?.DEV) && globalThis.sessionStorage?.getItem('parliament-dev-fail-upgrade') === '1'
  } catch {
    return false
  }
}

/**
 * Every schema step from nothing to `newVersion`, in order. Shared by
 * db.js's initDB and by the version 6 trial (migrations/v6Trial.js), so the trial
 * runs exactly the code the real upgrade will.
 */
export async function upgradeSchema(db, oldVersion, newVersion, transaction) {
  // ── v1 stores (created on fresh install or upgrade from nothing) ──
  if (oldVersion < 1) {
    const convStore = db.createObjectStore('conversations', { keyPath: 'id' })
    convStore.createIndex('updatedAt', 'updatedAt')

    const msgStore = db.createObjectStore('messages', { keyPath: 'id' })
    msgStore.createIndex('conversationId', 'conversationId')

    const hlStore = db.createObjectStore('highlights', { keyPath: 'id' })
    hlStore.createIndex('conversationId', 'conversationId')

    const noteStore = db.createObjectStore('notes', { keyPath: 'id' })
    noteStore.createIndex('conversationId', 'conversationId')

    const favStore = db.createObjectStore('favorites', { keyPath: 'id' })
    favStore.createIndex('conversationId', 'conversationId')

    const pinStore = db.createObjectStore('pins', { keyPath: 'id' })
    pinStore.createIndex('targetConversationId', 'targetConversationId')

    db.createObjectStore('settings', { keyPath: 'key' })
  }

  // ── v2 stores: Pelican file staging ───────────────────────────────
  if (oldVersion < 2) {
    // (migration block preserved for existing installs upgrading through v2)
    // File metadata: one record per uploaded file
    const fileStore = db.createObjectStore('files', { keyPath: 'id' })
    fileStore.createIndex('conversationId', 'conversationId')

    // File data: compressed raw bytes, keyed by fileId (one record per file)
    // Stored separately to avoid loading binary blobs when listing file metadata
    db.createObjectStore('file_data', { keyPath: 'fileId' })
  }

  // ── v3 stores: Secretarybird document state ────────────────────────
  if (oldVersion < 3) {
    // One document record per conversation — stores paragraphs with tracked
    // changes, suggestion states, and user replies to Claude comments.
    db.createObjectStore('sbrd_documents', { keyPath: 'conversationId' })
  }

  // ── v4 stores: V2 catalog + mode files ────────────────────────────
  // This is the foundation layer for the V2 refactor (PR-1 of Phase 1).
  // No code consumes these stores yet; they are populated incrementally
  // by later PRs. See refactor/data-migration.md for the canonical schema.
  if (oldVersion < 4) {
    // Mode files: one row per mode. Either scope='room' (a user-built room)
    // or scope='homepage' (the single homepage mode per user).
    const modesStore = db.createObjectStore('modes', { keyPath: 'id' })
    modesStore.createIndex('scope', 'scope')

    // Library tables — catalog entries the user can install, browse,
    // and (for layouts/rooms/resources) see "coming soon" placeholders for.
    const layoutsStore = db.createObjectStore('libraryLayouts', { keyPath: 'id' })
    layoutsStore.createIndex('status', 'status')

    const roomsStore = db.createObjectStore('libraryRooms', { keyPath: 'id' })
    roomsStore.createIndex('status', 'status')

    const componentsStore = db.createObjectStore('libraryComponents', { keyPath: 'id' })
    componentsStore.createIndex('tier', 'tier')

    db.createObjectStore('librarySchemes', { keyPath: 'id' })

    const resourcesStore = db.createObjectStore('libraryResources', { keyPath: 'id' })
    resourcesStore.createIndex('status', 'status')
    resourcesStore.createIndex('format', 'format')

    // Add `room: null` field to every existing conversation. Filled in
    // by PR-10a's one-time migration that maps `createdInMode` → room.
    // Awaiting the for-await loop keeps the version-change transaction
    // alive across each cursor.update() call.
    const convStore2 = transaction.objectStore('conversations')
    for await (const cursor of convStore2) {
      if (cursor.value.room === undefined) {
        await cursor.update({ ...cursor.value, room: null })
      }
    }
  }

  // ── v5: library canonical metadata (PR-14) ────────────────────────
  // Backfill `author` and `installedCount` on every library record so
  // the homepage library section can render the canonical card shape
  // (per refactor/parliament_v2_design_decisions.md §6.5). Built-in
  // rows get author=Parliament, installedCount=0; the post-migration
  // seed top-up may further refine specific rows.
  if (oldVersion < 5) {
    for (const storeName of ['libraryRooms', 'libraryLayouts', 'libraryComponents', 'librarySchemes']) {
      const store = transaction.objectStore(storeName)
      for await (const cursor of store) {
        const v = cursor.value
        if (v.author && v.installedCount !== undefined) continue
        await cursor.update({
          ...v,
          author: v.author || { ...BUILTIN_AUTHOR },
          installedCount: typeof v.installedCount === 'number' ? v.installedCount : 0,
        })
      }
    }
  }

  // ── v6: the one upgrade of the refactor (refactor-plan.md, stage 2) ──
  // Every new list and index, then the data planned by v6Plan.js, in this
  // same transaction, so it happens whole or not at all. Runs only when
  // asked for version 6, which DB_VERSION has been since 19 October.
  //
  // The browser does not roll back by itself when this function fails: idb
  // does not wait for it, so a failure would leave the new lists in place
  // with no data in them (found by the rollback test, 19 October). The
  // transaction is abandoned here instead, which keeps version 5 exactly as
  // it was, and the open fails.
  if (oldVersion < 6 && newVersion >= 6) {
    try {
      if (failureAskedFor()) throw new Error('A failure asked for in development, to show the upgrade screen reporting it.')
      createV6Stores(db, transaction)
      await migrateV6Data(transaction)
    } catch (err) {
      lastUpgradeFailure = err
      // The open's own promise reports the failure; this one would only go unheard.
      transaction.done?.catch(() => {})
      try {
        transaction.abort()
      } catch { /* already finished */ }
      console.error('[schema] The version 6 upgrade failed and was rolled back; the data is still at version 5.', err)
    }
  }
}

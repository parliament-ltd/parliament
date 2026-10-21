// Schema version 6: the one upgrade of the refactor (refactor-plan.md,
// stage 2).
//
// createV6Stores makes every list and index the plan needs. migrateV6Data
// then reads the version 5 data inside the same upgrade transaction, runs the
// planner (v6Plan.js) and writes what it planned. Both run inside the
// browser's upgrade transaction, so the upgrade happens whole or not at all:
// if anything throws, the transaction is rolled back and the data stays at
// version 5.
//
// Not done here: the saved key moves to the key store, which is a separate
// database and cannot share this transaction. That is its own step, with the
// key module.

import { planV6Migration } from './v6Plan'

// New lists. [index name, key path, options]
export const V6_NEW_STORES = {
  dockets: { keyPath: 'id', indexes: [['num', 'num', { unique: true }], ['updatedAt', 'updatedAt'], ['tags', 'tags', { multiEntry: true }]] },
  runs: { keyPath: 'id', indexes: [['docketId', 'docketId']] },
  collections: { keyPath: 'id', indexes: [['builtIn', 'builtIn'], ['updatedAt', 'updatedAt']] },
  // Created empty; filled from stage 11.
  edits: { keyPath: 'id', indexes: [['num', 'num', { unique: true }], ['conversationId', 'conversationId']] },
  asks: { keyPath: 'id', indexes: [['num', 'num', { unique: true }], ['conversationId', 'conversationId']] },
  suggestions: { keyPath: 'id', indexes: [['num', 'num', { unique: true }], ['conversationId', 'conversationId']] },
  collabs: { keyPath: 'id' },
  // Kept on this device. Arrangements go in a backup only when the person
  // chooses (stage 9); focus sets and saved searches never do.
  arrangements: { keyPath: 'id' },
  focusSets: { keyPath: 'id' },
  savedSearches: { keyPath: 'id' },
  // Commands only: never a prompt, a search or a line shaped like a key.
  commandHistory: { keyPath: 'id', autoIncrement: true, indexes: [['at', 'at']] },
  sourceCache: { keyPath: 'key', indexes: [['fetchedAt', 'fetchedAt']] },
  // The one counter every number comes from: { name: 'num', next }.
  counters: { keyPath: 'name' },
}

// New indexes on lists that exist: number, time, room, tags and kind.
export const V6_NEW_INDEXES = {
  conversations: [['num', 'num', { unique: true }], ['docketId', 'docketId'], ['room', 'room'], ['tags', 'tags', { multiEntry: true }], ['createdAt', 'createdAt']],
  notes: [['num', 'num', { unique: true }], ['tags', 'tags', { multiEntry: true }], ['createdAt', 'createdAt']],
  highlights: [['num', 'num', { unique: true }], ['kind', 'kind'], ['tags', 'tags', { multiEntry: true }]],
  pins: [['num', 'num', { unique: true }]],
}

// The version 5 lists the planner reads. Read only: documents, messages,
// favourites and settings are never written by this upgrade.
const READ = ['conversations', 'messages', 'notes', 'highlights', 'favorites', 'pins', 'settings', 'modes', 'sbrd_documents', 'libraryRooms']

/** Inside the upgrade transaction: create the new lists and indexes. */
export function createV6Stores(db, transaction) {
  for (const [name, def] of Object.entries(V6_NEW_STORES)) {
    if (db.objectStoreNames.contains(name)) continue
    const store = db.createObjectStore(name, { keyPath: def.keyPath, autoIncrement: Boolean(def.autoIncrement) })
    for (const [index, path, opts] of def.indexes || []) store.createIndex(index, path, opts)
  }
  for (const [name, indexes] of Object.entries(V6_NEW_INDEXES)) {
    const store = transaction.objectStore(name)
    for (const [index, path, opts] of indexes) {
      if (!store.indexNames.contains(index)) store.createIndex(index, path, opts)
    }
  }
}

/**
 * Inside the upgrade transaction, after createV6Stores: read the version 5
 * data, plan, write. Awaits only this transaction's own requests, which keeps
 * it open. Returns the plan.
 */
export async function migrateV6Data(transaction, { now = new Date().toISOString(), newId } = {}) {
  const snap = {}
  for (const name of READ) snap[name] = await transaction.objectStore(name).getAll()
  const plan = planV6Migration(snap, { now, newId })

  const writes = []
  const put = (name, record) => writes.push(transaction.objectStore(name).put(record))
  // Fields the plan sets on a record that exists. Pins and tags are filled
  // in only where the record has none, so nothing already there is lost.
  const mergeInto = (name, records, updates) => {
    const byId = new Map(records.map((r) => [r.id, r]))
    for (const { id, ...fields } of updates) {
      const record = byId.get(id)
      if (!record) continue
      put(name, {
        ...record,
        ...fields,
        ...('pinned' in fields ? { pinned: record.pinned ?? fields.pinned } : {}),
        ...('tags' in fields ? { tags: record.tags ?? fields.tags } : {}),
      })
    }
  }

  for (const d of plan.dockets) put('dockets', d)
  for (const r of plan.runs) put('runs', r)
  mergeInto('conversations', snap.conversations, plan.conversationUpdates)
  mergeInto('notes', snap.notes, plan.noteUpdates)
  mergeInto('highlights', snap.highlights, plan.termUpdates)
  mergeInto('pins', snap.pins, plan.quoteUpdates)
  for (const n of plan.newNotes) put('notes', n)
  for (const c of plan.collections) put('collections', c)
  for (const c of plan.collabs) put('collabs', c)
  const modes = new Map(snap.modes.map((m) => [m.id, m]))
  for (const { id, template } of plan.roomUpdates) {
    const m = modes.get(id)
    put('modes', { ...m, meta: { ...m.meta, template } })
  }
  put('counters', { name: 'num', next: plan.nextNum })

  await Promise.all(writes)
  return plan
}

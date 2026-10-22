// Saved searches on Records (refactor-plan.md, stage 6, piece 2; Almanac
// v30; C140).
//
// A saved search keeps the search words and the filters as commands, not
// the rows they found, so it is worked out again each time it is opened:
// since:7d is the last seven days on the day it is opened (v30: "recomputes
// every time you open it").
//
// Kept on this device in the version 6 list `savedSearches`, never in a
// backup, as that list was made (stage 2). What is read back is checked
// like anything stored: a record that cannot be made sense of is left out.
// Each change is announced like a record's (records.js), so other tabs
// read the list again; the announcement carries a kind and an id only.

import { announce } from './records'

const STORE = 'savedSearches'
export const SEARCH_NAME_MAX = 80
const LINE_MAX = 2000
const SEARCH_MAX = 500

/** A name as typed, trimmed, or why it cannot be one. */
export function cleanSearchName(text) {
  const name = String(text ?? '').replace(/\s+/g, ' ').trim()
  if (!name) return { error: 'empty' }
  if ([...name].length > SEARCH_NAME_MAX) return { error: 'long' }
  return { name }
}

const isText = (v, max) => typeof v === 'string' && v.length <= max
const isDate = (v) => typeof v === 'string' && Number.isFinite(Date.parse(v))

/** A stored saved search made safe to use, or null. */
export function cleanSaved(record) {
  if (!record || typeof record !== 'object') return null
  if (!isText(record.id, 128) || !record.id) return null
  const named = cleanSearchName(record.name)
  if (!named.name || !isText(record.search ?? '', SEARCH_MAX) || !isText(record.line ?? '', LINE_MAX)) return null
  return {
    id: record.id,
    name: named.name,
    search: String(record.search ?? '').trim(),
    line: String(record.line ?? '').trim(),
    createdAt: isDate(record.createdAt) ? record.createdAt : null,
    updatedAt: isDate(record.updatedAt) ? record.updatedAt : null,
  }
}

const has = (db) => db?.objectStoreNames?.contains(STORE)
const sameName = (a, b) => a.toLocaleLowerCase() === b.toLocaleLowerCase()

/**
 * Every saved search, the newest first. None before version 6.
 * @param {import('idb').IDBPDatabase} db
 */
export async function readSaved(db) {
  if (!has(db)) return []
  const all = (await db.getAll(STORE)).map(cleanSaved).filter(Boolean)
  return all.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
}

/**
 * Keeps a search under a name. A name already saved is replaced, keeping
 * its id and the day it was first saved.
 * @param {import('idb').IDBPDatabase} db
 * @param {{ name: string, search: string, line: string, now?: string, newId?: () => string }} search
 * @returns {Promise<object>} what was kept
 */
export async function keepSearch(db, { name, search = '', line = '', now = new Date().toISOString(), newId = () => crypto.randomUUID() }) {
  if (!has(db)) throw new Error('Saved searches need version 6')
  const named = cleanSearchName(name)
  if (!named.name) throw new Error('A saved search needs a name')
  const tx = db.transaction(STORE, 'readwrite')
  const store = tx.objectStore(STORE)
  const before = (await store.getAll()).map(cleanSaved).filter(Boolean).find((s) => sameName(s.name, named.name))
  const record = {
    id: before?.id ?? newId(),
    name: named.name,
    search: String(search).trim(),
    line: String(line).trim(),
    createdAt: before?.createdAt ?? now,
    updatedAt: now,
  }
  await store.put(record)
  await tx.done
  announce([{ kind: 'savedSearch', op: before ? 'updated' : 'created', id: record.id }])
  return record
}

/** Puts a saved search back exactly as it was, for undo: (C134). */
export async function putSaved(db, record) {
  const clean = cleanSaved(record)
  if (!has(db) || !clean) return
  await db.put(STORE, clean)
  announce([{ kind: 'savedSearch', op: 'updated', id: clean.id }])
}

/** Removes a saved search. What it found is untouched. */
export async function forgetSearch(db, id) {
  if (!has(db)) return
  await db.delete(STORE, id)
  announce([{ kind: 'savedSearch', op: 'removed', id }])
}

/** The saved search with this name, the same name first, then one that starts with it; null for none or several. */
export function findSaved(saved, name) {
  const n = String(name ?? '').trim().toLocaleLowerCase()
  if (!n) return { found: null, several: [] }
  const same = saved.filter((s) => s.name.toLocaleLowerCase() === n)
  if (same.length) return { found: same[0], several: [] }
  const starts = saved.filter((s) => s.name.toLocaleLowerCase().startsWith(n))
  return starts.length === 1 ? { found: starts[0], several: [] } : { found: null, several: starts.map((s) => s.name) }
}

// Keeping arrangements on this device (refactor-plan.md §4 and stage 3; P7,
// ruled: "arrangements are stored as data from the start"; Almanac spec §4
// and settings spec §12: per device; in a backup only when the person
// chooses it, ruled 20 October and built with backup: in stage 9).
//
// Records in the version 6 list `arrangements`. What is on screen is one
// space (C125, superseding C102), kept under `space` as it is left. Records
// kept under each arrangement's own key before C125 stay where they are,
// unread; loadArrangement reads such a record, for when an arrangement can
// be edited and kept (stage 14). The list is not on the backup allowlist
// until stage 9 adds the choice; a restore will check each record with
// cleanArrangement.
//
// What is read back is checked like anything from outside: unknown boards,
// places and fields are dropped, and a record that cannot be made sense of
// gives way to the shipped default.

import { boardEntry } from '../shell/boards'
import { shipped, shippedFor, SHIPPED, SPACE } from '../shell/arrangement'

const STORE = 'arrangements'
const BAR_PLACES = new Set(['top', 'bottom', 'card'])
const BAR_SIDES = new Set(['left', 'center', 'right'])
const SIDES = new Set(['left', 'right'])
const ID = /^[a-z]+(?::[A-Za-z0-9_-]{1,128})?$/

const contextValue = (v) => (typeof v === 'number' && Number.isFinite(v)) || (typeof v === 'string' && v.length <= 200)
// A board's share of the width (C126): its usual share is 1 or 2.
const shareValue = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0.05 && v <= 50

/**
 * A stored arrangement made safe to use, or null when it cannot be.
 * @returns {import('../shell/arrangement').Arrangement|null}
 */
export function cleanArrangement(record) {
  if (!record || typeof record !== 'object' || !ID.test(String(record.id)) || !SHIPPED[shippedFor(record.id)]) return null
  const seen = new Set()
  const known = (b) => typeof b === 'string' && boardEntry(b) && !seen.has(b) && seen.add(b)
  const columns = (Array.isArray(record.columns) ? record.columns : [])
    .map((c) => (Array.isArray(c) ? c.filter(known) : []))
    .filter((c) => c.length)
  if (!columns.length) return null
  const popped = (Array.isArray(record.popped) ? record.popped : [])
    .filter((p) => p && known(p.board))
    .map((p) => ({
      board: p.board,
      display: Number.isInteger(p.display) && p.display > 0 && p.display < 100 ? p.display : null,
      side: SIDES.has(p.side) ? p.side : null,
      from: Number.isInteger(p.from) && p.from >= 0 ? p.from : columns.length,
    }))
  const here = [...columns.flat(), ...popped.map((p) => p.board)]
  const bar = record.bar && typeof record.bar === 'object' ? record.bar : {}
  const context = {}
  for (const [k, v] of Object.entries(record.context && typeof record.context === 'object' ? record.context : {})) {
    if (boardEntry(k) && contextValue(v)) context[k] = v
  }
  // Spaces kept before C126 have no widths, and read with the usual shares.
  const widths = {}
  for (const [k, v] of Object.entries(record.widths && typeof record.widths === 'object' ? record.widths : {})) {
    if (boardEntry(k) && shareValue(v)) widths[k] = v
  }
  return {
    id: record.id,
    columns,
    popped,
    addressed: here.includes(record.addressed) ? record.addressed : columns[0][0],
    bar: { at: BAR_PLACES.has(bar.at) ? bar.at : SHIPPED[shippedFor(record.id)].bar, side: BAR_SIDES.has(bar.side) ? bar.side : 'center', popped: bar.popped === true },
    resting: record.resting === 'search' || record.resting === 'prompt' ? record.resting : null,
    context,
    widths,
  }
}

/**
 * The arrangement as this device left it, or the shipped default.
 * @param {import('idb').IDBPDatabase} db
 * @param {string} id 'almanac', 'lab', 'room:<room id>' …
 */
export async function loadArrangement(db, id, context = {}) {
  if (!db.objectStoreNames.contains(STORE)) return shipped(id, context)
  const stored = cleanArrangement(await db.get(STORE, id))
  return stored ? { ...stored, context: { ...stored.context, ...context } } : shipped(id, context)
}

/**
 * The space as this device left it (C125). With none kept yet, someone who
 * has made nothing starts on the welcome page, anyone else on the Almanac
 * (C118).
 * @param {import('idb').IDBPDatabase} db
 * @param {{ fresh: boolean }} who fresh: nothing made yet
 */
export async function loadSpace(db, { fresh }) {
  const stored = db.objectStoreNames.contains(STORE) ? cleanArrangement(await db.get(STORE, SPACE)) : null
  if (stored) return stored
  return fresh ? { ...shipped('welcome'), id: SPACE } : shipped(SPACE)
}

/**
 * Keeps an arrangement on this device. Returns what was kept, or null at
 * version 5, where the list does not exist yet.
 * @param {import('idb').IDBPDatabase} db
 */
export async function saveArrangement(db, arrangement, { now = new Date().toISOString() } = {}) {
  const clean = cleanArrangement(arrangement)
  if (!clean) throw new Error(`Not an arrangement: ${arrangement?.id}`)
  if (!db.objectStoreNames.contains(STORE)) return null
  const record = { ...clean, updatedAt: now }
  await db.put(STORE, record)
  return record
}

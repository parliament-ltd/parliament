// Keeping arrangements on this device (refactor-plan.md §4 and stage 3; P7,
// ruled: "arrangements are stored as data from the start"; Almanac spec §4
// and settings spec §12: per device; in a backup only when the person
// chooses it, ruled 20 October and built with backup: in stage 9).
//
// Records in the version 6 list `arrangements`. What is on screen is one
// space (C125, superseding C102), kept under `space` as it is left. Records
// kept under each arrangement's own key before C125 stay where they are,
// unread; loadArrangement reads such a record, for when an arrangement can
// be edited and kept (stage 14). A backup holds the list only when the
// layouts category is ticked (stage 9; C182), and a restore checks each
// record with cleanArrangement.
//
// What is read back is checked like anything from outside: unknown boards,
// places and fields are dropped, and a record that cannot be made sense of
// gives way to the shipped default.

import { boardEntry, isRoom } from '../shell/boards'
import { shipped, shippedFor, SHIPPED, SPACE, RECORDS_COLUMNS } from '../shell/arrangement'

const STORE = 'arrangements'
/** The kind of id a saved arrangement has, 'saved:…', and the longest name it takes (C257). */
export const SAVED = 'saved'
export const NAME_MAX = 80
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
  // A saved arrangement (stage 14, piece 3; C257 (d)): 'saved:…', with its
  // name, read like the space. A version from before skips it.
  const saved = shippedFor(record?.id) === SAVED
  const base = saved ? SHIPPED[SPACE] : SHIPPED[shippedFor(record?.id)]
  if (!record || typeof record !== 'object' || !ID.test(String(record.id)) || !base) return null
  const name = saved && typeof record.name === 'string' ? record.name.replace(/\s+/g, ' ').trim() : ''
  if (saved && (!name || Array.from(name).length > NAME_MAX)) return null
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
  // While focus: holds, the space as it was before (stage 5). Checked like
  // the space itself; one that cannot be made sense of is dropped, and
  // focus:off then has nothing to bring back.
  const before = record.focus && typeof record.focus === 'object' ? cleanArrangement({ ...record.focus, id: record.id, context: {} }) : null
  // While the Lab is open, the space as it was before lab:, for done: (C238 (c)).
  const beforeLab = record.lab && typeof record.lab === 'object' ? cleanArrangement({ ...record.lab, id: record.id, context: {} }) : null
  // Spaces kept before C126 have no widths, and read with the usual shares.
  const widths = {}
  for (const [k, v] of Object.entries(record.widths && typeof record.widths === 'object' ? record.widths : {})) {
    if (boardEntry(k) && shareValue(v)) widths[k] = v
  }
  // Records' columns, when the person has chosen (cols:, C141): known
  // columns only, once each, in their order, the title and number among them.
  const cols = Array.isArray(record.recordsCols) ? RECORDS_COLUMNS.filter((c) => record.recordsCols.includes(c)) : null
  const recordsCols = cols && cols.includes('id') && cols.includes('title') && cols.length < RECORDS_COLUMNS.length ? cols : null
  // The room the bar pointed at last, when it is here (C175 (a)).
  const lastRoom = isRoom(record.lastRoom) && here.includes(record.lastRoom) ? record.lastRoom : null
  return {
    id: record.id,
    columns,
    popped,
    addressed: here.includes(record.addressed) ? record.addressed : columns[0][0],
    bar: { at: BAR_PLACES.has(bar.at) ? bar.at : base.bar, side: BAR_SIDES.has(bar.side) ? bar.side : 'center', popped: bar.popped === true },
    resting: record.resting === 'search' || record.resting === 'prompt' ? record.resting : null,
    context,
    widths,
    ...(saved ? { name } : {}),
    ...(before && !saved ? { focus: { columns: before.columns, popped: before.popped, addressed: before.addressed, bar: before.bar } } : {}),
    ...(beforeLab && !saved ? { lab: { columns: beforeLab.columns, popped: beforeLab.popped, addressed: beforeLab.addressed, bar: beforeLab.bar } } : {}),
    ...(recordsCols ? { recordsCols } : {}),
    ...(lastRoom ? { lastRoom } : {}),
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

/** Your saved arrangements on this device, by name (C257). */
export async function loadSaved(db) {
  if (!db?.objectStoreNames.contains(STORE)) return []
  const all = await db.getAll(STORE).catch(() => [])
  return all.filter((r) => shippedFor(r?.id) === SAVED).map(cleanArrangement).filter(Boolean)
    .sort((x, y) => x.name.localeCompare(y.name))
}

/** Takes a saved arrangement off this device (forget:, which undo: can take back). */
export async function removeSaved(db, id) {
  if (!db?.objectStoreNames.contains(STORE) || shippedFor(id) !== SAVED) return
  await db.delete(STORE, id)
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

// Collections (refactor-plan.md, stage 6, piece 6; collection board v3;
// C139, C144). A collection holds pointers, never copies: a chat or a plan,
// live (every note, keyword and quote in it, now and later); one note,
// keyword or quote; or a message, as Favorites holds them. Collections take
// no number (C17).
//
// The record (version 6 list `collections`): { id, name, builtIn,
// description, items, headings, order, pinned, createdAt, updatedAt }.
// `order` is the cards' and headings' keys in the person's own order; cards
// not in it follow, oldest first. Items of kind chat, plan and marking, and
// `order`, are new with this piece (C144 (j)).
//
// The planners are pure; readCollections and writeCollection touch the
// store. A write names what it expects to find, so one that something else
// has overtaken is refused rather than written over (as changeRecords does).

import { announce, Changed } from './records'

const STORE = 'collections'
export const COLLECTION_NAME_MAX = 80
export const HEADING_MAX = 80

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
const lower = (t) => String(t ?? '').toLocaleLowerCase()

/** An item's key: what it points at. */
export function itemKey(item) {
  if (item?.kind === 'chat') return `chat:${item.conversationId}`
  if (item?.kind === 'plan') return `plan:${item.docketId}`
  if (item?.kind === 'marking') return `mark:${item.store}:${item.id}`
  if (item?.kind === 'message') return `msg:${item.messageId}`
  return null
}
/** A card's key, as \`order\` keeps it. */
export const markKey = (row) => `mark:${row.store}:${row.id}`
export const headKey = (heading) => `head:${heading.id}`

/** A name as typed, or why it cannot be one. */
export function cleanCollectionName(text, max = COLLECTION_NAME_MAX) {
  const name = String(text ?? '').replace(/\s+/g, ' ').trim()
  if (!name) return { error: 'empty' }
  if ([...name].length > max) return { error: 'long' }
  return { name }
}

/** A stored collection made safe to read: lists where lists belong. */
export function cleanCollection(record) {
  if (!record || typeof record !== 'object' || typeof record.id !== 'string') return null
  return {
    ...record,
    name: typeof record.name === 'string' && record.name.trim() ? record.name : null,
    items: Array.isArray(record.items) ? record.items.filter((i) => itemKey(i)) : [],
    headings: Array.isArray(record.headings) ? record.headings.filter((h) => h && typeof h.id === 'string' && typeof h.text === 'string') : [],
    order: Array.isArray(record.order) ? record.order.filter((k) => typeof k === 'string') : [],
  }
}

/** An empty collection, with no name until it is given one (C139). */
export const newCollection = ({ id, now }) => ({
  id, name: null, builtIn: null, description: '', items: [], headings: [], order: [], pinned: false, createdAt: now, updatedAt: now,
})

// The item a row of Records becomes.
function itemOf(row, now) {
  if (row.kind === 'chat') return { kind: 'chat', conversationId: row.chatId, num: row.num, addedAt: now }
  if (row.kind === 'docket') return { kind: 'plan', docketId: row.id, num: row.num, addedAt: now }
  if (['note', 'term', 'quote', 'highlight'].includes(row.kind)) return { kind: 'marking', store: row.store, id: row.id, num: row.num, addedAt: now }
  return null
}

/**
 * add:207, 216. Chats and plans are held whole; a note, keyword or quote on
 * its own also takes its place at the end of the person's order.
 * @returns {{ next: object, added: object[], already: object[] }}
 */
export function withRows(collection, rows, now) {
  const have = new Set(collection.items.map(itemKey))
  const items = [...collection.items]
  const order = [...collection.order]
  const added = []
  const already = []
  for (const row of rows) {
    const item = itemOf(row, now)
    if (!item) continue
    if (have.has(itemKey(item))) { already.push(row); continue }
    have.add(itemKey(item))
    items.push(item)
    if (item.kind === 'marking') order.push(itemKey(item))
    added.push(row)
  }
  return { next: { ...collection, items, order, updatedAt: now }, added, already }
}

/**
 * rm:207. Takes out what was added. A card that is there only because its
 * chat or plan is held is named in \`held\`, with what holds it (C144 (g)).
 * @param {(row: object) => object|null} holderOf the held chat or plan a row is there through, if any
 * @returns {{ next: object, removed: object[], held: Array<{ row: object, by: number }>, absent: object[] }}
 */
export function withoutRows(collection, rows, holderOf, now) {
  const drop = new Set()
  const removed = []
  const held = []
  const absent = []
  const keys = new Set(collection.items.map(itemKey))
  for (const row of rows) {
    const key = itemKey(itemOf(row, now) ?? {})
    if (key && keys.has(key)) { drop.add(key); removed.push(row); continue }
    const by = holderOf(row)
    if (by) held.push({ row, by: by.num })
    else absent.push(row)
  }
  const next = { ...collection, items: collection.items.filter((i) => !drop.has(itemKey(i))), order: collection.order.filter((k) => !drop.has(k)), updatedAt: now }
  return { next, removed, held, absent }
}

/** rm:"Causes": a heading taken out of the person's order. */
export function withoutHeading(collection, text, now) {
  const heading = collection.headings.find((h) => lower(h.text) === lower(text))
  if (!heading) return null
  return { next: { ...collection, headings: collection.headings.filter((h) => h !== heading), order: collection.order.filter((k) => k !== headKey(heading)), updatedAt: now }, heading }
}

// The person's order made whole: the keys as they show now, so a place can
// be found for anything in it.
const placed = (sequence, key, where, target) => {
  const out = sequence.filter((k) => k !== key)
  const at = target ? out.indexOf(target) : -1
  if (at < 0) return [...out, key]
  out.splice(where === 'after' ? at + 1 : at, 0, key)
  return out
}

/**
 * heading:"Causes" before 215: a heading in the person's order, at the end
 * unless placed.
 * @param {string[]} sequence the cards' and headings' keys as your order shows them now
 */
export function withHeading(collection, { id, text, where = null, target = null }, sequence, now) {
  const heading = { id, text }
  return {
    ...collection,
    headings: [...collection.headings, heading],
    order: placed(sequence, headKey(heading), where, target),
    updatedAt: now,
  }
}

/** move:218 after 214: a card's place in the person's order. */
export function withMoved(collection, key, where, target, sequence, now) {
  return { ...collection, order: placed(sequence, key, where, target), updatedAt: now }
}

/** clear: everything out; what it held stays where it is. */
export const emptied = (collection, now) => ({ ...collection, items: [], headings: [], order: [], updatedAt: now })

/** name:"Q2 evidence". */
export const named = (collection, name, now) => ({ ...collection, name, updatedAt: now })

// ── The store ───────────────────────────────────────────

const has = (db) => db?.objectStoreNames?.contains(STORE)

/** Every collection, the one changed last first. */
export async function readCollections(db) {
  if (!has(db)) return []
  const all = (await db.getAll(STORE)).map(cleanCollection).filter(Boolean)
  return all.sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')))
}

/**
 * Writes one collection: \`after\` in place of \`before\`, or removed when
 * \`after\` is null, or made when \`before\` is null. If what is stored is not
 * \`before\`, nothing is written and Changed is thrown. Undo is the same call
 * with the two swapped.
 * @param {import('idb').IDBPDatabase} db
 * @param {{ id: string, before: object|null, after: object|null }} change
 */
export async function writeCollection(db, { id, before, after }) {
  if (!has(db)) throw new Error('Collections need version 6')
  const tx = db.transaction(STORE, 'readwrite')
  const store = tx.objectStore(STORE)
  const now = await store.get(id)
  if (!same(now ? cleanCollection(now) : null, before ? cleanCollection(before) : null)) {
    tx.abort()
    await tx.done.catch(() => {})
    throw new Changed([before?.name ?? after?.name ?? id])
  }
  if (after) await store.put(after)
  else await store.delete(id)
  await tx.done
  announce([{ kind: 'collection', op: !before ? 'created' : !after ? 'removed' : 'updated', id }])
}

/** A collection by name: the same name first, then the only one that starts with it. */
export function findCollection(collections, name, label = (c) => c.name ?? '') {
  const n = lower(name).trim()
  if (!n) return { found: null, several: [] }
  const same1 = collections.filter((c) => lower(label(c)) === n)
  if (same1.length) return { found: same1[0], several: [] }
  const starts = collections.filter((c) => lower(label(c)).startsWith(n))
  return starts.length === 1 ? { found: starts[0], several: [] } : { found: null, several: starts.map(label) }
}

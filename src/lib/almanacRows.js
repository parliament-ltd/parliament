// The Almanac's rows (refactor-plan.md, stage 5, piece 3): everything made,
// one row each, by its number (Almanac v30; almanac spec §3). Read-only.
//
// What is a row (C127, built as suggested):
// - every chat, note, term (today's highlights, C57) and quote (a pinned
//   reference, A23) that has a number;
// - a docket once it holds more than one branch. Every chat starts a docket
//   (C18), and a docket of one branch is that chat, so it has no row of its
//   own until it is forked. Archived dockets stay out.
// Pinned rows lead, whatever the order (v30); then the most recently active.
//
// toRows and sortRows are pure; readAlmanac reads the stores they need.

import { isV6 } from './records'
import { roomName } from './roomNames'

/** The kinds of row, in the order the type filter will list them (stage 6). */
export const ROW_KINDS = Object.freeze(['chat', 'docket', 'note', 'term', 'quote'])

const firstLine = (text) => String(text ?? '').trim().split('\n')[0]
const time = (iso) => {
  const t = Date.parse(iso ?? '')
  return Number.isFinite(t) ? t : 0
}

/**
 * One row per numbered thing.
 * @param {{ chats?: object[], dockets?: object[], notes?: object[], highlights?: object[], quotes?: object[],
 *   rooms?: Record<string, { own?: string, template?: string }|null> }} stores
 *   rooms: each room file's name (roomNames.js), by its id
 * @returns {Array<{ kind: string, num: number, id: string, chatId: string|null, title: string, text: string|null,
 *   summary: string|null, room: object|null, tags: string[], pinned: boolean, createdAt: string|null,
 *   activeAt: string|null, branches?: number }>}
 */
export function toRows({ chats = [], dockets = [], notes = [], highlights = [], quotes = [], rooms = {} }) {
  const chatById = new Map(chats.map((c) => [c.id, c]))
  // A chat's room by its name; a room with no name of its own is
  // { unnamed: true }, and a chat with no room file null.
  const roomOf = (chatId) => {
    const chat = chatById.get(chatId)
    if (!chat?.room || !Object.hasOwn(rooms, chat.room)) return null
    return rooms[chat.room] ?? { unnamed: true }
  }
  const numbered = (r) => Number.isInteger(r?.num)
  const rows = []

  for (const c of chats.filter(numbered)) {
    rows.push({
      kind: 'chat', num: c.num, id: c.id, chatId: c.id,
      title: c.title ?? '', text: null, summary: c.aiSummary || null,
      room: roomOf(c.id), tags: Array.isArray(c.tags) ? c.tags : [], pinned: Boolean(c.pinned),
      createdAt: c.createdAt ?? null, activeAt: c.updatedAt ?? c.createdAt ?? null,
    })
  }
  for (const d of dockets.filter(numbered)) {
    const branches = Array.isArray(d.branches) ? d.branches.length : 0
    if (d.archived || branches < 2) continue
    const first = Array.isArray(d.order) ? d.order[0] : null
    const chat = chats.find((c) => c.docketId === d.id && c.branch === first) ?? null
    rows.push({
      kind: 'docket', num: d.num, id: d.id, chatId: chat?.id ?? null, chatNum: chat?.num ?? null,
      title: d.title ?? '', text: null, summary: null,
      room: chat ? roomOf(chat.id) : null, tags: Array.isArray(d.tags) ? d.tags : [], pinned: Boolean(d.pinned),
      createdAt: d.createdAt ?? null, activeAt: d.updatedAt ?? d.createdAt ?? null, branches,
    })
  }
  const marking = (kind, r, text, chatId) => ({
    kind, num: r.num, id: r.id, chatId: chatId ?? null,
    title: firstLine(text), text: String(text ?? ''), summary: null,
    room: roomOf(chatId), tags: Array.isArray(r.tags) ? r.tags : [], pinned: Boolean(r.pinned),
    createdAt: r.createdAt ?? null, activeAt: r.createdAt ?? null,
  })
  for (const n of notes.filter(numbered)) rows.push(marking('note', n, n.text, n.conversationId))
  for (const h of highlights.filter(numbered)) rows.push(marking(h.kind === 'quote' ? 'quote' : 'term', h, h.text, h.conversationId))
  for (const q of quotes.filter(numbered)) rows.push(marking('quote', q, q.content, q.targetConversationId))
  return rows
}

/** Pinned rows first, then the most recently active, then the newest number. */
export function sortRows(rows) {
  return [...rows].sort((a, b) => (
    Number(b.pinned) - Number(a.pinned)
    || time(b.activeAt) - time(a.activeAt)
    || b.num - a.num
  ))
}

/**
 * The rows as stored now, sorted. Before version 6 nothing has a number, so
 * there are none.
 * @param {import('idb').IDBPDatabase} db
 */
export async function readAlmanac(db) {
  if (!db || !isV6(db)) return []
  const all = (store) => (db.objectStoreNames.contains(store) ? db.getAll(store) : Promise.resolve([]))
  const [chats, dockets, notes, highlights, quotes, modes] = await Promise.all(
    ['conversations', 'dockets', 'notes', 'highlights', 'pins', 'modes'].map(all),
  )
  const rooms = {}
  for (const mode of modes) rooms[mode.id] = roomName(mode)
  return sortRows(toRows({ chats, dockets, notes, highlights, quotes, rooms }))
}

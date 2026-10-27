// The rows of Records (refactor-plan.md, stage 5, piece 3, and stage 6):
// everything made, one row each, by its number (Almanac v30; almanac spec
// §3). Read-only.
//
// What is a row (C127, built as suggested):
// - every chat, note, keyword (today's highlights, C57, C131) and quote (a
//   pinned reference, A23) that has a number. Which of them the table shows
//   is the view's to say (recordsFilter.js; A19, C133);
// - a plan (a docket, C131) once it holds more than one branch. Every chat
//   starts a docket (C18), and a docket of one branch is that chat, so it has
//   no row of its own until it is forked.
// - an edit and an ask (stage 11, piece 5; C56, C220 (j)), shown only under
//   their own type: filter, never in the table as it opens.
// Archived rows are rows too, marked; the view hides them unless asked for
// with in:archive (C135, C143 (c)).
// Pinned rows lead, whatever the order (v30); then the most recently active.
//
// Each row also carries what the filters read (stage 6, piece 1; C132): its
// room's id, its plan, branch and run, the markings it holds, who answered,
// what it cost where that is known, the collections that hold it, and the
// words inside a chat, for search.
//
// toRows and sortRows are pure; readAlmanac reads the stores they need.

import { isV6 } from './records'
import { roomName } from './roomNames'
import { costOf, costsByMonth } from './chatFacts'
import { letterAt } from './addresses'

/** The kinds of row, in the order the type filter lists them. */
export const ROW_KINDS = Object.freeze(['chat', 'docket', 'note', 'term', 'quote'])

const firstLine = (text) => String(text ?? '').trim().split('\n')[0]
const time = (iso) => {
  const t = Date.parse(iso ?? '')
  return Number.isFinite(t) ? t : 0
}
const NO_FACTS = Object.freeze({ models: [], sources: [], usage: [], unpriced: 0, words: '' })

// What each collection holds, by what it points at (C139, C144 (b)): a
// chat, a plan, one note, keyword or quote, or a message, which counts as
// its chat's row.
function heldBy(collections) {
  const out = new Map()
  const add = (key, id) => { if (!out.has(key)) out.set(key, new Set()); out.get(key).add(id) }
  for (const c of collections) {
    for (const item of Array.isArray(c?.items) ? c.items : []) {
      if ((item?.kind === 'chat' || item?.kind === 'message' || !item?.kind) && item?.conversationId) add(`chat:${item.conversationId}`, c.id)
      else if (item?.kind === 'plan' && item.docketId) add(`plan:${item.docketId}`, c.id)
      else if (item?.kind === 'marking' && item.store && item.id) add(`mark:${item.store}:${item.id}`, c.id)
    }
  }
  return out
}

/**
 * One row per numbered thing.
 * @param {{ chats?: object[], dockets?: object[], notes?: object[], highlights?: object[], quotes?: object[],
 *   rooms?: Record<string, { own?: string, template?: string }|null>, facts?: Map<string, object>,
 *   collections?: object[], priceOf?: (model: string) => object|null }} stores
 *   rooms: each room file's name (roomNames.js), by its id; facts: each chat's (chatFacts.js), by its id;
 *   priceOf: a model's price from the list of models, for cost
 * @returns {object[]}
 */
export function toRows({ chats = [], dockets = [], notes = [], highlights = [], quotes = [], edits = [], asks = [], suggestions = [], rooms = {}, facts = new Map(), collections = [], priceOf = () => null }) {
  const chatById = new Map(chats.map((c) => [c.id, c]))
  const docketById = new Map(dockets.map((d) => [d.id, d]))
  const held = heldBy(collections)
  // A chat is in what holds it, or holds its plan; a marking in what holds
  // it, its chat or its chat's plan.
  const chatIn = (chatId) => {
    const chat = chatById.get(chatId)
    return new Set([...(held.get(`chat:${chatId}`) ?? []), ...(chat?.docketId ? held.get(`plan:${chat.docketId}`) ?? [] : [])])
  }
  // A chat's room by its name; a room with no name of its own is
  // { unnamed: true }, and a chat with no room file null.
  const roomOf = (chatId) => {
    const chat = chatById.get(chatId)
    if (!chat?.room || !Object.hasOwn(rooms, chat.room)) return null
    return rooms[chat.room] ?? { unnamed: true }
  }
  const roomIdOf = (chatId) => {
    const chat = chatById.get(chatId)
    return chat?.room && Object.hasOwn(rooms, chat.room) ? chat.room : null
  }
  // Where a chat sits: its number, its plan's number, its branch and run.
  const placeOf = (chatId) => {
    const chat = chatById.get(chatId)
    if (!chat) return { chatNum: null, docketNum: null, branch: null, run: null, planNext: null }
    const docket = docketById.get(chat.docketId)
    return {
      chatNum: Number.isInteger(chat.num) ? chat.num : null,
      docketNum: docket?.num ?? null,
      branch: chat.branch ?? null,
      run: Number.isInteger(chat.run) ? chat.run : null,
      // The letter the plan's next branch will have (open:203b summary, C175).
      planNext: Number.isInteger(docket?.nextLetter) && docket.nextLetter >= 0 ? letterAt(docket.nextLetter) : null,
    }
  }
  const numbered = (r) => Number.isInteger(r?.num)

  // The kinds of marking each chat holds, for has:.
  const marks = new Map()
  const mark = (chatId, kind) => {
    if (!chatId) return
    if (!marks.has(chatId)) marks.set(chatId, new Set())
    marks.get(chatId).add(kind)
  }
  for (const n of notes) mark(n.conversationId, 'note')
  for (const h of highlights) mark(h.conversationId, h.kind === 'quote' ? 'quote' : h.kind === 'highlight' ? 'highlight' : 'term')
  for (const q of quotes) mark(q.targetConversationId, 'quote')

  const rows = []
  const chatRows = new Map()
  for (const c of chats.filter(numbered)) {
    const f = facts.get(c.id) ?? NO_FACTS
    const row = {
      kind: 'chat', num: c.num, id: c.id, chatId: c.id,
      title: c.title ?? '', text: null, summary: c.aiSummary || null,
      store: 'conversations', archived: Boolean(c.archived), tagsMine: Array.isArray(c.tagsMine) ? c.tagsMine : [],
      room: roomOf(c.id), roomId: roomIdOf(c.id), tags: Array.isArray(c.tags) ? c.tags : [], pinned: Boolean(c.pinned),
      createdAt: c.createdAt ?? null, activeAt: c.updatedAt ?? c.createdAt ?? null,
      ...placeOf(c.id),
      // A chat whose insides were not read has no known cost.
      marks: [...(marks.get(c.id) ?? [])], models: f.models, sources: f.sources, cost: facts.has(c.id) ? costOf(f, priceOf) : null,
      // Its cost by month, for Settings' spending (stage 9; C181).
      monthCosts: facts.has(c.id) ? costsByMonth(f, priceOf) : null,
      collections: [...chatIn(c.id)], words: f.words,
    }
    rows.push(row)
    chatRows.set(c.id, row)
  }
  for (const d of dockets.filter(numbered)) {
    const branches = Array.isArray(d.branches) ? d.branches.length : 0
    // A plan of one chat is that chat; a plan with no chat yet shows (C198).
    if (branches < 2 && chats.some((c) => c.docketId === d.id)) continue
    const first = Array.isArray(d.order) ? d.order[0] : null
    const chat = chats.find((c) => c.docketId === d.id && c.branch === first) ?? null
    // A plan holds its chats: what they hold, who answered them, and what
    // they cost, known only if every one of theirs is.
    const own = chats.filter((c) => c.docketId === d.id).map((c) => chatRows.get(c.id)).filter(Boolean)
    const union = (key) => [...new Set(own.flatMap((r) => r[key]))]
    const costs = own.map((r) => r.cost)
    rows.push({
      kind: 'docket', num: d.num, id: d.id, chatId: chat?.id ?? null, chatNum: chat?.num ?? null,
      store: 'dockets', archived: Boolean(d.archived), tagsMine: Array.isArray(d.tagsMine) ? d.tagsMine : [],
      title: d.title ?? '', text: null, summary: null,
      room: chat ? roomOf(chat.id) : null, roomId: chat ? roomIdOf(chat.id) : null,
      tags: Array.isArray(d.tags) ? d.tags : [], pinned: Boolean(d.pinned),
      createdAt: d.createdAt ?? null, activeAt: d.updatedAt ?? d.createdAt ?? null, branches,
      docketNum: d.num, branch: null, run: null, chatNums: own.map((r) => r.num),
      marks: union('marks'), models: union('models'), sources: union('sources'),
      cost: own.length && costs.every((x) => x != null) ? costs.reduce((a, b) => a + b, 0) : null,
      collections: [...new Set([...union('collections'), ...(held.get(`plan:${d.id}`) ?? [])])], words: '',
    })
  }
  const marking = (kind, store, r, text, chatId) => ({
    kind, num: r.num, id: r.id, chatId: chatId ?? null,
    store, archived: Boolean(r.archived), tagsMine: Array.isArray(r.tagsMine) ? r.tagsMine : [],
    // Kept when its chat was erased: the number that chat had (C137 (c)).
    erasedFrom: Number.isInteger(r.erasedFrom) ? r.erasedFrom : null,
    // A note of its own: the numbers it quotes, or what it summarizes (C145).
    quotes: Array.isArray(r.quotes) ? r.quotes.filter(Number.isInteger) : [],
    summarized: r.summary && Array.isArray(r.summary.from) ? r.summary : null,
    // Where its words sit: the message, for finding it (C145 (c)).
    messageId: r.messageId ?? r.sourceMessageId ?? null,
    title: firstLine(text), text: String(text ?? ''), summary: null,
    room: roomOf(chatId), roomId: roomIdOf(chatId), tags: Array.isArray(r.tags) ? r.tags : [], pinned: Boolean(r.pinned),
    createdAt: r.createdAt ?? null, activeAt: r.createdAt ?? null,
    ...placeOf(chatId),
    marks: [], models: [], sources: [], cost: null, words: '',
    collections: [...new Set([...(held.get(`mark:${store}:${r.id}`) ?? []), ...(chatId ? chatIn(chatId) : [])])],
  })
  for (const n of notes.filter(numbered)) rows.push(marking('note', 'notes', n, n.text, n.conversationId))
  for (const h of highlights.filter(numbered)) rows.push(marking(h.kind === 'quote' ? 'quote' : 'term', 'highlights', h, h.text, h.conversationId))
  for (const q of quotes.filter(numbered)) rows.push(marking('quote', 'pins', q, q.content, q.targetConversationId))
  // Edits and asks (C220): what a card and a row show, read as text.
  const str = (v) => (typeof v === 'string' ? v : '')
  const sentOf = (s) => (s && typeof s === 'object' ? { to: str(s.to) || null, at: str(s.at) || null, into: str(s.into) || null } : null)
  for (const e of edits.filter(numbered)) {
    const words = [str(e.struck), str(e.added)].filter(Boolean).join(' → ')
    rows.push({ ...marking('edit', 'edits', e, words, e.conversationId), change: {
      kind: 'edit', mark: str(e.edit), part: e.part === 'prompt' ? 'prompt' : 'reply', struck: str(e.struck), added: str(e.added),
      held: Boolean(e.held), sent: sentOf(e.sent),
    } })
  }
  for (const a of asks.filter(numbered)) {
    const answer = a.answer && typeof a.answer === 'object'
      ? { text: str(a.answer.text), by: str(a.answer.by) || null, at: str(a.answer.at) || null, inPlace: Boolean(a.answer.inPlace) }
      : null
    rows.push({ ...marking('ask', 'asks', a, str(a.question), a.conversationId), change: {
      kind: 'ask', mark: str(a.edit), part: 'reply', question: str(a.question), passage: str(a.passage), point: Boolean(a.point),
      state: str(a.state) || 'open', answer, held: Boolean(a.held), sent: sentOf(a.sent),
    } })
  }
  // Suggestions (stage 12; C229): Ripple's or a sweep's, with where each came from.
  const num = (v) => (Number.isInteger(v) ? v : null)
  for (const g of suggestions.filter(numbered)) {
    const words = [str(g.struck), str(g.suggested)].filter(Boolean).join(' → ')
    const f = g.from && typeof g.from === 'object' ? g.from : {}
    const made = g.kind === 'sweep' ? 'sweep' : 'ripple'
    const from = made === 'sweep'
      ? { framework: str(f.framework) || null, name: str(f.name), instruction: str(f.instruction) }
      : { edit: num(f.edit), chat: num(f.chat), branch: str(f.branch) || null }
    rows.push({ ...marking('suggestion', 'suggestions', g, words, g.conversationId), change: {
      kind: 'suggestion', made, mark: str(g.mark), part: g.part === 'prompt' ? 'prompt' : 'reply', struck: str(g.struck), suggested: str(g.suggested),
      from, model: str(g.model) || null, state: ['accepted', 'rejected'].includes(g.state) ? g.state : 'open',
    } })
  }
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
 * The rows as stored now, sorted, with the collections they can be filtered
 * by. Before version 6 nothing has a number, so there are none.
 * @param {import('idb').IDBPDatabase} db
 * @param {{ facts?: ReturnType<import('./chatFacts').createFactsCache>, priceOf?: (model: string) => object|null }} [ctx]
 *   facts: the cache of what is inside each chat; without it, nothing inside is read
 * @returns {Promise<{ rows: object[], collections: object[], rooms: object[] }>}
 *   collections and rooms: each with its id and name, for in: (C132 (f))
 */
export async function readAlmanac(db, { facts = null, priceOf } = {}) {
  if (!db || !isV6(db)) return { rows: [], collections: [], rooms: [] }
  const all = (store) => (db.objectStoreNames.contains(store) ? db.getAll(store) : Promise.resolve([]))
  const [chats, dockets, notes, highlights, quotes, modes, collections, edits, asks, suggestions] = await Promise.all(
    ['conversations', 'dockets', 'notes', 'highlights', 'pins', 'modes', 'collections', 'edits', 'asks', 'suggestions'].map(all),
  )
  const rooms = {}
  for (const mode of modes) rooms[mode.id] = roomName(mode)
  const inside = facts ? await facts.read(db, chats.filter((c) => Number.isInteger(c.num))) : new Map()
  return {
    rows: sortRows(toRows({ chats, dockets, notes, highlights, quotes, edits, asks, suggestions, rooms, facts: inside, collections, priceOf })),
    collections: collections.map((c) => ({ id: c.id, name: c.name ?? null, builtIn: c.builtIn ?? null })),
    // The homepage is not a room (R3, R11).
    rooms: modes.filter((m) => m.scope !== 'homepage').map((m) => ({ id: m.id, name: rooms[m.id] })),
  }
}

// The cards a collection shows (refactor-plan.md, stage 6, piece 6;
// collection board v3; C144). Cards, not a table: markings are read, not
// scanned.
//
// A held chat or plan shows every note, keyword and quote in it, as they
// are now; one added on its own shows itself; a message shows its words. A
// card for something erased keeps its text where it has one, and says so
// (C137 (d)). Each card once, however many ways it is held.
//
// Pure: rows come from almanacRows.js, messages from the shell.

import { itemKey, markKey, headKey } from './collections'

const MARKS = new Set(['note', 'term', 'quote', 'highlight'])
const time = (iso) => {
  const t = Date.parse(iso ?? '')
  return Number.isFinite(t) ? t : 0
}

/**
 * @typedef {{ key: string, kind: string, num: number|null, text: string, chatNum: number|null, erasedFrom: number|null,
 *   createdAt: string|null, tags: string[], via: { kind: string, num: number|null }|null, gone: boolean, what?: string }} Card
 *   kind: note, term, quote, highlight, message, or gone (something erased with no words kept);
 *   via: the held chat or plan it is there through, or null for one added on its own
 */

/**
 * @param {object|null} collection
 * @param {object[]} rows every row of Records
 * @param {Map<string, object>} messages the messages it holds, by id
 * @returns {{ cards: Card[], sources: Array<{ key: string, kind: 'chat'|'plan', num: number|null, title: string, gone: boolean }> }}
 */
export function cardsOf(collection, rows, messages = new Map()) {
  if (!collection) return { cards: [], sources: [] }
  const out = new Map()
  const put = (card) => {
    const was = out.get(card.key)
    // Held through a chat and added on its own: it shows once, as held.
    if (!was || (was.via === null && card.via)) out.set(card.key, was ? { ...card } : card)
  }
  const chatRow = (id) => rows.find((r) => r.kind === 'chat' && r.chatId === id) ?? null
  const markCard = (r, via) => ({
    key: markKey(r), kind: r.kind, num: r.num, text: r.text ?? '', chatNum: r.chatNum ?? null, erasedFrom: r.erasedFrom ?? null,
    createdAt: r.createdAt ?? null, tags: r.tags ?? [], via, gone: r.erasedFrom != null,
    // A note of its own: what it quotes beneath it, or what it summarizes (C145).
    quotes: r.quotes ?? [], summary: r.summarized ?? null, own: r.kind === 'note' && !r.chatId && r.erasedFrom == null,
  })
  const goneCard = (key, what, num, via = null) => ({ key, kind: 'gone', what, num, text: '', chatNum: null, erasedFrom: null, createdAt: null, tags: [], via, gone: true })
  const sources = []

  for (const item of collection.items) {
    if (item.kind === 'chat') {
      const chat = chatRow(item.conversationId)
      const via = { kind: 'chat', num: chat?.num ?? item.num ?? null }
      sources.push({ key: itemKey(item), kind: 'chat', num: via.num, title: chat?.title ?? '', gone: !chat })
      if (chat) for (const r of rows.filter((x) => MARKS.has(x.kind) && x.chatId === chat.chatId)) put(markCard(r, via))
      else {
        // Its chat was erased: what it kept stays, with a card for the chat (C137).
        for (const r of rows.filter((x) => MARKS.has(x.kind) && item.num != null && x.erasedFrom === item.num)) put(markCard(r, via))
        put(goneCard(itemKey(item), 'chat', item.num ?? null, via))
      }
    } else if (item.kind === 'plan') {
      const chats = rows.filter((r) => r.kind === 'chat' && r.docketNum === item.num)
      const plan = rows.find((r) => r.kind === 'docket' && r.id === item.docketId)
      const via = { kind: 'plan', num: item.num ?? null }
      sources.push({ key: itemKey(item), kind: 'plan', num: via.num, title: plan?.title ?? chats[0]?.title ?? '', gone: !chats.length })
      const ids = new Set(chats.map((c) => c.chatId))
      for (const r of rows.filter((x) => MARKS.has(x.kind) && x.chatId && ids.has(x.chatId))) put(markCard(r, via))
      if (!chats.length) put(goneCard(itemKey(item), 'plan', item.num ?? null, via))
    } else if (item.kind === 'marking') {
      const r = rows.find((x) => x.store === item.store && x.id === item.id)
      put(r ? markCard(r, null) : goneCard(itemKey(item), { notes: 'note', highlights: 'term', pins: 'quote' }[item.store] ?? 'note', item.num ?? null))
    } else if (item.kind === 'message') {
      const m = messages.get(item.messageId)
      const chat = chatRow(item.conversationId)
      put(m
        ? { key: itemKey(item), kind: 'message', num: null, text: m.content ?? '', chatNum: chat?.num ?? null, erasedFrom: null, createdAt: item.addedAt ?? m.createdAt ?? null, tags: [], via: null, gone: false }
        : goneCard(itemKey(item), 'message', null))
    }
  }
  return { cards: [...out.values()], sources }
}

/** How many cards of each kind, for the tabs; a kind with none has no tab (A16). */
export function tabCounts(cards) {
  const n = { all: cards.length }
  for (const c of cards) n[c.kind] = (n[c.kind] ?? 0) + 1
  return n
}

/** The kinds a tab shows. A card for something erased shows only under All. */
export const TABS = Object.freeze(['all', 'highlight', 'term', 'quote', 'note', 'message'])

/**
 * The cards in an order, with the headings and group labels between them.
 * @param {Card[]} cards those to show (a tab, a search)
 * @param {object} collection
 * @param {'yours'|'source'|'date'} sort
 * @param {{ asc?: boolean, sources?: object[], all?: Card[] }} [opts] all: every card, for your order's keys
 * @returns {Array<{ head: object }|{ group: object }|{ card: Card, under?: string|null }>}
 */
export function sequenceOf(cards, collection, sort = 'yours', { asc = false, sources = [] } = {}) {
  const shown = new Map(cards.map((c) => [c.key, c]))
  if (sort === 'date') {
    const dir = asc ? 1 : -1
    return [...cards].sort((a, b) => dir * (time(a.createdAt) - time(b.createdAt)) || dir * ((a.num ?? 0) - (b.num ?? 0))).map((card) => ({ card, under: underOf(collection, card.key) }))
  }
  if (sort === 'source') {
    const groups = []
    const order = sources.map((s) => `${s.kind}:${s.num}`)
    const groupOf = (c) => (c.via ? `${c.via.kind}:${c.via.num}` : c.kind === 'message' ? `chat:${c.chatNum}` : 'added')
    for (const c of cards) {
      const g = groupOf(c)
      let entry = groups.find((x) => x.key === g)
      if (!entry) { entry = { key: g, cards: [] }; groups.push(entry) }
      entry.cards.push(c)
    }
    const rank = (g) => (order.includes(g.key) ? order.indexOf(g.key) : g.key === 'added' ? Infinity : order.length)
    groups.sort((a, b) => rank(a) - rank(b))
    return groups.flatMap((g) => {
      const [kind, num] = g.key === 'added' ? ['added', null] : g.key.split(':')
      return [{ group: { kind, num: num == null || num === 'null' ? null : Number(num) } }, ...g.cards.map((card) => ({ card, under: underOf(collection, card.key) }))]
    })
  }
  // Your order: the order kept, then what is not in it yet, oldest first.
  const out = []
  const seen = new Set()
  const headings = new Map(collection.headings.map((h) => [headKey(h), h]))
  for (const key of collection.order) {
    if (headings.has(key)) out.push({ head: headings.get(key) })
    else if (shown.has(key)) { out.push({ card: shown.get(key) }); seen.add(key) }
  }
  const rest = cards.filter((c) => !seen.has(c.key)).sort((a, b) => time(a.createdAt) - time(b.createdAt) || (a.num ?? 0) - (b.num ?? 0))
  for (const card of rest) out.push({ card })
  return out
}

/** Your order as keys, whole, for placing a heading or moving a card (collections.js). */
export const orderKeys = (cards, collection) => sequenceOf(cards, collection, 'yours').map((e) => (e.head ? headKey(e.head) : e.card.key))

// The heading a card sits under in your order, for the other orders (v3).
function underOf(collection, key) {
  let under = null
  const headings = new Map(collection.headings.map((h) => [headKey(h), h]))
  for (const k of collection.order) {
    if (headings.has(k)) under = headings.get(k).text
    if (k === key) return under
  }
  // Not placed yet: it follows the last heading, as your order shows it.
  return under
}

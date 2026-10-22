// The Collection's commands, planned before Enter (refactor-plan.md, stage
// 6, piece 6; collection board v3; C139, C144): new:collection, add:, rm:,
// clear:, heading:, move: for a card, name:, and the tabs and orders.
//
// Each returns what the Enter line says and what Enter does: a write of one
// collection (before and after, so the write path can refuse one something
// else overtook, and undo: can take it back), or a change of view.
//
// Pure: rows come from almanacRows.js, the collection and its cards from
// the shell (collectionCards.js), names through \`label\`.

import { targetsOf } from './rowVerbs'
import { withRows, withoutRows, withoutHeading, withHeading, withMoved, emptied, named, cleanCollectionName, findCollection, HEADING_MAX, COLLECTION_NAME_MAX } from './collections'
import { orderKeys } from './collectionCards'

const flat = (values = []) => values.flatMap((a) => (a.kind === 'list' ? a.items : [a]))
const typed = (a) => (a?.kind === 'text' ? a.value : a?.text ?? '')
const write = (before, after) => ({ kind: 'collectionWrite', id: before.id, before, after })

// The collection on screen, or an answer that there is none.
function shownOr(screens) {
  const c = screens.collection?.shown ?? null
  return c ? { c } : { bad: { message: 'collectionNone', values: { board: 'collection' } } }
}

/** new:collection: an empty one, kept at once, shown on the Collection (C139). */
export function planNew(step) {
  const [what] = step.match?.values ?? []
  if (what?.value !== 'collection' || (step.match?.values ?? []).length > 1) return null
  return { says: { message: 'collectionNew' }, act: { kind: 'newCollection' } }
}

/** add:207, 216: into the collection on screen, from Records or the Collection. */
export function planAdd(step, screens) {
  const args = step.match?.values ?? []
  if (args[0]?.kind !== 'address' && args[0]?.kind !== 'list') return null // add:highlights is the Lab's
  const s = shownOr(screens)
  if (s.bad) return { says: s.bad, act: null }
  const t = targetsOf(args, screens.records?.rows ?? [])
  if (t.bad) return { says: t.bad, act: null }
  const r = withRows(s.c, t.rows, screens.records?.nowIso)
  const name = screens.collection.label(s.c)
  if (!r.added.length) return { says: { message: 'collectionAlready', values: { name } }, act: null }
  return { says: { message: 'collectionAdd', values: { nums: r.added.map((x) => x.num), name } }, act: write(s.c, r.next) }
}

/** rm:207 takes out what was added; rm:"Causes" a heading (C144 (g)). */
export function planRm(step, screens) {
  const args = step.match?.values ?? []
  const s = shownOr(screens)
  if (s.bad) return { says: s.bad, act: null }
  const name = screens.collection.label(s.c)
  const now = screens.records?.nowIso
  if (args[0]?.kind === 'text' || (args[0]?.kind === 'word' && args.length === 1)) {
    const h = withoutHeading(s.c, typed(args[0]), now)
    if (!h) return { says: { message: 'headingNone', values: { heading: typed(args[0]) } }, act: null }
    return { says: { message: 'headingRm', values: { heading: h.heading.text } }, act: write(s.c, h.next) }
  }
  const t = targetsOf(args, screens.records?.rows ?? [])
  if (t.bad) return { says: t.bad, act: null }
  // A card there because its chat or plan is held comes out with that.
  const holderOf = (row) => s.c.items.find((i) => (i.kind === 'chat' && row.chatId && i.conversationId === row.chatId && row.kind !== 'chat')
    || (i.kind === 'plan' && row.docketNum != null && i.num === row.docketNum && row.kind !== 'docket')) ?? null
  const r = withoutRows(s.c, t.rows, holderOf, now)
  const also = r.held.map((h) => ({ message: 'collectionHeld', values: { num: h.row.num, by: h.by } }))
  if (!r.removed.length) {
    return { says: r.held.length ? { ...also[0], also: also.slice(1) } : { message: 'collectionNotIn', values: { nums: r.absent.map((x) => x.num), count: r.absent.length, name } }, act: null }
  }
  return { says: { message: 'collectionRm', values: { nums: r.removed.map((x) => x.num), name }, also }, act: write(s.c, r.next) }
}

/** clear: alone empties the collection on screen; what it held stays where it is. */
export function planClear(screens) {
  const s = shownOr(screens)
  if (s.bad) return { says: s.bad, act: null }
  const count = s.c.items.length + s.c.headings.length
  const name = screens.collection.label(s.c)
  if (!count) return { says: { message: 'collectionEmptyAlready', values: { name } }, act: null }
  return { says: { message: 'collectionClear', values: { name, count } }, act: write(s.c, emptied(s.c, screens.records?.nowIso)) }
}

// The key of the card a number names here.
const cardKeyOf = (cards, num) => cards.find((c) => c.num === num)?.key ?? null

/** heading:"Causes", or heading:"Causes" before 215 (C144 (e)). */
export function planHeading(step, screens) {
  const s = shownOr(screens)
  if (s.bad) return { says: s.bad, act: null }
  const [text, where, at] = step.match?.values ?? []
  const clean = cleanCollectionName(typed(text), HEADING_MAX)
  if (clean.error === 'empty') return { says: { message: 'headingEmpty' }, act: null }
  if (clean.error === 'long') return { says: { message: 'headingLong', values: { max: HEADING_MAX } }, act: null }
  const cards = screens.collection.cards ?? []
  let target = null
  if (at) {
    target = cardKeyOf(cards, at.num)
    if (!target) return { says: { message: 'collectionCardNone', values: { num: at.num } }, act: null }
  }
  const ids = s.c.headings.map((h) => Number(String(h.id).replace(/^h/, ''))).filter(Number.isFinite)
  const id = `h${ids.length ? Math.max(...ids) + 1 : 1}`
  const next = withHeading(s.c, { id, text: clean.name, where: where?.value ?? null, target }, orderKeys(cards, s.c), screens.records?.nowIso)
  const says = at
    ? { message: where.value === 'after' ? 'headingAfter' : 'headingBefore', values: { heading: clean.name, num: at.num } }
    : { message: 'headingEnd', values: { heading: clean.name } }
  return { says, act: write(s.c, next) }
}

/** move:218 after 214: a card's place in your order (C144 (e)). */
export function planMoveCard(step, screens) {
  const s = shownOr(screens)
  if (s.bad) return { says: s.bad, act: null }
  const [card, where, at] = step.match?.values ?? []
  const cards = screens.collection.cards ?? []
  const key = cardKeyOf(cards, card.num)
  const target = cardKeyOf(cards, at.num)
  if (!key) return { says: { message: 'collectionCardNone', values: { num: card.num } }, act: null }
  if (!target) return { says: { message: 'collectionCardNone', values: { num: at.num } }, act: null }
  if (key === target) return { says: { message: 'moveCardSame' }, act: null }
  const next = withMoved(s.c, key, where.value, target, orderKeys(cards, s.c), screens.records?.nowIso)
  return { says: { message: where.value === 'after' ? 'moveCardAfter' : 'moveCardBefore', values: { num: card.num, at: at.num } }, act: write(s.c, next) }
}

/** name:"Q2 evidence" for the collection on screen (C144 (i)). */
export function planNameCollection(step, screens) {
  const s = shownOr(screens)
  if (s.bad) return { says: s.bad, act: null }
  const clean = cleanCollectionName(typed(step.match?.values?.[0]))
  if (clean.error === 'empty') return { says: { message: 'nameEmpty' }, act: null }
  if (clean.error === 'long') return { says: { message: 'nameTitleLong', values: { max: COLLECTION_NAME_MAX } }, act: null }
  const label = screens.collection.label
  if (label(s.c) === clean.name) return { says: { message: 'collectionNameSame' }, act: null }
  const taken = (screens.collection.all ?? []).some((c) => c.id !== s.c.id && label(c).toLocaleLowerCase() === clean.name.toLocaleLowerCase())
  if (taken) return { says: { message: 'collectionNameTaken', values: { name: clean.name } }, act: null }
  return { says: { message: 'collectionName', values: { name: clean.name } }, act: write(s.c, named(s.c, clean.name, screens.records?.nowIso)) }
}

/** forget:"Q2 evidence": the collection goes; what it held stays where it is. */
export function planForgetCollection(found, screens) {
  // Favorites is an ordinary collection now: a favourite is a tag (C147 (d)).
  return { says: { message: 'collectionForget', values: { name: screens.collection.label(found) } }, act: write(found, null) }
}

/** A collection by name, through the names people read. */
export const collectionNamed = (screens, name) => findCollection(screens.collection?.all ?? [], name, screens.collection?.label ?? ((c) => c.name ?? ''))

/** sort: and type: on the Collection: its order and its tab (C144 (d), (e)). */
export function planCollectionView(step, view = {}) {
  const word = step.match?.values?.[0]
  if (step.verb === 'sort') {
    const sort = { yours: ['yours', false], source: ['source', false], newest: ['date', false], oldest: ['date', true], created: ['date', false] }[word?.value]
    if (!sort) return { says: { message: 'sortCollection', values: { board: 'collection' } }, act: null }
    return { says: { message: 'collectionSort', values: { sort: sort[0], asc: sort[1] ? 'yes' : 'no' } }, act: { kind: 'collectionView', view: { ...view, sort: sort[0], asc: sort[1] } } }
  }
  const kinds = { keyword: 'term', quote: 'quote', note: 'note', highlight: 'highlight' }
  const items = flat(step.match?.values ?? [])
  if (step.minus || items.length !== 1 || !kinds[items[0].value]) return { says: { message: 'typeCollection', values: { board: 'collection' } }, act: null }
  return { says: { message: 'collectionTab', values: { kind: kinds[items[0].value] } }, act: { kind: 'collectionView', view: { ...view, tab: kinds[items[0].value] } } }
}

// The four acts, compare: and jump: (refactor-plan.md, stage 6, piece 7;
// collection board v3; C145). Each is planned before Enter: what the Enter
// line says, and what Enter does.
//
//   note:214, 217 "…"   a note in your words, quoting them beneath it
//   tagadd:             the Tag act writes it; the row verb does the rest
//   summarize:214, 217  a dated summary note: one call, named first
//   p>                  a new chat about the selected cards (the shell)
//   compare:218 231     two side by side, word by word, nothing sent
//   jump:218            finds 218: its card, its passage or its row
//
// Pure: rows come from almanacRows.js, the collection from the shell.

import { targetsOf } from './rowVerbs'
import { summaryCost } from '../shell/estimate'

export const NOTE_MAX = 20_000
// What a summary or a prompt can take in one go, in cards.
export const CARDS_MAX = 100
const CENT = 0.01

/** Kinds whose words a card shows: these can be quoted, summarized and compared. */
export const WORDED = new Set(['note', 'term', 'quote', 'highlight'])

const flat = (args = []) => args.flatMap((a) => (a.kind === 'list' ? a.items : [a]))
const isNumberArg = (a) => a?.kind === 'address' || a?.kind === 'number' || a?.kind === 'list'

// The collection on screen, when the bar points at the Collection.
const shownHere = (addressed, screens) => (addressed === 'collection' ? screens.collection?.shown ?? null : null)

/**
 * note:214, 217 "Thread for the essay", or note:"Check the dates" (C145 (e)).
 * A note written here has no chat; the numbers are quoted beneath it.
 */
export function planNote(step, screens = {}, addressed = null) {
  const args = step.args ?? []
  const last = args[args.length - 1]
  let text
  let quoted = []
  if (args.length > 1 && last?.kind === 'text' && args.slice(0, -1).every(isNumberArg)) {
    const t = targetsOf(args.slice(0, -1), screens.records?.rows ?? [])
    if (t.bad) return { says: t.bad, act: null }
    quoted = t.rows
    text = last.value
  } else if (args.length && args.every(isNumberArg)) {
    return { says: { message: 'noteWords', values: { example: `note:${flat(args).map((a) => a.num ?? a.value).join(', ')} "…"` } }, act: null }
  } else {
    text = step.match?.values?.[0] ?? ''
  }
  text = String(text ?? '').trim()
  if (!text) return { says: { message: 'noteWords', values: { example: quoted.length ? `note:${quoted.map((r) => r.num).join(', ')} "…"` : 'note:"Check the dates"' } }, act: null }
  if ([...text].length > NOTE_MAX) return { says: { message: 'noteLong', values: { max: NOTE_MAX } }, act: null }
  const nums = quoted.map((r) => r.num)
  const shown = shownHere(addressed, screens)
  const name = shown ? screens.collection.label(shown) : null
  const says = shown
    ? { message: nums.length ? 'noteInQuoting' : 'noteIn', values: { name, nums } }
    : { message: nums.length ? 'noteAloneQuoting' : 'noteAlone', values: { board: 'almanac', nums } }
  return { says: { ...says, also: [{ message: 'noteNeverSent' }] }, act: { kind: 'note', text, quotes: nums, collection: shown?.id ?? null } }
}

/** The cards a command names, or all the numbered ones shown when it names none. */
function cardsNamed(args, screens) {
  const rows = screens.records?.rows ?? []
  if (!args.length) {
    const nums = (screens.collection?.cards ?? []).filter((c) => c.num != null && WORDED.has(c.kind)).map((c) => c.num)
    return { rows: nums.map((n) => rows.find((r) => r.num === n)).filter(Boolean) }
  }
  return targetsOf(args, rows)
}

/**
 * summarize:214, 217 on the Collection: a summary note, dated and never
 * changed afterwards. One call, named with its cost before Enter (C145 (g)).
 * @param {{ keyed?: boolean|null, provider?: string, price?: object|null }} helper the model that titles chats (C62)
 */
export function planSummarize(step, screens = {}, addressed = null) {
  if (addressed !== 'collection') return { says: { message: 'summarizeWhere', values: { board: 'collection' } }, act: null }
  const shown = screens.collection?.shown ?? null
  if (!shown) return { says: { message: 'collectionNone', values: { board: 'collection' } }, act: null }
  const t = cardsNamed(step.match?.values ?? [], screens)
  if (t.bad) return { says: t.bad, act: null }
  if (!t.rows.length) return { says: { message: 'summarizeNothing' }, act: null }
  const odd = t.rows.find((r) => !WORDED.has(r.kind))
  if (odd) return { says: { message: 'summarizeKinds', values: { num: odd.num } }, act: null }
  if (t.rows.length > CARDS_MAX) return { says: { message: 'summarizeMany', values: { max: CARDS_MAX } }, act: null }
  const helper = screens.helper ?? {}
  if (helper.keyed == null) return { says: { message: 'promptChecking' }, act: null }
  if (!helper.keyed) return { says: { message: 'summarizeNoKey', values: { provider: helper.provider } }, act: null }
  const nums = t.rows.map((r) => r.num)
  const chars = t.rows.reduce((n, r) => n + String(r.text ?? '').length, 0)
  const cost = summaryCost(chars, helper.price)
  const values = { nums, name: screens.collection.label(shown), provider: helper.provider }
  const says = cost == null
    ? { message: 'summarizeUnpriced', values }
    : cost < CENT
      ? { message: 'summarizeCheap', values: { ...values, cost: CENT } }
      : { message: 'summarize', values: { ...values, cost } }
  // A quote is kept from models until the person acts on it: this is acting (C78).
  const quotes = t.rows.filter((r) => r.kind === 'quote').map((r) => r.num)
  const also = quotes.length ? [{ message: 'summarizeQuotes', values: { nums: quotes, count: quotes.length } }] : []
  return { says: { ...says, also }, act: { kind: 'summarize', nums, collection: shown.id } }
}

/** compare:218 231: two side by side under the bar, word by word (C145 (i)). */
export function planCompare(step, screens = {}) {
  const args = flat(step.match?.values ?? [])
  if (args.length !== 2) return { says: { message: 'compareTwo' }, act: null }
  const t = targetsOf(args, screens.records?.rows ?? [])
  if (t.bad) return { says: t.bad, act: null }
  if (t.rows.length !== 2) return { says: { message: 'compareSame' }, act: null }
  const odd = t.rows.find((r) => !WORDED.has(r.kind))
  if (odd) return { says: { message: 'compareKinds', values: { num: odd.num } }, act: null }
  const [a, b] = t.rows
  return { says: { message: 'compare', values: { a: a.num, b: b.num }, also: [{ message: 'compareNothingSent' }] }, act: { kind: 'compare', nums: [a.num, b.num] } }
}

/**
 * jump:218 finds 218 on the board the bar points at: its card on the
 * Collection, its passage in a room, its row on Records (C145 (c)).
 */
export function planJump(step, screens = {}, addressed = null) {
  const [arg] = step.match?.values ?? []
  const t = targetsOf([arg], screens.records?.rows ?? [])
  if (t.bad) return { says: t.bad, act: null }
  const row = t.rows[0]
  if (addressed === 'collection') {
    const shown = screens.collection?.shown ?? null
    if (!shown) return { says: { message: 'collectionNone', values: { board: 'collection' } }, act: null }
    if (!(screens.collection.cards ?? []).some((c) => c.num === row.num)) {
      return { says: { message: 'jumpNotHeld', values: { num: row.num, name: screens.collection.label(shown) } }, act: null }
    }
    return { says: { message: 'jumpCard', values: { num: row.num } }, act: { kind: 'find', num: row.num, to: 'card' } }
  }
  if (addressed === 'room') {
    if (!WORDED.has(row.kind)) return { says: { message: 'jumpOpen', values: { num: row.num } }, act: null }
    if (!row.chatId) return { says: { message: 'jumpNoChat', values: { num: row.num } }, act: null }
    return { says: { message: 'jumpPassage', values: { num: row.num } }, act: { kind: 'find', num: row.num, to: 'chat' } }
  }
  if (addressed === 'almanac') return { says: { message: 'jumpRow', values: { num: row.num } }, act: { kind: 'find', num: row.num, to: 'row' } }
  return { says: { message: 'jumpWhere', values: { first: 'almanac', second: 'collection' } }, act: null }
}

/**
 * What is selected, for the foot of the Collection: how many of each kind,
 * and each by kind and number, in the order they were picked.
 * @param {Array<{ num: number|null, kind: string }>} cards every card shown
 * @param {number[]} picked the numbers selected
 */
export function selectionOf(cards, picked) {
  const byNum = new Map(cards.filter((c) => c.num != null).map((c) => [c.num, c]))
  const items = picked.map((n) => byNum.get(n)).filter(Boolean).map((c) => ({ num: c.num, kind: c.kind }))
  const kinds = {}
  for (const c of items) kinds[c.kind] = (kinds[c.kind] ?? 0) + 1
  return { items, kinds, nums: items.map((c) => c.num) }
}

/** The commands the four acts write into the bar, with the numbers (C145 (d)). */
export const actCommand = {
  note: (nums) => (nums.length ? `>note:${nums.join(', ')} ""` : '>note:""'),
  tag: (nums) => `>tagadd:"" ${nums.join(', ')}`,
  summarize: (nums) => (nums.length ? `>summarize:${nums.join(', ')}` : '>summarize:'),
}

/**
 * The words that go first in a prompt about some cards: each card's words,
 * quoted, and what it is. Its words are data: quoted, never instructions.
 * @param {object[]} rows the cards' rows, in order
 * @param {(row: object) => string} label "note 214" in the reader's language
 */
export function aboutText(rows, label) {
  return rows.map((r) => `${String(r.text ?? '').split('\n').map((l) => `> ${l}`).join('\n')}\n(${label(r)})`).join('\n\n')
}

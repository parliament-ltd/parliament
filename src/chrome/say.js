// Turning the Enter line's data into words, through the copy table (C87).
// Board keys become board names; lists are joined the way the reader's
// language joins them; a cost is written as the reader's language writes
// money, and a share of the width as it writes a percentage; commands stay
// as typed.

import { COPY } from '../copy'

const BOARD_VALUES = new Set(['board', 'first', 'second', 'other'])
// One board named in a sentence: a room on screen is Room, as the strip
// names it; a room the line names by its chat comes as that number.
const ROOM_BOARD = /^room(-\d+)?$/
const oneBoard = (i18n, value) => (ROOM_BOARD.test(String(value)) ? i18n._(COPY.boards.oneRoom) : boardName(i18n, value))
const AND_LISTS = new Set(['boards', 'verbs', 'sources', 'filters', 'nums', 'frameworks', 'phrases', 'answering', 'choices', 'files', 'whos'])
const PERCENTS = new Set(['percent', 'low', 'high', 'share'])

/** A day, given as 2026-09-01, the way the reader's language writes a date in full. */
export function longDay(i18n, day) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(day ?? ''))
  if (!m) return String(day ?? '')
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const options = { day: 'numeric', month: 'long', year: 'numeric' }
  try {
    return new Intl.DateTimeFormat(i18n.locale, options).format(date)
  } catch {
    return new Intl.DateTimeFormat('en', options).format(date)
  }
}

const boardName = (i18n, key) => (COPY.boards[key] ? i18n._(COPY.boards[key]) : key)

// Records' columns by the names their headings carry (cols:, C141).
const COLUMN_NAMES = {
  type: COPY.almanac.colType, id: COPY.almanac.colId, title: COPY.almanac.colTitle, room: COPY.almanac.colRoom,
  tags: COPY.almanac.colTags, created: COPY.almanac.colCreated, active: COPY.almanac.colActive,
}
/** A column of Records by the name its heading carries. */
export const columnName = (i18n, key) => (COLUMN_NAMES[key] ? i18n._(COLUMN_NAMES[key]) : key)

function joined(i18n, items, type) {
  try {
    return new Intl.ListFormat(i18n.locale, { type }).format(items)
  } catch {
    return items.join(', ')
  }
}

// Prices in the list of models are in US dollars.
const CURRENCY = 'USD'

/** An amount of money the way the reader's language writes it: $0.02, 0,02 US$. */
export function money(i18n, amount) {
  const options = { style: 'currency', currency: CURRENCY, minimumFractionDigits: 2, maximumFractionDigits: 2 }
  try {
    return new Intl.NumberFormat(i18n.locale, options).format(amount)
  } catch {
    return new Intl.NumberFormat('en', options).format(amount)
  }
}

/** A share of the width the way the reader's language writes a percentage: 60%, 60 %. */
export function percent(i18n, value) {
  const options = { style: 'percent', maximumFractionDigits: 0 }
  try {
    return new Intl.NumberFormat(i18n.locale, options).format(value / 100)
  } catch {
    return new Intl.NumberFormat('en', options).format(value / 100)
  }
}

/**
 * The words for one Enter line message.
 * @param {import('@lingui/core').I18n} i18n
 * @param {string} message a key of COPY.enter
 * @param {object} [values]
 */
export function say(i18n, message, values = {}) {
  const descriptor = COPY.enter[message]
  if (!descriptor) return ''
  const words = {}
  for (const [key, value] of Object.entries(values ?? {})) {
    // A room on screen is Room, as the strip names it; Rooms names them all (30 October).
    if (BOARD_VALUES.has(key)) words[key] = oneBoard(i18n, value)
    // A block and a slot of a room, by their ids (the Lab, stage 13; C238).
    else if (key === 'block') words[key] = COPY.blocks[value] ? i18n._(COPY.blocks[value]) : String(value)
    else if (key === 'blocks') words[key] = joined(i18n, value.map((b) => (COPY.blocks[b] ? i18n._(COPY.blocks[b]) : String(b))), 'conjunction')
    else if (key === 'fromSlot' || key === 'toSlot') words[key] = COPY.slots[value] ? i18n._(COPY.slots[value]) : String(value)
    else if (key === 'boards') words[key] = joined(i18n, value.map((b) => oneBoard(i18n, b)), 'conjunction')
    // A focus set's boards (C253): the room as the chat it shows.
    else if (key === 'focusBoards') words[key] = joined(i18n, value.map((b) => (b === 'room' ? i18n._(COPY.enter.focusTheChat) : boardName(i18n, b))), 'conjunction')
    else if (AND_LISTS.has(key)) words[key] = joined(i18n, value.map(String), 'conjunction')
    // What the privacy filter found, by kind (C167): "an email address and 2 phone numbers".
    else if (key === 'found') words[key] = joined(i18n, Object.entries(value).filter(([k, n]) => n > 0 && COPY.privacyFound[k]).map(([k, n]) => i18n._(COPY.privacyFound[k], { count: n })), 'conjunction')
    else if (key === 'words' || key === 'names') words[key] = joined(i18n, value, 'disjunction')
    else if ((key === 'cost' || key === 'warn') && typeof value === 'number') words[key] = money(i18n, value)
    else if (PERCENTS.has(key) && typeof value === 'number') words[key] = percent(i18n, value)
    else if (key === 'day') words[key] = longDay(i18n, value)
    // A section of Settings, by its title (open:settings keys; C181).
    else if (key === 'section' && COPY.settings?.[`${value}Title`]) words[key] = i18n._(COPY.settings[`${value}Title`])
    else if (key === 'cols' && Array.isArray(value)) words[key] = joined(i18n, value.map((c) => columnName(i18n, c)), 'conjunction')
    else if (key === 'col') words[key] = columnName(i18n, value)
    // What erase: takes, each its number and its words (C137 (a)).
    // When one of several sent one after another runs (C201).
    else if (key === 'when') words[key] = i18n._(COPY.enter.manyWhen, { cond: value ?? 'finished' })
    else if (key === 'erasing' && Array.isArray(value)) {
      words[key] = joined(i18n, value.map((x) => (x.title ? i18n._(COPY.enter.eraseItem, { num: x.num, title: x.title }) : String(x.num))), 'conjunction')
    }
    else words[key] = value
  }
  return i18n._(descriptor, words)
}

/**
 * What a room is called, in words: its own name, a built-in room's name in
 * the reader's language, or "unnamed room" (C90; roomNames.js).
 * @param {{ own?: string, template?: string }|null} name
 */
export function roomLabel(i18n, name) {
  if (name?.own) return name.own
  if (name?.template && COPY.templates[name.template]) return i18n._(COPY.templates[name.template])
  return i18n._(COPY.room.unnamed)
}

export { boardName }

/** Items joined the way the reader's language joins a list with "and". */
export const andList = (i18n, items) => joined(i18n, items, 'conjunction')

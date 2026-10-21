// Turning the Enter line's data into words, through the copy table (C87).
// Board keys become board names; lists are joined the way the reader's
// language joins them; a cost is written as the reader's language writes
// money; commands stay as typed.

import { COPY } from '../copy'

const BOARD_VALUES = new Set(['board', 'first', 'second'])
const AND_LISTS = new Set(['boards', 'verbs'])

const boardName = (i18n, key) => (COPY.boards[key] ? i18n._(COPY.boards[key]) : key)

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
    if (BOARD_VALUES.has(key)) words[key] = boardName(i18n, value)
    else if (key === 'boards') words[key] = joined(i18n, value.map((b) => boardName(i18n, b)), 'conjunction')
    else if (AND_LISTS.has(key)) words[key] = joined(i18n, value, 'conjunction')
    else if (key === 'words') words[key] = joined(i18n, value, 'disjunction')
    else if (key === 'cost' && typeof value === 'number') words[key] = money(i18n, value)
    else words[key] = value
  }
  return i18n._(descriptor, words)
}

export { boardName }

// Which language the interface speaks, and its writing direction
// (refactor-plan.md, stage 3; C87; Lingui chosen 20 October).
//
// The language comes from the browser's own list of the languages its user
// reads, never from the network address (C89). Only languages Parliament
// ships are offered; today that is English, so everyone gets English until the
// first translations ship (C87). In development a test language can be
// chosen with ?lang=en-XA (accented, longer) or ?lang=ar-XB (right to left).
//
// Choosing a language with `language:` or the globe comes later (ruled
// 16 October); it will call switchLanguage() here.

import { i18n } from '@lingui/core'
import { messages as en } from './locales/en/messages.mjs'

export { i18n }

export const SOURCE_LANGUAGE = 'en'
// Languages offered to people, by their own names when there is more than one.
export const SHIPPED_LANGUAGES = ['en']
// Generated for testing on every compile; offered only in development.
export const TEST_LANGUAGES = ['en-XA', 'ar-XB']

const LOADERS = {
  'en-XA': () => import('./locales/en-XA/messages.mjs'),
  'ar-XB': () => import('./locales/ar-XB/messages.mjs'),
}

// Scripts written right to left, for browsers whose Intl.Locale cannot say.
const RIGHT_TO_LEFT = new Set(['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'yi', 'dv', 'ug', 'ckb'])

/** 'rtl' or 'ltr' for a language tag. */
export function directionOf(tag) {
  try {
    const locale = new Intl.Locale(tag)
    const info = typeof locale.getTextInfo === 'function' ? locale.getTextInfo() : locale.textInfo
    if (info?.direction) return info.direction
  } catch { /* not a valid tag: fall through */ }
  return RIGHT_TO_LEFT.has(String(tag).split('-')[0].toLowerCase()) ? 'rtl' : 'ltr'
}

/**
 * The first language in the person's list that Parliament has: an exact
 * match first, then the same language in another region (sv-FI finds sv).
 * English when there is none.
 */
export function pickLanguage(preferred = [], available = SHIPPED_LANGUAGES) {
  const have = available.map((tag) => tag.toLowerCase())
  for (const tag of preferred) {
    const exact = have.indexOf(String(tag).toLowerCase())
    if (exact >= 0) return available[exact]
    const base = String(tag).split('-')[0].toLowerCase()
    const sameLanguage = have.findIndex((h) => h.split('-')[0] === base)
    if (sameLanguage >= 0) return available[sameLanguage]
  }
  return SOURCE_LANGUAGE
}

/** Make a language the interface's: load its catalogue, then set the page's lang and dir. */
export async function switchLanguage(tag) {
  if (tag === SOURCE_LANGUAGE || !LOADERS[tag]) {
    i18n.loadAndActivate({ locale: SOURCE_LANGUAGE, messages: en })
  } else {
    const { messages } = await LOADERS[tag]()
    i18n.loadAndActivate({ locale: tag, messages })
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = i18n.locale
    document.documentElement.dir = directionOf(i18n.locale)
  }
  return i18n.locale
}

// Dev only: a test language from ?lang=, kept for the tab.
function devTestLanguage() {
  if (!import.meta.env?.DEV || typeof window === 'undefined') return null
  try {
    const asked = new URLSearchParams(window.location.search).get('lang')
    if (asked) sessionStorage.setItem('parliament-dev-lang', asked)
    const tag = asked || sessionStorage.getItem('parliament-dev-lang')
    return TEST_LANGUAGES.includes(tag) || tag === SOURCE_LANGUAGE ? tag : null
  } catch {
    return null
  }
}

/**
 * At start-up: English straight away, so the first render has words, then
 * the person's language (or a test language in development) once loaded.
 */
export function startLanguage() {
  i18n.loadAndActivate({ locale: SOURCE_LANGUAGE, messages: en })
  const wanted = devTestLanguage()
    ?? pickLanguage(typeof navigator !== 'undefined' ? navigator.languages || [] : [], SHIPPED_LANGUAGES)
  return switchLanguage(wanted)
}

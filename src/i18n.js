// Which language the interface speaks, and its writing direction
// (refactor-plan.md, stage 3; C87; Lingui chosen 20 October).
//
// The language comes from the browser's own list of the languages its user
// reads, never from the network address (C89). Only languages Parliament
// ships are offered; today that is English, so everyone gets English until the
// first translations ship (C87). In development a test language can be
// chosen with ?lang=en-XA (accented, longer) or ?lang=ar-XB (right to left).
//
// Choosing a language with `language:` or the globe (ruled 16 October;
// stage 9, piece 4; C184) is a setting of the person's, interfaceLanguage;
// InterfaceLanguage (App.jsx) applies it with switchLanguage() here.

import { i18n, setupI18n } from '@lingui/core'
import { messages as en } from './locales/en/messages.mjs'

export { i18n }

export const SOURCE_LANGUAGE = 'en'
// Languages offered to people, by their own names when there is more than one.
export const SHIPPED_LANGUAGES = ['en']
// Generated for testing on every compile; offered only in development.
export const TEST_LANGUAGES = ['en-XA', 'ar-XB']
// Drafted for Stefan's review (C87; C184): offered in development only, and
// marked as drafts, until he has read them. Shipping one moves it to
// SHIPPED_LANGUAGES, and the page then opts out of the browser's own
// translation (C84).
export const DRAFT_LANGUAGES = ['ja', 'zh-Hans', 'sv', 'fi']

const DEV = Boolean(import.meta.env.DEV)
const LOADERS = {
  'en-XA': () => import('./locales/en-XA/messages.mjs'),
  'ar-XB': () => import('./locales/ar-XB/messages.mjs'),
  // import.meta.env.DEV as written, so the build leaves the drafts out of
  // production entirely.
  ...(import.meta.env.DEV ? {
    ja: () => import('./locales/ja/messages.mjs'),
    'zh-Hans': () => import('./locales/zh-Hans/messages.mjs'),
    sv: () => import('./locales/sv/messages.mjs'),
    fi: () => import('./locales/fi/messages.mjs'),
  } : {}),
}

/** The languages the picker offers: those shipped, and in development the drafts. */
export function offeredLanguages(dev = DEV) {
  return [...SHIPPED_LANGUAGES, ...(dev ? DRAFT_LANGUAGES : [])]
}

/** Whether a language is offered only as a draft. */
export const isDraft = (tag) => DRAFT_LANGUAGES.includes(tag) && !SHIPPED_LANGUAGES.includes(tag)

// Catalogues loaded so far, for the Enter line of `language:`, which speaks
// the language chosen before it is chosen (ruled 16 October).
const loaded = new Map()
const speakers = new Map()
const listeners = new Set()
let loads = 0

/** Load a language's words without switching to it. */
export function preloadLanguage(tag) {
  if (!tag || loaded.has(tag) || !LOADERS[tag]) return
  loaded.set(tag, undefined)
  LOADERS[tag]().then(({ messages }) => {
    loaded.set(tag, messages)
    loads += 1
    for (const fn of listeners) fn()
  }).catch(() => loaded.delete(tag))
}

/** An i18n that speaks a language already loaded, or null. English is the page's own. */
export function speakerOf(tag) {
  if (!tag) return null
  if (tag === SOURCE_LANGUAGE) return setupSpeaker(tag, en)
  const messages = loaded.get(tag)
  return messages ? setupSpeaker(tag, messages) : null
}
function setupSpeaker(tag, messages) {
  if (!speakers.has(tag)) speakers.set(tag, setupI18n({ locale: tag, messages: { [tag]: messages } }))
  return speakers.get(tag)
}
/** For useSyncExternalStore: a language finished loading. */
export const onLanguageLoaded = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }
export const languageLoads = () => loads

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
    if (i18n.locale !== SOURCE_LANGUAGE) i18n.loadAndActivate({ locale: SOURCE_LANGUAGE, messages: en })
  } else if (i18n.locale !== tag) {
    const { messages } = await LOADERS[tag]()
    i18n.loadAndActivate({ locale: tag, messages })
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = i18n.locale
    document.documentElement.dir = directionOf(i18n.locale)
  }
  return i18n.locale
}

/**
 * The page opts out of the browser's own translation once a real
 * translation ships (C84): its words, chats included, would otherwise be
 * sent away to be translated.
 */
export function optOutOfPageTranslation(shipped = SHIPPED_LANGUAGES) {
  if (shipped.length < 2 || typeof document === 'undefined') return false
  document.documentElement.setAttribute('translate', 'no')
  if (!document.querySelector('meta[name="google"]')) {
    const meta = document.createElement('meta')
    meta.name = 'google'
    meta.content = 'notranslate'
    document.head.appendChild(meta)
  }
  return true
}

/** The language the page starts in when none is chosen: a test language in development, else the browser's. */
export function startingLanguage() {
  return devTestLanguage()
    ?? pickLanguage(typeof navigator !== 'undefined' ? navigator.languages || [] : [], SHIPPED_LANGUAGES)
}

/** The language the page is in: the one chosen, when offered, else the starting one. */
export function languageFor(chosen, offered = offeredLanguages()) {
  return chosen && offered.includes(chosen) ? chosen : startingLanguage()
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
  optOutOfPageTranslation()
  return switchLanguage(startingLanguage())
}

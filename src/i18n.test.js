import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { VERBS } from './commands/verbs'
import { setupI18n } from '@lingui/core'
import { pickLanguage, directionOf, offeredLanguages, isDraft, languageFor, optOutOfPageTranslation, DRAFT_LANGUAGES, SHIPPED_LANGUAGES } from './i18n'
import { COPY } from './copy'
import { messages as en } from './locales/en/messages.mjs'
import { messages as accented } from './locales/en-XA/messages.mjs'
import { messages as mirrored } from './locales/ar-XB/messages.mjs'

describe('choosing the language', () => {
  it("takes the first of the person's languages that Parliament has, then the same language elsewhere, then English", () => {
    expect(pickLanguage(['sv-SE', 'en'], ['en', 'sv'])).toBe('sv')
    expect(pickLanguage(['fi', 'sv-FI'], ['en', 'sv'])).toBe('sv')
    expect(pickLanguage(['ja'], ['en'])).toBe('en')
    expect(pickLanguage([], ['en'])).toBe('en')
  })

  it('knows which languages are written right to left', () => {
    expect(directionOf('ar-XB')).toBe('rtl')
    expect(directionOf('he')).toBe('rtl')
    expect(directionOf('en-XA')).toBe('ltr')
    expect(directionOf('sv')).toBe('ltr')
  })
})

describe('the compiled catalogues', () => {
  const i18n = setupI18n({ locale: 'en', messages: { en, 'en-XA': accented, 'ar-XB': mirrored } })

  it('speak English from the copy table, with plurals', () => {
    i18n.activate('en')
    expect(i18n._(COPY.boards.almanac)).toBe('Records') // C131
    expect(i18n._(COPY.counts.chats, { count: 1 })).toBe('1 chat')
    expect(i18n._(COPY.counts.chats, { count: 21 })).toBe('21 chats')
  })

  it('make every word different in the test languages, so a word left out stands out', () => {
    i18n.activate('en-XA')
    const almanac = i18n._(COPY.boards.almanac)
    expect(almanac).not.toBe('Records')
    expect(almanac).toMatch(/[À-ž]/)
    expect(i18n._(COPY.counts.chats, { count: 2 })).toMatch(/^2/)
    i18n.activate('ar-XB')
    expect(i18n._(COPY.boards.almanac)).toMatch(/‮/) // written right to left
  })

  it('say in English exactly what the copy table says, so rewording reaches the app', () => {
    const po = readFileSync(new URL('./locales/en/messages.po', import.meta.url), 'utf8')
    const english = new Map([...po.matchAll(/msgid "([^"]+)"\nmsgstr "((?:[^"\\]|\\.)*)"/g)].map((m) => [m[1], m[2].replace(/\\"/g, '"')]))
    const entries = [...Object.values(COPY).flatMap((group) => Object.values(group)), ...VERBS.map((v) => v.gloss)]
    for (const e of entries) expect(english.get(e.id), e.id).toBe(e.message)
  })

  it('hold every entry of the copy table', () => {
    const ids = Object.values(COPY).flatMap((group) => Object.values(group).map((entry) => entry.id))
    for (const id of ids) {
      expect(en[id], id).toBeDefined()
      expect(accented[id], id).toBeDefined()
      expect(mirrored[id], id).toBeDefined()
    }
  })
})

describe('the languages offered (C184)', () => {
  it('are English, and in development the drafts, marked as such', () => {
    expect(SHIPPED_LANGUAGES).toEqual(['en'])
    expect(offeredLanguages(false)).toEqual(['en'])
    expect(offeredLanguages(true)).toEqual(['en', ...DRAFT_LANGUAGES])
    expect(DRAFT_LANGUAGES).toEqual(['ja', 'zh-Hans', 'sv', 'fi'])
    expect(isDraft('sv')).toBe(true)
    expect(isDraft('en')).toBe(false)
  })

  it('give the page the language chosen, while it is offered', () => {
    expect(languageFor('sv', ['en', 'sv'])).toBe('sv')
    expect(languageFor('sv', ['en'])).toBe('en')
    expect(languageFor(null, ['en', 'sv'])).toBe('en')
  })

  it("leave the browser's own translation alone until a second language ships (C84)", () => {
    expect(optOutOfPageTranslation(['en'])).toBe(false)
  })
})

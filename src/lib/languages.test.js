import { describe, it, expect } from 'vitest'
import { findLanguage, replyLanguageOf, replyInstruction, withReplyLanguage, sourceAskLanguage, translateInto, nameOf, ownNameOf, baseOf, REPLY_LANGUAGES } from './languages'

describe('finding a language (C166)', () => {
  it('takes a tag, an English name, its own name or the interface language’s name', () => {
    expect(findLanguage('sv')).toBe('sv')
    expect(findLanguage('Swedish')).toBe('sv')
    expect(findLanguage('svenska')).toBe('sv')
    expect(findLanguage('日本語')).toBe('ja')
    expect(findLanguage('japanese')).toBe('ja')
    expect(findLanguage('suomi')).toBe('fi')
    expect(findLanguage('ruotsi', 'fi')).toBe('sv')
  })

  it('tells the two Chinese scripts apart, by tag or by name', () => {
    expect(findLanguage('zh-hant')).toBe('zh-Hant')
    expect(findLanguage('traditional chinese')).toBe('zh-Hant')
    expect(findLanguage('chinese')).toBe('zh')
  })

  it('finds nothing in words that name no language', () => {
    expect(findLanguage('klingonish')).toBeNull()
    expect(findLanguage('')).toBeNull()
    expect(findLanguage('off')).toBeNull()
  })

  it('names every language it offers, never just its tag', () => {
    for (const tag of REPLY_LANGUAGES) expect(nameOf(tag, 'en')).not.toBe(tag)
    expect(ownNameOf('sv')).toBe('svenska')
  })

  it('reads the test languages as English', () => {
    expect(baseOf('en-XA')).toBe('en')
    expect(baseOf('ar-XB')).toBe('en')
    expect(nameOf('sv', 'ar-XB')).toBe('Swedish')
  })
})

describe('what replies are in', () => {
  it('is the language chosen, whatever the interface', () => {
    expect(replyLanguageOf({ setting: 'sv', locale: 'en', browser: ['en-US'] })).toEqual({ tag: 'sv', how: 'set' })
  })

  it('follows the interface where the browser says its person reads that language', () => {
    expect(replyLanguageOf({ locale: 'en', browser: ['sv-SE', 'en-US'] })).toEqual({ tag: 'en', how: 'interface' })
  })

  it('asks for nothing where the interface is in a language the browser does not list', () => {
    expect(replyLanguageOf({ locale: 'en', browser: ['ja-JP'] })).toEqual({ tag: null, how: 'unread' })
  })

  it('asks for nothing when turned off', () => {
    expect(replyLanguageOf({ setting: 'off', locale: 'en', browser: ['en'] })).toEqual({ tag: null, how: 'off' })
  })

  it('reads a regional tag as the language kept', () => {
    expect(replyLanguageOf({ setting: 'zh-TW' }).tag).toBe('zh-Hant')
    expect(replyLanguageOf({ setting: 'sv-FI' }).tag).toBe('sv')
  })
})

describe('what a model is sent', () => {
  it('names the language in English, leaving room for a prompt that asks for another', () => {
    expect(replyInstruction('sv')).toBe('Write your replies in Swedish, whatever language I write in, unless I ask for another language.')
    expect(replyInstruction(null)).toBe('')
  })

  it('goes after the frameworks, as a paragraph of its own', () => {
    expect(withReplyLanguage('Push back.', 'fi')).toBe('Push back.\n\nWrite your replies in Finnish, whatever language I write in, unless I ask for another language.')
    expect(withReplyLanguage('', null)).toBe('')
    expect(withReplyLanguage('Push back.', null)).toBe('Push back.')
  })
})

describe('sources and translations', () => {
  it('asks a source in the chosen reply language, else the interface’s', () => {
    expect(sourceAskLanguage({ tag: 'sv', how: 'set' }, 'en')).toBe('sv')
    expect(sourceAskLanguage({ tag: 'zh-Hant', how: 'set' }, 'en')).toBe('zh')
    expect(sourceAskLanguage({ tag: 'en', how: 'interface' }, 'en-XA')).toBe('en')
    expect(sourceAskLanguage({ tag: null, how: 'off' }, 'en')).toBe('en')
  })

  it('translates into the reply language, else the interface’s', () => {
    expect(translateInto({ tag: 'sv', how: 'set' }, 'en')).toBe('sv')
    expect(translateInto({ tag: null, how: 'off' }, 'en')).toBe('en')
  })
})

describe('replies follow a language chosen with language: (C184)', () => {
  it('whatever the browser lists, and keep its script', () => {
    expect(replyLanguageOf({ locale: 'sv', browser: ['en-US'] })).toEqual({ tag: null, how: 'unread' })
    expect(replyLanguageOf({ locale: 'sv', browser: ['en-US'], chosen: true })).toEqual({ tag: 'sv', how: 'interface' })
    expect(replyLanguageOf({ locale: 'zh-Hans', browser: [], chosen: true })).toEqual({ tag: 'zh-Hans', how: 'interface' })
    expect(replyLanguageOf({ setting: 'off', locale: 'sv', chosen: true })).toEqual({ tag: null, how: 'off' })
  })
})

import { describe, it, expect } from 'vitest'
import { COPY } from './copy'

const entries = Object.entries(COPY).flatMap(([group, items]) => Object.entries(items).map(([key, entry]) => ({ where: `${group}.${key}`, ...entry })))
// Names, and the pronoun I, keep their capital in a sentence.
// The welcome page's letter and footer name a few more (stage 5).
// Names, and the name of a format (Markdown, as the verb glosses allow).
// Privacy and Anonymous: a provider's own menu names, quoted so a person can find them (C167).
const PROPER = new Set(['Parliament', "Parliament's", 'I', 'AI', 'API', 'Wikipedia', 'Claude', 'Code', 'MIT', 'Lov', 'Markdown', 'English', 'EU', 'US', 'Privacy', 'Anonymous',
  // The key's name, as the keyboard writes it ("when you press Enter"), the
  // web host the privacy copy names, and an IP address (About; C185).
  'Enter', 'Parliament’s', 'Netlify', 'IP',
  // A passkey's PIN (Lock Parliament).
  'PIN'])

describe('the copy table', () => {
  it('gives every entry an id and a message, and no id twice', () => {
    for (const e of entries) {
      expect(typeof e.id, e.where).toBe('string')
      expect(typeof e.message, e.where).toBe('string')
    }
    const ids = entries.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('follows the copy rules: no em dashes, sentence case', () => {
    for (const e of entries) {
      expect(e.message, e.where).not.toMatch(/—/)
      if (e.message.startsWith('{')) continue // a plural: its words are lower case
      // Each sentence may start with a capital; nothing else may, but names.
      for (const sentence of e.message.split(/(?<=[.!?])\s+/)) {
        const words = sentence.replace(/[.,!?;:"()]/g, '').split(/\s+/).slice(1)
        const capitalised = words.filter((w) => /^\p{Lu}/u.test(w) && !PROPER.has(w))
        expect(capitalised, `${e.where}: "${sentence}"`).toEqual([])
      }
    }
  })

  it('names no browser, since the app cannot tell which one it is in (C94)', () => {
    for (const e of entries) expect(e.message, e.where).not.toMatch(/Chrome|Firefox|Safari|LibreWolf|Zen|Edge|Brave/)
  })
})

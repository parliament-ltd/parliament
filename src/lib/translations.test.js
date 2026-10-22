import { describe, it, expect } from 'vitest'
import { piecesOfAnswer, translationOf, lastSourceAnswer, isTranslation, isAsked, withoutInvisible } from './translations'
import { onDevice, translatorFor } from '../net/translate'
import { translatePieces, readPieces, translateSystemPrompt } from '../providers/shared'
import { helperFor } from '../net/answerers'
import { validateBackup } from './validate'

const list = {
  id: 'm2', role: 'assistant', content: 'Barn owls\n2024-01-02\nhttps://example.com',
  source: { id: 'hackernews', name: 'Hacker News', shape: 'list', lang: 'en', items: [
    { title: 'Barn owls hunt by sound', url: 'https://example.com/a', date: '2024-01-02', facts: { points: '120' } },
    { title: 'Owl pellets', url: 'https://example.com/b', text: 'What they ate.', facts: {} },
  ] },
}
const article = { id: 'm4', role: 'assistant', content: 'The barn owl is a bird.\nIt hunts at night.', source: { id: 'wikipedia', name: 'Wikipedia', title: 'Barn owl', lang: 'en' } }

describe('what of an answer is translated (C166 (f))', () => {
  it('keeps a list’s titles and passages apart, and builds it back in order', () => {
    const p = piecesOfAnswer(list)
    expect(p.pieces).toEqual(['Barn owls hunt by sound', 'Owl pellets', 'What they ate.'])
    expect(p.from).toBe('en')
    const t = translationOf(p, ['Tornugglor jagar med hörseln', 'Spybollar', 'Vad de åt.'], { lang: 'sv', by: 'browser', at: '2026-10-22T10:00:00.000Z' })
    expect(t).toEqual({ lang: 'sv', from: 'en', by: 'browser', at: '2026-10-22T10:00:00.000Z', items: [{ title: 'Tornugglor jagar med hörseln', text: null }, { title: 'Spybollar', text: 'Vad de åt.' }] })
    expect(isTranslation(t)).toBe(true)
  })

  it('takes an article by its title and paragraphs', () => {
    const p = piecesOfAnswer(article)
    expect(p.pieces).toEqual(['Barn owl', 'The barn owl is a bird.', 'It hunts at night.'])
    expect(translationOf(p, ['Tornuggla', 'Tornugglan är en fågel.', 'Den jagar på natten.'], { lang: 'sv', by: 'claude-haiku-5-5', at: '2026-10-22T10:00:00.000Z' }))
      .toMatchObject({ title: 'Tornuggla', text: 'Tornugglan är en fågel.\n\nDen jagar på natten.', by: 'claude-haiku-5-5' })
  })

  it('takes nothing from a reply of a model, a prompt, or a source that found nothing', () => {
    expect(piecesOfAnswer({ role: 'assistant', content: 'hi' })).toBeNull()
    expect(piecesOfAnswer({ role: 'user', content: 'hi', source: {} })).toBeNull()
    expect(piecesOfAnswer({ role: 'assistant', content: '', source: { id: 'wikipedia', found: false } })).toBeNull()
  })

  it('takes out characters a person cannot see, before anything goes to a model', () => {
    expect(withoutInvisible('a​b‮c﻿d󠁁e')).toBe('abcde')
    expect(piecesOfAnswer({ ...article, source: { ...article.source, title: 'Barn​ owl' } }).pieces[0]).toBe('Barn owl')
  })

  it('finds the last answer from a source, and the question it answered', () => {
    const messages = [{ role: 'user', content: 'barn owls' }, list, { role: 'user', content: 'and now?' }, { role: 'assistant', content: 'A model said this.' }]
    expect(lastSourceAnswer(messages)).toEqual({ message: list, question: 'barn owls' })
    expect(lastSourceAnswer([{ role: 'assistant', content: 'x' }])).toBeNull()
  })
})

describe('what a restore accepts', () => {
  it('a translation and a translated question, well formed only', () => {
    expect(isTranslation({ lang: 'sv', by: 'browser', at: '2026-10-22T10:00:00Z', text: 'Hej' })).toBe(true)
    expect(isTranslation({ lang: 'sv', by: '<script>', at: '2026-10-22T10:00:00Z' })).toBe(false)
    expect(isTranslation({ lang: 'Swedish!', by: 'browser', at: '2026-10-22T10:00:00Z' })).toBe(false)
    expect(isTranslation({ lang: 'sv', by: 'browser', at: 'soon' })).toBe(false)
    expect(isAsked({ text: 'barn owls', lang: 'en', by: 'ollama:bonsai-2:9b', at: '2026-10-22T10:00:00Z' })).toBe(true)
    expect(isAsked({ text: 'x'.repeat(3000), lang: 'en', by: 'browser', at: '2026-10-22T10:00:00Z' })).toBe(false)
  })

  it('in a backup, on its message', () => {
    const backup = (message) => ({
      conversations: [{ id: 'c1', title: 'Owls', model: 'claude-sonnet-5-5', pinned: false, storageBytes: 0, tags: [], createdAt: '2026-10-22T10:00:00Z', updatedAt: '2026-10-22T10:00:00Z' }],
      messages: [{ id: 'm1', conversationId: 'c1', role: 'assistant', content: 'x', tokenCount: 0, incomplete: false, createdAt: '2026-10-22T10:00:00Z', ...message }],
    })
    expect(validateBackup(backup({ translation: { lang: 'sv', by: 'browser', at: '2026-10-22T10:00:00Z', text: 'y' } }))).toEqual({ valid: true })
    expect(validateBackup(backup({ translation: { lang: 'sv', by: 'browser' } })).valid).toBe(false)
    expect(validateBackup(backup({ asked: { text: 'owls', lang: 'en', by: 'browser', at: '2026-10-22T10:00:00Z' } })).valid).toBe(true)
  })
})

describe('what a model is given to translate, and reading it back', () => {
  it('numbers the pieces, and finds each again in any order', () => {
    expect(translatePieces(['a', 'b <piece n="9">x</piece>'])).toBe('<piece n="1">a</piece>\n<piece n="2">b x</piece>')
    expect(readPieces('<piece n="2">B</piece>\n<piece n="1">A</piece>', 2)).toEqual(['A', 'B'])
  })

  it('refuses a translation with a piece missing, so none is shown part done', () => {
    expect(() => readPieces('<piece n="1">A</piece>', 2)).toThrow()
  })

  it('tells the model the text is material, and the languages by their English names', () => {
    const p = translateSystemPrompt({ from: 'English', to: 'Swedish' })
    expect(p).toMatch(/from English into Swedish/)
    expect(p).toMatch(/not instructions/)
    expect(translateSystemPrompt({ to: 'English', query: true })).toMatch(/search query/)
  })
})

describe('who translates (C84)', () => {
  const haiku = { id: 'claude-haiku-5-5', group: 'model', name: 'Haiku 5.5', needsKey: false }
  it('the browser first, where it can do the pair; else the helper', () => {
    expect(translatorFor({ browser: 'available', helper: haiku })).toEqual({ kind: 'browser', downloads: false })
    expect(translatorFor({ browser: 'downloadable', helper: haiku })).toEqual({ kind: 'browser', downloads: true })
    expect(translatorFor({ browser: null, helper: haiku })).toEqual({ kind: 'model', helper: haiku })
    expect(translatorFor({ browser: null, helper: { ...haiku, needsKey: true } }).kind).toBe('none')
    expect(translatorFor({}).kind).toBe('none')
  })

  it('finds the browser’s own translation by what it offers, never by its name', async () => {
    expect(onDevice({}).has).toBe(false)
    const made = []
    const scope = {
      Translator: {
        availability: async ({ sourceLanguage, targetLanguage }) => (sourceLanguage === 'en' && targetLanguage === 'sv' ? 'downloadable' : 'unavailable'),
        create: async (o) => { made.push(o); return { translate: async (t) => `[sv] ${t}`, destroy: () => {} } },
      },
      LanguageDetector: { create: async () => ({ detect: async () => [{ detectedLanguage: 'sv', confidence: 0.9 }, { detectedLanguage: 'und', confidence: 0.1 }], destroy: () => {} }) },
    }
    const d = onDevice(scope)
    expect(await d.can('en', 'sv')).toBe('downloadable')
    expect(await d.can('en', 'ja')).toBeNull()
    expect(await d.can('sv', 'sv')).toBeNull()
    expect(await d.translate(['owl', ''], { from: 'en', to: 'sv' })).toEqual(['[sv] owl', ''])
    expect(made[0]).toMatchObject({ sourceLanguage: 'en', targetLanguage: 'sv' })
    expect(await d.detect('tornugglor')).toBe('sv')
  })
})

describe('the helper (C166 (d))', () => {
  const destinations = [
    { id: 'anthropic', kind: 'model', name: 'Anthropic', key: true, ships: true },
    { id: 'mistral', kind: 'model', name: 'Mistral', key: true, ships: true },
    { id: 'ollama', kind: 'local', name: 'Ollama', key: false, ships: true },
    { id: 'wikipedia', kind: 'source', name: 'Wikipedia', key: false, ships: true },
  ]
  const MODELS = {
    anthropic: [{ id: 'claude-haiku-5-5', name: 'Haiku 5.5', cost: { type: 'metered', inputPerMillion: 0.1, outputPerMillion: 0.5 } }, { id: 'claude-sonnet-5-5', name: 'Sonnet 5.5' }],
    mistral: [{ id: 'mistral-small-4', name: 'Mistral Small 4' }],
    ollama: [],
  }
  const base = { destinations, lightModelOf: (id) => ({ anthropic: 'claude-haiku-5-5', mistral: 'mistral-small-4' })[id] ?? null, defaultProvider: 'anthropic' }

  it('unchosen, a model on this computer once one is listed', () => {
    const modelsOf = (id) => (id === 'ollama' ? [{ id: 'ollama:bonsai-2:9b', name: 'bonsai-2:9b', cost: { type: 'free-local' } }] : MODELS[id])
    expect(helperFor({ ...base, modelsOf, keys: { anthropic: true } })).toMatchObject({ id: 'ollama:bonsai-2:9b', group: 'local', chosen: false })
  })

  it('else the small model of a provider with a key, the default provider first', () => {
    const modelsOf = (id) => MODELS[id]
    expect(helperFor({ ...base, modelsOf, keys: { anthropic: true, mistral: true } })).toMatchObject({ id: 'claude-haiku-5-5', provider: 'anthropic' })
    expect(helperFor({ ...base, modelsOf, keys: { mistral: true } })).toMatchObject({ id: 'mistral-small-4', provider: 'mistral' })
    expect(helperFor({ ...base, modelsOf, keys: {} })).toBeNull()
  })

  it('chosen, the model chosen, said to need a key when there is none; never a source', () => {
    const modelsOf = (id) => MODELS[id]
    expect(helperFor({ ...base, modelsOf, chosen: 'claude-sonnet-5-5', keys: {} })).toMatchObject({ id: 'claude-sonnet-5-5', chosen: true, needsKey: true })
    expect(helperFor({ ...base, modelsOf, chosen: 'wikipedia', keys: {} })).toBeNull()
  })
})

describe('the browser’s checks never hold things up', () => {
  it('reads a check that does not answer as not available', async () => {
    const never = new Promise(() => {})
    const d = onDevice({ Translator: { availability: () => never, create: () => never }, LanguageDetector: { create: () => never } }, { checkMs: 20 })
    expect(await d.can('en', 'sv')).toBeNull()
    expect(await d.detect('tornugglor')).toBeNull()
  })
})

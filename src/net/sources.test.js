import { describe, it, expect, vi } from 'vitest'
import wikipedia from './sources/wikipedia.json'
import { createSource, sourceLanguage, SourceError } from './sources'
import { destination } from './list'

const origins = destination('wikipedia').origins
const page = {
  title: 'Barn owl',
  extract: 'The barn owl is the most widely distributed species of owl.',
  fullurl: 'https://en.wikipedia.org/wiki/Barn_owl',
  revisions: [{ revid: 1250000000, timestamp: '2026-10-01T12:00:00Z' }],
}
const reply = (body, ok = true, status = 200) => ({ ok, status, json: async () => body })

describe('Wikipedia, from its manifest', () => {
  it('asks a plain-text search of the person\'s language, with no credentials or referrer', async () => {
    const fetch = vi.fn(async () => reply({ query: { pages: [page] } }))
    const source = createSource(wikipedia, { origins, fetch })
    await source.answer('barn owl', { lang: 'sv-FI' })
    const [url, init] = fetch.mock.calls[0]
    const u = new URL(url)
    expect(u.hostname).toBe('sv.wikipedia.org')
    expect(u.searchParams.get('gsrsearch')).toBe('barn owl')
    expect(u.searchParams.get('explaintext')).toBe('1')
    expect(u.searchParams.get('origin')).toBe('*')
    expect(init).toMatchObject({ credentials: 'omit', referrerPolicy: 'no-referrer' })
  })

  it('gives the text with where it came from: page, revision and licence', async () => {
    const source = createSource(wikipedia, { origins, fetch: async () => reply({ query: { pages: [page] } }) })
    expect(await source.answer('barn owl')).toEqual({
      source: 'wikipedia',
      name: 'Wikipedia',
      title: 'Barn owl',
      text: page.extract,
      url: page.fullurl,
      revision: '1250000000',
      revisedAt: '2026-10-01T12:00:00Z',
      licence: { name: 'CC BY-SA 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/' },
      lang: 'en',
    })
  })

  it('says nothing found, rather than inventing an answer', async () => {
    const source = createSource(wikipedia, { origins, fetch: async () => reply({ batchcomplete: true }) })
    expect(await source.answer('qwxzv')).toBeNull()
    expect(await source.answer('   ')).toBeNull()
  })

  it('keeps text as text, cut to its limit', async () => {
    const long = { ...page, extract: `<b>${'a'.repeat(7000)}</b>` }
    const source = createSource(wikipedia, { origins, fetch: async () => reply({ query: { pages: [long] } }) })
    const a = await source.answer('x')
    expect(a.text.startsWith('<b>')).toBe(true) // kept as characters, never read as markup
    expect(a.text.length).toBe(wikipedia.limits.textChars + 1)
  })

  it('falls back to English for a language it cannot name, and never builds a host from input', async () => {
    expect(sourceLanguage(wikipedia, 'en-XA')).toBe('en')
    expect(sourceLanguage(wikipedia, 'ja')).toBe('ja')
    expect(sourceLanguage(wikipedia, 'evil.example#')).toBe('en')
    expect(sourceLanguage(wikipedia, '')).toBe('en')
  })

  it('refuses an address the list does not give the source', async () => {
    const fetch = vi.fn()
    const elsewhere = { ...wikipedia, request: { ...wikipedia.request, url: 'https://{lang}.example.org/api' } }
    await expect(createSource(elsewhere, { origins, fetch }).answer('x')).rejects.toMatchObject({ reason: 'address not allowed' })
    const deeper = { ...wikipedia, request: { ...wikipedia.request, url: 'https://a.{lang}.wikipedia.org/w/api.php' } }
    await expect(createSource(deeper, { origins, fetch }).answer('x')).rejects.toBeInstanceOf(SourceError)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('reports a refusal or an unreachable source, and passes an abort through', async () => {
    await expect(createSource(wikipedia, { origins, fetch: async () => reply({}, false, 503) }).answer('x')).rejects.toMatchObject({ reason: 'refused', status: 503 })
    await expect(createSource(wikipedia, { origins, fetch: async () => { throw new TypeError('network') } }).answer('x')).rejects.toMatchObject({ reason: 'unreachable' })
    const abort = Object.assign(new Error('stopped'), { name: 'AbortError' })
    await expect(createSource(wikipedia, { origins, fetch: async () => { throw abort } }).answer('x')).rejects.toBe(abort)
  })
})

import { describe, it, expect, vi } from 'vitest'
import wikipedia from './sources/wikipedia.json'
import hn from './sources/hackernews.json'
import oa from './sources/openalex.json'
import { createSource, sourceLanguage, SourceError, read } from './sources'
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

describe('lists of results: Hacker News and OpenAlex (stage 7, piece 2; C156)', () => {
  const hackernews = destination('hackernews')
  const openalex = destination('openalex')
  const hits = [
    { objectID: '41', title: 'Barn owls hear in the dark', url: 'https://example.org/owls', created_at: '2024-05-01T12:00:00Z', points: 120, num_comments: 33, story_text: '<p>ignored</p>' },
    { objectID: '42', title: 'Ask HN: owls?', created_at: '2024-06-01T12:00:00Z', points: 3, num_comments: 1, story_text: '<script>x</script>' },
    { objectID: '43', title: '', url: 'https://example.org/none' },
  ]
  const works = [{
    display_name: 'Sound localization in the barn owl',
    doi: 'https://doi.org/10.1000/owl',
    primary_location: { landing_page_url: 'http://example.org/paper' },
    publication_year: 1979,
    authorships: [{ author: { display_name: 'E. Knudsen' } }, { author: { display_name: 'M. Konishi' } }, { author: { display_name: 'A' } }, { author: { display_name: 'B' } }],
    abstract_inverted_index: { Barn: [0], owls: [1], locate: [2], prey: [3], by: [4], 'sound.': [5] },
  }]

  it('asks Hacker News for stories, and keeps titles, links, dates and facts, never its HTML', async () => {
    const fetch = vi.fn(async () => reply({ hits }))
    const source = createSource(hn, { origins: hackernews.origins, fetch })
    const out = await source.answer('barn owl')
    const u = new URL(fetch.mock.calls[0][0])
    expect(u.origin).toBe('https://hn.algolia.com')
    expect(u.searchParams.get('query')).toBe('barn owl')
    expect(u.searchParams.get('tags')).toBe('story')
    expect(out.shape).toBe('list')
    expect(out.items).toEqual([
      { title: 'Barn owls hear in the dark', url: 'https://example.org/owls', discussion: 'https://news.ycombinator.com/item?id=41', date: '2024-05-01T12:00:00Z', text: null, facts: { points: '120', comments: '33' } },
      { title: 'Ask HN: owls?', url: null, discussion: 'https://news.ycombinator.com/item?id=42', date: '2024-06-01T12:00:00Z', text: null, facts: { points: '3', comments: '1' } },
    ])
    expect(JSON.stringify(out)).not.toMatch(/<p>|<script>/)
    expect(out.licence).toBeNull()
    expect(out.text).toBe('Barn owls hear in the dark\n2024-05-01T12:00:00Z\nhttps://example.org/owls\n\nAsk HN: owls?\n2024-06-01T12:00:00Z\nhttps://news.ycombinator.com/item?id=42')
  })

  it('asks OpenAlex for works, rebuilds an abstract from its word index, and keeps only web links', async () => {
    const source = createSource(oa, { origins: openalex.origins, fetch: async () => reply({ results: works }) })
    const out = await source.answer('barn owl')
    expect(out.items[0]).toEqual({
      title: 'Sound localization in the barn owl', url: 'https://doi.org/10.1000/owl', discussion: null, date: '1979',
      text: 'Barn owls locate prey by sound.', facts: { authors: 'E. Knudsen, M. Konishi, A …' },
    })
    expect(out.licence.name).toBe('CC0')
  })

  it('says nothing was found when no result has a title', async () => {
    expect(await createSource(hn, { origins: hackernews.origins, fetch: async () => reply({ hits: [] }) }).answer('x')).toBeNull()
  })

  it('never reaches a host the list does not give the source', async () => {
    const wrong = { ...hn, request: { ...hn.request, url: 'https://evil.example/search' } }
    await expect(createSource(wrong, { origins: hackernews.origins, fetch: vi.fn() }).answer('x')).rejects.toThrow(SourceError)
  })
})

describe('the readers a manifest may name', () => {
  const item = { a: { b: 'x' }, c: null, list: [{ n: 'One' }, { n: 'Two' }], idx: { two: [1], one: [0] } }
  it('reads a path, the first path with a value, a template, a word index, and names from a list', () => {
    expect(read(item, 'a.b')).toBe('x')
    expect(read(item, { first: ['c', 'a.b'] })).toBe('x')
    expect(read(item, { template: 'https://x.org/{a.b}?q' })).toBe('https://x.org/x?q')
    expect(read(item, { template: 'https://x.org/{c}' })).toBeNull()
    expect(read(item, { wordIndex: 'idx' })).toBe('one two')
    expect(read(item, { names: 'list', path: 'n', max: 1 })).toBe('One …')
  })
  it('reads nothing it does not know, and never an object as text', () => {
    expect(read(item, { run: 'alert(1)' })).toBeNull()
    expect(read(item, 'a')).toBeNull()
  })
})

describe('naming Parliament where a source asks (C160)', () => {
  it('sends Api-User-Agent to Wikipedia, naming the app and never the person', async () => {
    const fetch = vi.fn(async () => reply({ query: { pages: [page] } }))
    await createSource(wikipedia, { origins, fetch, identity: 'Parliament/0.5 (https://parliament.ltd; support@parliament.ltd)' }).answer('barn owl')
    expect(fetch.mock.calls[0][1].headers).toEqual({ Accept: 'application/json', 'Api-User-Agent': 'Parliament/0.5 (https://parliament.ltd; support@parliament.ltd)' })
  })
  it('sends no other header a manifest names, and none where it asks for none', async () => {
    const fetch = vi.fn(async () => reply({ query: { pages: [page] } }))
    await createSource({ ...wikipedia, identifyWith: 'Authorization' }, { origins, fetch, identity: 'x' }).answer('barn owl')
    await createSource(hn, { origins: destination('hackernews').origins, fetch: vi.fn(async () => reply({ hits: [] })), identity: 'x' }).answer('x')
    expect(fetch.mock.calls[0][1].headers).toEqual({ Accept: 'application/json' })
  })
})

import { describe, it, expect, vi, afterEach } from 'vitest'
import { setupI18n } from '@lingui/core'
import { messages as en } from '../locales/en/messages.mjs'
import { preview, promptPreview } from '../chrome/preview'
import { say } from '../chrome/say'
import { shipped } from '../shell/arrangement'
import { AnthropicProvider, citationOf } from '../providers/anthropic'
import { OllamaProvider, runsElsewhere } from '../providers/ollama'
import { DESTINATIONS } from '../net/list'
import { answererRows, answererFor, dataOf } from '../net/answerers'
import { validateBackup } from './validate'

const i18n = setupI18n({ locale: 'en', messages: { en } })
i18n.activate('en')
afterEach(() => vi.unstubAllGlobals())

describe('what each provider does with what it is sent, on its rows (C167)', () => {
  const MODELS = {
    anthropic: [{ id: 'claude-fable-5-1', name: 'Fable 5.1', data: { kept: 'atLeast30' } }, { id: 'claude-haiku-5-5', name: 'Haiku 5.5' }],
    mistral: [{ id: 'mistral-large-4', name: 'Mistral Large 4', preview: true, data: { training: 'always' } }, { id: 'mistral-small-4', name: 'Mistral Small 4' }],
    ollama: [{ id: 'ollama:bonsai-2:9b', name: 'bonsai-2:9b', cost: { type: 'free-local' } }],
  }
  const modelsOf = (id) => MODELS[id] ?? []

  it('takes each provider’s facts, and a model’s own where it has them', () => {
    const rows = answererRows({ destinations: DESTINATIONS, modelsOf, keys: { anthropic: true, mistral: true } })
    const by = (id) => [...rows.model, ...rows.local].find((r) => r.id === id)
    expect(by('claude-haiku-5-5')).toMatchObject({ training: 'no', kept: 'upTo30' })
    expect(by('claude-fable-5-1')).toMatchObject({ training: 'no', kept: 'atLeast30' })
    expect(by('mistral-small-4')).toMatchObject({ training: 'optOut', kept: 'days30' })
    expect(by('mistral-large-4')).toMatchObject({ training: 'always', kept: 'days30' })
    expect(by('ollama:bonsai-2:9b')).toMatchObject({ kept: 'device' })
    expect(rows.source.every((r) => r.training === undefined)).toBe(true)
  })

  it('says each fact was read on the provider’s own page, and when', () => {
    for (const d of DESTINATIONS.filter((x) => x.kind !== 'source')) {
      expect(d.data?.checked, d.id).toBe('2026-10-22')
      if (d.kind === 'model') expect(d.data.page, d.id).toMatch(/^https:\/\//)
    }
    expect(dataOf({ data: null }, null)).toEqual({})
  })

  it('names, before Enter, a preview whose provider trains on all it is sent', () => {
    const who = answererFor({ chosen: 'mistral-large-4', keys: { mistral: true }, destinations: DESTINATIONS, modelsOf, defaultProvider: 'anthropic' })
    const p = promptPreview('Hello', { room: 'c1', keyed: true, keyedBy: { mistral: true }, answerer: { ...who, price: { type: 'metered', inputPerMillion: 1, outputPerMillion: 1 } }, historyChars: 0, systemChars: 0 })
    const also = p.says.also.map((x) => say(i18n, x.message, x.values))
    expect(also).toContain('Mistral Large 4 is a preview: its provider trains on what you send it, whatever you chose. by: chooses another')
  })
})

describe('the privacy filter on the Enter line (C167)', () => {
  const sonnet = { id: 'claude-sonnet-5-5', group: 'model', name: 'Sonnet 5.5', provider: 'anthropic', price: { type: 'metered', inputPerMillion: 2, outputPerMillion: 10 } }
  const room = { room: 'c1', keyed: true, keyedBy: { anthropic: true }, answerer: sonnet, historyChars: 0, systemChars: 0 }
  const also = (text, privacy) => (promptPreview(text, { ...room, privacy }).says.also ?? []).map((x) => say(i18n, x.message, x.values))

  it('says what is swapped, the history’s included, each value once', () => {
    expect(also('Mail anna@example.se and call +46 70 123 45 67', { on: true, along: ['email:anna@example.se'] }))
      .toEqual(['Swapped for placeholders before it goes: an email address and a phone number. The reply puts them back'])
    expect(also('hi', { on: true, along: ['email:a@b.se', 'email:c@d.se'] })).toEqual(['Swapped for placeholders before it goes: 2 email addresses. The reply puts them back'])
  })

  it('off, offers it when there is something it would swap', () => {
    expect(also('Card 4111 1111 1111 1111', { on: false, along: [] })).toEqual(['It holds a card number. privacy:on swaps such things for placeholders before they go'])
    expect(also('What is a barn owl?', { on: false, along: [] })).toEqual([])
  })

  it('turns on and off, a setting', () => {
    const line = (v, on) => preview(v, { mode: 'command', arrangement: shipped('almanac'), screens: { privacy: { on } } })
    expect(line('>privacy:on', false).act).toEqual({ kind: 'setting', key: 'privacyFilter', value: 'patterns', before: 'off' })
    expect(line('>privacy:off', true).act).toEqual({ kind: 'setting', key: 'privacyFilter', value: 'off', before: 'patterns' })
    expect(say(i18n, line('>privacy:', false).says.message, line('>privacy:', false).says.values)).toMatch(/^The privacy filter is off/)
  })
})

describe('citations from a web search, kept (C167 (f))', () => {
  function streamed(events) {
    const text = events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join('')
    return { ok: true, status: 200, body: new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(text)); c.close() } }), headers: new Headers() }
  }

  it('reads them as they stream, web addresses only', async () => {
    const cite = (url) => ({ type: 'content_block_delta', index: 1, delta: { type: 'citations_delta', citation: { type: 'web_search_result_location', url, title: 'Barn owl', cited_text: 'Barn owls hunt by sound.', encrypted_index: 'x' } } })
    vi.stubGlobal('fetch', vi.fn(async () => streamed([
      { type: 'message_start', message: { usage: { input_tokens: 9 } } },
      cite('https://example.org/owls'),
      cite('javascript:alert(1)'),
      { type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: 'They hunt by sound.' } },
      { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 4 } },
    ])))
    const r = await new AnthropicProvider().sendMessage('k', [{ role: 'user', content: 'owls' }], 'claude-haiku-5-5', () => {}, undefined)
    expect(r.citations).toEqual([{ url: 'https://example.org/owls', title: 'Barn owl', cited: 'Barn owls hunt by sound.' }])
  })

  it('reads only citations of a web search', () => {
    expect(citationOf({ type: 'char_location', cited_text: 'x' })).toBeNull()
    expect(citationOf({ type: 'web_search_result_location', url: 'http://plain.example', title: 't' })).toBeNull()
  })

  it('travels in a backup on its reply, checked', () => {
    const backup = (citations) => ({
      conversations: [{ id: 'c1', title: 'Owls', model: 'claude-sonnet-5-5', pinned: false, storageBytes: 0, tags: [], createdAt: '2026-10-22T10:00:00Z', updatedAt: '2026-10-22T10:00:00Z' }],
      messages: [{ id: 'm1', conversationId: 'c1', role: 'assistant', content: 'x', tokenCount: 0, incomplete: false, createdAt: '2026-10-22T10:00:00Z', citations }],
    })
    expect(validateBackup(backup([{ url: 'https://example.org', title: 'Owls', quoted: ['They hunt by sound.'] }])).valid).toBe(true)
    expect(validateBackup(backup([{ url: 'javascript:alert(1)', quoted: [] }])).valid).toBe(false)
  })
})

describe('models Ollama runs on its own servers (C167 (d))', () => {
  it('are left out, so nothing sent to a model listed here leaves the computer', async () => {
    const tags = { models: [
      { name: 'bonsai-2:9b' },
      { name: 'gemma4:cloud' },
      { name: 'gpt-oss:120b-cloud' },
      { name: 'glm-5.3', remote_host: 'https://ollama.com:443', remote_model: 'glm-5.3' },
    ] }
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => tags })))
    const p = new OllamaProvider()
    const found = await p.listModels()
    expect(found.map((m) => m.name)).toEqual(['bonsai-2:9b'])
    expect(p.awayModels()).toEqual(['gemma4:cloud', 'gpt-oss:120b-cloud', 'glm-5.3'])
    expect(runsElsewhere({ name: 'qwen3.5:9b' })).toBe(false)
  })
})

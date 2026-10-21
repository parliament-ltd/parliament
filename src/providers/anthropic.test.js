import { describe, it, expect, vi, afterEach } from 'vitest'
import { AnthropicProvider } from './anthropic'

// A stand-in for the provider's streamed reply: server-sent events, read
// piece by piece. No request leaves the test.
function streamed(events) {
  const text = events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join('')
  const bytes = new TextEncoder().encode(text)
  const body = new ReadableStream({
    start(controller) {
      // In two pieces, so an event can arrive split.
      controller.enqueue(bytes.slice(0, 40))
      controller.enqueue(bytes.slice(40))
      controller.close()
    },
  })
  return { ok: true, status: 200, body, headers: new Headers() }
}

const start = { type: 'message_start', message: { usage: { input_tokens: 12 } } }
const text = (t) => ({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: t } })
const stop = (reason) => ({ type: 'message_delta', delta: { stop_reason: reason }, usage: { output_tokens: 5 } })

afterEach(() => vi.unstubAllGlobals())

async function send(events) {
  vi.stubGlobal('fetch', vi.fn(async () => streamed(events)))
  const chunks = []
  const p = new AnthropicProvider()
  const result = await p.sendMessage('test-key', [{ role: 'user', content: 'Hi' }], 'claude-haiku', (c) => chunks.push(c), undefined)
  return { result, chunks }
}

describe('reading a streamed reply', () => {
  it('says why the reply stopped, so a reply at the length limit is known as cut off', async () => {
    const { result, chunks } = await send([start, text('Hello'), text(' there'), stop('max_tokens'), { type: 'message_stop' }])
    expect(chunks.join('')).toBe('Hello there')
    expect(result.stopReason).toBe('max_tokens')
    expect(result.usage).toEqual({ input_tokens: 12, output_tokens: 5 })
  })

  it('a stream that ends without a reason says none, so it is taken as broken off', async () => {
    const { result } = await send([start, text('Hello')])
    expect(result.stopReason).toBeNull()
  })

  it('an error inside the stream ends the reply as an error, after what arrived', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => streamed([start, text('Part'), { type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } }, text(' more')])))
    const chunks = []
    const p = new AnthropicProvider()
    const err = await p.sendMessage('test-key', [{ role: 'user', content: 'Hi' }], 'claude-haiku', (c) => chunks.push(c)).catch((e) => e)
    expect(err).toBeInstanceOf(Error)
    expect(err.type).toBe('overloaded_error')
    expect(err.status).toBe(529)
    expect(chunks.join('')).toBe('Part')
  })
})

describe('one request for a title, summary and tags (C62)', () => {
  const answer = (text) => vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text }] }) }))
  const exchange = [{ role: 'user', content: 'What is a barn owl?' }, { role: 'assistant', content: 'A bird.' }]

  it('makes one call and keeps what came back valid', async () => {
    const fetch = answer(`Here: {"title": "Barn Owl Basics", "summary": "Discussed what a barn owl is.", "tags": ["birds", "Owls!", "${'x'.repeat(30)}"]}`)
    vi.stubGlobal('fetch', fetch)
    const d = await new AnthropicProvider().generateMetadata('test-key', exchange)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(d).toEqual({ title: 'Barn Owl Basics', summary: 'Discussed what a barn owl is', tags: ['birds', 'owls'] })
    const body = JSON.parse(fetch.mock.calls[0][1].body)
    expect(body.model).toMatch(/haiku/)
    expect(body.messages.at(-1).content).toBe('Describe the conversation above as JSON.')
  })

  it('keeps part of an answer when the rest is not usable, and refuses an answer with nothing usable', async () => {
    vi.stubGlobal('fetch', answer('{"title": "", "summary": "Talked about owls.", "tags": "birds"}'))
    expect(await new AnthropicProvider().generateMetadata('test-key', exchange)).toEqual({ summary: 'Talked about owls' })
    vi.stubGlobal('fetch', answer('Sorry, I cannot.'))
    await expect(new AnthropicProvider().generateMetadata('test-key', exchange)).rejects.toThrow()
  })

  it('names the model it goes to, so the Enter line can price it', () => {
    expect(new AnthropicProvider().getMetadataModel()).toBe('claude-haiku')
  })
})

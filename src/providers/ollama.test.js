import { describe, it, expect, vi, afterEach } from 'vitest'
import { OllamaProvider, modelFromTag, ORIGIN } from './ollama'

// Models on this computer (stage 7, piece 4; C163), with stand-in replies.

const ndjson = (lines) => {
  const text = lines.map((l) => JSON.stringify(l)).join('\n') + '\n'
  return { ok: true, status: 200, body: new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(text)); c.close() } }) }
}
const tags = { models: [
  { name: 'qwen3.5:9b', size: 6_600_000_000, details: { family: 'qwen35', parameter_size: '9B' } },
  { name: 'gemma4:e4b', details: { parameter_size: '8B' } },
  { name: 'bad name with spaces' },
] }

afterEach(() => vi.unstubAllGlobals())

describe('Ollama', () => {
  it('lists the models on this computer when asked, each free and named as Ollama names it', async () => {
    const fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => tags }))
    vi.stubGlobal('fetch', fetch)
    const p = new OllamaProvider()
    expect(p.getModels()).toEqual([])
    const found = await p.listModels()
    expect(fetch.mock.calls[0][0]).toBe(`${ORIGIN}/api/tags`)
    expect(fetch.mock.calls[0][1]).toMatchObject({ credentials: 'omit', referrerPolicy: 'no-referrer' })
    expect(found.map((m) => m.id)).toEqual(['ollama:qwen3.5:9b', 'ollama:gemma4:e4b'])
    expect(found[0]).toMatchObject({ name: 'qwen3.5:9b', apiId: 'qwen3.5:9b', cost: { type: 'free-local' }, parameters: '9B' })
    expect(p.getModels()).toBe(found)
  })

  it('refuses a name that is not a model name', () => {
    expect(modelFromTag({ name: '<script>' })).toBeNull()
    expect(modelFromTag({ name: 'hf.co/org/model:q4' }).id).toBe('ollama:hf.co/org/model:q4')
  })

  it('streams a reply line by line, leaving out a thinking model\'s thinking', async () => {
    const fetch = vi.fn(async () => ndjson([
      { message: { role: 'assistant', content: '', thinking: 'Hmm.' }, done: false },
      { message: { role: 'assistant', content: 'Barn owls ' }, done: false },
      { message: { role: 'assistant', content: 'hunt by ear.' }, done: false },
      { message: { role: 'assistant', content: '' }, done: true, done_reason: 'stop', prompt_eval_count: 14, eval_count: 6 },
    ]))
    vi.stubGlobal('fetch', fetch)
    const parts = []
    const out = await new OllamaProvider().sendMessage([{ role: 'user', content: 'owls?' }], 'ollama:qwen3.5:9b', (c) => parts.push(c), undefined, 'Be brief.')
    expect(parts.join('')).toBe('Barn owls hunt by ear.')
    expect(out).toEqual({ usage: { input_tokens: 14, output_tokens: 6 }, stopReason: 'end_turn', toolUses: [] })
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe(`${ORIGIN}/api/chat`)
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(JSON.parse(init.body)).toEqual({ model: 'qwen3.5:9b', stream: true, messages: [{ role: 'system', content: 'Be brief.' }, { role: 'user', content: 'owls?' }] })
  })

  it('says a reply cut at the length limit was cut, and throws an error Ollama sends', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ndjson([{ message: { content: 'A long' }, done: false }, { done: true, done_reason: 'length' }])))
    expect((await new OllamaProvider().sendMessage([], 'ollama:x', () => {})).stopReason).toBe('max_tokens')
    vi.stubGlobal('fetch', vi.fn(async () => ndjson([{ error: 'model ran out of memory' }])))
    await expect(new OllamaProvider().sendMessage([], 'ollama:x', () => {})).rejects.toThrow('model ran out of memory')
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })))
    await expect(new OllamaProvider().sendMessage([], 'ollama:x', () => {})).rejects.toMatchObject({ status: 404 })
  })

  it('gives the whole reply at once without streaming, when asked (C114)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ message: { content: 'Whole.' }, done: true, done_reason: 'stop', prompt_eval_count: 3, eval_count: 2 }) })))
    const parts = []
    const out = await new OllamaProvider().sendMessageWhole([], 'ollama:x', (c) => parts.push(c))
    expect(parts).toEqual(['Whole.'])
    expect(out.usage).toEqual({ input_tokens: 3, output_tokens: 2 })
  })

  it('titles a chat with the model that answered it, on this computer', async () => {
    const fetch = vi.fn(async (url, init) => (JSON.parse(init.body).stream
      ? ndjson([{ message: { content: 'Hi' }, done: true, done_reason: 'stop' }])
      : { ok: true, status: 200, json: async () => ({ message: { content: '{"title": "Owl Hearing", "summary": "Talked about owls.", "tags": ["owls"]}' } }) }))
    vi.stubGlobal('fetch', fetch)
    const p = new OllamaProvider()
    await expect(p.generateMetadata([])).rejects.toThrow()
    await p.sendMessage([], 'ollama:qwen3.5:9b', () => {})
    expect(await p.generateMetadata([{ role: 'user', content: 'owls' }])).toEqual({ title: 'Owl Hearing', summary: 'Talked about owls', tags: ['owls'] })
    expect(JSON.parse(fetch.mock.calls.at(-1)[1].body).model).toBe('qwen3.5:9b')
  })
})

describe('thinking (C165)', () => {
  const thinker = { name: 'bonsai-2:9b', capabilities: ['completion', 'thinking'] }
  const plain = { name: 'plain:1b', capabilities: ['completion'] }
  const stream = () => ndjson([
    { message: { content: '', thinking: 'First, ' }, done: false },
    { message: { content: '', thinking: 'owls.' }, done: false },
    { message: { content: 'An owl.' }, done: false },
    { message: { content: '' }, done: true, done_reason: 'stop', prompt_eval_count: 1, eval_count: 2 },
  ])
  it('passes its thinking out as it comes, apart from the answer', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => stream()))
    const thought = []
    const parts = []
    await new OllamaProvider().sendMessage([], 'ollama:bonsai-2:9b', (c) => parts.push(c), undefined, '', [], null, { onThinking: (t) => thought.push(t) })
    expect(thought.join('')).toBe('First, owls.')
    expect(parts.join('')).toBe('An owl.')
  })
  it('asks a model not to think only when thinking is off and the model can', async () => {
    const tags = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ models: [thinker, plain] }) }))
    vi.stubGlobal('fetch', tags)
    const p = new OllamaProvider()
    await p.listModels()
    expect(p.getModels().map((m) => m.thinks)).toEqual([true, false])
    const fetch = vi.fn(async () => stream())
    vi.stubGlobal('fetch', fetch)
    await p.sendMessage([], 'ollama:bonsai-2:9b', () => {}, undefined, '', [], null, { think: false })
    await p.sendMessage([], 'ollama:plain:1b', () => {}, undefined, '', [], null, { think: false })
    await p.sendMessage([], 'ollama:bonsai-2:9b', () => {}, undefined, '', [], null, { think: true })
    const bodies = fetch.mock.calls.map((c) => JSON.parse(c[1].body))
    expect(bodies.map((b) => b.think)).toEqual([false, undefined, undefined])
  })
})

import { describe, it, expect, vi, afterEach } from 'vitest'
import { MistralProvider, HOSTS } from './mistral'

// Mistral (stage 7, piece 3; C159), with stand-in replies: no key, nothing sent.

const sse = (events) => {
  const text = events.map((e) => `data: ${typeof e === 'string' ? e : JSON.stringify(e)}\n\n`).join('')
  return { ok: true, status: 200, headers: new Headers(), body: new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(text)); c.close() } }) }
}
const chunk = (content, extra = {}) => ({ object: 'chat.completion.chunk', choices: [{ index: 0, delta: { content }, finish_reason: null }], ...extra })

afterEach(() => vi.unstubAllGlobals())

describe('Mistral', () => {
  it('streams a reply: text as it arrives, why it stopped and what it used', async () => {
    const fetch = vi.fn(async () => sse([
      chunk('Barn owls '),
      chunk('hunt by ear.'),
      { choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 12, completion_tokens: 5 } },
      '[DONE]',
    ]))
    vi.stubGlobal('fetch', fetch)
    const parts = []
    const out = await new MistralProvider().sendMessage('test-key', [{ role: 'user', content: 'owls?' }], 'mistral-small-4', (c) => parts.push(c), undefined, 'Be brief.')
    expect(parts.join('')).toBe('Barn owls hunt by ear.')
    expect(out).toEqual({ usage: { input_tokens: 12, output_tokens: 5 }, stopReason: 'end_turn', toolUses: [] })
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe(`${HOSTS.global}/v1/chat/completions`)
    expect(init.headers.Authorization).toBe('Bearer test-key')
    const body = JSON.parse(init.body)
    expect(body).toMatchObject({ model: 'mistral-small-2603', stream: true })
    expect(body.messages).toEqual([{ role: 'system', content: 'Be brief.' }, { role: 'user', content: 'owls?' }])
  })

  it('says a reply cut at the length limit was cut, in the words the chat reads', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => sse([chunk('A long'), { choices: [{ index: 0, delta: {}, finish_reason: 'length' }] }, '[DONE]'])))
    const out = await new MistralProvider().sendMessage('k', [], 'mistral-small-4', () => {})
    expect(out.stopReason).toBe('max_tokens')
  })

  it('throws when the stream sends an error, and when the request is refused', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => sse([chunk('Half'), { object: 'error', message: 'Service unavailable', code: 503 }])))
    await expect(new MistralProvider().sendMessage('k', [], 'mistral-small-4', () => {})).rejects.toThrow('Service unavailable')
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 401, headers: new Headers() })))
    await expect(new MistralProvider().sendMessage('k', [], 'mistral-small-4', () => {})).rejects.toMatchObject({ status: 401 })
  })

  it('sends only the words of a message, leaving out parts given in another provider\'s form', async () => {
    const fetch = vi.fn(async () => sse(['[DONE]']))
    vi.stubGlobal('fetch', fetch)
    await new MistralProvider().sendMessage('k', [{ role: 'user', content: [{ type: 'text', text: 'Look' }, { type: 'image', source: { data: 'x' } }] }], 'mistral-small-4', () => {})
    expect(JSON.parse(fetch.mock.calls[0][1].body).messages).toEqual([{ role: 'user', content: 'Look' }])
  })

  it('gives the whole reply at once without streaming, when asked (C114)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'Whole.' }, finish_reason: 'stop' }], usage: { prompt_tokens: 3, completion_tokens: 2 } }) })))
    const parts = []
    const out = await new MistralProvider().sendMessageWhole('k', [], 'mistral-large-3', (c) => parts.push(c))
    expect(parts).toEqual(['Whole.'])
    expect(out).toMatchObject({ usage: { input_tokens: 3, output_tokens: 2 }, stopReason: 'end_turn' })
  })

  it('checks a key by listing its models, spending nothing', async () => {
    const fetch = vi.fn(async () => ({ ok: true, status: 200 }))
    vi.stubGlobal('fetch', fetch)
    expect(await new MistralProvider().validateKey('k')).toMatchObject({ valid: true })
    expect(fetch.mock.calls[0][0]).toBe(`${HOSTS.global}/v1/models`)
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 401 })))
    expect(await new MistralProvider().validateKey('k')).toMatchObject({ valid: false, status: 'invalid' })
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline') }))
    expect(await new MistralProvider().validateKey('k')).toMatchObject({ valid: false, status: 'unreached' })
  })

  it('goes to the address of the region chosen, at 1.1 times the price there', async () => {
    const p = new MistralProvider()
    p.setRegion('eu')
    const fetch = vi.fn(async () => sse(['[DONE]']))
    vi.stubGlobal('fetch', fetch)
    await p.sendMessage('k', [], 'mistral-small-4', () => {})
    expect(fetch.mock.calls[0][0]).toBe('https://api.eu.mistral.ai/v1/chat/completions')
    const small = p.getModels().find((m) => m.id === 'mistral-small-4')
    expect(small.cost.inputPerMillion).toBeCloseTo(0.165)
    p.setRegion('somewhere')
    expect(p.region).toBe('global')
  })

  it('names fixed versions, never a moving alias, and who made each', () => {
    const models = new MistralProvider().getModels()
    for (const m of models) expect(m.apiId).not.toMatch(/latest/)
    expect(models.find((m) => m.id === 'zai-glm-5-3').maker).toBe('Z.ai')
    expect(models.filter((m) => m.preview).map((m) => m.name)).toEqual(['Mistral Large 4'])
  })
})

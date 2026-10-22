import { describe, it, expect, vi, afterEach } from 'vitest'
import { MistralProvider } from './mistral'

// A reply that reasons first, and a reply that never comes (C171), with
// stand-in replies: no key, nothing sent.

const sse = (events) => {
  const text = events.map((e) => `data: ${typeof e === 'string' ? e : JSON.stringify(e)}\n\n`).join('')
  return { ok: true, status: 200, headers: new Headers(), body: new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(text)); c.close() } }) }
}
const raw = (text) => ({ ok: true, status: 200, headers: new Headers(), body: new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(text)); c.close() } }) })
const delta = (content) => ({ choices: [{ index: 0, delta: { content }, finish_reason: null }] })

afterEach(() => vi.unstubAllGlobals())

describe('Mistral models that reason (C171)', () => {
  it('asks the models that take the setting not to reason first, and GLM 5.3 as little as it allows', async () => {
    const fetch = vi.fn(async () => sse([delta('Hi.'), '[DONE]']))
    vi.stubGlobal('fetch', fetch)
    const p = new MistralProvider()
    const sent = async (model) => {
      await p.sendMessage('k', [{ role: 'user', content: 'hi' }], model, () => {})
      return JSON.parse(fetch.mock.calls.at(-1)[1].body).reasoning_effort
    }
    expect(await sent('mistral-medium-3-5')).toBe('none')
    expect(await sent('mistral-large-4')).toBe('none')
    expect(await sent('zai-glm-5-3')).toBe('low')
    // Not on the page by its id: nothing sent for it.
    expect(await sent('mistral-small-4')).toBeUndefined()
    expect(await sent('mistral-large-3')).toBeUndefined()
  })

  it('shows thinking that arrives, and gives the answer that follows it', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => sse([
      delta([{ type: 'thinking', thinking: [{ type: 'text', text: 'Owls are birds; ' }] }]),
      delta([{ type: 'thinking', thinking: [{ type: 'text', text: 'answer briefly.' }] }, { type: 'text', text: 'Barn owls ' }]),
      delta('hunt by ear.'),
      { choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] },
      '[DONE]',
    ])))
    const parts = []
    const thoughts = []
    await new MistralProvider().sendMessage('k', [], 'zai-glm-5-3', (c) => parts.push(c), undefined, '', [], null, { onThinking: (t) => thoughts.push(t) })
    expect(parts.join('')).toBe('Barn owls hunt by ear.')
    expect(thoughts.join('')).toBe('Owls are birds; answer briefly.')
  })

  it('says why, when what came back is not a stream', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => raw('{"object":"error","message":"Invalid model: mistral-small-2603","type":"invalid_model","code":"1500"}')))
    await expect(new MistralProvider().sendMessage('k', [], 'mistral-small-4', () => {})).rejects.toThrow('Invalid model: mistral-small-2603')
    vi.stubGlobal('fetch', vi.fn(async () => raw('')))
    await expect(new MistralProvider().sendMessage('k', [], 'mistral-small-4', () => {})).rejects.toThrow('The provider sent no reply.')
  })

  it('reads the answer, not the thinking, from a whole reply', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: [{ type: 'thinking', thinking: [{ type: 'text', text: 'hmm' }] }, { type: 'text', text: 'Whole.' }] }, finish_reason: 'stop' }] }) })))
    const parts = []
    await new MistralProvider().sendMessageWhole('k', [], 'mistral-medium-3-5', (c) => parts.push(c))
    expect(parts).toEqual(['Whole.'])
  })
})

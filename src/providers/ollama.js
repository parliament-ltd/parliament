import { BaseProvider } from './base'
import { DESCRIBE_SYSTEM_PROMPT, SUMMARIZE_SYSTEM_PROMPT, readDescription, summaryItems, SUMMARY_MAX_TOKENS, SUMMARY_MAX_CHARS } from './shared'

// Ollama: models on this computer (refactor-plan.md, stage 7, piece 4;
// LPN §7.2 and §7.5; C33, C163).
//
// It is reached at one address, this computer on Ollama's own port, which is
// all the connection policy allows (CLAUDE.md: localhost by exact port).
// Nothing leaves the computer and nothing costs money. It takes no key, so
// the gateway calls it without one.
//
// It is never looked for unasked (C33): a browser asks the person before a
// site may reach apps on their computer, and that question should come after
// Parliament has said why. So the models are known only once the person has
// asked for a check (listModels), and after that on each start.
//
// Ollama's chat API streams one JSON object per line: a piece of the reply
// in message.content, and on the last line done: true, why it stopped and
// what it used. A thinking model's thinking comes in message.thinking and is
// not shown or kept: the reply is what it says.

export const ORIGIN = 'http://localhost:11434'
// Ids here are the model's Ollama name after this prefix, so they never
// meet another provider's: ollama:qwen3.5:8b.
export const PREFIX = 'ollama:'
// A model on a computer can take a while to load before its first word.
// Silence this long counts as a stall (C114); a second send costs nothing.
export const STALL_MS = 180_000

const STOPPED = { stop: 'end_turn', length: 'max_tokens' }

function textOf(content) {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content.filter((p) => p?.type === 'text' && typeof p.text === 'string').map((p) => p.text).join('\n\n')
}

function stalledError() {
  const error = new Error('The reply stalled: nothing arrived for a while.')
  error.name = 'Stalled'
  return error
}

/** A model as Parliament lists it, from what /api/tags says of it. */
export function modelFromTag(tag) {
  const name = String(tag?.name ?? tag?.model ?? '')
  if (!/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,95}$/.test(name)) return null
  const d = tag?.details ?? {}
  return Object.freeze({
    id: `${PREFIX}${name.toLowerCase()}`,
    apiId: name,
    name,
    maker: null,
    current: true,
    reference: false,
    preview: false,
    aliases: [],
    contextWindow: null,
    cost: { type: 'free-local' },
    size: typeof tag?.size === 'number' ? tag.size : null,
    parameters: typeof d.parameter_size === 'string' ? d.parameter_size.slice(0, 20) : null,
    family: typeof d.family === 'string' ? d.family.slice(0, 40) : null,
  })
}

export class OllamaProvider extends BaseProvider {
  constructor() {
    super()
    this.models = []
    this.last = null // the model last asked, for the small requests after it
  }

  getModels() {
    return this.models
  }

  _apiName(model) {
    const id = String(model ?? '')
    const found = this.models.find((m) => m.id === id || m.apiId === id)
    if (found) return found.apiId
    return id.startsWith(PREFIX) ? id.slice(PREFIX.length) : id
  }

  /**
   * Asks Ollama which models it has: the check the person asks for (C33).
   * @returns {Promise<object[]>} the models, now also what getModels() gives
   */
  async listModels({ signal } = {}) {
    const response = await fetch(`${ORIGIN}/api/tags`, { signal, credentials: 'omit', referrerPolicy: 'no-referrer' })
    if (!response.ok) {
      const error = new Error(`Ollama answered ${response.status}`)
      error.status = response.status
      throw error
    }
    const data = await response.json()
    this.models = (Array.isArray(data?.models) ? data.models : []).map(modelFromTag).filter(Boolean).slice(0, 200)
    return this.models
  }

  _messages(messages, systemPrompt) {
    const out = (messages ?? []).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: textOf(m.content) }))
    return systemPrompt ? [{ role: 'system', content: systemPrompt }, ...out] : out
  }

  _failure(response) {
    const error = new Error(response.status === 404 ? 'That model is not on this computer.' : `Ollama answered ${response.status}`)
    error.status = response.status
    return error
  }

  async sendMessage(messages, model, onChunk, signal, systemPrompt) {
    this.last = model
    const watch = new AbortController()
    const stop = () => watch.abort()
    if (signal?.aborted) watch.abort()
    signal?.addEventListener('abort', stop)
    let stalled = false
    let timer = null
    const alive = () => {
      clearTimeout(timer)
      timer = setTimeout(() => { stalled = true; watch.abort() }, STALL_MS)
    }
    try {
      alive()
      const response = await fetch(`${ORIGIN}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        body: JSON.stringify({ model: this._apiName(model), messages: this._messages(messages, systemPrompt), stream: true }),
        signal: watch.signal,
      })
      alive()
      if (!response.ok) throw this._failure(response)
      return await this._readStream(response, onChunk, alive)
    } catch (err) {
      if (stalled) throw stalledError()
      throw err
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', stop)
    }
  }

  async _readStream(response, onChunk, alive = () => {}) {
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    const usage = { input_tokens: 0, output_tokens: 0 }
    let stopReason = null
    const read = (line) => {
      if (!line.trim()) return false
      let event
      try { event = JSON.parse(line) } catch { return false }
      if (event?.error) {
        const error = new Error(String(event.error).slice(0, 300))
        error.status = null
        throw error
      }
      const text = event?.message?.content
      if (typeof text === 'string' && text) onChunk(text)
      if (event?.done) {
        stopReason = STOPPED[event.done_reason] ?? 'end_turn'
        usage.input_tokens = Number(event.prompt_eval_count) || 0
        usage.output_tokens = Number(event.eval_count) || 0
        return true
      }
      return false
    }
    for (;;) {
      const { done, value } = await reader.read()
      alive()
      if (done) { if (buffer) read(buffer); break }
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      let ended = false
      for (const line of lines) if (read(line)) ended = true
      if (ended) break
    }
    return { usage, stopReason, toolUses: [] }
  }

  async sendMessageWhole(messages, model, onChunk, signal, systemPrompt) {
    this.last = model
    const response = await fetch(`${ORIGIN}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      body: JSON.stringify({ model: this._apiName(model), messages: this._messages(messages, systemPrompt), stream: false }),
      signal,
    })
    if (!response.ok) throw this._failure(response)
    const data = await response.json()
    const text = textOf(data?.message?.content)
    if (text) onChunk(text)
    return {
      usage: { input_tokens: Number(data?.prompt_eval_count) || 0, output_tokens: Number(data?.eval_count) || 0 },
      stopReason: STOPPED[data?.done_reason] ?? 'end_turn',
      toolUses: [],
    }
  }

  // The small requests go to the model that answered last, on this computer.
  async _lightweightCall(systemPrompt, messages, maxTokens) {
    if (!this.last) throw new Error('No model on this computer has answered yet')
    const response = await fetch(`${ORIGIN}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      body: JSON.stringify({ model: this._apiName(this.last), messages: this._messages(messages, systemPrompt), stream: false, options: { num_predict: maxTokens } }),
    })
    if (!response.ok) throw this._failure(response)
    const data = await response.json()
    return textOf(data?.message?.content).trim()
  }

  async generateMetadata(messages) {
    const shown = (messages ?? []).slice(0, 4).map((m) => ({ role: m.role, content: textOf(m.content).slice(0, 500) }))
    shown.push({ role: 'user', content: 'Describe the conversation above as JSON.' })
    return readDescription(await this._lightweightCall(DESCRIBE_SYSTEM_PROMPT, shown, 200))
  }

  // Not named here: the model is whichever answered last (getMetadataModel
  // is for pricing, and this costs nothing).
  getMetadataModel() {
    return null
  }

  async summarize(items) {
    const text = await this._lightweightCall(SUMMARIZE_SYSTEM_PROMPT, [{ role: 'user', content: summaryItems(items) }], SUMMARY_MAX_TOKENS)
    if (!text) throw new Error('No summary came back')
    return text.slice(0, SUMMARY_MAX_CHARS)
  }
}

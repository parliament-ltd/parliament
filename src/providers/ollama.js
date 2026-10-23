import { BaseProvider } from './base'
import { DESCRIBE_SYSTEM_PROMPT, SUMMARIZE_SYSTEM_PROMPT, readDescription, summaryItems, SUMMARY_MAX_TOKENS, SUMMARY_MAX_CHARS, translateSystemPrompt, translatePieces, readPieces, translateMaxTokens, CHAT_SUMMARY_SYSTEM_PROMPT, CHAT_SUMMARY_MAX_TOKENS, readChatSummary, withIncluded } from './shared'
import { NAMES_SYSTEM_PROMPT, CHECK_SYSTEM_PROMPT, readNames, readCheck } from '../lib/injection'

// Text for one of the checks below, in its tag, any such tag inside taken out.
const asText = (t) => `<text>\n${String(t ?? '').replace(/<\/?text\b[^>]*>/gi, '').slice(0, 12_000)}\n</text>`

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

/**
 * Whether a model Ollama lists runs elsewhere: its cloud models run on its
 * own servers when asked through this computer, so a prompt to one leaves
 * the computer. /api/tags names their host (remote_host, remote_model), and
 * their tags end in cloud (docs.ollama.com, 22 October 2026; C167 (d)).
 */
export function runsElsewhere(tag) {
  const name = String(tag?.name ?? tag?.model ?? '')
  return Boolean(tag?.remote_host || tag?.remote_model) || /[:-]cloud$/i.test(name)
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
    // Whether it can think before answering, as Ollama says (C165).
    thinks: Array.isArray(tag?.capabilities) && tag.capabilities.includes('thinking'),
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

  /** The models the last check found that run elsewhere, left out (C167 (d)). */
  awayModels() {
    return this.away ?? []
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
    const tags = Array.isArray(data?.models) ? data.models : []
    // Models that run elsewhere are left out, so nothing sent to a model
    // listed here leaves this computer; the key panel says how many.
    this.away = tags.filter(runsElsewhere).map((t) => String(t?.name ?? t?.model ?? '').slice(0, 96)).filter(Boolean).slice(0, 50)
    this.models = tags.filter((t) => !runsElsewhere(t)).map(modelFromTag).filter(Boolean).slice(0, 200)
    return this.models
  }

  // What a prompt brought in from sources goes as JSON before its words,
  // with the system line saying it is data (C176).
  _messages(messages, systemPrompt) {
    const w = withIncluded(messages, systemPrompt, 'json')
    const out = (w.messages ?? []).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: textOf(m.content) }))
    return w.system ? [{ role: 'system', content: w.system }, ...out] : out
  }

  _failure(response) {
    const error = new Error(response.status === 404 ? 'That model is not on this computer.' : `Ollama answered ${response.status}`)
    error.status = response.status
    return error
  }

  // Whether to ask a model not to think: only when thinking is off and the
  // model can (asking one that cannot is refused by Ollama).
  _think(model, think) {
    const m = this.models.find((x) => x.id === model || x.apiId === model)
    return think === false && m?.thinks ? { think: false } : {}
  }

  // options: { think, onThinking } (C165): whether to let it think, and
  // where its thinking goes as it arrives, shown and never sent back.
  async sendMessage(messages, model, onChunk, signal, systemPrompt, _tools = [], _onToolUse = null, options = {}) {
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
        body: JSON.stringify({ model: this._apiName(model), messages: this._messages(messages, systemPrompt), stream: true, ...this._think(model, options.think) }),
        signal: watch.signal,
      })
      alive()
      if (!response.ok) throw this._failure(response)
      return await this._readStream(response, onChunk, alive, options.onThinking)
    } catch (err) {
      if (stalled) throw stalledError()
      throw err
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', stop)
    }
  }

  async _readStream(response, onChunk, alive = () => {}, onThinking = null) {
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
      const thought = event?.message?.thinking
      if (typeof thought === 'string' && thought) onThinking?.(thought)
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

  async sendMessageWhole(messages, model, onChunk, signal, systemPrompt, _tools = [], options = {}) {
    this.last = model
    const response = await fetch(`${ORIGIN}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      body: JSON.stringify({ model: this._apiName(model), messages: this._messages(messages, systemPrompt), stream: false, ...this._think(model, options.think) }),
      signal,
    })
    if (!response.ok) throw this._failure(response)
    const data = await response.json()
    const thought = data?.message?.thinking
    if (typeof thought === 'string' && thought) options.onThinking?.(thought)
    const text = textOf(data?.message?.content)
    if (text) onChunk(text)
    return {
      usage: { input_tokens: Number(data?.prompt_eval_count) || 0, output_tokens: Number(data?.eval_count) || 0 },
      stopReason: STOPPED[data?.done_reason] ?? 'end_turn',
      toolUses: [],
    }
  }

  // The small requests go to the model that answered last, on this computer,
  // or the one named; never thinking first, since a model that thinks would
  // spend the few tokens allowed on its thinking and answer nothing.
  async _lightweightCall(systemPrompt, messages, maxTokens, model = this.last) {
    if (!model) throw new Error('No model on this computer has answered yet')
    const response = await fetch(`${ORIGIN}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      body: JSON.stringify({ model: this._apiName(model), messages: this._messages(messages, systemPrompt), stream: false, options: { num_predict: maxTokens }, ...this._think(model, false) }),
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

  // The names of people in some texts, for the privacy filter (S3; C169):
  // only through a model here, so nothing leaves the computer to find them.
  async findNames(texts, { model } = {}) {
    const list = (texts ?? []).map((t) => String(t ?? '')).filter(Boolean)
    if (!list.length) return []
    const raw = await this._lightweightCall(NAMES_SYSTEM_PROMPT, [{ role: 'user', content: asText(list.join('\n\n')) }], 400, model)
    return readNames(raw, list)
  }

  // Whether text from a source tries to instruct a model (security notes
  // §1.5; S3; C169): a yes or no from a model here, a warning, never a guarantee.
  async checkText(text, { model } = {}) {
    const raw = await this._lightweightCall(CHECK_SYSTEM_PROMPT, [{ role: 'user', content: asText(text) }], 200, model)
    const said = readCheck(raw)
    if (!said) throw new Error('The check came back unreadable')
    return said
  }

  // open:203b summary (C175) by a model on this computer: free, and nothing leaves it.
  async summarizeChat(turns, { model } = {}) {
    return readChatSummary(await this._lightweightCall(CHAT_SUMMARY_SYSTEM_PROMPT, [{ role: 'user', content: summaryItems(turns) }], CHAT_SUMMARY_MAX_TOKENS, model))
  }

  // translate: (C166) by a model on this computer: free, and nothing leaves it.
  async translate(pieces, { from = null, to, query = false, model } = {}) {
    const raw = await this._lightweightCall(translateSystemPrompt({ from, to, query }), [{ role: 'user', content: translatePieces(pieces) }], translateMaxTokens(pieces), model)
    return readPieces(raw, pieces.length)
  }
}

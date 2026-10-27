import { BaseProvider } from './base'
import { findModel } from '../net/answerers'
import { DESCRIBE_SYSTEM_PROMPT, SUMMARIZE_SYSTEM_PROMPT, readDescription, summaryItems, SUMMARY_MAX_TOKENS, SUMMARY_MAX_CHARS, translateSystemPrompt, translatePieces, readPieces, translateMaxTokens, CHAT_SUMMARY_SYSTEM_PROMPT, CHAT_SUMMARY_MAX_TOKENS, readChatSummary, RIPPLE_SYSTEM_PROMPT, RIPPLE_MAX_TOKENS, rippleMessage, readRipple, SWEEP_SYSTEM_PROMPT, SWEEP_MAX_TOKENS, sweepMessage, readSweep, REFLECT_SYSTEM_PROMPT, REFLECT_TALK_SYSTEM_PROMPT, REFLECT_MAX_TOKENS, REFLECT_TALK_MAX_TOKENS, reflectMaterial, reflectTalkMessage, reflectSystem, readReflection, readReflectTalk, withIncluded, asCheckText } from './shared'
import { CHECK_SYSTEM_PROMPT, readCheck } from '../lib/injection'

// Mistral (refactor-plan.md, stage 7, piece 3; LPN §7.1; C82, C159).
//
// Its API answers a page in the browser (C82: every address allows any
// origin and the Authorization header). Three addresses: the global one, and
// one each in the EU and the US, which process prompts in that region and
// cost 1.1 times as much (docs.mistral.ai/studio-api/regional-inference).
// The address is chosen by the person's processing region, never by their
// network address, and only these three are ever reached: the list of
// providers names them for the connection policy.
//
// The chat API is shaped like OpenAI's: messages in, a stream of server-sent
// events out ("data: {…}", ending "data: [DONE]"). Replies report why they
// stopped in Anthropic's words here, so the chat reads every provider alike.

export const HOSTS = Object.freeze({
  global: 'https://api.mistral.ai',
  eu: 'https://api.eu.mistral.ai',
  us: 'https://api.us.mistral.ai',
})
export const REGIONS = Object.freeze(Object.keys(HOSTS))
// The regional addresses cost this much more, on every price.
export const REGION_FACTOR = 1.1

// As Anthropic's: silence this long counts as a stall (C114).
export const STALL_MS = 45_000

/* ── The models (checked 22 October 2026, docs.mistral.ai/inference/pricing
   and each model's page). Fixed versions, never a "-latest" alias, which
   Mistral moves (LPN §7.1). Prices in US dollars per million tokens, at the
   global address.
     maker    who made it: Mistral hosts models by others too (LPN §7.1)
     preview  offered before general availability; Mistral may change or
              withdraw it, and its data terms may differ (security notes §3)
     reasoning what is sent as reasoning_effort: the least each model takes,
              so a hosted model does not reason first unasked, which costs
              tokens unseen (C165 (f); docs.mistral.ai/capabilities/reasoning,
              22 October 2026, lists these ids: "none" omits the thinking;
              GLM 5.3 takes "low" at the least). A model the page does not
              list by its id is sent none (C171)
   The ids are as the docs give them, to confirm with a key (C159). */
const metered = (inputPerMillion, outputPerMillion) => ({ type: 'metered', inputPerMillion, outputPerMillion })
const MODELS = Object.freeze([
  { id: 'mistral-medium-3-5', apiId: 'mistral-medium-3-5', name: 'Mistral Medium 3.5', about: 'mistralMedium', contextWindow: 256_000, cost: metered(1.5, 7.5), reasoning: 'none' },
  // A preview: trained on whatever is chosen (commercial terms §4.3, 25
  // September 2026; C167 (c)).
  { id: 'mistral-large-4', apiId: 'mistral-large-4-0', name: 'Mistral Large 4', about: 'mistralLarge', contextWindow: 1_000_000, cost: metered(1.36, 4.18), preview: true, data: { training: 'always' }, reasoning: 'none' },
  { id: 'mistral-large-3', apiId: 'mistral-large-2512', name: 'Mistral Large 3', about: 'mistralLarge', contextWindow: 256_000, cost: metered(0.5, 1.5) },
  { id: 'mistral-small-4', apiId: 'mistral-small-2603', name: 'Mistral Small 4', about: 'mistralSmall', contextWindow: 256_000, cost: metered(0.15, 0.6) },
  { id: 'zai-glm-5-3', apiId: 'zai-glm-5-3', name: 'GLM 5.3', about: 'glm', contextWindow: 1_000_000, cost: metered(1.4, 4.4), maker: 'Z.ai', reasoning: 'low' },
].map((m) => Object.freeze({ maker: 'Mistral', current: true, reference: false, preview: false, aliases: [], ...m })))

// The small requests: a new chat's title, summary and tags (C62), and
// summarize: (C145 (g)), when Mistral answered.
const LIGHT_MODEL = 'mistral-small-4'

// What Mistral's "finish_reason" says, in the words the chat reads.
const STOPPED = { stop: 'end_turn', length: 'max_tokens', model_length: 'max_tokens', tool_calls: 'tool_use' }

// A message's words. Parts this provider is not given here (images, files
// in another provider's form) are left out, their text kept.
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

export class MistralProvider extends BaseProvider {
  constructor() {
    super()
    this.region = 'global'
  }

  /** The processing region: global, eu or us. Anything else is global. */
  setRegion(region) {
    this.region = REGIONS.includes(region) ? region : 'global'
  }

  _base() {
    return `${HOSTS[this.region] ?? HOSTS.global}/v1`
  }

  getModels() {
    if (this.region === 'global') return MODELS
    // A regional address costs 1.1 times as much (C159).
    return MODELS.map((m) => ({
      ...m,
      cost: { ...m.cost, inputPerMillion: m.cost.inputPerMillion * REGION_FACTOR, outputPerMillion: m.cost.outputPerMillion * REGION_FACTOR },
    }))
  }

  _resolveModel(model) {
    return findModel(MODELS, model)?.apiId ?? model
  }

  // How much a model may reason first, for a model that takes the setting.
  _reasoning(model) {
    const r = findModel(MODELS, model)?.reasoning
    return r ? { reasoning_effort: r } : {}
  }

  _headers(apiKey) {
    return { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${apiKey}` }
  }

  // What a prompt brought in from sources goes as JSON before its words,
  // with the system line saying it is data (C176).
  _messages(messages, systemPrompt) {
    const w = withIncluded(messages, systemPrompt, 'json')
    const out = (w.messages ?? []).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: textOf(m.content) }))
    return w.system ? [{ role: 'system', content: w.system }, ...out] : out
  }

  async validateKey(apiKey) {
    try {
      // Lists the models the key may use; nothing is generated, nothing spent.
      const response = await fetch(`${this._base()}/models`, { headers: this._headers(apiKey) })
      if (response.ok) return { valid: true, status: 'valid' }
      if (response.status === 401) return { valid: false, status: 'invalid', error: 'This key is not valid.' }
      if (response.status === 402 || response.status === 403) return { valid: false, status: 'billing_error', error: 'This key was recognised, but the account may not allow it.' }
      return { valid: false, status: 'error', error: `Unexpected error (${response.status}).` }
    } catch {
      return { valid: false, status: 'unreached', error: 'Could not reach the provider.' }
    }
  }

  // The error for a response the provider refused, with its status.
  _failure(response) {
    const error = new Error(response.status === 401 ? 'API key is no longer valid.' : response.status === 429 ? 'Rate limit reached.' : `API error (${response.status})`)
    error.status = response.status
    return error
  }

  // options: { onThinking }: where any thinking it sends goes, shown and
  // never sent back (C165), as for a model on this computer.
  async sendMessage(apiKey, messages, model, onChunk, signal, systemPrompt, _tools = [], _onToolUse = null, options = {}) {
    const body = { model: this._resolveModel(model), messages: this._messages(messages, systemPrompt), stream: true, max_tokens: 8192, ...this._reasoning(model) }
    // A stream that falls silent is stopped and said to have stalled, as
    // with every provider (C114); never sent again from here.
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
      const response = await fetch(`${this._base()}/chat/completions`, { method: 'POST', headers: { ...this._headers(apiKey), Accept: 'text/event-stream' }, body: JSON.stringify(body), signal: watch.signal })
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

  // Reads the stream: text to onChunk as it arrives, why it stopped, and
  // what it used, where a chunk carries it.
  async _readStream(response, onChunk, alive = () => {}, onThinking = null) {
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    // What came that was not a stream, read for its error at the end: a
    // reply must never end with nothing and no reason (C171).
    let sawData = false
    let other = ''
    const usage = { input_tokens: 0, output_tokens: 0 }
    let stopReason = null
    let ended = false
    while (!ended) {
      const { done, value } = await reader.read()
      alive()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (!line.startsWith('data:')) {
          if (!sawData && other.length < 4000) other += `${line}\n`
          continue
        }
        sawData = true
        const data = line.slice(5).trim()
        if (data === '[DONE]') { ended = true; break }
        let event
        try { event = JSON.parse(data) } catch { continue }
        if (event?.object === 'error' || event?.error) {
          reader.cancel().catch(() => {})
          const error = new Error(event.message || event.error?.message || 'The reply broke off.')
          error.status = event.code ?? null
          throw error
        }
        const choice = event?.choices?.[0]
        const text = choice?.delta?.content
        if (typeof text === 'string' && text) onChunk(text)
        else if (Array.isArray(text)) {
          // A model that reasons sends its thinking first, in pieces of their
          // own, then the answer (docs.mistral.ai/capabilities/reasoning).
          const thought = text.filter((p) => p?.type === 'thinking').map((p) => textOf(p.thinking)).join('')
          if (thought) onThinking?.(thought)
          const joined = text.filter((p) => p?.type === 'text').map((p) => p.text).join('')
          if (joined) onChunk(joined)
        }
        if (choice?.finish_reason) stopReason = STOPPED[choice.finish_reason] ?? null
        if (event?.usage) {
          usage.input_tokens = event.usage.prompt_tokens ?? usage.input_tokens
          usage.output_tokens = event.usage.completion_tokens ?? usage.output_tokens
        }
      }
    }
    if (!sawData) {
      // Not a stream at all: an error in another shape, or nothing.
      const rest = (other + buffer).trim()
      let said = null
      try { said = JSON.parse(rest) } catch { said = null }
      const error = new Error(said?.message || said?.error?.message || said?.detail?.[0]?.msg || 'The provider sent no reply.')
      error.status = said?.code ?? null
      throw error
    }
    return { usage, stopReason, toolUses: [] }
  }

  async sendMessageWhole(apiKey, messages, model, onChunk, signal, systemPrompt) {
    const response = await fetch(`${this._base()}/chat/completions`, {
      method: 'POST',
      headers: this._headers(apiKey),
      body: JSON.stringify({ model: this._resolveModel(model), messages: this._messages(messages, systemPrompt), stream: false, max_tokens: 8192, ...this._reasoning(model) }),
      signal,
    })
    if (!response.ok) throw this._failure(response)
    const data = await response.json()
    const choice = data?.choices?.[0]
    const text = textOf(choice?.message?.content)
    if (text) onChunk(text)
    return {
      usage: { input_tokens: data?.usage?.prompt_tokens ?? 0, output_tokens: data?.usage?.completion_tokens ?? 0 },
      stopReason: STOPPED[choice?.finish_reason] ?? null,
      toolUses: [],
    }
  }

  // A short request without streaming, to the small model unless another is named.
  async _lightweightCall(apiKey, systemPrompt, messages, maxTokens, model = LIGHT_MODEL) {
    const response = await fetch(`${this._base()}/chat/completions`, {
      method: 'POST',
      headers: this._headers(apiKey),
      body: JSON.stringify({ model: this._resolveModel(model), messages: this._messages(messages, systemPrompt), stream: false, max_tokens: maxTokens, ...this._reasoning(model) }),
    })
    if (!response.ok) throw this._failure(response)
    const data = await response.json()
    return textOf(data?.choices?.[0]?.message?.content).trim()
  }

  async generateMetadata(apiKey, messages) {
    const shown = (messages ?? []).slice(0, 4).map((m) => ({ role: m.role, content: textOf(m.content).slice(0, 500) }))
    shown.push({ role: 'user', content: 'Describe the conversation above as JSON.' })
    return readDescription(await this._lightweightCall(apiKey, DESCRIBE_SYSTEM_PROMPT, shown, 200))
  }

  getMetadataModel() {
    return LIGHT_MODEL
  }

  async summarize(apiKey, items) {
    const text = await this._lightweightCall(apiKey, SUMMARIZE_SYSTEM_PROMPT, [{ role: 'user', content: summaryItems(items) }], SUMMARY_MAX_TOKENS)
    if (!text) throw new Error('No summary came back')
    return text.slice(0, SUMMARY_MAX_CHARS)
  }

  // check: by a hosted model (C169 (d); C179), as Anthropic's.
  async checkText(apiKey, text, { model = LIGHT_MODEL } = {}) {
    const said = readCheck(await this._lightweightCall(apiKey, CHECK_SYSTEM_PROMPT, [{ role: 'user', content: asCheckText(text) }], 200, model))
    if (!said) throw new Error('The check came back unreadable')
    return said
  }

  // open:203b summary (C175), as Anthropic's.
  async summarizeChat(apiKey, turns, { model = LIGHT_MODEL } = {}) {
    return readChatSummary(await this._lightweightCall(apiKey, CHAT_SUMMARY_SYSTEM_PROMPT, [{ role: 'user', content: summaryItems(turns) }], CHAT_SUMMARY_MAX_TOKENS, model))
  }

  // translate: (C166), as Anthropic's.
  // Ripple (stage 12, piece 2; C231): where an edit belongs in another
  // branch, by the model named (the helper). null when nothing readable came back.
  async ripple(apiKey, request, { model = LIGHT_MODEL } = {}) {
    return readRipple(await this._lightweightCall(apiKey, RIPPLE_SYSTEM_PROMPT, [{ role: 'user', content: rippleMessage(request) }], RIPPLE_MAX_TOKENS, model), request)
  }

  // A sweep (stage 12, piece 3; C233): a framework's instruction applied to
  // a reply by the model named (the helper). null when nothing readable came back.
  async sweep(apiKey, request, { model = LIGHT_MODEL } = {}) {
    return readSweep(await this._lightweightCall(apiKey, SWEEP_SYSTEM_PROMPT, [{ role: 'user', content: sweepMessage(request) }], SWEEP_MAX_TOKENS, model))
  }

  // Reflection (stage 12, piece 4; C235): a synthesis, questions and a
  // proposal, or a reply in the talk about the chat, by the model named (the
  // helper), under the chat's frameworks (rules). Nothing goes into the chat.
  async reflect(apiKey, request, { model = LIGHT_MODEL, rules = [] } = {}) {
    return readReflection(await this._lightweightCall(apiKey, reflectSystem(REFLECT_SYSTEM_PROMPT, rules), [{ role: 'user', content: reflectMaterial(request) }], REFLECT_MAX_TOKENS, model), request)
  }

  async reflectTalk(apiKey, request, { model = LIGHT_MODEL, rules = [] } = {}) {
    return readReflectTalk(await this._lightweightCall(apiKey, reflectSystem(REFLECT_TALK_SYSTEM_PROMPT, rules), [{ role: 'user', content: reflectTalkMessage(request) }], REFLECT_TALK_MAX_TOKENS, model))
  }

  async translate(apiKey, pieces, { from = null, to, query = false, model = LIGHT_MODEL } = {}) {
    const raw = await this._lightweightCall(apiKey, translateSystemPrompt({ from, to, query }), [{ role: 'user', content: translatePieces(pieces) }], translateMaxTokens(pieces), model)
    return readPieces(raw, pieces.length)
  }
}

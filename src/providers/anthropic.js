import { BaseProvider } from './base'
import { evalMath } from '../lib/mathEval'
import { findModel } from '../net/answerers'
import { DESCRIBE_SYSTEM_PROMPT, SUMMARIZE_SYSTEM_PROMPT, SUMMARY_MAX_TOKENS, SUMMARY_MAX_CHARS, readDescription, summaryItems, stripPrefixes, translateSystemPrompt, translatePieces, readPieces, translateMaxTokens, CHAT_SUMMARY_SYSTEM_PROMPT, CHAT_SUMMARY_MAX_TOKENS, readChatSummary } from './shared'

const API_BASE = 'https://api.anthropic.com/v1'
const API_VERSION = '2023-06-01'

// How long a stream may be silent before it counts as stalled (C114). The
// provider sends pings while a reply is under way, so silence this long
// means a network is holding the stream. Kept generous: a stall leads the
// person to send again, which costs again.
export const STALL_MS = 45_000

// A citation from a web search, as kept: its address (web addresses only),
// its title and the passage it quoted (the provider sends at most 150
// characters). Other kinds of citation are left out.
export function citationOf(c) {
  if (c?.type !== 'web_search_result_location') return null
  if (typeof c.url !== 'string' || !c.url.startsWith('https://')) return null
  return { url: c.url, title: typeof c.title === 'string' ? c.title : null, cited: typeof c.cited_text === 'string' ? c.cited_text : null }
}

function stalledError() {
  const error = new Error('The reply stalled: nothing arrived for a while.')
  error.name = 'Stalled'
  return error
}

// The instructions for the small requests are shared by every provider
// (shared.js, stage 7).

/* ── Built-in Anthropic tools ─────────────────────────────── */

// PR-18d: max_uses caps how many times the model can run a search per
// response. 3 is a deliberate middle — thorough enough for most "look
// this up" prompts, frugal enough on credits and latency. No per-room
// config UI yet; revisit if anyone needs to tune it.
const WEB_SEARCH_TOOL = {
  type: 'web_search_20250305',
  name: 'web_search',
  max_uses: 3,
}

/* ── Client-side custom tools ─────────────────────────────── */

export const CALCULATE_TOOL = {
  name: 'calculate',
  description: 'Evaluate a mathematical expression and return the precise numeric result. Use this for arithmetic, percentages, exponents, and any calculation where exact precision matters.',
  input_schema: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'A JavaScript-compatible mathematical expression (e.g. "2 ** 32", "1234 * 5678", "Math.PI * 10 ** 2")',
      },
    },
    required: ['expression'],
  },
}

export const CREATE_CHART_TOOL = {
  name: 'create_chart',
  description: 'Render a chart in the conversation. Use when the user asks for a visualization, graph, or chart of data. Output structured chart data and the browser will render it.',
  input_schema: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: ['bar', 'line', 'pie', 'area'],
        description: 'Chart type',
      },
      title: {
        type: 'string',
        description: 'Chart title',
      },
      labels: {
        type: 'array',
        items: { type: 'string' },
        description: 'X-axis labels or pie slice names',
      },
      datasets: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            values: { type: 'array', items: { type: 'number' } },
          },
          required: ['values'],
        },
        description: 'One or more data series. For pie charts, use a single dataset.',
      },
    },
    required: ['type', 'labels', 'datasets'],
  },
}

/* ── Tool execution (client-side) ─────────────────────────── */

/**
 * Execute a client-side tool call. Returns the result as a string.
 * @param {string} toolName
 * @param {object} toolInput
 */
export function executeClientTool(toolName, toolInput) {
  if (toolName === 'calculate') {
    try {
      const result = evalMath(toolInput.expression ?? '')
      if (typeof result !== 'number' || !Number.isFinite(result)) {
        return `Result: ${result}`
      }
      return String(result)
    } catch (err) {
      return `Error: ${err.message}`
    }
  }

  if (toolName === 'create_chart') {
    // Return a JSON marker that MessageCard will detect and render as a chart
    return JSON.stringify({ _chartData: toolInput })
  }

  return 'Unknown tool'
}

/* ── The models (stage 7, piece 1; C34, C151, C153) ──────────
   Prices in US dollars per million tokens, from the provider's pricing page,
   checked 22 October 2026 (platform.claude.com/docs/en/about-claude/pricing).
   Every id here is a fixed snapshot, never an alias that moves.
     current    in the picker. Older models stay in the list only to name and
                price what they answered, and to read old short ids (aliases)
                as the model they stood for when they were written
     about      which line of the copy table says what it is good for
     reference  the model cost marks compare with (settings spec §8: Haiku)
     over       a higher price for a request whose prompt passes promptTokens */
const metered = (inputPerMillion, outputPerMillion, over = null) => ({ type: 'metered', inputPerMillion, outputPerMillion, ...(over ? { over } : {}) })
const MODELS = Object.freeze([
  // Kept 30 days or more, checked by the provider's safety systems
  // (support.claude.com/en/articles/15425695, 1 September 2026; C167 (b)).
  { id: 'claude-fable-5-1', apiId: 'claude-fable-5-1', name: 'Fable 5.1', about: 'fable', contextWindow: 1_000_000, cost: metered(10, 50), data: { kept: 'atLeast30' } },
  { id: 'claude-opus-5-5', apiId: 'claude-opus-5-5', name: 'Opus 5.5', about: 'opus', contextWindow: 1_000_000, cost: metered(4, 20) },
  { id: 'claude-sonnet-5-5', apiId: 'claude-sonnet-5-5', name: 'Sonnet 5.5', about: 'sonnet', contextWindow: 1_000_000, cost: metered(2, 10) },
  { id: 'claude-haiku-5-5', apiId: 'claude-haiku-5-5', name: 'Haiku 5.5', about: 'haiku', contextWindow: 1_000_000,
    cost: metered(0.1, 0.5, { promptTokens: 100_000, inputPerMillion: 0.5, outputPerMillion: 2.5 }) },
  // Older, still served: chats and Settings name them by the short ids of before.
  { id: 'claude-haiku-4-5', apiId: 'claude-haiku-4-5-20251001', name: 'Haiku 4.5', about: 'haiku', contextWindow: 200_000, cost: metered(1, 5), current: false, reference: true, aliases: ['claude-haiku'] },
  { id: 'claude-sonnet-4-6', apiId: 'claude-sonnet-4-6', name: 'Sonnet 4.6', about: 'sonnet', contextWindow: 1_000_000, cost: metered(3, 15), current: false, aliases: ['claude-sonnet'] },
  { id: 'claude-opus-4-6', apiId: 'claude-opus-4-6', name: 'Opus 4.6', about: 'opus', contextWindow: 1_000_000, cost: metered(5, 25), current: false, aliases: ['claude-opus'] },
  { id: 'claude-opus-4-7', apiId: 'claude-opus-4-7', name: 'Opus 4.7', about: 'opus', contextWindow: 1_000_000, cost: metered(5, 25), current: false },
].map((m) => Object.freeze({ maker: 'Anthropic', current: true, reference: false, aliases: [], ...m })))

// The model for the small requests: a key's check, a new chat's title,
// summary and tags (C62), and summarize: (C145 (g)). The cheapest current
// one (C154).
const LIGHT_MODEL = 'claude-haiku-5-5'

export class AnthropicProvider extends BaseProvider {
  getModels() {
    return MODELS
  }

  /** Return tool definitions this provider supports. */
  getAvailableTools() {
    return [
      {
        id: 'web_search',
        label: 'Web search',
        description: 'Search the web for up-to-date information',
        definition: WEB_SEARCH_TOOL,
        serverSide: true, // Anthropic handles execution
      },
      {
        id: 'calculate',
        label: 'Calculator',
        description: 'Precise arithmetic and math expressions',
        definition: CALCULATE_TOOL,
        serverSide: false,
      },
      {
        id: 'create_chart',
        label: 'Charts',
        description: 'Render charts and visualizations inline',
        definition: CREATE_CHART_TOOL,
        serverSide: false,
      },
    ]
  }

  // The API's id for a model, by its id here or an old short id (C151).
  _resolveModel(model) {
    return findModel(this.getModels(), model)?.apiId ?? model
  }

  // Common headers for all Anthropic API requests
  _headers(apiKey) {
    return {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': API_VERSION,
      'anthropic-dangerous-direct-browser-access': 'true',
    }
  }

  // Shared helper for lightweight non-streaming calls (title, summary, tags,
  // a translation), to the small model unless another is named.
  async _lightweightCall(apiKey, systemPrompt, messages, maxTokens = 60, model = LIGHT_MODEL) {
    const response = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: this._headers(apiKey),
      body: JSON.stringify({
        model: this._resolveModel(model),
        max_tokens: maxTokens,
        system: systemPrompt,
        messages,
      }),
    })

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`)
    }

    const data = await response.json()
    return data.content?.[0]?.text?.trim() ?? ''
  }

  // Prepare messages for lightweight calls: take first N messages, truncate content
  _prepareMessages(messages, maxMessages = 4, maxContentLength = 500) {
    return messages.slice(0, maxMessages).map(msg => ({
      role: msg.role,
      content: typeof msg.content === 'string'
        ? msg.content.slice(0, maxContentLength)
        : msg.content,
    }))
  }

  _stripPrefixes(text) {
    return stripPrefixes(text)
  }

  async validateKey(apiKey) {
    try {
      const response = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: this._headers(apiKey),
        body: JSON.stringify({
          model: this._resolveModel(LIGHT_MODEL),
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }],
        }),
      })

      if (response.ok) {
        return { valid: true, status: 'valid' }
      }

      // Note: Anthropic API keys do not expire automatically.
      // Do not use the word "expired" in any user-facing copy.
      // Keys become invalid when manually revoked or when the
      // account has billing issues.
      if (response.status === 401) {
        return {
          valid: false,
          status: 'invalid',
          error: 'This API key is not valid. Please check your key and try again.',
        }
      }

      if (response.status === 403) {
        return {
          valid: false,
          status: 'billing_error',
          error: 'This API key was recognized but your account may have insufficient credits or a billing issue. Please check your Anthropic dashboard.',
        }
      }

      // Neither accepted nor refused: the check could not say (stage 5,
      // the key panel tells this apart from a key that is wrong).
      return {
        valid: false,
        status: 'error',
        error: `Unexpected error (${response.status}). Please try again.`,
      }
    } catch {
      return {
        valid: false,
        status: 'unreached',
        error: 'Could not reach the Anthropic API. Please check your connection.',
      }
    }
  }

  /**
   * Send a message and stream the response.
   *
   * @param {string}   apiKey
   * @param {object[]} messages       - [{ role, content }]
   * @param {string}   model          - short model ID
   * @param {Function} onChunk        - called with each text chunk
   * @param {AbortSignal} signal
   * @param {string}   [systemPrompt]
   * @param {object[]} [tools]        - tool definitions to include
   * @param {Function} [onToolUse]    - called with { id, name, input } for client-side tools
   * @returns {{ usage, stopReason, toolUses }}
   */
  async sendMessage(apiKey, messages, model, onChunk, signal, systemPrompt, tools = [], onToolUse) {
    const toolDefs = tools.map(t => t.definition ?? t)

    const body = {
      model: this._resolveModel(model),
      max_tokens: 8192,
      stream: true,
      messages,
      ...(systemPrompt ? { system: systemPrompt } : {}),
      ...(toolDefs.length > 0 ? { tools: toolDefs } : {}),
    }

    // A network that holds streamed replies shows as silence: nothing at
    // all for STALL_MS, where the provider otherwise keeps the stream alive.
    // The stream is then stopped and the reply said to have stalled, for the
    // person to send again without streaming if they choose (C114). It is
    // never sent again from here: that would spend without a second Enter.
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
      const response = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: this._headers(apiKey),
        body: JSON.stringify(body),
        signal: watch.signal,
      })
      alive()
      if (!response.ok) throw this._failure(response)
      return await this._readStream(response, onChunk, onToolUse, alive)
    } catch (err) {
      if (stalled) throw stalledError()
      throw err
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', stop)
    }
  }

  /**
   * The same request without streaming: the whole reply in one response,
   * for a network that holds streamed replies (C114). Sent only when the
   * person chooses it on the Enter line. Same return as sendMessage; the
   * text reaches onChunk once.
   */
  async sendMessageWhole(apiKey, messages, model, onChunk, signal, systemPrompt, tools = []) {
    const toolDefs = tools.map(t => t.definition ?? t)
    const response = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: this._headers(apiKey),
      body: JSON.stringify({
        model: this._resolveModel(model),
        max_tokens: 8192,
        messages,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        ...(toolDefs.length > 0 ? { tools: toolDefs } : {}),
      }),
      signal,
    })
    if (!response.ok) throw this._failure(response)
    const data = await response.json()
    const blocks = Array.isArray(data?.content) ? data.content : []
    const text = blocks.filter(b => b?.type === 'text' && typeof b.text === 'string').map(b => b.text).join('')
    if (text) onChunk(text)
    return {
      usage: { input_tokens: data?.usage?.input_tokens ?? 0, output_tokens: data?.usage?.output_tokens ?? 0 },
      stopReason: data?.stop_reason ?? null,
      toolUses: blocks.filter(b => b?.type === 'tool_use').map(b => ({ id: b.id, name: b.name, input: b.input ?? {} })),
      citations: blocks.flatMap(b => (b?.type === 'text' && Array.isArray(b.citations) ? b.citations : [])).map(citationOf).filter(Boolean),
    }
  }

  // The error for a response the provider refused, with its status.
  _failure(response) {
    const status = response.status

    if (status === 401) {
      const error = new Error('API key is no longer valid.')
      error.status = 401
      return error
    }

    if (status === 403) {
      const error = new Error('Account billing issue. Please check your Anthropic dashboard.')
      error.status = 403
      return error
    }

    if (status === 429) {
      // Parse `retry-after` — spec allows seconds or HTTP-date, but
      // Anthropic returns seconds. Defend against both.
      const retryAfterHeader = response.headers.get('retry-after')
      let retryAfterSeconds = null
      if (retryAfterHeader) {
        const asNum = Number(retryAfterHeader)
        if (Number.isFinite(asNum) && asNum >= 0) {
          retryAfterSeconds = Math.ceil(asNum)
        } else {
          const asDate = Date.parse(retryAfterHeader)
          if (!Number.isNaN(asDate)) {
            retryAfterSeconds = Math.max(0, Math.ceil((asDate - Date.now()) / 1000))
          }
        }
      }
      const message = retryAfterSeconds
        ? `Rate limit reached. Please wait ~${retryAfterSeconds}s before sending.`
        : 'Rate limit reached. Please wait a moment before sending.'
      const error = new Error(message)
      error.status = 429
      error.retryAfterSeconds = retryAfterSeconds
      return error
    }

    const error = new Error(`API error (${status})`)
    error.status = status
    return error
  }

  // Reads a streamed reply: text to onChunk as it arrives, tool calls, the
  // reason it stopped and what it used. `alive` hears of every piece, so a
  // stream that falls silent can be noticed.
  async _readStream(response, onChunk, onToolUse, alive = () => {}) {
    // Parse SSE stream
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let usage = { input_tokens: 0, output_tokens: 0 }
    let stopReason = null
    const toolUses = []
    let currentToolUse = null
    // What a web search found and the reply cited, each { url, title, cited }:
    // kept and shown under the reply (stage 7, piece 7; the provider asks that
    // citations be shown to whoever reads the reply).
    const citations = []
    // An error sent inside the stream, as when the service is overloaded part
    // way through a reply. It used to be skipped, and the reply stored as
    // complete (request-path audit, item 9).
    let streamError = null

    while (!streamError) {
      const { done, value } = await reader.read()
      alive()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') continue

        try {
          const event = JSON.parse(data)

          if (event.type === 'error') {
            streamError = event.error ?? { type: 'error' }
            break
          }

          if (event.type === 'content_block_start') {
            if (event.content_block?.type === 'tool_use') {
              currentToolUse = {
                id: event.content_block.id,
                name: event.content_block.name,
                inputRaw: '',
              }
            }
          }

          if (event.type === 'content_block_delta') {
            if (event.delta?.type === 'text_delta') {
              onChunk(event.delta.text)
            }
            if (event.delta?.type === 'citations_delta') {
              const c = citationOf(event.delta.citation)
              if (c) citations.push(c)
            }
            if (event.delta?.type === 'input_json_delta' && currentToolUse) {
              currentToolUse.inputRaw += event.delta.partial_json
            }
          }

          if (event.type === 'content_block_stop' && currentToolUse) {
            try {
              currentToolUse.input = JSON.parse(currentToolUse.inputRaw || '{}')
            } catch {
              currentToolUse.input = {}
            }
            const { inputRaw: _, ...toolUse } = currentToolUse
            toolUses.push(toolUse)
            onToolUse?.(toolUse)
            currentToolUse = null
          }

          if (event.type === 'message_delta') {
            if (event.usage) {
              usage.output_tokens = event.usage.output_tokens
            }
            if (event.delta?.stop_reason) {
              stopReason = event.delta.stop_reason
            }
          }

          if (event.type === 'message_start' && event.message?.usage) {
            usage.input_tokens = event.message.usage.input_tokens
          }
        } catch {
          // Skip malformed JSON lines
        }
      }
    }

    if (streamError) {
      reader.cancel().catch(() => {})
      const error = new Error(streamError.message || 'The reply broke off.')
      error.type = streamError.type
      if (streamError.type === 'overloaded_error') error.status = 529
      throw error
    }

    return {
      usage,
      stopReason,
      toolUses,
      citations,
    }
  }

  async countTokens(apiKey, messages, model) {
    const response = await fetch(`${API_BASE}/messages/count_tokens`, {
      method: 'POST',
      headers: this._headers(apiKey),
      body: JSON.stringify({
        model: this._resolveModel(model),
        messages,
      }),
    })

    if (!response.ok) {
      throw new Error(`Token count failed (${response.status})`)
    }

    const data = await response.json()
    return { inputTokens: data.input_tokens }
  }

  // The one request after a chat's first answer (C62): title, summary and
  // tags from a single call. Returns whichever of them came back valid.
  async generateMetadata(apiKey, messages) {
    const describeMessages = this._prepareMessages(messages, 4, 500)
    describeMessages.push({ role: 'user', content: 'Describe the conversation above as JSON.' })

    return readDescription(await this._lightweightCall(apiKey, DESCRIBE_SYSTEM_PROMPT, describeMessages, 200))
  }

  // The model the request above goes to, so the Enter line can price it.
  getMetadataModel() {
    return LIGHT_MODEL
  }

  async summarize(apiKey, items) {
    const raw = await this._lightweightCall(apiKey, SUMMARIZE_SYSTEM_PROMPT, [{ role: 'user', content: summaryItems(items) }], SUMMARY_MAX_TOKENS)
    const text = String(raw ?? '').trim()
    if (!text) throw new Error('No summary came back')
    return text.slice(0, SUMMARY_MAX_CHARS)
  }

  // open:203b summary (stage 8, piece 4; C175): a chat's turns, each
  // { label, text }, summarized by the model named (the helper).
  async summarizeChat(apiKey, turns, { model = LIGHT_MODEL } = {}) {
    return readChatSummary(await this._lightweightCall(apiKey, CHAT_SUMMARY_SYSTEM_PROMPT, [{ role: 'user', content: summaryItems(turns) }], CHAT_SUMMARY_MAX_TOKENS, model))
  }

  // translate: (stage 7, piece 6; C166): pieces of text from a source, or a
  // question for one, into another language, by the model named (the
  // helper) or the small one. from and to are English names of languages.
  async translate(apiKey, pieces, { from = null, to, query = false, model = LIGHT_MODEL } = {}) {
    const raw = await this._lightweightCall(apiKey, translateSystemPrompt({ from, to, query }), [{ role: 'user', content: translatePieces(pieces) }], translateMaxTokens(pieces), model)
    return readPieces(raw, pieces.length)
  }
}

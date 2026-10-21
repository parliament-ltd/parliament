import { BaseProvider } from './base'
import { evalMath } from '../lib/mathEval'

const API_BASE = 'https://api.anthropic.com/v1'
const API_VERSION = '2023-06-01'

// How long a stream may be silent before it counts as stalled (C114). The
// provider sends pings while a reply is under way, so silence this long
// means a network is holding the stream. Kept generous: a stall leads the
// person to send again, which costs again.
export const STALL_MS = 45_000

function stalledError() {
  const error = new Error('The reply stalled: nothing arrived for a while.')
  error.name = 'Stalled'
  return error
}

const TITLE_SYSTEM_PROMPT = `Generate a short title (2-6 words) for this conversation. Rules:
- No quotes, no periods, no special characters
- Capture the core topic or intent
- Be specific, not generic (e.g. "React Router Migration" not "Coding Help")
- Title case
- Do NOT prefix with "Title:" or "Summary:" or any label
- Respond with ONLY the title, nothing else`

const SUMMARY_SYSTEM_PROMPT = `Summarize this conversation in one concise sentence. Rules:
- Maximum 120 characters
- Describe what was discussed or accomplished
- Use past tense (e.g. "Designed a chat interface with branching and context metering")
- Be specific, not generic
- Do NOT prefix with "Summary:" or any label
- Respond with ONLY the summary sentence, nothing else`

const TAGS_SYSTEM_PROMPT = `Generate 1-3 topic tags for this conversation. Rules:
- Each tag is a single lowercase word (e.g. "design", "api", "architecture")
- Tags should capture the main topics or domains discussed
- Return ONLY the tags as a comma-separated list, nothing else
- Example: "design, api, performance"`

// One request after a chat's first answer, in place of the three above
// (C62): its title, a one-line summary and its tags, as JSON.
const DESCRIBE_SYSTEM_PROMPT = `Describe this conversation for a list of conversations. Respond with JSON only, in exactly this shape:
{"title": "...", "summary": "...", "tags": ["..."]}
Rules:
- title: 2-6 words, specific, in title case, with no quotes and no final period
- summary: one sentence in the past tense, at most 120 characters, describing what was discussed
- tags: 1-3 single lowercase words naming the main topics
- Write the title and summary in the language of the conversation
- Respond with the JSON only, nothing before or after it`

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

export class AnthropicProvider extends BaseProvider {
  getModels() {
    return [
      { id: 'claude-haiku',     apiId: 'claude-haiku-4-5-20251001', name: 'Claude Haiku',     contextWindow: 200000, cost: { type: 'metered', inputPerMillion: 0.25,  outputPerMillion: 1.25  } },
      { id: 'claude-sonnet',    apiId: 'claude-sonnet-4-6',         name: 'Claude Sonnet',    contextWindow: 200000, cost: { type: 'metered', inputPerMillion: 3.00,  outputPerMillion: 15.00 } },
      { id: 'claude-opus',      apiId: 'claude-opus-4-6',           name: 'Claude Opus 4.6',  contextWindow: 200000, cost: { type: 'metered', inputPerMillion: 15.00, outputPerMillion: 75.00 } },
      { id: 'claude-opus-4-7',  apiId: 'claude-opus-4-7',           name: 'Claude Opus 4.7',  contextWindow: 200000, cost: { type: 'metered', inputPerMillion: 15.00, outputPerMillion: 75.00 } },
    ]
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

  // Resolve a short model ID (e.g. 'claude-sonnet') to the API model string
  _resolveModel(model) {
    const found = this.getModels().find(m => m.id === model || m.apiId === model)
    return found ? found.apiId : model
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

  // Shared helper for lightweight non-streaming calls (title, summary, tags)
  async _lightweightCall(apiKey, systemPrompt, messages, maxTokens = 60) {
    const response = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: this._headers(apiKey),
      body: JSON.stringify({
        model: this._resolveModel('claude-haiku'),
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

  // Strip common prefixes that the model sometimes adds despite instructions
  _stripPrefixes(text) {
    return text
      .replace(/^(Title|Summary|Tags|Branch|Topic|Label|Subject)\s*:\s*/i, '')
      .replace(/^["']|["']$/g, '')
      .replace(/\.$/, '')
      .trim()
  }

  async validateKey(apiKey) {
    try {
      const response = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: this._headers(apiKey),
        body: JSON.stringify({
          model: this._resolveModel('claude-haiku'),
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

      return {
        valid: false,
        status: 'invalid',
        error: `Unexpected error (${response.status}). Please try again.`,
      }
    } catch {
      return {
        valid: false,
        status: 'invalid',
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

  async generateTitle(apiKey, messages) {
    const titleMessages = this._prepareMessages(messages, 2, 500)

    titleMessages.push({
      role: 'user',
      content: 'Based on our exchange above, generate a short title for this conversation.',
    })

    const rawTitle = await this._lightweightCall(apiKey, TITLE_SYSTEM_PROMPT, titleMessages, 30)
    const cleanTitle = this._stripPrefixes(rawTitle)

    if (cleanTitle.length === 0 || cleanTitle.length > 60) {
      throw new Error('Generated title was empty or too long')
    }

    return cleanTitle
  }

  async generateSummary(apiKey, messages) {
    const summaryMessages = this._prepareMessages(messages, 6, 400)

    summaryMessages.push({
      role: 'user',
      content: 'Based on the conversation above, write a one-sentence summary of what was discussed.',
    })

    const rawSummary = await this._lightweightCall(apiKey, SUMMARY_SYSTEM_PROMPT, summaryMessages, 80)
    const cleanSummary = this._stripPrefixes(rawSummary)

    if (cleanSummary.length === 0 || cleanSummary.length > 200) {
      throw new Error('Generated summary was empty or too long')
    }

    return cleanSummary
  }

  async generateTags(apiKey, messages) {
    const tagMessages = this._prepareMessages(messages, 4, 400)

    tagMessages.push({
      role: 'user',
      content: 'Based on the conversation above, generate topic tags.',
    })

    const rawTags = await this._lightweightCall(apiKey, TAGS_SYSTEM_PROMPT, tagMessages, 40)
    const cleanTags = this._stripPrefixes(rawTags)

    // Parse comma-separated tags, clean each one
    const tags = cleanTags
      .split(',')
      .map(t => t.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''))
      .filter(t => t.length > 0 && t.length <= 20)
      .slice(0, 3)

    if (tags.length === 0) {
      throw new Error('No valid tags generated')
    }

    return tags
  }

  // The one request after a chat's first answer (C62): title, summary and
  // tags from a single call. Returns whichever of them came back valid.
  async generateMetadata(apiKey, messages) {
    const describeMessages = this._prepareMessages(messages, 4, 500)
    describeMessages.push({ role: 'user', content: 'Describe the conversation above as JSON.' })

    const raw = await this._lightweightCall(apiKey, DESCRIBE_SYSTEM_PROMPT, describeMessages, 200)
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    let data = null
    try { data = start >= 0 && end > start ? JSON.parse(raw.slice(start, end + 1)) : null } catch { data = null }
    if (!data || typeof data !== 'object') throw new Error('No description came back')

    const out = {}
    const title = typeof data.title === 'string' ? this._stripPrefixes(data.title) : ''
    if (title.length > 0 && title.length <= 60) out.title = title
    const summary = typeof data.summary === 'string' ? this._stripPrefixes(data.summary) : ''
    if (summary.length > 0 && summary.length <= 200) out.summary = summary
    const tags = (Array.isArray(data.tags) ? data.tags : [])
      .filter(t => typeof t === 'string')
      .map(t => t.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''))
      .filter(t => t.length > 0 && t.length <= 20)
      .slice(0, 3)
    if (tags.length) out.tags = tags
    if (!Object.keys(out).length) throw new Error('No valid description came back')
    return out
  }

  // The model the request above goes to, so the Enter line can price it.
  getMetadataModel() {
    return 'claude-haiku'
  }
}

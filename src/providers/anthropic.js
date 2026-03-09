import { BaseProvider } from './base'

const API_BASE = 'https://api.anthropic.com/v1'
const API_VERSION = '2023-06-01'

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

export class AnthropicProvider extends BaseProvider {
  getModels() {
    return [
      { id: 'claude-haiku', apiId: 'claude-haiku-4-5-20251001', name: 'Claude Haiku', inputCost: 0.25, outputCost: 1.25, contextWindow: 200000 },
      { id: 'claude-sonnet', apiId: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet', inputCost: 3.00, outputCost: 15.00, contextWindow: 200000 },
      { id: 'claude-opus', apiId: 'claude-opus-4-6', name: 'Claude Opus', inputCost: 15.00, outputCost: 75.00, contextWindow: 200000 },
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
    } catch (error) {
      return {
        valid: false,
        status: 'invalid',
        error: 'Could not reach the Anthropic API. Please check your connection.',
      }
    }
  }

  async sendMessage(apiKey, messages, model, onChunk, signal, systemPrompt) {
    const response = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: this._headers(apiKey),
      body: JSON.stringify({
        model: this._resolveModel(model),
        max_tokens: 8192,
        stream: true,
        messages,
        ...(systemPrompt ? { system: systemPrompt } : {}),
      }),
      signal,
    })

    // Handle error responses before attempting to parse the stream
    if (!response.ok) {
      const status = response.status

      if (status === 401) {
        const error = new Error('API key is no longer valid.')
        error.status = 401
        throw error
      }

      if (status === 403) {
        const error = new Error('Account billing issue. Please check your Anthropic dashboard.')
        error.status = 403
        throw error
      }

      if (status === 429) {
        const error = new Error('Rate limit reached. Please wait a moment before sending.')
        error.status = 429
        throw error
      }

      const error = new Error(`API error (${status})`)
      error.status = status
      throw error
    }

    // Parse SSE stream
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let usage = { input_tokens: 0, output_tokens: 0 }
    let stopReason = null

    while (true) {
      const { done, value } = await reader.read()
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

          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            onChunk(event.delta.text)
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

    return {
      usage,
      stopReason,
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
}
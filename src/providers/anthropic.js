import { BaseProvider } from './base'

const API_BASE = 'https://api.anthropic.com/v1'
const API_VERSION = '2023-06-01'

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

  async sendMessage(apiKey, messages, model, onChunk, signal) {
    const response = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: this._headers(apiKey),
      body: JSON.stringify({
        model: this._resolveModel(model),
        max_tokens: 8192,
        stream: true,
        messages,
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
}
import { BaseProvider } from './base'

const API_BASE = 'https://api.anthropic.com/v1'

export class AnthropicProvider extends BaseProvider {
  getModels() {
    return [
      { id: 'claude-haiku', apiId: 'claude-haiku-4-5-20251001', name: 'Claude Haiku', inputCost: 0.25, outputCost: 1.25, contextWindow: 200000 },
      { id: 'claude-sonnet', apiId: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet', inputCost: 3.00, outputCost: 15.00, contextWindow: 200000 },
      { id: 'claude-opus', apiId: 'claude-opus-4-6', name: 'Claude Opus', inputCost: 15.00, outputCost: 75.00, contextWindow: 200000 },
    ]
  }

  async validateKey(apiKey) {
    // TODO: implement — call /v1/messages with a minimal prompt
    // Return { valid: true } or { valid: false, error: 'message' }
  }

  async sendMessage(apiKey, messages, model, onChunk) {
    // TODO: implement — call /v1/messages with stream: true
    // Parse SSE events and call onChunk(text) for each content delta
    // Return full response with usage: { inputTokens, outputTokens }
  }

  async countTokens(apiKey, messages, model) {
    // TODO: implement — call /v1/messages/count_tokens
  }
}
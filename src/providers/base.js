// Provider Interface
// Every AI provider must implement these methods.
// V1 only includes Anthropic — others can be added later
// without changing any consuming code.

export class BaseProvider {
  // Validate that an API key works
  // Returns { valid: boolean, status: 'valid'|'invalid'|'billing_error', error?: string }
  async validateKey(apiKey) {
    throw new Error('Not implemented')
  }

  // Send a message and stream the response
  // messages: [{ role: 'user'|'assistant', content: string }]
  // onChunk: callback called with each text chunk as it arrives
  // signal: AbortController signal to cancel the request
  // Returns the complete response object with usage data
  async sendMessage(apiKey, messages, model, onChunk, signal) {
    throw new Error('Not implemented')
  }

  // Return available models with metadata
  // Returns [{ id, apiId, name, inputCost, outputCost, contextWindow }]
  getModels() {
    throw new Error('Not implemented')
  }

  // Count tokens for a set of messages
  // Returns { inputTokens }
  async countTokens(apiKey, messages, model) {
    throw new Error('Not implemented')
  }

  // Continue instruction for resuming interrupted streams.
  // This is a constant — not provider-specific — but lives here
  // so all providers share the same phrasing.
  getContinueInstruction() {
    return 'Your previous response was interrupted. The partial response above is what was delivered. Continue exactly from where you left off — do not repeat, summarize, or restart any content that already appears above. Maintain the same tone, structure, and formatting.'
  }
}
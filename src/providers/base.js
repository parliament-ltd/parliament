// Provider Interface
// Every AI provider must implement these methods.
// V1 only includes Anthropic — others can be added later
// without changing any consuming code.

export class BaseProvider {
  // Validate that an API key works
  // Returns { valid: boolean, error?: string }
  async validateKey(apiKey) {
    throw new Error('Not implemented')
  }

  // Send a message and stream the response
  // messages: [{ role: 'user'|'assistant', content: string }]
  // onChunk: callback called with each text chunk as it arrives
  // Returns the complete response object with usage data
  async sendMessage(apiKey, messages, model, onChunk) {
    throw new Error('Not implemented')
  }

  // Return available models with metadata
  // Returns [{ id, name, inputCost, outputCost, contextWindow }]
  getModels() {
    throw new Error('Not implemented')
  }

  // Count tokens for a set of messages
  // Returns { inputTokens }
  async countTokens(apiKey, messages, model) {
    throw new Error('Not implemented')
  }
}
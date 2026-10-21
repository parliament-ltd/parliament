/* eslint-disable no-unused-vars -- interface stubs: the parameters document the contract */
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
  // systemPrompt: optional string prepended as a system message
  // tools: optional array of tool definitions to enable
  // Returns the complete response object with usage data
  async sendMessage(apiKey, messages, model, onChunk, signal, systemPrompt, tools = []) {
    throw new Error('Not implemented')
  }

  // The same request without streaming: the whole reply in one response,
  // for a network that holds streamed replies (C114). Sent only when the
  // person chooses it on the Enter line, never as an automatic retry.
  // Same return as sendMessage; the text reaches onChunk once.
  // A streamed send whose stream falls silent too long throws an error
  // named 'Stalled', so the Enter line can offer this.
  async sendMessageWhole(apiKey, messages, model, onChunk, signal, systemPrompt, tools = []) {
    throw new Error('Not implemented')
  }

  // Return available models with metadata.
  //
  // Returns [{ id, apiId, name, contextWindow, cost }]
  //
  // The `cost` field is structured so non-Anthropic providers can fill the
  // same shape without any refactor of consuming code:
  //   - { type: 'metered', inputPerMillion, outputPerMillion } — paid APIs
  //     (Anthropic, OpenAI, Mistral). Both numbers in USD per 1M tokens.
  //   - { type: 'free-local' } — keyless local providers (Ollama, etc.).
  //   - null — pricing unknown / unspecified.
  //
  // PR-12 consolidated the model info to this shape; the legacy duplicate
  // cost table in src/lib/tokens.js was removed.
  getModels() {
    throw new Error('Not implemented')
  }

  // Count tokens for a set of messages
  // Returns { inputTokens }
  async countTokens(apiKey, messages, model) {
    throw new Error('Not implemented')
  }

  // Return the list of tool definitions this provider supports.
  // Each tool: { name, description, input_schema }
  // Default: empty — providers with no tool support can skip overriding.
  getAvailableTools() {
    return []
  }

  // The one request after a chat's first answer (C62), in place of the
  // three above: its title, a one-line summary and 1-3 tags, from a single
  // lightweight call. Returns { title?, summary?, tags? }, whichever came
  // back valid; throws when none did. Callers keep the chat as it was.
  async generateMetadata(apiKey, messages) {
    throw new Error('Not implemented')
  }

  // The model that request goes to, so the Enter line can price it before
  // Enter (C83). null when not known.
  getMetadataModel() {
    return null
  }

  // How an answer from a source (Wikipedia) is introduced when the person
  // brings it into a prompt. The model did not write it, so it goes as
  // quoted context on the person's side, saying where it came from. Not
  // used yet: source answers stay out of what a model is sent unless the
  // person acts on them (C115), and that act comes with branches (stage 8).
  // Shared by every provider.
  introduceSourceAnswer(source) {
    const name = source?.name || 'a source'
    const page = source?.title ? `, the page "${source.title}"` : ''
    return `[An answer from ${name}${page}, shown to the person in place of a reply. You did not write it.]`
  }

  // Continue instruction for resuming interrupted streams.
  // This is a constant — not provider-specific — but lives here
  // so all providers share the same phrasing.
  getContinueInstruction() {
    return 'Your previous response was interrupted. The partial response above is what was delivered. Continue exactly from where you left off — do not repeat, summarize, or restart any content that already appears above. Maintain the same tone, structure, and formatting.'
  }
}

import { AnthropicProvider } from './anthropic'
import { MistralProvider } from './mistral'
import { OllamaProvider } from './ollama'

const providers = {
  anthropic: new AnthropicProvider(),
  mistral: new MistralProvider(),
  ollama: new OllamaProvider(),
}

export function getProvider(name = 'anthropic') {
  const provider = providers[name]
  if (!provider) throw new Error(`Unknown provider: ${name}`)
  return provider
}

export function listProviders() {
  return Object.keys(providers)
}
import { AnthropicProvider } from './anthropic'

const providers = {
  anthropic: new AnthropicProvider(),
}

export function getProvider(name = 'anthropic') {
  const provider = providers[name]
  if (!provider) throw new Error(`Unknown provider: ${name}`)
  return provider
}

export function listProviders() {
  return Object.keys(providers)
}
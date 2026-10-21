// The gateway and the key module, wired to the app (stage 4). Everything
// that talks to a provider or source, or handles a key, goes through here.

import { destination } from './list'
import { createKeyring } from './keyring'
import { createGateway } from './gateway'
import { getProvider } from '../providers'
import { executeClientTool } from '../providers/anthropic'
import { saveApiKey, loadApiKey, deleteApiKey, hasSavedKey } from '../lib/crypto'

export { Refused } from './gateway'
export { destination, shipped } from './list'

export const keys = createKeyring({
  load: (provider) => loadApiKey('persistent', provider),
  has: (provider) => hasSavedKey(provider),
  save: (provider, key) => saveApiKey(key, 'persistent', provider),
  remove: (provider) => deleteApiKey(provider),
})

// The code behind each shipped entry. Models come from src/providers;
// sources join as they ship (Wikipedia next, in this stage).
function implementation(id) {
  const d = destination(id)
  if (!d) return null
  if (d.kind === 'model') return getProvider(id)
  return null
}

export const gateway = createGateway({ destination, keyring: keys, implementation })

// The provider until the picker arrives (stage 7): every call names it, so
// switching is a change of this one value per call site.
export const DEFAULT_MODEL_PROVIDER = 'anthropic'

// Facts about a provider that need no request: its models and their prices,
// the tools it offers, and tools that run on this device (a chart drawn from
// what the model sends). Read here so nothing outside src/net imports
// provider code (CLAUDE.md, hard constraints).
export const models = (id = DEFAULT_MODEL_PROVIDER) => implementation(id)?.getModels?.() ?? []
export const availableTools = (id = DEFAULT_MODEL_PROVIDER) => implementation(id)?.getAvailableTools?.() ?? []
export const continueInstruction = (id = DEFAULT_MODEL_PROVIDER) => implementation(id)?.getContinueInstruction?.() ?? ''
export const runClientTool = (name, input) => executeClientTool(name, input)

/** Whether there is a key for a provider, without decrypting it. */
export const hasKey = (id = DEFAULT_MODEL_PROVIDER) => keys.has(id)

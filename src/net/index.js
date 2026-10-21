// The gateway and the key module, wired to the app (stage 4). Everything
// that talks to a provider or source, or handles a key, goes through here.

import { destination, shipped } from './list'
import { createKeyring, checkAndKeep } from './keyring'
import { createGateway } from './gateway'
import { getProvider } from '../providers'
import { executeClientTool } from '../providers/anthropic'
import { saveApiKey, loadApiKey, deleteApiKey, hasSavedKey } from '../lib/crypto'
import { createSource } from './sources'
import wikipediaManifest from './sources/wikipedia.json'

export { Refused } from './gateway'
export { destination, shipped } from './list'

export const keys = createKeyring({
  load: (provider) => loadApiKey('persistent', provider),
  has: (provider) => hasSavedKey(provider),
  save: (provider, key) => saveApiKey(key, 'persistent', provider),
  remove: (provider) => deleteApiKey(provider),
})

// The code behind each shipped entry. Models come from src/providers;
// sources are manifests read by one runner (sources.js), each allowed only
// the origins the list gives it.
const MANIFESTS = { wikipedia: wikipediaManifest }
const sources = new Map()
function implementation(id) {
  const d = destination(id)
  if (!d) return null
  if (d.kind === 'model') return getProvider(id)
  if (d.kind === 'source' && MANIFESTS[id]) {
    if (!sources.has(id)) sources.set(id, createSource(MANIFESTS[id], { origins: d.origins, fetch: (...a) => window.fetch(...a) }))
    return sources.get(id)
  }
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
export const metadataModel = (id = DEFAULT_MODEL_PROVIDER) => implementation(id)?.getMetadataModel?.() ?? null
export const introduceSource =(source, id = DEFAULT_MODEL_PROVIDER) => implementation(id)?.introduceSourceAnswer?.(source) ?? ''
export const runClientTool = (name, input) => executeClientTool(name, input)

/** Whether there is a key for a provider, without decrypting it. */
export const hasKey = (id = DEFAULT_MODEL_PROVIDER) => keys.has(id)

// ── For the key panel (stage 5) ─────────────────────────
// The panel shows each key's last four characters and never holds a key:
// the key is read here, cut, and let go.

/** The built providers that take a key: whether each has one, and its last four characters. */
export async function keyStatus() {
  const out = []
  for (const d of shipped().filter((x) => x.key)) {
    const key = await keys.get(d.id).catch(() => null)
    out.push({ id: d.id, name: d.name, has: Boolean(key), held: keys.isHeld(d.id), ending: key ? key.slice(-4) : null, keysPage: d.keysPage })
  }
  return out
}

/** Checks a typed key with its provider, then keeps it saved or for this tab only. */
export const addKey = (id, typed, { save = true } = {}) => checkAndKeep({ check: gateway.check, keyring: keys }, id, typed, { save })

/** The built sources and local models that need no key, by name. */
export const noKeyNeeded = () => shipped().filter((d) => !d.key && d.kind !== 'model').map((d) => d.name)

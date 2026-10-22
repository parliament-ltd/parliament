// The gateway and the key module, wired to the app (stage 4). Everything
// that talks to a provider or source, or handles a key, goes through here.

import { destination, shipped, DESTINATIONS } from './list'
import { answererRows, answererFor, findModel } from './answerers'
import { createKeyring, checkAndKeep } from './keyring'
import { createGateway } from './gateway'
import { getProvider } from '../providers'
import { executeClientTool } from '../providers/anthropic'
import { saveApiKey, loadApiKey, deleteApiKey, hasSavedKey } from '../lib/crypto'
import { createSource } from './sources'
import wikipediaManifest from './sources/wikipedia.json'

export { Refused } from './gateway'
export { destination, shipped, DESTINATIONS } from './list'
export { findAnswerers, findModel, costMark, GROUPS as ANSWER_GROUPS, SOURCE_KINDS } from './answerers'

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

// ── Who answers (stage 7, piece 1; C148 to C153) ────────
// The picker's rows and the one answering a chat, from the list and each
// built provider's models. A provider not built yet has no models here.

/** A provider's models, or none when it is not built yet. */
export const modelsOf = (id) => (destination(id)?.ships ? models(id) : [])

/** Every built provider's models, current and older, as the model: filter reads them. */
export const allModels = () => DESTINATIONS.filter((d) => d.ships && d.kind !== 'source').flatMap((d) => modelsOf(d.id))

/** The price cost marks compare with: the model each provider's list marks as the reference (C34, C153). */
export const referencePrice = () => modelsOf(DEFAULT_MODEL_PROVIDER).find((m) => m.reference)?.cost ?? null

/** The picker's rows by group. keys: which providers have a key here. */
export const pickerRows = (keyed = {}) => answererRows({ destinations: DESTINATIONS, modelsOf, keys: keyed, reference: referencePrice() })

/** Who answers a chat: its own choice, or the default (C150). */
export const answererOf = ({ chosen = null, keyed = {}, defaultModel = null } = {}) =>
  answererFor({ chosen, keys: keyed, defaultModel, destinations: DESTINATIONS, modelsOf, defaultProvider: DEFAULT_MODEL_PROVIDER })

/** A model's or a source's name and price by its id, old ids included (C151), for naming and pricing what it answered. */
export function modelFacts(id) {
  if (!id) return null
  for (const d of DESTINATIONS.filter((x) => x.ships && x.kind !== 'source')) {
    const m = findModel(modelsOf(d.id), id)
    if (m) return { id: m.id, name: m.name, provider: d.id, cost: m.cost ?? null }
  }
  return null
}

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

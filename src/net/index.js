// The gateway and the key module, wired to the app (stage 4). Everything
// that talks to a provider or source, or handles a key, goes through here.

import { destination, shipped, DESTINATIONS } from './list'
import { answererRows, answererFor, helperFor, findModel } from './answerers'
import { onDevice } from './translate'
import { englishNameOf } from '../lib/languages'
import { requestsByHost } from './requestLog'
import { createKeyring, checkAndKeep } from './keyring'
import { createGateway } from './gateway'
import { getProvider } from '../providers'
import { executeClientTool } from '../providers/anthropic'
import { saveApiKey, loadApiKey, deleteApiKey, hasSavedKey } from '../lib/crypto'
import { createSource } from './sources'
import wikipediaManifest from './sources/wikipedia.json'
import hackernewsManifest from './sources/hackernews.json'
import openalexManifest from './sources/openalex.json'

export { Refused } from './gateway'
export { destination, shipped, DESTINATIONS } from './list'
export { findAnswerers, findModel, costMark, GROUPS as ANSWER_GROUPS, SOURCE_KINDS } from './answerers'
export { translatorFor } from './translate'

export const keys = createKeyring({
  load: (provider) => loadApiKey('persistent', provider),
  has: (provider) => hasSavedKey(provider),
  save: (provider, key) => saveApiKey(key, 'persistent', provider),
  remove: (provider) => deleteApiKey(provider),
})

// The code behind each shipped entry. Models come from src/providers;
// sources are manifests read by one runner (sources.js), each allowed only
// the origins the list gives it.
// How Parliament names itself to a source that asks automated clients to
// (Wikimedia's User-Agent policy: name, version, contact; C160).
export const IDENTITY = 'Parliament/0.5 (https://parliament.ltd; support@parliament.ltd)'
const MANIFESTS = { wikipedia: wikipediaManifest, hackernews: hackernewsManifest, openalex: openalexManifest }
const sources = new Map()
function implementation(id) {
  const d = destination(id)
  if (!d) return null
  if (d.kind === 'model' || d.kind === 'local') return getProvider(id)
  if (d.kind === 'source' && MANIFESTS[id]) {
    if (!sources.has(id)) sources.set(id, createSource(MANIFESTS[id], { origins: d.origins, fetch: (...a) => window.fetch(...a), identity: IDENTITY }))
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

/**
 * The page's requests grouped by host, each named by the provider or source
 * it belongs to, with what made them (stage 7, piece 2). entries: the page's
 * own log; requests: the gateway's.
 */
export const networkByHost = (entries, requests = gateway.requests()) =>
  requestsByHost({ entries, requests, destinations: DESTINATIONS, self: typeof location === 'undefined' ? null : location.host })

/**
 * The provider a model belongs to, by its id or an old short id (stage 7,
 * piece 3): a reply goes to the provider of the model that answers, with
 * that provider's key. A model no list knows is the default provider's.
 */
export function providerOf(modelId) {
  for (const d of DESTINATIONS.filter((x) => x.ships && x.kind !== 'source')) {
    if (findModel(modelsOf(d.id), modelId)) return d.id
    // A model on this computer, named by its id before any check (C163).
    if (d.kind === 'local' && String(modelId ?? '').startsWith(`${d.id}:`)) return d.id
  }
  return DEFAULT_MODEL_PROVIDER
}

/** Which built providers have a key here, without decrypting one: { anthropic: true, mistral: false }. */
export async function keyedProviders() {
  const out = {}
  for (const d of shipped().filter((x) => x.key)) out[d.id] = Boolean(await keys.has(d.id).catch(() => false))
  return out
}

/** A provider's processing region, where it has one (Mistral: global, eu or us; C159). */
export const setRegion = (id, region) => implementation(id)?.setRegion?.(region)

/** Every built provider's models, current and older, as the model: filter reads them. */
export const allModels = () => DESTINATIONS.filter((d) => d.ships && d.kind !== 'source').flatMap((d) => modelsOf(d.id))

/** The price cost marks compare with: the model each provider's list marks as the reference (C34, C153). */
export const referencePrice = () => modelsOf(DEFAULT_MODEL_PROVIDER).find((m) => m.reference)?.cost ?? null

/** The picker's rows by group. keys: which providers have a key here. */
export const pickerRows = (keyed = {}) => answererRows({ destinations: DESTINATIONS, modelsOf, keys: keyed, reference: referencePrice() })

/** Who answers a chat: its own choice, or the default (C150). */
export const answererOf = ({ chosen = null, keyed = {}, defaultModel = null } = {}) =>
  answererFor({ chosen, keys: keyed, defaultModel, destinations: DESTINATIONS, modelsOf, defaultProvider: DEFAULT_MODEL_PROVIDER })

// ── Translation and the helper (stage 7, piece 6; C84, C85, C166) ──

/** The model that reads text from sources: chosen with helper:, else as helperFor says. */
export const helperOf = ({ chosen = null, keyed = {} } = {}) =>
  helperFor({ chosen, keys: keyed, destinations: DESTINATIONS, modelsOf, lightModelOf: (id) => metadataModel(id), defaultProvider: DEFAULT_MODEL_PROVIDER })

/** The browser's own translation, where it has one (feature detection). */
export const browserTranslation = () => onDevice(typeof window === 'undefined' ? null : window)

/**
 * Translates pieces of text, by whom translatorFor chose: the browser, on
 * this device, or the helper, through the gateway, with its own provider's
 * key. from and to are language tags; from may be null.
 * @returns {Promise<string[]>}
 */
export async function translateText(pieces, { who, from = null, to, query = false, signal } = {}) {
  if (who?.kind === 'browser') return browserTranslation().translate(pieces, { from, to, signal })
  if (who?.kind !== 'model') throw new Error('Nothing here can translate')
  const h = who.helper
  const options = { from: from ? englishNameOf(from) : null, to: englishNameOf(to), query, model: h.id }
  return gateway.call(h.provider, 'translate', [pieces, options], { label: query ? 'translate question' : 'translate answer' })
}

/** A model's or a source's name and price by its id, old ids included (C151), for naming and pricing what it answered. */
export function modelFacts(id) {
  if (!id) return null
  for (const d of DESTINATIONS.filter((x) => x.ships && x.kind !== 'source')) {
    const m = findModel(modelsOf(d.id), id)
    if (m) return { id: m.id, name: m.name, provider: d.id, cost: m.cost ?? null, contextWindow: m.contextWindow ?? null }
    // A model on this computer answered: free, named from its id (C163).
    if (d.kind === 'local' && String(id).startsWith(`${d.id}:`)) return { id, name: String(id).slice(d.id.length + 1), provider: d.id, cost: { type: 'free-local' }, contextWindow: null }
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
    // What it does with what it is sent, and the models that differ (C167).
    const current = modelsOf(d.id).filter((m) => m.current !== false)
    const data = d.data ? { ...d.data, longer: current.filter((m) => m.data?.kept === 'atLeast30').map((m) => m.name), trainsAll: current.filter((m) => m.data?.training === 'always').map((m) => m.name) } : null
    out.push({ id: d.id, name: d.name, has: Boolean(key), held: keys.isHeld(d.id), ending: key ? key.slice(-4) : null, keysPage: d.keysPage, data })
  }
  return out
}

/** Checks a typed key with its provider, then keeps it saved or for this tab only. */
export const addKey = (id, typed, { save = true } = {}) => checkAndKeep({ check: gateway.check, keyring: keys }, id, typed, { save })

/** The built sources that need no key, by name. Models on this computer have their own place in the panel. */
export const noKeyNeeded = () => shipped().filter((d) => !d.key && d.kind === 'source').map((d) => d.name)

/**
 * Asks Ollama on this computer which models it has (C33, C163): only when
 * the person asks, or on start once they have. Through the gateway like
 * every request, labelled for the network log.
 * @returns {Promise<object[]>} the models
 */
export const checkLocal = (id = 'ollama') => gateway.call(id, 'listModels', [], { label: 'check Ollama' })

/** The models that check found that run on the provider's own servers, and so are left out (C167 (d)). */
export const localAway = (id = 'ollama') => implementation(id)?.awayModels?.() ?? []

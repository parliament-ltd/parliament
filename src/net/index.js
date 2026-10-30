// The gateway and the key module, wired to the app (stage 4). Everything
// that talks to a provider or source, or handles a key, goes through here.

import { destination, shipped, DESTINATIONS } from './list'
import { answererRows, answererFor, helperFor, findModel } from './answerers'
import { onDevice } from './translate'
import { englishNameOf } from '../lib/languages'
import { requestsByHost } from './requestLog'
import { createKeyring } from './keyring'
import { createVaultClient, STAND_IN_TYPED } from './vaultClient'
import { noteVaultRequest } from '../lib/networkLog'
import { createGateway } from './gateway'
import { getProvider } from '../providers'
import { executeClientTool } from '../providers/anthropic'
import { saveApiKey, loadApiKey, deleteApiKey, hasSavedKey } from '../lib/crypto'
import { createSource } from './sources'
import wikipediaManifest from './sources/wikipedia.json'
import hackernewsManifest from './sources/hackernews.json'
import openalexManifest from './sources/openalex.json'
import { version } from '../../package.json'

export { Refused } from './gateway'
export { destination, shipped, DESTINATIONS } from './list'
export { findAnswerers, findModel, costMark, GROUPS as ANSWER_GROUPS, SOURCE_KINDS } from './answerers'
export { translatorFor } from './translate'

// The key vault (stage 15, piece 3; research/vault-design.md; C267): keys
// live at its own address, and the page never holds one. In development it
// runs beside the app on localhost:5175.
const env = import.meta.env ?? {}
export const VAULT_ORIGIN = env.VITE_VAULT_ORIGIN ?? (env.DEV ? 'http://localhost:5175' : 'https://keys.parliament.ltd')
export const vault = createVaultClient({ origin: VAULT_ORIGIN, onSent: noteVaultRequest })

// What the gateway asks for a provider's key: the vault's stand-in when the
// vault holds a usable key, never the key itself. The vault puts the key in.
export const keys = {
  get: (provider) => vault.keyFor(provider),
  async has(provider) { await vault.ready(); return Boolean(vault.statusOf(provider)?.has) },
  isHeld: (provider) => Boolean(vault.statusOf(provider)?.held),
}

// Keys the page kept itself before the vault, read once to move them in
// (C267 (d)): saved, encrypted, in the page's key database, or held in this
// tab. Nothing new is ever kept here.
const pageKeys = createKeyring({
  load: (provider) => loadApiKey('persistent', provider),
  has: (provider) => hasSavedKey(provider),
  save: (provider, key) => saveApiKey(key, 'persistent', provider),
  remove: (provider) => deleteApiKey(provider),
})

/**
 * Moves the keys the page kept before the vault into it, once (C267 (d)):
 * each goes over the private channel, the vault keeps it unless it already
 * holds one, and the page's copy is deleted. Shown in C269 before it ran.
 * @returns {Promise<string[]>} the providers whose keys moved
 */
export async function moveKeysToVault() {
  if (!(await vault.ready())) return []
  const moved = []
  for (const d of DESTINATIONS.filter((x) => x.key)) {
    const key = await pageKeys.get(d.id).catch(() => null)
    if (!key) continue
    const r = await vault.move(d.id, key, { save: !pageKeys.isHeld(d.id) }).catch(() => null)
    if (r?.ok) { await pageKeys.remove(d.id).catch(() => {}); moved.push(d.id) }
  }
  return moved
}

/** The lock's unreadable data key, lent to the vault or taken back (C267 (e)). */
export const lendLockKey = (key, on) => vault.lock(key, on).catch(() => null)

/** Delete everything reaches the vault's keys too (C183). */
export const eraseVault = () => vault.erase().catch(() => null)

/**
 * How every key is kept, when the choice changes (settings spec §8; stage
 * 9; C181): saved, encrypted, in this browser, or held for this tab only with
 * the saved copy removed. Each key stays with its own provider.
 */
export async function keepKeys(save) {
  await vault.keep(save)
}

// The code behind each shipped entry. Models come from src/providers;
// sources are manifests read by one runner (sources.js), each allowed only
// the origins the list gives it.
// How Parliament names itself to a source that asks automated clients to
// (Wikimedia's User-Agent policy: name, version, contact; C160). The
// version is the release's own, so it never goes stale (C282).
export const IDENTITY = `Parliament/${version} (https://parliament.ltd; support@parliament.ltd)`
const MANIFESTS = { wikipedia: wikipediaManifest, hackernews: hackernewsManifest, openalex: openalexManifest }
const sources = new Map()
function implementation(id) {
  const d = destination(id)
  if (!d) return null
  if (d.kind === 'model' || d.kind === 'local') {
    const p = getProvider(id)
    // A provider that takes a key sends through the vault, which adds it.
    if (p && d.key && !p.fetchVia) p.fetchVia = vault.fetchFor(id)
    return p
  }
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
  // unreached: the vault did not open, so no key can be used (C267 (h)).
  const unreached = !(await vault.ready())
  const out = []
  for (const d of shipped().filter((x) => x.key)) {
    const s = vault.statusOf(d.id)
    // What it does with what it is sent, and the models that differ (C167).
    const current = modelsOf(d.id).filter((m) => m.current !== false)
    const data = d.data ? { ...d.data, longer: current.filter((m) => m.data?.kept === 'atLeast30').map((m) => m.name), trainsAll: current.filter((m) => m.data?.training === 'always').map((m) => m.name) } : null
    out.push({ id: d.id, name: d.name, has: Boolean(s?.has), held: Boolean(s?.held), ending: s?.ending ?? null, unreached, keysPage: d.keysPage, limitsPage: d.limitsPage, data })
  }
  return out
}

/**
 * Checks the key typed into the vault's field with its provider, then tells
 * the vault to keep it, saved or for this tab only, or let it go. The
 * provider's own check runs here; the vault fills in the typed key.
 * @returns {Promise<{ ok: true, fresh: boolean }|{ ok: false, status: 'empty'|'invalid'|'billing'|'unreached' }>}
 */
export async function checkTypedKey(id, { save = true, empty = false } = {}) {
  if (empty) return { ok: false, status: 'empty' }
  let result
  try {
    result = await gateway.check(id, STAND_IN_TYPED)
  } catch {
    result = { valid: false, status: 'unreached' }
  }
  const valid = Boolean(result?.valid)
  const out = await vault.decide(id, { keep: valid, save }).catch(() => null)
  if (!valid) return { ok: false, status: result?.status === 'billing_error' ? 'billing' : result?.status === 'invalid' ? 'invalid' : 'unreached' }
  return out?.kept ? { ok: true, fresh: Boolean(out.fresh) } : { ok: false, status: 'unreached' }
}

/**
 * The waiting version's changelog entry (stage 15, piece 5; C272 (g)): one
 * request to this site's own /changelog.json, which the service worker does
 * not keep. No provider or source is asked anything.
 */
export async function waitingVersionNotes() {
  const r = await fetch('/changelog.json', { cache: 'no-store', credentials: 'same-origin' })
  return r.ok ? r.json() : null
}

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

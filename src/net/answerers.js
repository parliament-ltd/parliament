// Who can answer a prompt (refactor-plan.md, stage 7, piece 1; A14, C27,
// C34, C148 to C153).
//
// The picker in the prompt field lists, in three groups as ruled (A14):
// models, models on this machine, and sources, which answer with no tokens.
// Every row comes from the one list of providers and sources (list.js) and
// each provider's own models, so the picker, the Enter line and the costs
// on Records read the same names and prices.
//
// A chat can keep its own choice (`answerer` on the chat, C150). With none,
// the default answers as before: Settings' model with a key, Wikipedia
// without one. Old short ids name the model they stood for when they were
// written, never the newest of its family (C151).
//
// Pure: the list, the models and which keys exist are passed in.

export const GROUPS = Object.freeze(['model', 'local', 'source'])

// Sources by the kind of question they answer (branch slider v9).
export const SOURCE_KINDS = Object.freeze(['reference', 'research', 'discussion'])

// The source that answers with no key, and no choice made (stage 4).
export const KEYLESS_DEFAULT = 'wikipedia'

/**
 * A model's cost mark: its price per token beside the reference model's,
 * as a multiple (settings spec §8; C34, C153). Input and output prices are
 * added, so a model whose two prices sit in another ratio still gets one
 * mark. ×1 and up are whole numbers; below ×1, one figure (×0.3).
 * @param {{ type: string, inputPerMillion?: number, outputPerMillion?: number }|null} price
 * @param {{ inputPerMillion: number, outputPerMillion: number }|null} reference
 * @returns {string|null} '×15', '×0.3', 'free', or null when not known
 */
export function costMark(price, reference) {
  if (!price) return null
  if (price.type === 'free-local') return 'free'
  if (price.type !== 'metered' || !reference) return null
  const ref = reference.inputPerMillion + reference.outputPerMillion
  if (!(ref > 0)) return null
  const ratio = (price.inputPerMillion + price.outputPerMillion) / ref
  if (!(ratio > 0)) return null
  return `×${ratio >= 0.95 ? Math.max(1, Math.round(ratio)) : Number(ratio.toPrecision(1))}`
}

/** A model of a provider by its id, its API id, or an old short id it once had (C151). */
export function findModel(models, id) {
  if (!id) return null
  return models.find((m) => m.id === id) ?? models.find((m) => m.apiId === id) ?? models.find((m) => (m.aliases ?? []).includes(id)) ?? null
}

const priceTotal = (m) => (m.cost?.type === 'metered' ? m.cost.inputPerMillion + m.cost.outputPerMillion : 0)

/**
 * The picker's rows, by group: each provider's current models, priciest
 * first; a provider not built yet as one row marked later; and the
 * sources, by the kind of question each answers.
 * @param {{ destinations: object[], modelsOf: (id: string) => object[], keys?: Record<string, boolean>,
 *   reference?: object|null }} input
 *   keys: which providers have a key here; reference: the price marks compare with
 * @returns {{ model: object[], local: object[], source: object[] }}
 *   each row { id, group, name, provider, providerName, mark, later, needsKey, about?, and a source's kind,
 *   answersIn and perDay (list.js) };
 *   about: which line of the copy table says what a model is good for
 */
export function answererRows({ destinations, modelsOf, keys = {}, reference = null }) {
  const out = { model: [], local: [], source: [] }
  for (const d of destinations) {
    const group = d.kind === 'local' ? 'local' : d.kind === 'source' ? 'source' : 'model'
    if (group === 'source') {
      out.source.push({
        id: d.id, group, name: d.name, provider: d.id, providerName: d.name, kind: d.sourceKind ?? null, mark: null, later: !d.ships, needsKey: false,
        answersIn: d.answersIn ?? null, perDay: d.perDay ?? null,
      })
      continue
    }
    const current = d.ships ? (modelsOf(d.id) ?? []).filter((m) => m.current !== false) : []
    if (!current.length) {
      out[group].push({ id: d.id, group, name: d.name, provider: d.id, providerName: d.name, mark: null, later: true, needsKey: false })
      continue
    }
    const rows = [...current].sort((a, b) => priceTotal(b) - priceTotal(a)).map((m) => ({
      id: m.id, group, name: m.name, provider: d.id, providerName: d.name, about: m.about ?? null,
      // Who made it, where that is not its provider (LPN §7.1), and whether
      // it is a preview (security notes §3).
      maker: m.maker && m.maker !== d.name ? m.maker : null, preview: Boolean(m.preview),
      mark: costMark(m.cost, reference), later: false, needsKey: Boolean(d.key && !keys[d.id]),
    }))
    out[group].push(...rows)
  }
  out.source.sort((a, b) => SOURCE_KINDS.indexOf(a.kind) - SOURCE_KINDS.indexOf(b.kind))
  return out
}

const words = (s) => String(s ?? '').toLocaleLowerCase()

/**
 * The rows a word names, as by: reads it (C149): its id exactly, or any
 * part of its name or its provider's name. An exact id or name wins over
 * a part, so by:wikipedia never also means a model with that word in it.
 * @returns {object[]}
 */
export function findAnswerers(rows, word) {
  const w = words(word).trim()
  if (!w) return []
  const all = [...rows.model, ...rows.local, ...rows.source]
  const exact = all.filter((r) => r.id === w || words(r.name) === w)
  if (exact.length) return exact
  return all.filter((r) => words(r.name).includes(w) || words(r.providerName).includes(w) || r.id.includes(w))
}

/**
 * Who answers a prompt in a chat, and whether it can (C150, C151).
 * @param {{ chosen?: string|null, keys?: Record<string, boolean>, defaultModel?: string|null,
 *   destinations: object[], modelsOf: (id: string) => object[], defaultProvider: string }} input
 *   chosen: the chat's own choice, or the one held for a new chat
 * @returns {{ id: string, group: string, name: string, provider: string, providerName: string, chosen: boolean,
 *   price: object|null, needsKey: boolean, gone: boolean, later: boolean }}
 *   gone: its provider no longer serves it, or the list does not know it; later: not built yet
 */
export function answererFor({ chosen = null, keys = {}, defaultModel = null, destinations, modelsOf, defaultProvider }) {
  const byId = new Map(destinations.map((d) => [d.id, d]))
  const describe = (id, isChosen) => {
    const d = byId.get(id)
    if (d && d.kind === 'source') {
      return { id, group: 'source', name: d.name, provider: id, providerName: d.name, chosen: isChosen, price: null, needsKey: false, gone: false, later: !d.ships, perDay: d.perDay ?? null }
    }
    for (const p of destinations.filter((x) => x.kind !== 'source')) {
      const m = findModel(modelsOf(p.id) ?? [], id)
      if (!m) continue
      return {
        id: m.id, group: p.kind === 'local' ? 'local' : 'model', name: m.name, provider: p.id, providerName: p.name, chosen: isChosen,
        price: m.cost ?? null, needsKey: Boolean(p.key && !keys[p.id]), gone: Boolean(m.retired), later: !p.ships, preview: Boolean(m.preview),
      }
    }
    return { id, group: 'model', name: id, provider: null, providerName: null, chosen: isChosen, price: null, needsKey: false, gone: true, later: false }
  }
  if (chosen) return describe(chosen, true)
  // The default model, when its provider has a key here (a model no list
  // knows counts as the default provider's, and is said to be gone).
  const d = describe(defaultModel, false)
  if (keys[d.provider ?? defaultProvider]) return d
  return describe(KEYLESS_DEFAULT, false)
}

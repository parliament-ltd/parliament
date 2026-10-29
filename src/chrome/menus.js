// What the menus under the bar show, worked out apart from how they are
// drawn (Menu.jsx; 29 October), so it can be tested without a page.

/** The words at a menu's foot, one sentence after another: what it does, its keys, that Escape closes it. */
export const footOf = (...parts) => parts.filter(Boolean).join(' ')

/**
 * Who answers, in the menu's groups: the picker's rows (answererRows in
 * net/answerers.js) grouped as the ? reference groups its commands. Each
 * provider's models under its name from the list of providers, in the
 * list's order; providers not built yet together, one row each; models on
 * this computer; then the sources, each marked where the kind of question
 * it answers changes (branch slider v9).
 * @param {{ model?: object[], local?: object[], source?: object[] }} rows
 * @returns {Array<{ key: string, group: 'model'|'later'|'local'|'source', name: string|null,
 *   provider: string|null, needsKey: boolean, rows: object[] }>}
 *   name: the provider's name from the list for its own group, else null (the copy table names the group);
 *   needsKey: every row waits for its provider's key, said once at the heading;
 *   a source row gains kindStarts when its kind differs from the row before
 */
export function answerGroups(rows) {
  const out = []
  const byProvider = new Map()
  const later = []
  for (const r of rows?.model ?? []) {
    // A provider not built yet is one row of its own name, marked later.
    if (r.later) { later.push(r); continue }
    let g = byProvider.get(r.provider)
    if (!g) {
      g = { key: `model:${r.provider}`, group: 'model', name: r.providerName ?? r.provider, provider: r.provider, needsKey: false, rows: [] }
      byProvider.set(r.provider, g)
      out.push(g)
    }
    g.rows.push(r)
  }
  for (const g of out) g.needsKey = g.rows.every((r) => r.needsKey)
  const quiet = (key, list) => ({ key, group: key, name: null, provider: null, needsKey: false, rows: list })
  if (later.length) out.push(quiet('later', later))
  if (rows?.local?.length) out.push(quiet('local', rows.local))
  const sources = rows?.source ?? []
  if (sources.length) out.push(quiet('source', sources.map((r, i) => ({ ...r, kindStarts: Boolean(r.kind) && r.kind !== sources[i - 1]?.kind }))))
  return out
}

// Keys of COPY.picker for what a provider does with what it is sent
// (security notes §3; C167), and for a source's language (LPN §6).
const TRAINING = { no: 'trainNo', optOut: 'trainOptOut', always: 'trainAlways' }
const KEPT = { upTo30: 'keptUpTo30', days30: 'kept30', atLeast30: 'keptAtLeast30' }
const ANSWERS_IN = { english: 'englishOnly', mostlyEnglish: 'mostlyEnglish' }

/**
 * The facts a row of who answers shows under what it is for, in order:
 * its cost mark (kept on a model with no key, since it helps decide
 * whether to add one), or that it is not built or not checked yet, or the
 * language a source answers in where that is not yours; whether it can
 * think, is a preview, or was made by another than its provider; and what
 * its provider does with what it is sent. A source has no cost and keeps
 * nothing of yours.
 * @returns {Array<{ copy: string, values?: object, warn?: boolean }|{ mark: string }>}
 *   copy: a key of COPY.picker; mark: written as it is; warn: in ink, as trained on whatever you choose is
 */
export function answerFacts(r) {
  if (r.later) return [{ copy: 'later' }]
  const out = []
  if (r.unchecked) out.push({ copy: 'unchecked' })
  else if (r.group === 'source') { if (ANSWERS_IN[r.answersIn]) out.push({ copy: ANSWERS_IN[r.answersIn] }) }
  else if (r.mark) out.push({ mark: r.mark })
  if (r.thinks) out.push({ copy: 'thinks' })
  if (r.preview) out.push({ copy: 'preview' })
  if (r.maker) out.push({ copy: 'madeBy', values: { maker: r.maker } })
  if (r.group === 'source') return out
  if (r.kept === 'device') return [...out, { copy: 'keptDevice' }]
  if (TRAINING[r.training]) out.push({ copy: TRAINING[r.training], ...(r.training === 'always' ? { warn: true } : {}) })
  if (KEPT[r.kept]) out.push({ copy: KEPT[r.kept] })
  return out
}

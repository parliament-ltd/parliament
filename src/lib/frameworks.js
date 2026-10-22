// Frameworks (refactor-plan.md, stage 7, piece 5; the editing spec's
// "collab:", renamed by C131; A13, C67, C164).
//
// A framework is a standing instruction about how a model should work,
// sent with every prompt in a chat until turned off. Five are built in;
// the person's own are kept in the version 6 list `collabs` (the name it
// had when the list was made), among them the personas the upgrade
// carried over, switched off (A13).
//
// They stack in the order chosen, and belong to a chat (the mockup sets
// them for the whole chat; C164 (a)). A reply records the frameworks it
// was written under, so it can name them later, even one since removed.
//
// The words sent to a model are here, in English: they are instructions,
// not words of the interface. What a person reads (each one's name) is in
// the copy table, by id. Pure.

// The five built in (editing spec, "collab:"), in its order. Their
// instructions follow its glosses (C67: "question what it is given", not
// the old self-critique).
export const BUILT_IN = Object.freeze([
  { id: 'challenge', instruction: 'Question what you are given instead of taking it as settled: the premises, the framing and the facts in my prompt. Say which you doubt, and why.' },
  { id: 'reasoning', instruction: 'Lay out your reasoning step by step before you give the answer.' },
  { id: 'pushback', instruction: 'When you think I am wrong, or heading in a poor direction, say so plainly and explain why, rather than agreeing.' },
  { id: 'alts', instruction: 'Give two or three different ways to answer or approach this, not just one, and say how they differ.' },
  { id: 'uncertain', instruction: 'Say how sure you are, and point out where you are guessing or the evidence is thin.' },
].map((f) => Object.freeze({ ...f, builtIn: true })))

// The person's own are named own:<their id>.
export const OWN = 'own:'
export const MOST = 10 // frameworks on one chat
export const NAME_MAX = 60
export const INSTRUCTION_MAX = 2000

const BUILT_BY_ID = new Map(BUILT_IN.map((f) => [f.id, f]))

/** Every framework there is: the built in, then the person's own, each { id, builtIn, name?, instruction }. */
export function frameworkList(own = []) {
  return [
    ...BUILT_IN,
    ...own.filter((c) => c && typeof c.instruction === 'string' && c.instruction.trim())
      .map((c) => ({ id: `${OWN}${c.id}`, builtIn: false, name: c.name || null, instruction: c.instruction.trim(), record: c })),
  ]
}

/** The frameworks of a chat, in its order, known ones only. */
export function frameworksOf(ids = [], list) {
  const byId = new Map(list.map((f) => [f.id, f]))
  return (Array.isArray(ids) ? ids : []).map((id) => byId.get(id)).filter(Boolean)
}

/**
 * The standing instructions a prompt carries, in the order chosen: what
 * goes to the model as its system prompt. '' when none.
 */
export function instructionsOf(ids, list) {
  return frameworksOf(ids, list).map((f) => f.instruction).join('\n\n')
}

/**
 * What a reply records of the frameworks it was written under: the id, and
 * for one of the person's own its name as it was, so the reply can still
 * name it after it is removed. Built-in names are words of the interface and
 * are not stored (C86).
 */
export function recordOf(ids, list) {
  return frameworksOf(ids, list).map((f) => (f.builtIn ? { id: f.id } : { id: f.id, name: f.name ?? null }))
}

const words = (s) => String(s ?? '').toLocaleLowerCase().trim()

/**
 * The frameworks some words name: a built-in's id or its name, or one of the
 * person's own by its name, exactly or by its start.
 * @param {string} word
 * @param {object[]} list frameworkList()
 * @param {(f: object) => string} nameOf a framework's name as people read it
 * @returns {object[]}
 */
export function findFrameworks(word, list, nameOf) {
  const w = words(word)
  if (!w) return []
  const exact = list.filter((f) => f.id === w || words(nameOf(f)) === w)
  if (exact.length) return exact
  return list.filter((f) => words(nameOf(f)).startsWith(w) || (f.builtIn && f.id.startsWith(w)))
}

/**
 * framework:pushback, uncertain / framework:off / framework: (C164).
 * @param {object[]} args the command's values (words, quoted text or lists)
 * @param {{ list: object[], nameOf: (f: object) => string, now: string[] }} ctx now: the chat's frameworks
 * @returns {{ bad: object }|{ show: true }|{ ids: string[], same: boolean }}
 */
export function readFrameworks(args, { list, nameOf, now = [] }) {
  if (!args.length) return { show: true }
  const said = namesFrom(args)
  if (said.length === 1 && words(said[0]) === 'off') return { ids: [], same: now.length === 0 }
  const ids = []
  for (const s of said) {
    const found = findFrameworks(s, list, nameOf)
    if (!found.length) return { bad: { message: 'frameworkNone', values: { word: s } } }
    if (found.length > 1) return { bad: { message: 'frameworkWhich', values: { word: s, names: found.map(nameOf) } } }
    if (!ids.includes(found[0].id)) ids.push(found[0].id)
  }
  if (ids.length > MOST) return { bad: { message: 'frameworkMost', values: { count: MOST } } }
  return { ids, same: ids.length === now.length && ids.every((id, i) => id === now[i]) }
}

/**
 * The names a command line gives, commas between them and spaces inside
 * them: push back on me, uncertain reads as two names. The parser hands a
 * comma list as one value, so its first item ends the words before it and
 * its last starts the words after.
 * @returns {string[]}
 */
export function namesFrom(args) {
  const said = (a) => (a.kind === 'text' ? a.value : a.text ?? String(a.value ?? ''))
  const names = []
  let words = []
  for (const a of args) {
    if (a.kind !== 'list') { words.push(said(a)); continue }
    a.items.forEach((item, i) => {
      words.push(said(item))
      if (i < a.items.length - 1) { names.push(words.join(' ')); words = [] }
    })
  }
  if (words.length) names.push(words.join(' '))
  return names.filter((n) => n.trim())
}

/** A framework of the person's own as written with new:framework "Name" "Instruction". */
export function cleanOwn(name, instruction) {
  const n = String(name ?? '').trim()
  const t = String(instruction ?? '').trim()
  if (!n) return { error: 'name' }
  if (n.length > NAME_MAX) return { error: 'nameLong' }
  if (!t) return { error: 'instruction' }
  if (t.length > INSTRUCTION_MAX) return { error: 'instructionLong' }
  return { name: n, instruction: t }
}

/** Whether an id is one of the built in. */
export const isBuiltIn = (id) => BUILT_BY_ID.has(id)

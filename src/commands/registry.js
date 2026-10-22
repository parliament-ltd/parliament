// The verb registry, read (refactor-plan.md §4 and stage 3; docket spec §6;
// settings spec §5).
//
// verbs.js holds one entry per verb. Everything the bar says about a command
// is generated from it here, so nothing can drift: what a verb takes, the
// Enter line before you press Enter, completion, `?` and the reference.
// Renamed and retired verbs answer with what to type now.
//
// Pure. Actions are attached by the shell, not imported here, so the
// registry never reaches the database, the providers or the keys. Until a
// verb's action exists, its Enter line says it is not built yet.

import { VERBS, RENAMED, RETIRED, KEPT_FREE, GROUPS, LEADERS } from './verbs'
import { parseCommand, readField, shapedLikeKey } from './parse'

const BY_VERB = new Map(VERBS.map((v) => [v.verb, v]))

/** The entry for a current verb, or null. */
export const verbEntry = (verb) => BY_VERB.get(verb) ?? null

/**
 * What the parser needs to know about a verb: whether it keeps the rest of
 * the line as text. Renamed and retired verbs are known too, so they start a
 * command and can be answered.
 * @param {string} verb
 * @returns {{ rest?: boolean } | null}
 */
export function lookup(verb) {
  const entry = BY_VERB.get(verb)
  if (entry) return { rest: Boolean(entry.rest) }
  if (Object.hasOwn(RENAMED, verb) || Object.hasOwn(RETIRED, verb)) return {}
  return null
}

/** Reads the text after `>` with this registry. */
export const parse = (body) => parseCommand(body, lookup)

// Does an argument fill a slot? Slots are written in verbs.js:
//   'address'     201 or 201a
//   'addresses'   one address, or several with commas: 201, 203
//   'number'      a plain number
//   'percent'     a percentage: 60%
//   'text'        quoted text, or one word or number
//   'word'        any one word
//   ['a', 'b']    one of these words
//   { list: s }   one s, or several with commas: type:note,chat
//   { opt: s }    s, or nothing (last slots only)
//   { many: s }   one or more s with spaces between: compare:201a 201b (last slot only)
const fills = {
  address: (a) => a.kind === 'address',
  number: (a) => a.kind === 'number',
  percent: (a) => a.kind === 'percent',
  text: (a) => a.kind === 'text' || a.kind === 'word' || a.kind === 'address' || a.kind === 'number' || a.kind === 'percent',
  word: (a) => a.kind === 'word',
}
function fillsSlot(slot, arg) {
  if (slot === 'addresses') return fillsSlot({ list: 'address' }, arg)
  if (slot?.opt) return fillsSlot(slot.opt, arg)
  if (slot?.many) return fillsSlot(slot.many, arg)
  if (slot?.list) return arg.kind === 'list' ? arg.items.every((i) => fillsSlot(slot.list, i)) : fillsSlot(slot.list, arg)
  if (Array.isArray(slot)) return arg.kind === 'word' && slot.includes(arg.value)
  return fills[slot](arg)
}

/**
 * The form of `takes` a command matches, as `{ form, values }`, or null.
 * A verb that keeps the rest of the line needs only some text, or nothing
 * where a form allows that.
 * @param {{ takes: Array<Array<*>>, rest?: boolean }} entry
 * @param {{ args: Array<object>, text: string }} command
 */
export function matchForm(entry, command) {
  if (entry.rest) {
    if (command.text) return { form: ['text'], values: [command.text] }
    return entry.takes.some((f) => f.length === 0) ? { form: [], values: [] } : null
  }
  const { args } = command
  for (const form of entry.takes) {
    const last = form[form.length - 1]
    const required = form.filter((s) => !s?.opt).length
    const most = last?.many ? Infinity : form.length
    if (args.length < required || args.length > most) continue
    if (args.every((arg, i) => fillsSlot(form[Math.min(i, form.length - 1)], arg))) return { form, values: args }
  }
  return null
}

// The words a verb takes in its first slot, for completion and for the
// Enter line when a command does not fit.
const wordsIn = (slot) => {
  const s = slot?.opt ?? slot?.many ?? slot?.list ?? slot
  return Array.isArray(s) ? s : []
}
const keywordsOf = (entry) => [...new Set(entry.takes.flatMap((f) => wordsIn(f[0])))]

// Closest current verb by edit distance, for "did you mean". Two edits at
// most, so the answer is a likely slip and not a guess.
function distance(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const keep = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = keep
    }
  }
  return row[b.length]
}

/** The current verb one slip away from a word, or null. Never for a word kept free. */
export function nearest(verb) {
  if (KEPT_FREE.includes(verb)) return null
  let best = null
  for (const v of VERBS) {
    const d = distance(verb, v.verb)
    if (d <= Math.min(2, verb.length - 1) && (!best || d < best.d)) best = { verb: v.verb, d }
  }
  return best?.verb ?? null
}

const worksOn = (entry, board) => entry.on === 'everywhere' || !board || entry.on.includes(board)
const isFilter = (command) => BY_VERB.get(command.verb)?.group === 'filters'

/**
 * What the Enter line says for the field as it stands, as data the bar
 * renders through the copy table (COPY.enter). Never content: only verbs,
 * numbers, board keys and keys into the copy table.
 *
 * Several commands may share a line (C99, ruled 20 October). They run left
 * to right, and the first that fails stops the rest (runLine, run.js). A
 * command that sends something, or erase:, runs on a line of its own.
 *
 * @param {string} value the whole field, leader included
 * @param {{ mode?: string, board?: string|null, built?: Set<string> }} ctx
 *   mode: the field's mode now; board: the addressed board; built: the verbs
 *   whose actions exist
 * @returns {{ state: string, message: string, values?: object, verb?: string, fill?: string, entry?: object, match?: object, steps?: object[] }}
 *   state: 'empty' | 'help' | 'ready' | 'later' | 'elsewhere' | 'misfit' |
 *   'renamed' | 'retired' | 'unknown' | 'alone' | 'key' | 'mode';
 *   message: a key of COPY.enter, values its values; fill: what Enter writes
 *   into the field instead of running anything; steps: each command's own
 *   answer, in the order they run.
 */
export function enterLine(value, ctx = {}) {
  const { mode = 'search', board = null, built = new Set() } = ctx
  const field = readField(value, mode)
  if (field.mode !== 'command') return { state: 'mode', message: field.mode }
  if (shapedLikeKey(value)) return { state: 'key', message: 'key' }

  const { commands, help, loose } = parse(field.body)
  if (help) {
    if (help.topic && !BY_VERB.has(help.topic)) return { state: 'unknown', message: 'unknownHelp', values: { verb: `${help.topic}:` } }
    return help.topic
      ? { state: 'help', message: 'helpVerb', values: { verb: `${help.topic}:` } }
      : { state: 'help', message: 'help' }
  }
  if (loose) return { state: 'unknown', message: 'notCommand' }
  if (!commands.length) return { state: 'empty', message: 'empty' }

  const answers = commands.map((c) => answer(c, board, built, field.body))
  const stop = answers.find((a) => a.state !== 'ready' && a.state !== 'later')
  if (stop) return stop
  if (commands.length > 1) {
    const alone = answers.find((a) => a.entry.spends || a.entry.destructive)
    if (alone) return { state: 'alone', message: alone.entry.spends ? 'aloneSpends' : 'aloneErase', values: alone.values, verb: alone.verb }
  }
  const later = answers.find((a) => a.state === 'later')
  if (later) return { ...later, steps: answers }
  if (commands.length === 1) return { ...answers[0], steps: answers }
  return commands.every(isFilter)
    ? { state: 'ready', message: 'filters', values: { count: commands.length }, steps: answers }
    : { state: 'ready', message: 'sequence', values: { count: commands.length, verbs: answers.map((a) => a.values.verb) }, steps: answers }
}

function answer(command, board, built, body) {
  const { verb } = command
  const said = `${command.minus ? '-' : ''}${verb}:`
  if (Object.hasOwn(RENAMED, verb)) {
    // Enter writes the new verb in place of the old one, and keeps the rest
    // of the line as it was.
    const now = RENAMED[verb]
    const after = command.start + said.length
    const fill = `>${body.slice(0, command.start)}${command.minus ? '-' : ''}${now.to}:${body.slice(after)}`
    return { state: 'renamed', message: now.message ?? 'renamed', values: { verb: said, now: `${now.to}:` }, verb, fill }
  }
  if (Object.hasOwn(RETIRED, verb)) {
    const instead = RETIRED[verb]
    return { state: 'retired', message: instead ? 'retiredInstead' : 'retired', values: { verb: said, instead }, verb }
  }
  const entry = BY_VERB.get(verb)
  if (!entry) {
    const near = nearest(verb)
    return near
      ? { state: 'unknown', message: 'didYouMean', values: { verb: said, near: `${near}:` }, verb }
      : { state: 'unknown', message: 'unknown', values: { verb: said }, verb }
  }
  if (command.minus && !entry.minus) return { state: 'misfit', message: 'noMinus', values: { verb: said }, verb }
  if (!worksOn(entry, board)) return { state: 'elsewhere', message: 'elsewhere', values: { verb: said, boards: entry.on }, verb }
  const first = command.args[0]?.value
  if (entry.retiredArgs && typeof first === 'string' && Object.hasOwn(entry.retiredArgs, first)) {
    return { state: 'retired', message: 'retiredInstead', values: { verb: `${verb}:${first}`, instead: entry.retiredArgs[first] }, verb }
  }
  const match = matchForm(entry, command)
  if (!match) {
    const words = keywordsOf(entry)
    return words.length && !entry.takes.some((f) => f.length && !wordsIn(f[0]).length)
      ? { state: 'misfit', message: 'takesWords', values: { verb: said, words }, verb }
      : { state: 'misfit', message: 'takesExample', values: { verb: said, example: entry.example }, verb }
  }
  if (!built.has(verb)) return { state: 'later', message: 'later', values: { verb: said }, verb, entry }
  // minus: a filter that leaves out what it names (-tag:essay).
  return { state: 'ready', message: 'ready', values: { verb: said }, verb, minus: command.minus, entry, match }
}

/**
 * Completion for what is typed after `>`: current verbs that start with it,
 * or, once the colon is there, the words the verb takes. Board-aware.
 * @param {string} body
 * @param {string|null} board
 * @returns {string[]}
 */
export function complete(body, board = null) {
  const text = String(body ?? '')
  const colon = text.indexOf(':')
  if (colon < 0) {
    const start = text.trim().toLowerCase()
    if (!start) return []
    return VERBS.filter((v) => v.verb.startsWith(start) && worksOn(v, board)).map((v) => `${v.verb}:`).sort()
  }
  const entry = BY_VERB.get(text.slice(0, colon).toLowerCase())
  if (!entry || !worksOn(entry, board)) return []
  const typed = text.slice(colon + 1).trim().toLowerCase()
  if (/\s/.test(typed)) return []
  return keywordsOf(entry).filter((w) => w.startsWith(typed)).map((w) => `${entry.verb}:${w}`)
}

/**
 * The reference `?` opens: the leaders first, then the verbs in the order
 * GROUPS gives. On a board, the verbs that work there; with no board, every
 * verb. Each row carries its examples and the gloss's copy entry.
 * @param {string|null} board
 */
export function reference(board = null) {
  const groups = GROUPS.map((group) => ({
    group: group.key,
    title: group.title,
    rows: VERBS.filter((v) => v.group === group.key && worksOn(v, board))
      .map((v) => ({ verb: v.verb, example: v.example, forms: v.forms ?? [v.example], gloss: v.gloss, spends: v.spends })),
  })).filter((g) => g.rows.length)
  return [{ group: 'leaders', title: LEADERS.title, rows: LEADERS.rows }, ...groups]
}

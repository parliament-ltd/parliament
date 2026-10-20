// Reading the bar (bar-and-commands-decisions.md, "The field"; settings spec
// §5 and §6; refactor-plan.md stage 3).
//
// The bar is one field read three ways. A leader at position 0 picks the
// mode: `>` for a command, which stays in the field; `p>` or `prompt>` for a
// prompt, and `s>` or `search>` for search, both swallowed. With no leader the
// field stays in the mode it is in.
//
// A command is a verb and a colon, then what the verb takes: `open:201a`,
// `bar:bottom`, `name:"Field notes"`, `add:201, 203`, `set:default haiku`.
// Verbs read in any case; commands stay English (LPN §5).
//
// This module is pure: it knows the grammar, not the verbs. What each verb
// takes, and which verbs keep the rest of the line as text, comes from the
// registry (verbs.js) through a lookup.
//
// Only the field feeds it. Text from outside (model output, sources, pasted
// files) never reaches this module, so it can never run a command.

import { parseAddress } from '../lib/addresses'

const LEADERS = [
  { text: 'prompt>', mode: 'prompt', swallow: true },
  { text: 'p>', mode: 'prompt', swallow: true },
  { text: 'search>', mode: 'search', swallow: true },
  { text: 's>', mode: 'search', swallow: true },
  { text: '>', mode: 'command', swallow: false },
]

/** The leader at position 0 of the field, or null. Read in any case. */
export function leaderOf(value) {
  const low = String(value ?? '').toLowerCase()
  const found = LEADERS.find((l) => low.startsWith(l.text))
  return found ? { ...found, length: found.text.length } : null
}

/**
 * What the field holds: its mode and the text after any leader.
 * `mode` is the mode the field is in now. `p>` and `s>` typed right after the
 * command `>` switch too, since the reference lists them among the commands.
 */
export function readField(value, mode = 'search') {
  const text = String(value ?? '')
  const leader = leaderOf(text)
  if (!leader) return { mode, body: text, leader: null }
  if (leader.mode === 'command') {
    const body = text.slice(leader.length)
    const inner = leaderOf(body)
    if (inner && inner.mode !== 'command') return { mode: inner.mode, body: body.slice(inner.length), leader: inner }
    return { mode: 'command', body, leader }
  }
  return { mode: leader.mode, body: text.slice(leader.length), leader }
}

// A verb: letters, then a colon. `https:` is not a verb unless the registry
// says so, which keeps a link inside an argument from starting a command. A
// filter may carry a leading minus to leave things out: `-tag:research`.
const VERB = /^(-?)([a-z]+):/i
const SPACE = /\s/
const QUOTES = { '"': '"', '“': '”', '”': '”', '«': '»' }

// The words of a line, split on spaces outside quotes, with where each sits.
function words(text) {
  const out = []
  let i = 0
  while (i < text.length) {
    if (SPACE.test(text[i])) { i += 1; continue }
    const start = i
    let close = null
    while (i < text.length && (close || !SPACE.test(text[i]))) {
      if (close) { if (text[i] === close) close = null }
      else if (QUOTES[text[i]]) close = QUOTES[text[i]]
      i += 1
    }
    out.push({ text: text.slice(start, i), start, end: i })
  }
  return out
}

// No ranges: no document gives a syntax for one, and erase: takes explicit
// numbers only (C39). Lists use commas.

/** One argument, typed: an address, a number, quoted text or a word. */
export function readArg(text) {
  const raw = String(text)
  const open = raw[0]
  if (QUOTES[open]) {
    const close = QUOTES[open]
    const inner = raw.slice(1)
    const done = inner.endsWith(close) && inner.length > 0
    return { kind: 'text', text: raw, value: done ? inner.slice(0, -1) : inner, closed: done }
  }
  const address = parseAddress(raw)
  if (address) return { kind: 'address', text: raw, ...address }
  if (/^\d+$/.test(raw)) return { kind: 'number', text: raw, value: Number(raw) }
  return { kind: 'word', text: raw, value: raw.toLowerCase() }
}

// The arguments of one command: words and quoted text, with commas joining
// items into a list (`add:201,203` or `add:201, 203`).
function readArgs(text, offset) {
  const items = []
  let joinNext = false
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    if (SPACE.test(ch)) { i += 1; continue }
    if (ch === ',') { if (items.length) joinNext = true; i += 1; continue }
    const start = i
    let close = null
    while (i < text.length && (close || !(SPACE.test(text[i]) || text[i] === ','))) {
      if (close) { if (text[i] === close) close = null }
      else if (QUOTES[text[i]] && i === start) close = QUOTES[text[i]]
      i += 1
    }
    const arg = { ...readArg(text.slice(start, i)), start: offset + start, end: offset + i }
    const last = items[items.length - 1]
    if (joinNext && last) {
      if (last.kind === 'list') last.items.push(arg)
      else items[items.length - 1] = { kind: 'list', items: [last, arg], start: last.start }
      items[items.length - 1].end = arg.end
    } else items.push(arg)
    joinNext = false
  }
  for (const item of items) if (item.kind === 'list') item.text = item.items.map((a) => a.text).join(', ')
  return items
}

const unquote = (text) => {
  const t = text.trim()
  return QUOTES[t[0]] && t.length > 1 && t.endsWith(QUOTES[t[0]]) ? t.slice(1, -1) : t
}

/**
 * Reads the text after `>` into commands.
 *
 * `lookup(verb)` comes from the registry: it returns `{ rest: true }` for a
 * verb that keeps the rest of the line as text (`tell:`, `note:`), any object
 * for another verb it knows, and null otherwise. A known verb starts a new
 * command, so filters can share a line: `type:chat tag:research`.
 *
 * Returns `{ commands, help, loose }`:
 * - commands: `{ verb, minus, args, raw, text, start, end }`, verb in lower
 *   case as typed (before any renaming), minus true for `-tag:`, raw what
 *   followed the colon as typed, text the same with outer quotes removed,
 *   args read from it even for a verb that keeps the rest (`note:203 "Try it"`);
 * - help: `{ topic }` for `?`, `?name`, `help` or `help:name`, else null;
 * - loose: words before the first verb, as typed.
 */
export function parseCommand(body, lookup = () => null) {
  const text = String(body ?? '')
  const trimmed = text.trim()

  const help = /^(?:\?|help\b:?)\s*([a-z]*):?\s*$/i.exec(trimmed)
  if (help) return { commands: [], help: { topic: help[1] ? help[1].toLowerCase() : null }, loose: '' }

  const commands = []
  let loose = ''
  let current = null
  const finish = (end) => {
    if (!current) return
    const argText = text.slice(current.argStart, end)
    current.raw = argText.trim()
    current.text = unquote(argText)
    current.args = readArgs(argText, current.argStart)
    current.end = end
    delete current.argStart
    delete current.rest
    commands.push(current)
    current = null
  }

  for (const w of words(text)) {
    const head = VERB.exec(w.text)
    const verb = head ? head[2].toLowerCase() : null
    const known = verb ? lookup(verb) : null
    if (head && (known || (!current && !commands.length))) {
      finish(w.start)
      current = { verb, minus: head[1] === '-', start: w.start, argStart: w.start + head[0].length, rest: Boolean(known?.rest) }
      if (current.rest) break
      continue
    }
    if (!current && !commands.length) loose = text.slice(0, w.end).trim()
  }
  finish(text.length)
  return { commands, help: null, loose }
}

// A line shaped like a key is refused before Enter and never kept in the
// history, whatever the verb (settings spec §6). Two shapes: `sk-` at the
// start of a word, and a long run of key characters that mixes capitals,
// small letters and digits, or small letters and many digits with no break,
// which is how keys look and ordinary words, dates and tags do not.
const SK = /(?<![A-Za-z0-9])sk-/
const RUN = /[A-Za-z0-9_-]{28,}/g

/** True for a line that looks like it holds an API key. */
export function shapedLikeKey(line) {
  const text = String(line ?? '')
  if (SK.test(text)) return true
  for (const [run] of text.matchAll(RUN)) {
    const mixed = /[A-Z]/.test(run) && /[a-z]/.test(run) && /\d/.test(run)
    const hex = /^[a-z0-9]+$/.test(run) && (run.match(/\d/g) || []).length >= 6
    if (mixed || hex) return true
  }
  return false
}

// The history of commands (refactor-plan.md, stage 3; settings spec §6 and
// §15; C101).
//
// Commands only: never a prompt, a search, or a line shaped like a key, and
// never the writing a command carries (`note:` and `tell:` keep the rest of
// the line as text, so lines with them are not kept). Only lines that ran are
// handed here. The list is kept on this device and never goes in a backup
// (version 6, `commandHistory`); it holds the last HISTORY_LIMIT lines, and
// a line run twice in a row is kept once.
//
// Walking back through it with the arrow keys is `stepRecall`, which keeps
// the line being typed and brings it back past the newest.

import { parse, verbEntry } from '../commands/registry'
import { shapedLikeKey } from '../commands/parse'

export const HISTORY_LIMIT = 500
const LONGEST = 500
const STORE = 'commandHistory'

/**
 * The line as it would be kept, or null when it must not be.
 * @param {string} body the text after `>`
 */
export function keepable(body) {
  const line = String(body ?? '').trim()
  if (!line || line.length > LONGEST) return null
  if (shapedLikeKey(line)) return null
  const { commands, help, loose } = parse(line)
  if (help || loose || !commands.length) return null
  for (const c of commands) {
    const entry = verbEntry(c.verb)
    if (!entry || entry.rest) return null
  }
  return line
}

/**
 * Keeps a command that ran. Returns the line kept, or null.
 * @param {import('idb').IDBPDatabase} db
 * @param {string} body the text after `>`
 */
export async function keepCommand(db, body, { now = new Date().toISOString(), limit = HISTORY_LIMIT } = {}) {
  const line = keepable(body)
  if (!line || !db.objectStoreNames.contains(STORE)) return null
  // Whole reads rather than cursors, so the same code runs with the lock on,
  // where a transaction is staged (sealedDb.js).
  const tx = db.transaction(STORE, 'readwrite')
  const store = tx.objectStore(STORE)
  const kept = await store.getAll() // oldest first: the keys count up
  const last = kept[kept.length - 1]
  if (last && last.line === line) await store.put({ ...last, at: now })
  else await store.add({ line, at: now })
  const extra = kept.length + (last && last.line === line ? 0 : 1) - limit
  for (const old of kept.slice(0, Math.max(0, extra))) await store.delete(old.id)
  await tx.done
  return line
}

/**
 * The kept lines, newest first.
 * @param {import('idb').IDBPDatabase} db
 */
export async function readCommands(db, { limit = HISTORY_LIMIT } = {}) {
  if (!db.objectStoreNames.contains(STORE)) return []
  const kept = await db.getAll(STORE)
  return kept.reverse().slice(0, limit).map((c) => c.line)
}

/**
 * One step through the history with the arrow keys.
 * @param {{ lines: string[], index: number, draft: string }} walk index -1 is the line being typed
 * @param {'up'|'down'} direction
 * @param {string} current what the field holds now
 * @returns {{ lines: string[], index: number, draft: string, value: string }}
 */
export function stepRecall({ lines, index = -1, draft = '' }, direction, current) {
  if (!lines.length) return { lines, index: -1, draft, value: current }
  if (direction === 'up') {
    const kept = index === -1 ? current : draft
    const next = Math.min(index + 1, lines.length - 1)
    return { lines, index: next, draft: kept, value: lines[next] }
  }
  const next = Math.max(index - 1, -1)
  return { lines, index: next, draft, value: next === -1 ? draft : lines[next] }
}

// Cross-window signals (change-plan.md 1.7, conflicts.md C14).
//
// Tabs of Parliament are separate instances sharing one IndexedDB. They tell
// each other what changed over BroadcastChannel; the data itself is always
// re-read from IndexedDB, which stays the single source of truth. Pop-out
// windows need none of this: they are drawn by their opener and share its
// state directly.
//
// SECURITY RULE: messages carry ids and short signals only, never message
// content, prompts, titles or keys. sanitizeSignal() enforces it by dropping
// any field not on the allow-list below, so a careless caller cannot leak.
//
// Web Locks make sure only one tab executes a given docket at a time.

export const CHANNEL_NAME = 'parliament'

// type -> allowed fields (besides `type` and `from`, which every signal has)
const SIGNALS = Object.freeze({
  hello: [],                          // a tab opened
  bye: [],                            // a tab is closing
  changed: ['kind', 'num', 'id'],     // a record was written; re-read it
  stop: ['scope', 'num', 'letter'],   // halt runs: scope 'all' | 'docket' | 'branch'
})

const FIELD_TYPES = Object.freeze({
  kind: 'string', num: 'number', id: 'string', scope: 'string', letter: 'string',
})

/** Returns a clean copy of a signal, or null if its type is unknown. */
export function sanitizeSignal(signal) {
  if (!signal || typeof signal !== 'object') return null
  const allowed = SIGNALS[signal.type]
  if (!allowed) return null
  const out = { type: signal.type }
  if (typeof signal.from === 'string' && signal.from.length <= 64) out.from = signal.from
  for (const field of allowed) {
    const v = signal[field]
    if (v === undefined || v === null) continue
    if (typeof v !== FIELD_TYPES[field]) continue
    if (typeof v === 'string' && v.length > 64) continue
    out[field] = v
  }
  return out
}

/**
 * Open the channel for this tab.
 * @returns {{ tabId: string, post: (signal) => void, on: (fn) => () => void, close: () => void }}
 */
export function openBus({ channelName = CHANNEL_NAME, tabId = crypto.randomUUID() } = {}) {
  if (typeof BroadcastChannel === 'undefined') {
    return { tabId, post() {}, on: () => () => {}, close() {} }
  }
  const channel = new BroadcastChannel(channelName)
  const listeners = new Set()
  channel.onmessage = (e) => {
    const s = sanitizeSignal(e.data)
    if (!s || s.from === tabId) return
    for (const fn of listeners) fn(s)
  }
  return {
    tabId,
    post(signal) {
      const s = sanitizeSignal({ ...signal, from: tabId })
      if (s) channel.postMessage(s)
    },
    on(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    close() {
      listeners.clear()
      channel.close()
    },
  }
}

/**
 * Run fn while holding the lock for one docket, so no other tab runs it at
 * the same time. Resolves to fn's result, or to null without calling fn if
 * another tab already holds the lock.
 */
export async function withDocketLock(docketId, fn) {
  if (typeof navigator === 'undefined' || !navigator.locks) return fn()
  return navigator.locks.request(`parliament-docket-${docketId}`, { ifAvailable: true }, (lock) =>
    lock ? fn() : null
  )
}

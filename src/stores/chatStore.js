// Replies being written, kept by conversation (refactor-plan.md, stage 3;
// state audit §11a; C109). No React here.
//
// Before this, one shared place held the reply being written, so every
// block on the page redrew for each piece of it, a second chat could not
// stream, and a reply that outlived its chat wrote into whichever chat was
// open. Now each conversation's stream is its own entry: its text, the
// message it fills, when it started, and the controller that stops it.
// Readers subscribe by topic, `stream:<id>` for the text and `status:<id>`
// for whether it streams, and hear at most every 40ms while text arrives.
//
// A stream stopped because its chat was left carries the reason, so the
// reply can say so and the page landed on can say it once (C109).

const NOTIFY_MS = 40

const streams = new Map() // conversation id -> { messageId, text, startedAt, controller, stopReason }
const listeners = new Map() // topic -> Set of functions
const waiting = new Set() // topics to tell at the next flush
let timer = null
let notices = [] // replies stopped because their chat was left, not yet shown

function tell(topic) {
  for (const fn of listeners.get(topic) ?? []) fn()
}

function flush() {
  timer = null
  const topics = [...waiting]
  waiting.clear()
  topics.forEach(tell)
}

// Text is told at most every NOTIFY_MS; everything else at once.
function soon(topic) {
  waiting.add(topic)
  if (!timer) timer = setTimeout(flush, NOTIFY_MS)
}
function now(...topics) {
  for (const t of topics) waiting.delete(t)
  topics.forEach(tell)
}

/** Listens to a topic; returns the function that stops listening. */
export function subscribe(topic, fn) {
  if (!listeners.has(topic)) listeners.set(topic, new Set())
  listeners.get(topic).add(fn)
  return () => {
    const set = listeners.get(topic)
    set?.delete(fn)
    if (set && !set.size) listeners.delete(topic)
  }
}

/** A stream begins for a conversation, filling one message. */
export function startStream(id, { messageId, text = '', controller = null, at = Date.now() }) {
  streams.set(id, { messageId, text, startedAt: at, controller, stopReason: null })
  now(`status:${id}`, `stream:${id}`)
}

/** A piece of the reply arrives. */
export function appendStream(id, chunk) {
  const s = streams.get(id)
  if (!s) return
  s.text += chunk
  soon(`stream:${id}`)
}

/** The text starts again, as between the turns of a tool call. */
export function resetStreamText(id, text = '') {
  const s = streams.get(id)
  if (!s) return
  s.text = text
  now(`stream:${id}`)
}

/** Stops a stream: its controller aborts, and the reason stays until it ends. */
export function stopStream(id, reason = 'stopped') {
  const s = streams.get(id)
  if (!s) return false
  if (!s.stopReason) s.stopReason = reason
  try { s.controller?.abort() } catch { /* already stopped */ }
  return true
}

/** The stream is over, finished or stopped. Returns what it was. */
export function endStream(id) {
  const s = streams.get(id) ?? null
  streams.delete(id)
  now(`status:${id}`, `stream:${id}`)
  return s
}

export const getStream = (id) => streams.get(id) ?? null
export const streamText = (id) => streams.get(id)?.text ?? ''
export const streamMessageId = (id) => streams.get(id)?.messageId ?? null
export const isStreaming = (id) => streams.has(id)
export const streamingIds = () => [...streams.keys()]

/** A reply stopped because its chat was left, to be said once where the person lands. */
export function addNotice(notice) {
  notices = [...notices, { ...notice, at: notice.at ?? Date.now() }]
  now('notices')
}
export const getNotices = () => notices
export function dismissNotice(conversationId) {
  notices = notices.filter((n) => n.conversationId !== conversationId)
  now('notices')
}

/** For tests: forget everything. */
export function _reset() {
  streams.clear()
  listeners.clear()
  waiting.clear()
  if (timer) clearTimeout(timer)
  timer = null
  notices = []
}

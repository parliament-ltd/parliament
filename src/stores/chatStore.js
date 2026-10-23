// Replies being written, and the messages of open chats, kept by
// conversation (refactor-plan.md, stages 3 and 4; state audit §11a; C109).
// No React here.
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
  streams.set(id, { messageId, text, startedAt: at, controller, stopReason: null, cut: false, thinking: '', thinkingAt: null, answerAt: null })
  now(`status:${id}`, `stream:${id}`)
}

/** The reply broke off: an error or a stall cut it short. */
export function noteCut(id) {
  const s = streams.get(id)
  if (s) s.cut = true
}

// How each conversation's last stream ended, for the ink pot (C114):
// 'done' when the reply arrived, 'stopped' when it was stopped, left, or
// broke off. Read on the `status:<id>` topic.
const ends = new Map()
export const streamEnd = (id) => ends.get(id) ?? null

/** A piece of the reply arrives. */
export function appendStream(id, chunk) {
  const s = streams.get(id)
  if (!s) return
  if (chunk && s.answerAt == null) s.answerAt = Date.now()
  s.text += chunk
  soon(`stream:${id}`)
}

/**
 * The reply as it should be shown, all of it so far: as appendStream, for a
 * reply whose text is changed on the way in (the privacy filter's
 * placeholders swapped back, C167).
 */
export function showStreamText(id, text) {
  const s = streams.get(id)
  if (!s) return
  if (text && s.answerAt == null) s.answerAt = Date.now()
  s.text = text
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
export function endStream(id, at = Date.now()) {
  const s = streams.get(id) ?? null
  if (s) ends.set(id, Object.freeze({ how: s.stopReason || s.cut ? 'stopped' : 'done', at }))
  streams.delete(id)
  now(`status:${id}`, `stream:${id}`)
  return s
}

/**
 * A piece of a model's thinking arrives, shown as it goes so a long wait
 * is seen to be work (C165). It is never the reply, and never sent back.
 */
export function appendThinking(id, chunk) {
  const s = streams.get(id)
  if (!s || !chunk) return
  if (s.thinkingAt == null) s.thinkingAt = Date.now()
  s.thinking += chunk
  soon(`stream:${id}`)
}

/** What a finished stream thought, for its reply: { thinking, thinkingMs }, or {} when it did not think. */
export function thoughtOf(s, at = Date.now()) {
  if (!s?.thinking) return {}
  return { thinking: s.thinking.slice(0, THINKING_MAX), thinkingMs: Math.max(0, (s.answerAt ?? at) - (s.thinkingAt ?? at)) }
}
// The most of a reply's thinking that is kept with it.
export const THINKING_MAX = 20_000

export const getStream = (id) => streams.get(id) ?? null
export const streamThinking = (id) => streams.get(id)?.thinking ?? ''
export const streamAnswering = (id) => streams.get(id)?.answerAt != null
export const streamText = (id) => streams.get(id)?.text ?? ''
export const streamMessageId = (id) => streams.get(id)?.messageId ?? null
export const isStreaming = (id) => streams.has(id)
export const streamingIds = () => [...streams.keys()]

// ── Who shows a chat (stage 8, piece 2; C109, C173) ──
//
// A chat is left, and a reply being written in it stopped (C109), when
// nothing on screen shows it any more: not its room, and not a slider that
// shows it as a branch. Each shows a chat by watching it; the last to stop
// watching leaves it. So looking at another branch in a slider, or the room
// moving to the branch it carries on, never stops a branch still writing.
const watchers = new Map() // chat id -> how many show it

/** Something on screen shows a chat; returns the function for when it stops. */
export function watch(id) {
  watchers.set(id, (watchers.get(id) ?? 0) + 1)
  let done = false
  return () => {
    if (done) return
    done = true
    const n = (watchers.get(id) ?? 1) - 1
    if (n > 0) watchers.set(id, n)
    else watchers.delete(id)
  }
}

/** Whether anything on screen shows a chat. */
export const watched = (id) => (watchers.get(id) ?? 0) > 0

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

// ── Messages, by chat (refactor-plan.md, stage 4; state audit §11a, step 5) ──
//
// The messages of each chat that is open somewhere, kept here rather than
// in one shared list for "the open chat", so what is sent is built from
// the chat it goes to, by its id. Readers listen to `messages:<id>`.
// The database stays the record: a chat's list is loaded from it, kept
// while the chat is open, and let go when it closes.
//
// Hidden messages and messages waiting to be deleted are kept here too, so
// that nothing hidden or deleted is sent (request-path audit, item 5).
// A hide lasts for this visit to the app, as it always has. A delete waits
// for its undo time and then happens, even if the chat was left meanwhile:
// deleting means deleted.

const NONE = Object.freeze([])
const NO_IDS = Object.freeze(new Set())

const lists = new Map() // chat id -> messages, oldest first
const hidden = new Map() // chat id -> Set of message ids
const deleting = new Map() // chat id -> Map of message id -> { timer, at }
const deletingLists = new Map() // chat id -> cached array of pending deletes, for readers

/** The chat's messages while it is open, or an empty list. */
export const getMessages = (id) => lists.get(id) ?? NONE
/** Whether the chat's messages are held here. */
export const hasMessages = (id) => lists.has(id)

/** Keeps a chat's messages, as loaded from the database. */
export function setMessages(id, messages) {
  lists.set(id, Object.freeze([...messages]))
  now(`messages:${id}`)
}

/** Changes a chat's messages, if they are held here; a chat that is not open is left to the database. */
export function updateMessages(id, change) {
  const list = lists.get(id)
  if (!list) return
  const next = change(list)
  if (next === list) return
  lists.set(id, Object.freeze([...next]))
  now(`messages:${id}`)
}

/** Lets a chat's messages go when it closes. Hides and deletes stay. */
export function releaseMessages(id) {
  if (!lists.delete(id)) return
  now(`messages:${id}`)
}

/** The ids of a chat's hidden messages. */
export const hiddenIds = (id) => hidden.get(id) ?? NO_IDS

function setHidden(id, ids) {
  if (ids.size) hidden.set(id, Object.freeze(ids))
  else hidden.delete(id)
  now(`hidden:${id}`)
}
export function hideMessage(id, messageId) {
  const ids = new Set(hiddenIds(id))
  ids.add(messageId)
  setHidden(id, ids)
}
export function showMessage(id, messageId) {
  const ids = new Set(hiddenIds(id))
  if (!ids.delete(messageId)) return
  setHidden(id, ids)
}
export function showAllMessages(id) {
  if (hidden.has(id)) setHidden(id, new Set())
}

/** Messages waiting to be deleted in a chat, oldest first: [{ messageId, at }]. */
export const pendingDeletes = (id) => deletingLists.get(id) ?? NONE

function tellDeleting(id) {
  const map = deleting.get(id)
  if (map && map.size) deletingLists.set(id, Object.freeze([...map].map(([messageId, d]) => ({ messageId, at: d.at }))))
  else { deleting.delete(id); deletingLists.delete(id) }
  now(`deleting:${id}`)
}

/**
 * A message leaves the chat now and is deleted after `ms`, unless undone.
 * `remove` deletes it from the database; when it has, the message leaves
 * the chat's list too.
 */
export function scheduleDelete(id, messageId, { remove, ms, at = Date.now() }) {
  if (!deleting.has(id)) deleting.set(id, new Map())
  const map = deleting.get(id)
  if (map.has(messageId)) return
  const timer = setTimeout(async () => {
    try { await remove(messageId) } catch { /* the database keeps it; it shows again on the next load */ }
    map.delete(messageId)
    tellDeleting(id)
    updateMessages(id, (list) => list.filter((m) => m.id !== messageId))
    showMessage(id, messageId)
  }, ms)
  map.set(messageId, { timer, at })
  tellDeleting(id)
}

/** Takes back a delete that has not happened yet. */
export function undoDelete(id, messageId) {
  const d = deleting.get(id)?.get(messageId)
  if (!d) return false
  clearTimeout(d.timer)
  deleting.get(id).delete(messageId)
  tellDeleting(id)
  return true
}

/**
 * What a chat sends of its messages: those with text, leaving out hidden
 * messages and messages waiting to be deleted. What is sent is what is
 * shown.
 */
export function sendable(id, messages = getMessages(id)) {
  return sendableOf(messages, hiddenIds(id), pendingDeletes(id))
}

/** The same, from a chat's messages, hidden ids and pending deletes as a reader holds them. */
export function sendableOf(messages, hiddenSet, pending = NONE) {
  const gone = new Set(pending.map((p) => p.messageId))
  return messages.filter((m) => m && m.content && !hiddenSet.has(m.id) && !gone.has(m.id))
}

/** For tests: forget everything. */
export function _reset() {
  watchers.clear()
  streams.clear()
  listeners.clear()
  waiting.clear()
  if (timer) clearTimeout(timer)
  timer = null
  notices = []
  ends.clear()
  lists.clear()
  hidden.clear()
  for (const map of deleting.values()) for (const d of map.values()) clearTimeout(d.timer)
  deleting.clear()
  deletingLists.clear()
}

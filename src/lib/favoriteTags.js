// Favourites as a tag (stage 6 checkpoint, 22 October 2026; C147).
//
// A favourite is anything carrying the tag `favorite`: a chat, plan, note,
// keyword or quote, tagged with tagadd: like any tag. A single message has
// no number, so the heart on it keeps a quote of the whole message beside
// its chat, tagged `favorite` (or tags the whole-message quote already
// there). A second click takes the tag off; the quote stays, and erase:
// removes it.
//
// Favourites made before this were records of their own, gathered in the
// Favorites collection. favoritesToTags plans turning each into such a quote,
// shown as a dry run before it runs; until it has run, the heart still shows
// them, and a click on one takes it back as it always did.
//
// Pure, apart from applyFavoritesToTags, which writes in one transaction.

import { addNumbered } from './records'

export const FAVORITE_TAG = 'favorite'
// Where the conversion notes that it has run, so the old records stop counting.
export const FAVORITES_TAGGED_SETTING = 'favoritesTaggedAt'

const tagged = (record) => (record?.tags ?? []).some((t) => String(t).toLocaleLowerCase() === FAVORITE_TAG)

/** A quote of a whole message, kept in that message's own chat. */
export function wholeQuoteOf(pins, conversationId, messageId, content) {
  return pins.find((p) => p.sourceMessageId === messageId && p.targetConversationId === conversationId && p.content === content) ?? null
}

/**
 * What the heart shows on each message of a chat: a quote tagged `favorite`,
 * or, until the conversion has run, an old favourite record.
 * @param {{ pins: object[], oldFavorites: object[], conversationId: string, converted: boolean }} s
 * @returns {Map<string, { kind: 'tag', pin: object }|{ kind: 'old', record: object }>}
 */
export function favoritesOf({ pins = [], oldFavorites = [], conversationId, converted = false }) {
  const out = new Map()
  if (!converted) for (const f of oldFavorites) if (f.messageId) out.set(f.messageId, { kind: 'old', record: f })
  for (const p of pins) {
    if (p.targetConversationId === conversationId && p.sourceMessageId && tagged(p)) out.set(p.sourceMessageId, { kind: 'tag', pin: p })
  }
  return out
}

/** The tags of a record with `favorite` added or taken off, as the row verbs write them. */
export function withFavorite(record, on) {
  const tags = (record.tags ?? []).filter((t) => String(t).toLocaleLowerCase() !== FAVORITE_TAG)
  const mine = (record.tagsMine ?? []).filter((t) => String(t).toLocaleLowerCase() !== FAVORITE_TAG)
  return on ? { tags: [...tags, FAVORITE_TAG], tagsMine: [...mine, FAVORITE_TAG] } : { tags, tagsMine: mine }
}

/**
 * The dry run: what becomes of each old favourite (C147 (c)).
 * @param {{ favorites: object[], messages: object[], pins: object[] }} snap
 * @returns {{ tag: object[], create: object[], gone: object[], already: object[] }}
 *   tag: whole-message quotes that get the tag; create: quotes to make;
 *   gone: favourites whose message is no longer there (left as they are);
 *   already: ones a tagged quote covers
 */
export function planFavoritesToTags({ favorites = [], messages = [], pins = [] }) {
  const byId = new Map(messages.map((m) => [m.id, m]))
  const plan = { tag: [], create: [], gone: [], already: [] }
  const seen = new Set()
  for (const f of favorites) {
    const m = byId.get(f.messageId)
    if (!m || typeof m.content !== 'string' || !m.content) { plan.gone.push(f); continue }
    const key = `${f.conversationId}:${f.messageId}`
    if (seen.has(key)) continue
    seen.add(key)
    const whole = wholeQuoteOf(pins, f.conversationId, f.messageId, m.content)
    if (whole && tagged(whole)) plan.already.push({ favorite: f, pin: whole })
    else if (whole) plan.tag.push({ favorite: f, pin: whole })
    else plan.create.push({ favorite: f, conversationId: f.conversationId, messageId: f.messageId, content: m.content, createdAt: f.createdAt ?? null })
  }
  return plan
}

/**
 * Runs the plan: new quotes tagged `favorite`, the tag on the quotes that
 * were there, and a note that it ran. The old records are left as they
 * are, readable by old backups. The quotes are made one by one, each with
 * its number; if anything fails the note is not written, and running again
 * finds the quotes already made and tagged, so nothing is made twice.
 * @returns {Promise<{ created: number[], tagged: number[] }>} the numbers of the quotes
 */
export async function applyFavoritesToTags(db, plan, { now, newId }) {
  const created = []
  for (const c of plan.create) {
    // Each its own number, in the order they were made.
    const pin = await addNumbered(db, 'pins', {
      id: newId(), targetConversationId: c.conversationId, sourceConversationId: c.conversationId, sourceMessageId: c.messageId,
      content: c.content, createdAt: c.createdAt ?? now, ...withFavorite({}, true),
    })
    created.push(pin.num)
  }
  const taggedNums = []
  const tx = db.transaction(['pins', 'settings'], 'readwrite')
  for (const t of plan.tag) {
    const now1 = await tx.objectStore('pins').get(t.pin.id)
    if (!now1) continue
    await tx.objectStore('pins').put({ ...now1, ...withFavorite(now1, true) })
    taggedNums.push(now1.num)
  }
  await tx.objectStore('settings').put({ key: FAVORITES_TAGGED_SETTING, value: now })
  await tx.done
  return { created, tagged: taggedNums }
}

/** What the conversion works from: every old favourite, its message, and every quote. */
export async function readFavoritesSnapshot(db) {
  const favorites = await db.getAll('favorites')
  const ids = [...new Set(favorites.map((f) => f.messageId).filter(Boolean))]
  const messages = (await Promise.all(ids.map((id) => db.get('messages', id)))).filter(Boolean)
  const pins = await db.getAll('pins')
  return { favorites, messages, pins }
}

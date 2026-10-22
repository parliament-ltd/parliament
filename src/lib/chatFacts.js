// What Records needs from inside each chat (refactor-plan.md, stage 6,
// piece 1; C132): the words in it, for search; who answered, for model:;
// and the tokens each reply recorded, for cost:. Read from the chat's
// messages and, for a Secretarybird chat, its document.
//
// Read once per chat and kept while the chat is unchanged. A change to a
// chat, one of its messages or its document, here or in another tab
// (records.js announces each), drops that chat's facts, and they are read
// again the next time the table is.
//
// factsOf is pure; createFactsCache reads the stores.

/**
 * @typedef {{ models: string[], sources: string[], usage: Array<{ model: string, input: number, output: number }>,
 *   unpriced: number, words: string }} ChatFacts
 *   models: the models that answered, by id (an older reply counts as its chat's last model, C132 (g));
 *   sources: the sources that answered, by id; usage: what each reply recorded, to be priced;
 *   unpriced: replies from a model with no tokens recorded, so the chat's cost is not known;
 *   words: everything written in the chat, in lower case, for search
 */

const lower = (text) => String(text ?? '').toLocaleLowerCase()
const count = (n) => (Number.isFinite(n) && n >= 0 ? n : 0)

/**
 * @param {{ model?: string|null }} chat
 * @param {object[]} messages the chat's messages
 * @param {{ paragraphs?: Array<{ text?: string }> }|null} [document] a Secretarybird chat's document
 * @returns {ChatFacts}
 */
export function factsOf(chat, messages = [], document = null) {
  const models = new Set()
  const sources = new Set()
  const usage = []
  let unpriced = 0
  const words = []
  for (const m of messages) {
    if (m?.content) words.push(lower(m.content))
    if (m?.role !== 'assistant') continue
    if (m.source?.id) { sources.add(m.source.id); continue } // a source costs nothing
    const model = m.model || chat?.model || null
    if (model) models.add(model)
    if (m.model && m.usage) usage.push({ model: m.model, input: count(m.usage.input), output: count(m.usage.output) })
    else unpriced += 1
  }
  for (const p of Array.isArray(document?.paragraphs) ? document.paragraphs : []) {
    if (p?.text) words.push(lower(p.text))
  }
  return { models: [...models], sources: [...sources], usage, unpriced, words: words.join('\n') }
}

/**
 * A chat's cost from what its replies recorded, priced from the list of
 * models, or null when it cannot be known: a reply recorded no tokens, or its
 * model has no price. Never guessed (v30).
 * @param {ChatFacts} facts
 * @param {(model: string) => { inputPerMillion?: number, outputPerMillion?: number }|null} priceOf
 */
export function costOf(facts, priceOf) {
  if (!facts || facts.unpriced > 0) return null
  let total = 0
  for (const u of facts.usage) {
    const price = priceOf?.(u.model)
    if (typeof price?.inputPerMillion !== 'number' || typeof price?.outputPerMillion !== 'number') return null
    total += (u.input * price.inputPerMillion + u.output * price.outputPerMillion) / 1_000_000
  }
  return total
}

/** The facts of each chat, read when first asked for and kept until the chat changes. */
export function createFactsCache() {
  const byChat = new Map() // chat id -> ChatFacts
  const chatOf = new Map() // message id -> chat id

  return {
    /**
     * Drops what a stored change makes stale. A change from records.js:
     * { kind, op, id }. A new message is announced with its chat.
     */
    forget({ kind, id } = {}) {
      if (kind === 'chat' || kind === 'document') byChat.delete(id)
      if (kind === 'message' && chatOf.has(id)) byChat.delete(chatOf.get(id))
    },

    /**
     * The facts of these chats, reading only those not kept.
     * @param {import('idb').IDBPDatabase} db
     * @param {object[]} chats
     * @returns {Promise<Map<string, ChatFacts>>}
     */
    async read(db, chats) {
      const ids = new Set(chats.map((c) => c.id))
      for (const id of byChat.keys()) if (!ids.has(id)) byChat.delete(id)
      const missing = chats.filter((c) => !byChat.has(c.id))
      if (missing.length) {
        const tx = db.transaction(['messages', 'sbrd_documents'], 'readonly')
        const messages = tx.objectStore('messages').index('conversationId')
        const documents = tx.objectStore('sbrd_documents')
        const read = await Promise.all(missing.map((c) => Promise.all([messages.getAll(c.id), documents.get(c.id)])))
        await tx.done
        missing.forEach((chat, i) => {
          const [msgs, doc] = read[i]
          for (const m of msgs) chatOf.set(m.id, chat.id)
          byChat.set(chat.id, factsOf(chat, msgs, doc ?? null))
        })
      }
      return new Map(chats.map((c) => [c.id, byChat.get(c.id)]))
    },
  }
}

// What Records makes into Markdown (refactor-plan.md, stage 6, pieces 3 and
// 5; C143 (f), C138): a chat with who said what and its markings, its
// sources as footnotes with their page, revision and licence; a plan as its
// chats in order; a note, keyword or quote as its words and where it came
// from. copy: puts it on the clipboard; export: (piece 5) will write it to
// a file.
//
// Pure. The words people read (You, Notes, the names of models and
// sources) come in through `words`, from the copy table, so the Markdown is
// in the reader's language. Everything else is the person's words or a
// model's, written as they are.

const oneLine = (text) => String(text ?? '').replace(/\s+/g, ' ').trim()

/**
 * @typedef {{ you: string, untitled: string, by: (message: object) => string,
 *   heading: Record<'note'|'term'|'quote'|'document', string>, kind: (kind: string) => string,
 *   from: (num: number) => string, revision: (revision: string) => string }} Words
 */

// A source's footnote: its name, its page, revision and licence, and where
// it is. Each part only when known.
function footnote(n, source, words) {
  const parts = [
    source.name || source.id,
    source.title ? `“${oneLine(source.title)}”` : null,
    source.revision ? words.revision(source.revision) : null,
    source.licence?.name ?? null,
  ].filter(Boolean)
  return `[^${n}]: ${parts.join(', ')}${source.url ? `. <${source.url}>` : ''}`
}

/**
 * One chat.
 * @param {{ num: number, title?: string, facts?: string[], messages?: object[], document?: string[],
 *   markings?: Array<{ kind: string, num: number|null, text: string }> }} chat
 *   facts: worded already (its number, room, day); messages in order, hidden ones left out by the caller
 * @param {Words} words
 * @param {{ next: number }} [notes] footnote numbering, shared across the chats of a plan
 */
export function chatMarkdown(chat, words, notes = { next: 1 }) {
  const out = [`# ${oneLine(chat.title) || words.untitled}`]
  if (chat.facts?.length) out.push(chat.facts.join(' · '))
  const foot = []
  for (const m of chat.messages ?? []) {
    if (!m?.content) continue
    let who = m.role === 'user' ? words.you : words.by(m)
    if (m.source?.id) {
      const n = notes.next++
      who = `${who}[^${n}]`
      foot.push(footnote(n, m.source, words))
    }
    out.push(`**${who}**`, String(m.content).trim())
  }
  if (chat.document?.length) out.push(`## ${words.heading.document}`, chat.document.map((p) => String(p).trim()).filter(Boolean).join('\n\n'))
  for (const kind of ['note', 'term', 'quote']) {
    const marks = (chat.markings ?? []).filter((m) => m.kind === kind && m.text)
    if (!marks.length) continue
    out.push(`## ${words.heading[kind]}`, marks.map((m) => `- ${m.num != null ? `${m.num}: ` : ''}${oneLine(m.text)}`).join('\n'))
  }
  if (foot.length) out.push(foot.join('\n'))
  return out.join('\n\n')
}

/** A plan: its chats in order, one after another. */
export function planMarkdown(chats, words) {
  const notes = { next: 1 }
  return chats.map((c) => chatMarkdown(c, words, notes)).join('\n\n---\n\n')
}

/** A note, keyword or quote: its words, what it is, and where it came from. */
export function markingMarkdown({ kind, num, text, chatNum, erasedFrom = null }, words) {
  const body = String(text ?? '').trim()
  const words1 = kind === 'note' ? body : body.split('\n').map((line) => `> ${line}`).join('\n')
  const where = chatNum != null ? words.from(chatNum) : erasedFrom != null && words.fromErased ? words.fromErased(erasedFrom) : null
  const facts = [`${words.kind(kind)} ${num}`, where].filter(Boolean)
  return `${words1}\n\n${facts.join(' · ')}`
}

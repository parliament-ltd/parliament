// What a stored chat title says about the chat's name (C86, C90).
//
// The old code wrote words of the interface into titles: "Branch: " before a
// fork's title (so a fork of a fork reads "Branch: Branch: …"), "Summary: "
// before a summary branch's, and "New conversation" or "New Conversation"
// where there was no title at all. Those are not the person's words, so a
// docket's or branch's name leaves them out, as it does the " (from backup)"
// a restore adds to a copy's title. The stored title is not changed, because
// today's screens show it.

// Every leading "Branch:" and "Summary:" on a chat that was forked.
const BRANCH_PREFIX = /^(?:(?:Branch|Summary):\s*)+/
// What a restore adds to a copy's title while today's screens show only titles.
const COPY_SUFFIX = /(?:\s\(from backup\))+$/
// What the old code stored in place of a title (SelectorLayout, createConversation).
const NO_TITLE = new Set(['new conversation'])

/** The name a chat gives its docket or branch, or null for none. */
export function nameFromChat(chat) {
  const title = typeof chat?.title === 'string' ? chat.title : ''
  if (!title) return null
  const unsuffixed = title.replace(COPY_SUFFIX, '') || title
  const name = chat.parentId ? unsuffixed.replace(BRANCH_PREFIX, '') || unsuffixed : unsuffixed
  return NO_TITLE.has(name.trim().toLowerCase()) ? null : name
}

/**
 * The chat's fields from the one request after its first answer (C62):
 * { title?, summary?, tags? } becomes { title?, aiSummary?, tags? }, with
 * only what came back.
 */
export function fieldsFromDescription(d) {
  const fields = {}
  if (typeof d?.title === 'string' && d.title) fields.title = d.title
  if (typeof d?.summary === 'string' && d.summary) fields.aiSummary = d.summary
  if (Array.isArray(d?.tags) && d.tags.length) fields.tags = d.tags
  return fields
}

// A title made on this device from the first words of a prompt, sending
// nothing (refactor-plan.md, stage 4; C62). The person's own words, so no
// word of the interface is stored. Counted in characters, not code units,
// so a title never ends in half a character.
const TITLE_WORDS = 8
const TITLE_CHARS = 60

/** The first words of a prompt as a chat title, with … when cut short; '' for none. */
export function titleFromPrompt(text) {
  const words = String(text ?? '').split(/\s+/).filter(Boolean)
  if (!words.length) return ''
  const length = (s) => Array.from(s).length
  let title = ''
  for (const word of words.slice(0, TITLE_WORDS)) {
    const next = title ? `${title} ${word}` : word
    if (length(next) > TITLE_CHARS) break
    title = next
  }
  // One word longer than a title, as in a language written without spaces.
  if (!title) title = Array.from(words[0]).slice(0, TITLE_CHARS).join('')
  return length(title) < length(words.join(' ')) ? `${title}…` : title
}

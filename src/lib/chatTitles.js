// What a stored chat title says about the chat's name (C86, C90).
//
// The old code wrote words of the interface into titles: "Branch: " before a
// fork's title (so a fork of a fork reads "Branch: Branch: …"), "Summary: "
// before a summary branch's, and "New conversation" or "New Conversation"
// where there was no title at all. Those are not the person's words, so a
// docket's or branch's name leaves them out. The stored title is not changed,
// because today's screens show it.

// Every leading "Branch:" and "Summary:" on a chat that was forked.
const BRANCH_PREFIX = /^(?:(?:Branch|Summary):\s*)+/
// What the old code stored in place of a title (SelectorLayout, createConversation).
const NO_TITLE = new Set(['new conversation'])

/** The name a chat gives its docket or branch, or null for none. */
export function nameFromChat(chat) {
  const title = typeof chat?.title === 'string' ? chat.title : ''
  if (!title) return null
  const name = chat.parentId ? title.replace(BRANCH_PREFIX, '') || title : title
  return NO_TITLE.has(name.trim().toLowerCase()) ? null : name
}

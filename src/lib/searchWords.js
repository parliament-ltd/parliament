// What a question to a source searches for (refactor-plan.md, stage 7,
// piece 8; conflicts.md Part 4; C168).
//
// A source answers a search, not a question: "What is a barn owl?" sent as
// typed finds "American barn owl" on Wikipedia, since "what is a" weighs in
// the search, where "barn owl" finds "Barn owl". So a leading question
// phrase and a closing question mark are left out of the search, and the
// Enter line says what is searched for before Enter, so what is sent still
// matches what is shown. The person's prompt is kept as typed.
//
// Only for English for now: other languages need their own phrases, from
// someone who reads them (C87).
//
// Pure.

// Question openings, longest first so "how tall is" wins over "how".
const ENGLISH = [
  'can you tell me about', 'could you tell me about', 'tell me about', 'tell me',
  'what is the meaning of', 'what is meant by', 'what does', 'what do',
  "what's", 'what is', 'what are', 'what was', 'what were',
  "who's", 'who is', 'who are', 'who was', 'who were',
  'who wrote', 'who invented', 'who discovered', 'who painted', 'who founded', 'who built', 'who made', 'who directed', 'who composed',
  "where's", 'where is', 'where are', 'where was', 'where were', 'where did', 'where does',
  'when is', 'when was', 'when were', 'when did', 'when does',
  'how tall is', 'how big is', 'how old is', 'how far is', 'how long is', 'how deep is', 'how heavy is', 'how fast is',
  'how many', 'how much', 'how does', 'how do', 'how did', 'how is', 'how are', 'how was',
  'why is', 'why are', 'why was', 'why do', 'why does', 'why did',
  'which is', 'which are', 'explain', 'define', 'describe',
].sort((a, b) => b.length - a.length)
const ARTICLES = /^(a|an|the)\s+/i
const TRAILING = /\s+(mean|means|meant|work|works|do|does)$/i

/**
 * The words a source is asked to search for, for a question in a language.
 * Returns the question as typed (less a closing question mark) when no rule
 * applies, or when the rule would leave nothing.
 * @param {string} question
 * @param {string} lang the language of the search ('en')
 * @returns {string}
 */
export function searchWords(question, lang = 'en') {
  const typed = String(question ?? '').trim()
  const bare = typed.replace(/[?？!.]+$/u, '').trim()
  if (String(lang).split('-')[0] !== 'en' || !bare) return bare || typed
  const lower = bare.toLowerCase()
  const lead = ENGLISH.find((p) => lower === p || lower.startsWith(`${p} `))
  if (!lead) return bare
  let rest = bare.slice(lead.length).trim().replace(ARTICLES, '')
  if (/^(what|do|does)\b/i.test(lead) || /\bmean/i.test(lead)) rest = rest.replace(TRAILING, '')
  rest = rest.trim()
  return rest.length >= 2 ? rest : bare
}

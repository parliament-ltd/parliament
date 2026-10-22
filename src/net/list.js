// The providers and sources: the one list that the model picker, the site's
// connection policy, the network log and the privacy copy all read
// (refactor-plan.md §4 and stage 4; C15, A8, A14).
//
// Each entry:
//   id        how the rest of the app names it, and how keys are kept
//   kind      'model' (a model provider), 'local' (a model on this
//             machine), 'source' (answers from a public source, no tokens)
//   name      its name, from here and nowhere else: copy names no provider
//             in a sentence, so sentences take the name from this list
//   origins   where requests to it go, for the connection policy
//   key       whether it needs a key of the person's
//   ships     whether it is built and allowed out. Only shipped entries
//             reach the connection policy (CLAUDE.md: a new host is added
//             only with its provider or source)
//   stage     the stage of refactor-plan.md that builds it
//   licence   for sources, the licence their text comes under
//   keysPage  for providers that take a key, the page where the person makes
//             and revokes keys: a link they open, never fetched
//   sourceKind for sources, the kind of question it answers, which groups it
//             in the picker: reference, research or discussion (branch
//             slider v9; stage 7)
//   answersIn for sources, the language its answers come in: 'yours' (an
//             edition in the reader's language), 'english', or
//             'mostlyEnglish' (LPN §6; stage 7)
//   perDay    for a source with a daily allowance without a key, about how
//             many searches it allows a day, shared by everyone on the same
//             network (OpenAlex; checked 22 October 2026)

export const DESTINATIONS = Object.freeze([
  { id: 'anthropic', kind: 'model', name: 'Anthropic', origins: ['https://api.anthropic.com'], key: true, ships: true, stage: 4, keysPage: 'https://console.anthropic.com/settings/keys' },
  { id: 'mistral', kind: 'model', name: 'Mistral', origins: ['https://api.mistral.ai'], key: true, ships: false, stage: 7 },
  // On this machine, by its exact port (CLAUDE.md, hard constraints).
  { id: 'ollama', kind: 'local', name: 'Ollama', origins: ['http://localhost:11434'], key: false, ships: false, stage: 7 },
  // Every language edition, so answers come from the person's language (C110).
  { id: 'wikipedia', kind: 'source', name: 'Wikipedia', origins: ['https://*.wikipedia.org'], key: false, ships: true, stage: 4, licence: 'CC BY-SA 4.0', sourceKind: 'reference', answersIn: 'yours' },
  // Hacker News through its search service, Algolia (stage 7, piece 2).
  { id: 'hackernews', kind: 'source', name: 'Hacker News', origins: ['https://hn.algolia.com'], key: false, ships: true, stage: 7, sourceKind: 'discussion', answersIn: 'english' },
  { id: 'openalex', kind: 'source', name: 'OpenAlex', origins: ['https://api.openalex.org'], key: false, ships: true, stage: 7, licence: 'CC0', sourceKind: 'research', answersIn: 'mostlyEnglish', perDay: 100 },
].map((d) => Object.freeze({ licence: null, keysPage: null, sourceKind: null, answersIn: null, perDay: null, ...d, origins: Object.freeze([...d.origins]) })))

const BY_ID = new Map(DESTINATIONS.map((d) => [d.id, d]))

/** The entry for a provider or source, or null. */
export const destination = (id) => BY_ID.get(id) ?? null

/** Everything that is built and allowed out. */
export const shipped = () => DESTINATIONS.filter((d) => d.ships)

/** The origins the connection policy allows, in list order: shipped entries only. */
export const connectOrigins = () => shipped().flatMap((d) => d.origins)

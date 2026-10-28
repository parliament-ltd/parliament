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
//   limitsPage for providers that bill, the page where the person sets a
//             monthly spending limit that the provider enforces (settings
//             spec §9; C204): a link they open, never fetched. Read on each
//             provider's own documentation on 24 October 2026
//   sourceKind for sources, the kind of question it answers, which groups it
//             in the picker: reference, research or discussion (branch
//             slider v9; stage 7)
//   answersIn for sources, the language its answers come in: 'yours' (an
//             edition in the reader's language), 'english', or
//             'mostlyEnglish' (LPN §6; stage 7)
//   perDay    for a source with a daily allowance without a key, about how
//             many searches it allows a day, shared by everyone on the same
//             network (OpenAlex; checked 22 October 2026)
//   data      for providers, what they do with what they are sent (security
//             notes §3; stage 7, piece 7; C167), shown on their rows only:
//               training  'no' (not trained on), 'optOut' (may be trained on
//                         unless the person opts out), 'always' (trained on
//                         whatever is chosen); a model can say otherwise
//               kept      how long it is kept: 'upTo30' (deleted within 30
//                         days), 'days30' (kept 30 days), 'atLeast30' (30 days
//                         or more), 'device' (on this computer only)
//               checked   the day it was read on the provider's own pages
//               page      the page that says so: a link the person opens,
//                         never fetched

export const DESTINATIONS = Object.freeze([
  // Its commercial terms: not trained on. How long it keeps what is sent:
  // its privacy pages say deleted within 30 days, its API pages "not
  // retained by default" beside a "30-day retention" setting (C167 (b)), so
  // the longer is shown. Some models keep 30 days or more (their own data).
  { id: 'anthropic', kind: 'model', name: 'Anthropic', origins: ['https://api.anthropic.com'], key: true, ships: true, stage: 4, keysPage: 'https://console.anthropic.com/settings/keys', limitsPage: 'https://platform.claude.com/settings/billing',
    data: { training: 'no', kept: 'upTo30', flagged: true, checked: '2026-10-22', page: 'https://privacy.claude.com/en/articles/7996866' } },
  // Its global address and the two that process prompts in one region,
  // chosen by the person, never by their network (stage 7, piece 3; C159).
  // Its free mode may train on what is sent unless the person opts out; its
  // paid use leaves it to the person. Preview models are trained on
  // whatever is chosen. Kept 30 days to watch for misuse (C167 (c)).
  { id: 'mistral', kind: 'model', name: 'Mistral', origins: ['https://api.mistral.ai', 'https://api.eu.mistral.ai', 'https://api.us.mistral.ai'], key: true, ships: true, stage: 7, keysPage: 'https://console.mistral.ai/api-keys', limitsPage: 'https://admin.mistral.ai/organization/billing',
    data: { training: 'optOut', kept: 'days30', checked: '2026-10-22', page: 'https://help.mistral.ai/en/articles/455207' } },
  // On this machine, by its exact port (CLAUDE.md, hard constraints).
  { id: 'ollama', kind: 'local', name: 'Ollama', origins: ['http://localhost:11434'], key: false, ships: true, stage: 7, data: { training: 'no', kept: 'device', checked: '2026-10-22', page: null } },
  // Every language edition, so answers come from the person's language (C110).
  { id: 'wikipedia', kind: 'source', name: 'Wikipedia', origins: ['https://*.wikipedia.org'], key: false, ships: true, stage: 4, licence: 'CC BY-SA 4.0', sourceKind: 'reference', answersIn: 'yours' },
  // Hacker News through its search service, Algolia (stage 7, piece 2).
  { id: 'hackernews', kind: 'source', name: 'Hacker News', origins: ['https://hn.algolia.com'], key: false, ships: true, stage: 7, sourceKind: 'discussion', answersIn: 'english' },
  { id: 'openalex', kind: 'source', name: 'OpenAlex', origins: ['https://api.openalex.org'], key: false, ships: true, stage: 7, licence: 'CC0', sourceKind: 'research', answersIn: 'mostlyEnglish', perDay: 100 },
].map((d) => Object.freeze({ licence: null, keysPage: null, limitsPage: null, sourceKind: null, answersIn: null, perDay: null, data: null, ...d, origins: Object.freeze([...d.origins]) })))

const BY_ID = new Map(DESTINATIONS.map((d) => [d.id, d]))

/** The entry for a provider or source, or null. */
export const destination = (id) => BY_ID.get(id) ?? null

/** Everything that is built and allowed out. */
export const shipped = () => DESTINATIONS.filter((d) => d.ships)

/**
 * The origins the page's connection policy allows, in list order: shipped
 * entries that take no key. Those that take a key are reached only through
 * the key vault (stage 15; research/vault-design.md §8), so the page itself
 * cannot reach them at all.
 */
export const connectOrigins = () => shipped().filter((d) => !d.key).flatMap((d) => d.origins)

/** The origins only the key vault connects to: shipped entries that take a key. */
export const vaultOrigins = () => shipped().filter((d) => d.key).flatMap((d) => d.origins)

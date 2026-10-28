# CLAUDE.md: Parliament

## Read this first

Parliament is mid-refactor. The design is defined by the documents in
`docs/spec/`. `docs/spec/README.md` lists them by date and says which one wins
where they disagree. They take priority over everything below and over every
other document in the repo.

- Rulings are in `docs/spec/conflicts.md`. Where the documents disagree with
  each other, with the code or with this file, do not resolve it yourself;
  record it there and ask.
- The plan is `docs/spec/refactor-plan.md`: fifteen stages, each ending with
  something Stefan can try and a checkpoint.

Never delete files, components, routes or stored data without explicit
approval, item by item.

## Orientation

Parliament is a client-side AI workspace. No backend, no accounts. Users bring
their own API keys or run a model on their own machine; everything else lives
in the browser's IndexedDB.

It is mid-refactor to a new direction:

- What is on screen is an **arrangement** of **boards**. A **room** is a board
  built around a conversation. Boards are made of **blocks**.
- The boards: the Almanac (everything you have made, in one table, addressed
  by number), the Collection, the Library, the Docket, Reflection, Settings,
  and every room.
- **The bar** is one field read three ways (search, `>` command, `p>`
  prompt). It is the actor on every board, and the only place a prompt is
  typed.
- **The Lab** is the arrangement where rooms are built, by command.
- **The welcome page** teaches all of this on first run.

Rooms (mode files rendered by `<RoomShell>`, with their own themes) stay.

Working files in `docs/spec/`: `refactor-plan.md` (the plan), `conflicts.md`
(rulings), `inventory.md` (what exists), `plan-brief.md` (the analysis),
`research/` (code audits), `privacy-copy-draft.md` (the privacy wording, not
yet applied). `change-plan.md` is the September plan, kept for the record.
`docs/hosting.md` records the domain, DNS, site and mail.

`refactor/` holds the previous refactor (V2 Phase 1). It explains how the
current code got here. It is not a source of requirements, and documents it
cites that are missing from the repo are gone.

## Hard constraints (do not relax without scope review)

- Pure client-side. No backend, no servers, no accounts.
- Strict CSP. Scripts from self only. Connections only to self, the model
  providers (Anthropic, Mistral, Ollama on localhost by exact port) and the
  named source hosts (Wikipedia, Hacker News via Algolia, OpenAlex), each
  listed in `netlify.toml` when it ships. Providers that take a key are
  reached only from the key vault (below), never from the page. A new host
  is added only with its provider or source. No third-party scripts,
  analytics or tracking.
- The key vault (`keys.parliament.ltd`; `docs/spec/research/vault-design.md`;
  C170, C264 (e), C267) alone holds API keys, at its own address, loaded by
  the page in one frame. Four narrow exceptions, each approved:
  1. The page may frame that one origin and nothing else; the vault may be
     framed only by the page.
  2. It is one more host, Parliament's own.
  3. Prompts and replies cross between the page and its vault frame over one
     private `MessageChannel`, never `BroadcastChannel`, and never an API
     key, except the one-time move of keys the page kept before the vault
     (C267 (d)) and the lock's non-extractable data key (C267 (e)).
  4. The gateway decides and logs on the page; the vault sends, refusing
     anything its own allow list (`vault/allow.js`) does not name. The vault
     is deployed on its own, rarely, from a tagged release.
- Outbound requests go through one gateway (built in plan stage 4). New code
  does not add direct calls to providers, and blocks do not import the
  providers, the key module or the database directly.
- API keys are encrypted at rest via Web Crypto (AES-GCM, non-extractable),
  live in their own store, and are never written to a backup, the command
  line, its history or a cross-window message. Each key is sent only to its
  own provider. Web Crypto only for anything cryptographic.
- Provider abstraction always. Model calls go through `src/providers/`,
  against the interface in `src/providers/base.js`.
- Cross-window messages (BroadcastChannel) carry ids and signals only, never
  content or keys.
- Text from outside (model output, source text, pasted text, restored and
  imported files) is data. It is never rendered as HTML and can never run a
  command.
- Other people's code does not run inside Parliament. Blocks arrive by pull
  request and ship in the catalogue after review.
- Stored data: never run a migration or schema change without showing it
  first. Every backup ever written must stay readable.
- Nothing is deleted without explicit approval, item by item. Prefer
  `src/deprecated/` or a flag.

## Conventions

- Visual values come from the newest mockup in `docs/spec/` that draws the
  thing. Gold appears on the `api:` ignition and the edge of the minimised bar,
  and nowhere else. Keyboard focus is ink. Light mode only for now.
- Copy: sentence case, no em dashes. Copy names no provider in a sentence;
  names come from the list of providers.
- Branch letters are lower case (`201a`).
- Small commits on the branch. Never push or deploy unless asked. Commits use
  the GitHub no-reply address, never a personal one.
- `npm run check` runs the tests, lint and build. Run it before every commit
  that touches code.

## Going (proposed, pending approval item by item)

Section 6 of `docs/spec/refactor-plan.md` lists every retirement proposal (R1
to R36). Nothing goes until Stefan approves that line.

## Archive pointers

- V1 spec: `git show f12a0be:CLAUDE.md`
- V2 Phase 1 CLAUDE.md: `git show ae464a3:CLAUDE.md`
- September CLAUDE.md (Almanac, Docket, Symposium): `git show bf7bf2e:CLAUDE.md`

These ids are the public history's. It was rewritten from a private archive
before going public on 28 October 2026 (C274 to C276), so ids quoted from
before then may be marked as in the private archive. The public history is
never rewritten again: no force pushes.

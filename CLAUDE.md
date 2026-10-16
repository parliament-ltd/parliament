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
  listed in `netlify.toml` when it ships. A new host is added only with its
  provider or source. No third-party scripts, analytics or tracking.
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

- V1 spec: `git show 12e142f:CLAUDE.md`
- V2 Phase 1 CLAUDE.md: `git show 5ac8a1d:CLAUDE.md`
- September CLAUDE.md (Almanac, Docket, Symposium): `git show d45ff07:CLAUDE.md`

Commit ids change when the history is rewritten before going public (plan
stage 15); update these then.

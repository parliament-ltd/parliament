# Parliament

A power-user chat interface for Anthropic's Claude that runs entirely in
your browser. Bring your own API key — there is no backend, no account,
and nothing leaves your machine except API calls to Anthropic.

## What this is

Apollo (codename **Parliament** in the codebase) is a single-page React
app that talks directly to the Anthropic API from the browser. Your
conversations, highlights, notes, and templates live in IndexedDB; your
API key is encrypted at rest with the Web Crypto API.

The UI is composed from reusable building blocks rather than fixed
screens. Every chat surface is a **room** built from four things:

- **Layouts** — slot grids that decide where things go on screen.
- **Schemes** — color and typography tokens.
- **Catalog components** — the actual building blocks (file shelf,
  chart canvas, document editor with tracked changes, comments,
  ripple analysis, branches sidebar, context meter, voice input,
  message list, and so on).
- **Templates** — pre-built rooms for common starting points (Writing
  Studio, Pocket Chat, Drafting Desk, Data Workspace).

You build a room three ways: pick a template, walk through the wizard,
or open the editor and drop components into slots yourself.

## Status

V2 Phase 1 is feature-complete. The four-layer composition model,
catalog, room editor, three builder paths, and Anthropic provider all
ship. Phase 2 covers a permission/consent flow for components that
write to shared stores, and multi-provider support (Ollama, OpenAI,
Mistral) behind the same interface.

The repo is private until the app reaches public-launch quality.

## Stack

- React 19 + Vite 7
- Tailwind 4
- Framer Motion
- IndexedDB via [`idb`](https://www.npmjs.com/package/idb)
- Web Crypto API (no third-party crypto libraries)
- PWA via [`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/)

## Common commands

```bash
npm install
npm run dev       # Dev server on :5173
npm run build     # Production build into dist/
npm run preview   # Serve the production build locally
npm run lint      # ESLint
```

## Where to read more

- [CLAUDE.md](CLAUDE.md) — orientation for contributors and AI assistants.
- [refactor/v2-phase1-audit.md](refactor/v2-phase1-audit.md) — the full V2
  architecture audit, decision record, and migration risks.
- [refactor/glossary.md](refactor/glossary.md) — what "room", "mode",
  "layout", "scheme", and "catalog component" each mean.
- [refactor/phase-1-pr-plan.md](refactor/phase-1-pr-plan.md) — the
  Phase 1 PR-by-PR scope.
- [refactor/v1-mockups-archive/](refactor/v1-mockups-archive/) —
  preserved V1 design mockups, kept for fidelity reference.

## License

See [LICENSE](LICENSE).

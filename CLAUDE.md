# CLAUDE.md — Project Apollo / Parliament

## Orientation

Project Apollo (codename **Parliament** in the V2 architecture) is a
power-user chat interface for AI models. It runs entirely client-side in
the browser — no backend, no accounts. Users bring their own Anthropic
API key; everything else lives in the browser's IndexedDB.

V1 organized the app around six bird-named "modes" (Albatross, Swift,
Pelican, Secretarybird, Kingfisher, Starling) and routed every screen
through a per-mode adapter. **Phase 1 of V2 replaced that with a four-
layer composition model: layouts, schemes, catalog components, and
rooms.** V1 adapter code is fully deleted; every chat surface now
renders through `<RoomShell>` against a mode file in IndexedDB.

This file is a redirect. The canonical V2 specification lives in
[refactor/](refactor/). Read those before making non-trivial changes.

## Where to look

| Topic | Doc |
|---|---|
| End-to-end audit + decision record | [refactor/v2-phase1-audit.md](refactor/v2-phase1-audit.md) |
| Vocabulary (rooms, modes, layouts, schemes, catalog) | [refactor/glossary.md](refactor/glossary.md) |
| IndexedDB schema, migration map, version-bump notes | [refactor/data-migration.md](refactor/data-migration.md) |
| Composer / Persister / Agent tier rules | [refactor/tier-classification.md](refactor/tier-classification.md) |
| PR-by-PR Phase 1 plan + scope | [refactor/phase-1-pr-plan.md](refactor/phase-1-pr-plan.md) |
| Manual verification checklist (one section per PR) | [refactor/phase-1-testing.md](refactor/phase-1-testing.md) |
| V1 visual mockups (preserved for fidelity reference) | [refactor/v1-mockups-archive/](refactor/v1-mockups-archive/) |

## Hard constraints (do not relax without scope review)

- **Pure client-side.** No backend, no servers, no accounts.
- **Strict CSP.** Scripts from self only; connections to self +
  `api.anthropic.com` only. No third-party origins.
- **API key encrypted at rest** via Web Crypto API (AES-GCM,
  non-extractable). No external crypto libraries.
- **Web Crypto API only** for everything cryptographic — `window.crypto.subtle`.
- **Provider abstraction always.** All API calls go through
  `src/providers/anthropic.js` against the interface in
  `src/providers/base.js`. Don't hardcode the Anthropic API anywhere
  else. Multi-provider support (Ollama / OpenAI / Mistral) is firmly
  Phase 2 and ships behind the same interface — see audit §3.10 / §3.20.
- **No third-party scripts, analytics, or tracking.** The app makes
  zero network requests except to the Anthropic API.

## What's gone (V1 concepts that do not map cleanly to V2)

- The `parliament-mode` localStorage key (V1's active-mode persistence).
- `ModeContext` / `ModeProvider` / `useMode()` (the V1 mode-driven
  routing context).
- Per-mode layout adapters in `src/adapters/` — every layout now lives
  in the catalog or the editor.
- `ModeSuggestion` and `modeSuggestions.js` — V1 affordance for
  suggesting an alternate mode for a task. No V2 equivalent.

If you find a reference to any of these in a doc or a comment, it's
stale. Either update it to V2 vocabulary or flag it.

## V1 archive pointer

The pre-V2 CLAUDE.md (the original 438-line V1 spec — chat selector
model, input area, branching flow, design system as it stood for V1)
was archived when PR-12 landed. To read it:

```bash
git show 12e142f:CLAUDE.md
```

(`12e142f` is the merge commit for PR-11b — the last commit on `main`
before this redirect replaced the V1 file.)

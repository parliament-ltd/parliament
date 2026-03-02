# Session Log — March 2, 2026

## Decisions Made

- **State management:** React Context only, split by concern (SettingsContext, ConversationContext, ChatContext). No Zustand.
- **Conversation titles:** Auto-generated via lightweight Claude summarization call after first exchange. Click-to-edit inline for renaming. No dedicated input box.
- **Auto-compression:** Branch-based. When context threshold is hit, system creates a new branch with a compressed summary. Original conversation preserved intact.
- **Message transfer (from original to compressed branch):** Two options — "Send to branch" (injects into context, uses tokens, Claude sees it) and "Pin for reference" (visual only, no tokens). Token count shown per message during selection.
- **Review modal:** Category toggles for Highlights, Notes, Favorites, and Pinned References. All on by default, user can deselect.
- **Export:** Two formats — encrypted .apb (passphrase-based) and plain-text JSON for portability.
- **Hosting:** Netlify.
- **Open source timing:** Repo stays private until functional.

## Files Created / Updated

### Project Documentation
- `README.md` — project overview, features, getting started, security summary
- `SECURITY.md` — full security model documentation
- `CLAUDE.md` — updated with all new decisions (compression, pins, review modal, contexts, export formats, hosting, open source timing)
- `ROADMAP.md` — updated Steps 4, 8, 9, 10, 12, 14 to reflect decisions

### Scaffolding (Steps 1–2)
- Vite 7 + React project initialized
- Dependencies installed: framer-motion, react-router-dom, lucide-react, idb, tailwindcss, @tailwindcss/vite
- Tailwind and Vite configured
- Routing shell: `/` (SelectorView), `/chat/:id` (ChatView), `/settings` (SettingsView)
- Folder structure: components, views, lib, providers, stores, assets
- Cleaned up default Vite files

### Data Layer (Step 4 — Complete)
- `src/lib/db.js` — Full IndexedDB implementation with all CRUD operations for conversations, messages, highlights, notes, favorites, pins, and settings. Includes exportAllData, importData, and clearAllData.

### Crypto Module (Step 5 — Complete)
- `src/lib/crypto.js` — API key encryption/decryption (AES-GCM, non-extractable key), three storage modes (persistent, session, memory), passphrase-based export encryption (PBKDF2 + AES-GCM) for .apb files.

### Token Utilities
- `src/lib/tokens.js` — Model info, cost estimation, context usage percentage, health status calculation.

### Provider Abstraction (Step 6 — Partial)
- `src/providers/base.js` — Interface definition (validateKey, sendMessage, getModels, countTokens)
- `src/providers/anthropic.js` — Model data defined, method signatures with TODOs for API implementation
- `src/providers/index.js` — Provider registry with getProvider and listProviders

### State Management (Step 13 — Partial)
- `src/stores/SettingsContext.jsx` — Settings state with defaults, updateSetting method, IndexedDB persistence (TODO)
- `src/stores/ConversationContext.jsx` — Conversation list state, create/delete methods (TODO)
- `src/stores/ChatContext.jsx` — Message state, streaming state, send/stop methods (TODO)
- `src/App.jsx` — All three providers wired in

### Shared UI Components (9 components)
- `src/components/Button.jsx` — Variants: default, primary, danger, ghost. Sizes: sm, md, lg. Icon support.
- `src/components/Card.jsx` — Standard and danger variants, optional hover animation.
- `src/components/Input.jsx` — Label, error state, secret/password toggle with eye icon.
- `src/components/Modal.jsx` — Animated overlay with header, body, footer slots.
- `src/components/Toggle.jsx` — Animated switch with label and description.
- `src/components/RadioGroup.jsx` — Animated radio options with icon and description support.
- `src/components/SegmentedControl.jsx` — Tab-style selector.
- `src/components/IconButton.jsx` — Icon-only button with active state. Sizes: sm, md, lg.
- `src/components/SectionLabel.jsx` — Uppercase label for settings sections.
- `src/components/index.js` — Barrel export for all components.

### Settings View (Step 3 — Partial)
- `src/views/SettingsView.jsx` — Full implementation with all 7 sections:
  - API Configuration (key input, validation, storage mode)
  - Model Preferences (model cards with pricing)
  - Usage & Spending (stats, budget slider, spending limit callout)
  - Context & Defaults (summary depth, threshold slider, auto-compress mode)
  - Data & Backups (export/import with modals, delete with confirmation)
  - Appearance (theme toggle, text size with preview)
  - About & Security (version info, privacy explanation)

## Known Issues / Future Fixes
- Hover animations on RadioGroup cards feel jittery — reduce scale or add delay
- Dark theme selector present but not yet implemented (shows "coming soon" note)
- Settings TODOs: wire validateKey to real provider, wire export/import to crypto module, wire clearAllData

## Commit History
```
caa3fd7 added index to components
5e57e6d more UI components
2e4e033 added UI components
8122777 updated crypto.js
0079db7 edited db.js
cb8026e updated index html title
1b80713 deleted default vite files and updated main.jsx
6911955 added settings view
cce36f9 added chat view
ee787bb added selector view
3d8cf95 updated routing shell
e8cb8cb configured tailwind and vite
7772785 Create .gitignore
135f50f Update CLAUDE.md
876ba00 Update ROADMAP.md
7b3e2a1 Create ROADMAP.md
2203a37 Create CLAUDE.md
c69ff25 Create settings.jsx
b390ad1 Create chat-selector.jsx
```

## Next Steps
- Implement Anthropic provider API calls (validateKey, sendMessage, countTokens)
- Build SelectorView with real components
- Build ChatView with message list and input
- Wire settings context to IndexedDB persistence
- Tune hover animations to reduce jitter

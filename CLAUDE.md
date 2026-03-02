# CLAUDE.md — Project Apollo

## What is this?

Project Apollo is a power-user chat interface for AI models, starting with Claude (Anthropic). It runs entirely client-side in the browser — no backend, no accounts, no servers. Users bring their own API key, and all data stays in their browser's IndexedDB.

## Architecture

- **Pure client-side web app** — React + Vite, hosted as static files
- **No backend** — API calls go directly from the browser to Anthropic's API
- **IndexedDB** for all persistent storage (conversations, messages, highlights, notes, settings)
- **Web Crypto API** for encrypting the API key at rest (AES-GCM with non-extractable keys)
- **Provider abstraction** — Claude is the only provider in V1, but the API layer is structured so other providers (Mistral, OpenAI) can be added later without refactoring

## Tech Stack

- React 18+ with Vite
- Tailwind CSS
- Framer Motion (spring animations)
- React Router v6
- Lucide React (icons)
- `idb` library (IndexedDB wrapper)
- Web Crypto API (native — no crypto libraries)

## Design System

This app uses a light theme with minimal accent color. Blue (`#4A7AE5`) is used sparingly for active states and interactive elements. The overall aesthetic is clean, white, with subtle borders.

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| `bg-primary` | `#FFFFFF` | Page background, cards |
| `text-primary` | `#1E2532` | Headings, body text |
| `text-secondary` | `#6B7C93` | Labels, metadata |
| `text-muted` | `#4A5568` | Descriptions |
| `accent-blue` | `#4A7AE5` | Active states, links, validation |
| `accent-purple` | `#7C6CD4` | Branch indicators |
| `success` | `#22C55E` | Valid, complete |
| `warning` | `#E5A620` | Caution, amber alerts |
| `error` | `#EF4444` | Invalid, danger zone |
| `border` | `#EBEBEB` | Cards, inputs |
| `border-subtle` | `#F0F0F0` | Sidebar dividers |
| `hover-bg` | `#EEEEEE` | Button hover |
| `row-hover` | `#FAFAFA` | Table row hover |
| `placeholder` | `#D5D5D5` | Input placeholders |

### Animation Springs
```javascript
const SPRING_SNAPPY = { type: 'spring', stiffness: 500, damping: 30 };
const SPRING_SMOOTH = { type: 'spring', stiffness: 300, damping: 28 };
const SPRING_GENTLE = { type: 'spring', stiffness: 200, damping: 24 };
```

Use `SPRING_SMOOTH` as the default. `SPRING_SNAPPY` for toggles and small elements. `SPRING_GENTLE` for page transitions and message cards.

### Component Patterns
- **Cards:** `className="px-5 py-4 rounded-xl border border-[#EBEBEB] bg-white"`
- **Inputs:** `className="bg-white rounded-lg px-4 py-2.5 text-sm text-[#1E2532] outline-none border border-[#EBEBEB] focus:border-[#4A7AE5] transition-colors placeholder:text-[#D5D5D5]"`
- **Buttons (default):** `className="px-4 py-2.5 rounded-lg text-xs font-semibold border border-[#EBEBEB] bg-white text-[#1E2532]"` with `whileHover={{ scale: 1.03, borderColor: '#4A7AE5' }}` and `whileTap={{ scale: 0.97 }}`
- **Section labels:** `className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider"`
- **Modals:** white bg, `border-[#EBEBEB] rounded-xl shadow-2xl shadow-black/10`, backdrop `rgba(0,0,0,0.2)`

## Folder Structure

```
src/
  components/       # Shared UI components
    MessageCard.jsx
    Sidebar.jsx
    ContextMeter.jsx
    Modal.jsx
    SettingsCard.jsx
    ...
  views/            # Route-level pages
    ChatView.jsx
    SelectorView.jsx
    SettingsView.jsx
  lib/              # Utilities
    db.js           # IndexedDB CRUD operations
    crypto.js       # Web Crypto API key encryption
    tokens.js       # Token counting utilities
  providers/        # API provider abstraction
    base.js         # Interface definition
    anthropic.js    # Claude implementation
    index.js        # Provider registry
  stores/           # State management (React context)
    SettingsContext.jsx
    ConversationContext.jsx
  assets/           # Static assets
```

## Key Decisions

- **No external crypto libraries** — use `window.crypto.subtle` (Web Crypto API) exclusively
- **API key encrypted at rest** — AES-GCM with non-extractable CryptoKey stored in IndexedDB
- **Conversations stored unencrypted** in IndexedDB — protected by CSP and origin isolation
- **Exported backups are encrypted** — user sets a passphrase, key derived via PBKDF2, encrypted with AES-GCM, saved as `.apb` files
- **Provider abstraction from day one** — even though V1 is Claude-only, all API calls go through `/providers/anthropic.js` implementing the interface in `/providers/base.js`
- **No third-party analytics, tracking, or ads** — the app makes zero network requests except to the Anthropic API
- **CSP header** restricts scripts to same-origin only, connections to self + `api.anthropic.com`

## Security Model

1. API key encrypted at rest via Web Crypto API (AES-GCM, non-extractable key)
2. Strict Content Security Policy — no third-party scripts
3. HTTPS only (enforced by hosting + HSTS header)
4. All data stored in browser's IndexedDB (origin-locked)
5. Exported backups encrypted with user passphrase (PBKDF2 + AES-GCM)
6. Users guided to set Anthropic spending limits

## Common Commands

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run preview   # Preview production build
npm run lint      # Run ESLint
```

## Reference Mockups

The UI was designed in standalone `.jsx` mockup files before development began. When implementing features, reference these for visual accuracy:

- `chat-interface-final.jsx` — Chat conversation view
- `chat-selector.jsx` — Conversation list
- `settings.jsx` — Settings page with all sections

## What NOT to Do

- Don't add a backend or server component
- Don't use localStorage for sensitive data (API key goes in IndexedDB, encrypted)
- Don't add third-party scripts or analytics
- Don't hardcode the Anthropic API — always go through the provider abstraction
- Don't use external crypto libraries — Web Crypto API only
- Don't use `Inter`, `Roboto`, or other generic fonts — system sans-serif
- Don't use purple gradients or generic AI aesthetics
- Don't add emojis to the UI

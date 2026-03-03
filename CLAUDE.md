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
  stores/           # State management (React Context, split by concern)
    SettingsContext.jsx
    ConversationContext.jsx
    ChatContext.jsx      # Active conversation streaming state
  assets/           # Static assets
```

## Key Decisions

- **No external crypto libraries** — use `window.crypto.subtle` (Web Crypto API) exclusively
- **API key encrypted at rest** — AES-GCM with non-extractable CryptoKey stored in IndexedDB
- **Conversations stored unencrypted** in IndexedDB — protected by CSP and origin isolation
- **Exported backups: two formats** — encrypted `.apb` files (passphrase → PBKDF2 → AES-GCM) for secure backups, and plain-text JSON export for portability (users can feed this into other tools, Claude, etc.)
- **Provider abstraction from day one** — even though V1 is Claude-only, all API calls go through `/providers/anthropic.js` implementing the interface in `/providers/base.js`
- **No third-party analytics, tracking, or ads** — the app makes zero network requests except to the Anthropic API
- **CSP header** restricts scripts to same-origin only, connections to self + `api.anthropic.com`
- **State management: React Context only** — no Zustand or other libraries. Split contexts by concern (`SettingsContext`, `ConversationContext`, `ChatContext` for streaming state). Components subscribe only to what they need, keeping re-renders scoped
- **Conversation titles: auto-generated** — lightweight summarization call to Claude after the first user→assistant exchange. No dedicated title input box. Users can click-to-edit titles inline later
- **Hosting: Netlify** — simpler CSP header configuration via `netlify.toml` or `_headers` file. Auto-deploy from `main` branch
- **Open source timing** — repo stays private until the app is functional and ready for a strong first impression

## Auto-Compression via Branching

When the context window reaches the configured threshold, the system handles compression by branching — not by modifying messages in place.

**Flow:**
1. Context meter crosses threshold → prompt the user (or auto-trigger based on settings)
2. System creates a new branch from the current conversation
3. The new branch starts with a compressed summary of the conversation so far
4. The user continues in the new branch with a clean context window
5. The original conversation is preserved intact as a full archive

**Message Transfer — Two Options:**
When viewing the original branch, the user can select specific messages to bring into the new branch:
- **"Send to branch"** — injects the message content into the active branch's context. Claude sees it on the next API call. Uses tokens. Show a token count per message during selection (e.g., "~340 tokens") so users can be intentional about context space
- **"Pin for reference"** — displays the message as a collapsible quote block in the UI. Visual only, does not use tokens, Claude does not see it. Useful for keeping wording or details handy without consuming context

### Compression at Branch Time

Compression is not limited to threshold-triggered events. When a user clicks "Branch from here" on any message, the branch creation panel offers two modes:

- **Full History:** copies all messages up to the fork point into the new branch. Context usage stays the same.
- **Compressed Summary:** generates a Claude summary of the conversation so far. The new branch starts with just the summary, giving a clean context window.

The panel includes:
- An inline context meter showing projected context usage for the selected mode
- For Compressed Summary: a savings display (e.g. 62% to 8% context, frees up 54%) and a collapsible summary preview with token count before committing
- The context meter animates to reflect the new percentage when the branch is created
- "(saves context)" appears as a green parenthetical next to the Compressed Summary title

Panel design follows the modal pattern: white bg, border #EBEBEB rounded-xl shadow-2xl shadow-black/10, backdrop rgba(0,0,0,0.2). Branch icon uses accent-purple #7C6CD4. Primary CTA uses the gradient from #4A7AE5 to #7C6CD4. Radio-style selection with filled circle on active.

### Summary Pre-Generation Timing

The compressed summary is not pre-generated when the panel opens. Instead:
1. Savings percentage and context projection display immediately when Compressed Summary is selected (calculated locally from token counts — no API call)
2. The actual summary text generates only when the user clicks "Preview summary" for the first time
3. The result is cached in component state for the rest of the panel session (switching modes and back reuses the cache)
4. Closing and reopening the panel clears the cache (conversation may have changed since)
5. "Create Branch" is enabled without requiring a preview — users can commit without reading the summary

## Stream Failure Recovery (Ghost Text)

When a streaming response fails mid-output (no `stop_reason: "end_turn"` received), the system preserves the partial response and gives the user a clear path to resume.

**Behavior:**
1. Save the partial message to IndexedDB with an `incomplete: true` flag
2. Render the entire partial message at 50-60% opacity to signal provisional state without hiding useful content
3. At the break point, show a thin dashed border with a slow pulsing dot and "Response interrupted" label
4. Display a compact pill-style "Continue" button at the break point (accent blue #4A7AE5 on hover)
5. On click: send the conversation back to the API including the partial response, with a trailing instruction to continue from where it left off
6. As the continuation streams in, progressively fade the ghost text back to full opacity. The user sees the message heal in real time
7. If the continuation also fails, return to ghost state with the same recovery option

**Design rationale:** The entire message is faded (not just the tail) because Claude may have been building toward a conclusion that reframes earlier content. Treating it all as provisional is more honest. Ghost text was chosen over a progress stepper because Claude output structure is unpredictable, and a stepper would require forced structured output. The continue action is explicit rather than automatic to respect the user API budget and maintain transparency. Automatic retry/stitching is deferred to V2+ as an opt-in setting.

### Continue Instruction Phrasing

When the user clicks Continue, the API call appends the partial response as an assistant message followed by a user message with a continuation instruction:

```
[...prior messages, { role: "assistant", content: partialResponse }, { role: "user", content: continueInstruction }]
```

Starting phrasing (lives as a constant in the provider abstraction):

> "Your previous response was interrupted. The partial response above is what was delivered. Continue exactly from where you left off — do not repeat, summarize, or restart any content that already appears above. Maintain the same tone, structure, and formatting."

This should be tested against different interruption types (mid-sentence, mid-list, mid-code-block) during implementation.

### Incremental Streaming Persistence

During streaming, the assistant message is persisted incrementally to protect against tab/browser crashes:

- Every ~3 seconds (or ~100 tokens), update the message record in IndexedDB with content so far, marked `incomplete: true`
- On stream completion, final write flips to `incomplete: false`
- Uses a throttled fire-and-forget pattern — writes happen in the background without blocking stream rendering
- A crash during streaming becomes indistinguishable from a network failure: on reopen, the user sees ghost text with a Continue button

## API Key Validation and Error Handling

### Key Validation (Settings Page)

The "Validate" button fires a lightweight API call to `/v1/messages` with a minimal prompt. The response determines the feedback:

| HTTP Status | keyStatus | Message | Color |
|------------|-----------|---------|-------|
| 200 | `valid` | "API key is valid — connected to Anthropic" | Success green #22C55E |
| 401 | `invalid` | "This API key is not valid. Please check your key and try again." | Error red #EF4444 |
| 403 / billing | `billing_error` | "This API key was recognized but your account may have insufficient credits or a billing issue. Please check your Anthropic dashboard." | Warning amber #E5A620 |

On invalid/error states, the input border also turns red (`border-[#EF4444]`). Both border and message reset when the user starts typing (onChange resets keyStatus to null).

Note: Anthropic API keys do not expire automatically. Do not use the word "expired" in any user-facing copy. Keys become invalid when manually revoked or when the account has billing issues.

### Mid-Conversation Key Failure

When a send fails with a 401 or billing error during an active conversation:

- Show a persistent banner above the input area (not a modal)
- Primary text: "Your API key is no longer working. Your conversation is safe — update your key in Settings to continue."
- Secondary text: "You can export your chat history from Settings → Data & Backups."
- Banner persists until key is updated or manually dismissed
- All conversation data remains in IndexedDB and in React state — nothing is lost

### Rate Limit Handling

When a send returns 429 (Too Many Requests):
- Show a brief inline message below the input: "Rate limit reached. Please wait a moment before sending."
- Message auto-clears when the next send succeeds
- No countdown timer, no proactive rate limit tracking

## Send Button Behavior

### Streaming State

The send button transforms based on the `isStreaming` flag in `ChatContext`:

- **Idle:** "Send" button with standard styling. Enabled when textarea has non-whitespace content
- **Streaming:** Button transforms to a Stop button (square stop icon, same dimensions, subtle red tint on border). Click aborts the in-flight stream
- **Transition:** SPRING_SNAPPY animation between states

The textarea remains editable during streaming. The user can pre-compose their next message. Hitting Enter while streaming triggers stop, not send.

### Guards

- 500ms debounce on the send handler (catches double-clicks and keyboard repeat)
- Empty/whitespace-only input silently ignored (no error message, no feedback)
- No message queuing, no semantic caching, no content filtering, no redundancy detection

### Token Count Indicator

Display the estimated token cost of the current input next to the send button. Uses the provider's `countTokens()` method or a client-side approximation. If the input would consume >25% of remaining context window, the indicator shifts to warning amber (#E5A620). This is informational only — never blocks sending.

## Browser Storage Management

### Storage Monitoring

The app monitors browser storage via `navigator.storage.estimate()`:
- Checked on app startup and after every IndexedDB write
- Results stored in React context for component access
- Warning threshold: 80% of quota. Critical threshold: 95%

### User-Facing Indicators

**Settings → Data & Backups:**
- Storage bar showing used vs. quota (e.g., "47 MB of ~1.2 GB used") with a thin progress bar
- Conversation count and total message count
- Always visible — this is the user's storage dashboard

**Chat selector (80%+ usage):**
- Subtle amber banner at top of conversation list
- Text: "Your browser storage is getting full. Consider exporting a backup or cleaning up old conversations."

**Chat view (95%+ usage):**
- Persistent red banner above the input area
- Text with Export and Manage Chats action buttons

### Making Cleanup Actionable

- Per-conversation size indicator in the chat selector (subtle secondary text, always present)
- Size as a sortable column in the conversation list (alongside last edited, created)
- Selected-items size total in the bulk action bar: "3 selected — 12.7 MB"

### Write Failure Handling

On `QuotaExceededError`:
- Message remains visible in React state but shows inline error: "This message couldn't be saved — storage is full."
- Trigger a modal with export option and storage stats
- No read-only mode — app stays functional in memory, persistence failures surfaced individually

## Startup Integrity Check

On app load, run a lightweight scan to detect and resolve inconsistencies from crashes:

1. **Orphaned conversations** (zero messages): silently deleted
2. **Incomplete messages** (`incomplete: true`): rendered in ghost text state with Continue/dismiss options
3. **Multi-store atomicity**: branch creation and other multi-store operations wrapped in single IndexedDB transactions to prevent partial writes

No "crash detected" modal or notification. The app simply looks correct on reopen.

## Review Modal

The review modal synthesizes a conversation using Claude. It includes category toggles so the user controls what feeds into the review prompt:
- **Highlights** — on by default
- **Notes** — on by default
- **Favorites** — on by default
- **Pinned references** — on by default

Each toggle can be turned off to exclude that category from the review synthesis. This keeps reviews focused and avoids overwhelming Claude with everything when only certain annotations are relevant.

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
- `branch-panel-v3.jsx` — Branch creation panel with Full History / Compressed Summary modes, inline context meter, and savings animation

## What NOT to Do

- Don't add a backend or server component
- Don't use localStorage for sensitive data (API key goes in IndexedDB, encrypted)
- Don't add third-party scripts or analytics
- Don't hardcode the Anthropic API — always go through the provider abstraction
- Don't use external crypto libraries — Web Crypto API only
- Don't use `Inter`, `Roboto`, or other generic fonts — system sans-serif
- Don't use purple gradients or generic AI aesthetics
- Don't add emojis to the UI

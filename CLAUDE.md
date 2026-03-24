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
- `react-markdown` + `remark-gfm` (Markdown rendering in message cards)
- Web Crypto API (native — no crypto libraries)

## Design System

This app uses a light theme inspired by a warm neutral palette with a Dusty Gold accent. The overall aesthetic is warm white with subtle warm-tinted borders — not cold blue/grey.

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| `bg-primary` | `#FFFFFF` | Page background, cards |
| `text-primary` | `#191919` | Headings, body text |
| `text-secondary` | `#787774` | Labels, metadata, section headers |
| `text-muted` | `#9B9A97` | Placeholders, de-emphasized |
| `accent-gold` | `#B8A070` | Focus borders, hover text, links, interactive icons |
| `dusty-gold` | `#C4A94D` | Branch animations, shimmer effects, special highlights |
| `success` | `#0F7B6C` | Valid, complete (dark teal) |
| `warning` | `#D9730D` | Caution, amber alerts (warm orange) |
| `error` | `#E03E3E` | Invalid, danger zone |
| `border` | `#E9E9E7` | Cards, inputs (warm off-white) |
| `border-subtle` | `#F1F1EF` | Sidebar dividers, progress tracks |
| `hover-bg` | `#FAFAFA` | Row/button hover |
| `code-bg` | `#F7F6F3` | Code block backgrounds |

### Animation Springs
```javascript
const SPRING_SNAPPY = { type: 'spring', stiffness: 500, damping: 30 };
const SPRING_SMOOTH = { type: 'spring', stiffness: 300, damping: 28 };
const SPRING_GENTLE = { type: 'spring', stiffness: 200, damping: 24 };
```

Use `SPRING_SMOOTH` as the default. `SPRING_SNAPPY` for toggles and small elements. `SPRING_GENTLE` for page transitions and message cards.

### Component Patterns
- **Cards:** `className="px-5 py-4 rounded-xl border border-[#E9E9E7] bg-white"`
- **Inputs:** `className="bg-white rounded-lg px-4 py-3 text-sm text-[#191919] resize-none outline-none border border-[#E9E9E7] focus:border-[#B8A070] transition-colors placeholder:text-[#9B9A97]"`
- **Buttons (default):** `className="px-4 py-2.5 rounded-lg text-sm font-medium border border-[#E9E9E7] bg-white text-[#191919]"` with `whileHover={{ scale: 1.03, borderColor: '#B8A070' }}` and `whileTap={{ scale: 0.97 }}`
- **Section labels:** `className="text-xs font-medium text-[#787774] uppercase tracking-wider"`
- **Modals:** white bg, `border-[#E9E9E7] rounded-xl shadow-2xl shadow-black/10`, backdrop `rgba(0,0,0,0.2)`

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
mockups/            # Reference UI mockups (standalone .jsx files, not part of app build)
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

Panel design follows the modal pattern: white bg, border #E9E9E7 rounded-xl shadow-2xl shadow-black/10, backdrop rgba(0,0,0,0.2). Branch icon uses dusty gold #C4A94D. Primary CTA uses a gold shimmer animation. Radio-style selection with filled circle on active.

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
4. Display a compact pill-style "Continue" button at the break point (accent gold #B8A070 on hover)
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
| 200 | `valid` | "API key is valid — connected to Anthropic" | Success teal #0F7B6C |
| 401 | `invalid` | "This API key is not valid. Please check your key and try again." | Error red #E03E3E |
| 403 / billing | `billing_error` | "This API key was recognized but your account may have insufficient credits or a billing issue. Please check your Anthropic dashboard." | Warning orange #D9730D |

On invalid/error states, the input border also turns red (`border-[#E03E3E]`). Both border and message reset when the user starts typing (onChange resets keyStatus to null).

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

## Input Area Layout

### Desktop / Albatross (inline layout)

`InputArea` renders as a horizontal row: `flex items-stretch gap-3`. The `+` button lives **inside** the textarea wrapper, absolutely positioned at `bottom-3 left-2.5`. The textarea gets `pl-11` so text clears the button. The Send button sits alongside the textarea as a separate flex sibling — `items-stretch` ensures both are always exactly the same height with no manual sizing needed. Do not add explicit `height` or `h-[]` to either element; let flex stretch do the work.

```
[ textarea (rows=3, py-3, pl-11)  ] [ Send ]
  ↖ + button (absolute bottom-3 left-2.5)
```

### Mobile / Swift (card layout)

Pass `cardLayout` prop to `InputArea`. Renders as a unified rounded card: textarea on top, `+` button bottom-left, arrow-up Send button bottom-right. `rows={2}`, no separate Send button alongside.

### + Menu

The `+` button opens a floating popup (anchored bottom-left, opens upward) containing:
- **Upload file** — triggers the hidden file input; shows a checkmark when a file is attached
- **Divider** then each available tool (web search, calculate, create chart) — toggleable with a checkmark when active
- A blue dot indicator appears on the `+` button itself when anything is active

Tool metadata lives in `TOOL_META` in `InputArea.jsx`. Add new tools there to have them appear automatically.

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

Display the estimated token cost of the current input next to the send button. Uses the provider's `countTokens()` method or a client-side approximation. If the input would consume >25% of remaining context window, the indicator shifts to warning orange (#D9730D). This is informational only — never blocks sending.

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

- Selected-items size total in the bulk action bar: "3 selected — 12.7 MB"
- Per-conversation size visible in Settings → Data & Backups storage section
- Note: the Size column was replaced by a Topics column in the V6 chat selector redesign. Size information is still accessible via the bulk action bar selection total and the settings storage dashboard

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

## Chat Selector Design (V6)

The chat selector is a table-based conversation list that doubles as a knowledge management surface. Reference mockup: `chat-selector-v6.jsx`.

### Global View Toggle

A segmented control in the page header switches what the second line of every row displays: **Summary** (default) | **Notes** | **Highlights** | **Branches**. Changing the global view clears any per-row overrides.

### Row Structure

Every row shows two lines: the conversation title on top, and the active view's content below. In Summary mode, this is a truncated one-line AI-generated summary in light grey (`#9CA7B8`). In other modes, the content swaps accordingly. Rows with no content for the active view are de-emphasized to 45% opacity.

### Interactive Count Badges

Small pill badges appear next to the title showing counts for branches (on parents), notes, and highlights. Clicking a badge overrides that row's view independently of the global toggle. Clicking it again snaps back to the global view. Badges use the same visual pattern as the existing branch badge: `text-[10px] px-1.5 py-0.5 rounded-full font-semibold`. Active badges fill with their color (blue for notes, amber for highlights, purple for branches).

### Flat Branch Model

All conversations — parent or branch — live at the same level in the table. Branches are not visually nested or subordinate. A branch is a conversation with a `parentId` and `familyId`. Related conversations share a family color used in the Branches view as a left bar indicator.

**Additional conversation fields (set via `updateConversation()` after creation):**
- `aiSummary` — auto-generated one-sentence summary, displayed in Summary view
- `familyId` — shared ID across a parent and all its branches (used for family color assignment)
- `parentTitle` — denormalized parent title for display in Branches view
- `tags` — array of 1–3 lowercase strings, auto-generated from conversation content

In the Branches global view, branch rows show `↳ branched from [Parent Title]` with a colored family bar. Parent rows list their children. Standalone conversations are de-emphasized. In all other views (Summary, Notes, Highlights), every conversation looks identical — no "from" subtitles, no hierarchy.

### Notes

Notes can be created from the conversation UI (anchored to a specific message, shown as `(Message 14)`) or from the chat selector table (general notes, no label). Notes are editable and deletable from the table. The "+ Add a note" button is always visible in Notes view but rendered at 45% opacity, transitioning to full on hover.

### Highlights

Read-only in the chat selector. Created by selecting text in the conversation UI. Displayed with a colored left bar: taller and fully opaque for multi-line highlights, shorter and partially transparent for single-line. Copy button on hover.

### Tags/Topics Column

Replaces the Size column. Tags are auto-generated from conversation content. Displayed as stacked colored pills, vertically centered. Non-sortable in V1.

### AI Summaries

Auto-generated after the first user→assistant exchange. Displayed as the default inline content under each title. Regenerable via bulk action bar (select chats → Regenerate summaries icon).

### Bulk Actions

Available when one or more rows are selected via checkboxes: **Pin/Unpin** (smart toggle — detects current state), **Regenerate summaries**, **Delete**. Selection shows count and total size.

### Click Targets

- **Title text**: opens the conversation
- **Count badges**: toggles inline view for that row
- **"+ Add a note" button**: opens inline note editor
- **Checkbox**: toggles selection
- The full row is not a single click target — interactions are zone-based to prevent accidental navigation

### Metadata

Edited and Created columns use lighter text (`#C0C8D4`). Table header labels also use `#C0C8D4`. Footer shows conversation count and total storage size only.

### Favorites Sidebar

Remains as a collapsible right sidebar (300px). Favorites are cross-cutting reference content (snippets from any conversation), not per-conversation metadata, so they don't fit the global view toggle pattern. Collapsible to reclaim horizontal space.

## Collab Modal — Parrot Personas

Parrot Personas are user-created system prompt presets stored in IndexedDB via `getSetting`/`setSetting` with key `parrot-personas`. Each persona has `{ id, title, instruction }`.

### CRUD
- **Create** — title + instruction inputs at the top of the Personas tab; saved on "Save persona"
- **Edit** — pencil icon appears on hover next to the trash icon. Clicking it switches that persona's card into an inline edit form (title input + instruction textarea). "Save" commits, "Cancel" discards. Uses `editingPersonaId` state to track which card is in edit mode.
- **Delete** — trash icon (always visible on hover)
- **Activate** — clicking the card body toggles it as the active preset

Do not add a separate edit page or modal — keep the inline edit pattern within the card.

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
- `chat-selector-v6.jsx` — **Current** conversation list design (flat branch model, global view toggle, inline summaries/notes/highlights/branches, interactive count badges)
- `chat-selector.jsx` / `chat-selector-v2.jsx` — **Superseded** conversation list designs (nested branch model). Keep for reference but V6 is the target
- `settings.jsx` — Settings page with all sections
- `branch-panel-v3.jsx` — Branch creation panel with Full History / Compressed Summary modes, inline context meter, and savings animation
- `pelican-mode.jsx` — **Pelican mode** — data analysis workspace (three-panel: file shelf + data canvas + inspector/chat). Reference for color-updated implementation.

## What NOT to Do

- Don't add a backend or server component
- Don't use localStorage for sensitive data (API key goes in IndexedDB, encrypted)
- Don't add third-party scripts or analytics
- Don't hardcode the Anthropic API — always go through the provider abstraction
- Don't use external crypto libraries — Web Crypto API only
- Don't use cold blue (`#4A7AE5`) as a primary accent — the design system uses warm gold (`#B8A070`) and Dusty Gold (`#C4A94D`)
- Use `Inter Variable` / `Inter` (set globally in `index.css`) — do not override font-family inline
- Don't use purple gradients or generic AI aesthetics
- Don't add emojis to the UI
- Don't nest branches under parents in the chat selector — use the flat model with Branches view

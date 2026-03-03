# Project Apollo — Development Roadmap

A power-user chat interface for AI, starting with Claude. Client-side only, no backend, users bring their own API keys.

## Tech Stack

- **Framework:** React 18+ with Vite
- **Styling:** Tailwind CSS
- **Animation:** Framer Motion
- **Storage:** IndexedDB (via `idb` library)
- **Encryption:** Web Crypto API (native, no libraries)
- **Routing:** React Router v6
- **Icons:** Lucide React
- **Hosting:** GitHub Pages or Netlify

## Design System

- **Background:** `#FFFFFF` (white)
- **Text primary:** `#1E2532`
- **Text secondary:** `#6B7C93`
- **Text muted:** `#4A5568`
- **Accent blue:** `#4A7AE5` (used sparingly — active states, links, validation)
- **Accent purple:** `#7C6CD4` (branches)
- **Success green:** `#22C55E`
- **Warning amber:** `#E5A620`
- **Error red:** `#EF4444`
- **Borders:** `#EBEBEB` (cards, inputs), `#F0F0F0` (sidebar dividers, subtle)
- **Hover/active bg:** `#EEEEEE` (buttons), `#FAFAFA` (rows), `#F5F5F5` (badges)
- **Placeholder text:** `#D5D5D5`
- **Font:** System sans-serif
- **Border radius:** `rounded-lg` (8px) for cards/inputs, `rounded-xl` (12px) for modals/containers

### Animation Constants

```javascript
const SPRING_SNAPPY = { type: 'spring', stiffness: 500, damping: 30 };
const SPRING_SMOOTH = { type: 'spring', stiffness: 300, damping: 28 };
const SPRING_GENTLE = { type: 'spring', stiffness: 200, damping: 24 };
```

### UI Patterns

- Cards: white bg, `border border-[#EBEBEB]`, `px-5 py-4 rounded-xl`
- Inputs: `border border-[#EBEBEB] focus:border-[#4A7AE5]`, white bg
- Buttons: `border border-[#EBEBEB] bg-white text-[#1E2532]`, hover scales 1.03 with blue border
- Radio options: circle with inner dot animation, `border-[#4A7AE5] bg-[#4A7AE5]/5` when active
- Segmented controls: `bg-[#EEEEEE]` for active tab, `text-[#6B7C93]` for inactive
- Section labels: `text-xs font-semibold text-[#6B7C93] uppercase tracking-wider`
- Modals: white bg, `border-[#EBEBEB] rounded-xl`, backdrop `rgba(0,0,0,0.2)`

## Existing UI Mockups

Reference mockups are available as `.jsx` files. These contain the complete visual design but use hardcoded mock data. Each step should reference these for visual accuracy:

- **Chat interface:** `chat-interface-final.jsx` — Main conversation view with left sidebar (TOC, quick actions), chat area, right sidebar (highlights, branches, context meter). Includes ReviewModal and CollabModal.
- **Chat selector:** `chat-selector.jsx` — Table-based conversation list with search, sort, bulk actions, expandable branches.
- **Settings:** `settings.jsx` — Left nav with 7 sections: API Configuration, Model Preferences, Usage & Spending, Context & Defaults, Data & Backups, Appearance, About & Security. Includes encrypted export/import modals with passphrase flow.
- **Branch creation panel:** `branch-panel-v3.jsx` — Branch creation panel with Full History / Compressed Summary modes, inline context meter, and savings animation.

---

## Step 1: Scaffold the Project

**Goal:** A running Vite + React app with all dependencies installed and the project structure ready.

**Tasks:**
- Initialize with `npm create vite@latest project-apollo -- --template react`
- Install dependencies: `tailwindcss`, `framer-motion`, `react-router-dom`, `lucide-react`, `idb`
- Configure Tailwind CSS
- Create folder structure:
  ```
  src/
    components/       # Shared UI components (buttons, cards, modals, etc.)
    views/            # Route-level pages (ChatView, SelectorView, SettingsView)
    lib/              # Utilities (db.js, crypto.js, tokens.js)
    providers/        # API provider abstraction (base.js, anthropic.js)
    stores/           # State management (React context or zustand)
    assets/           # Static assets
  ```
- Set up ESLint with React config
- Create `README.md`, `LICENSE` (MIT), `SECURITY.md`
- Initialize git repo, make initial commit

**Done when:** `npm run dev` shows a blank page with no errors, folder structure exists.

---

## Step 2: Build the Routing Shell

**Goal:** Three routes with navigation between them.

**Tasks:**
- Set up React Router with routes:
  - `/` — Chat selector (list of conversations)
  - `/chat/:id` — Chat interface (conversation view)
  - `/settings` — Settings page
- Create minimal placeholder components for each route
- Add navigation: Settings gear icon in chat selector header, back arrow in settings, clicking a chat navigates to `/chat/:id`
- Ensure browser back/forward works correctly

**Done when:** You can navigate between all three views with URL updates.

---

## Step 3: Port the UI Mockups

**Goal:** The mockup visuals live inside the real app, rendered at the correct routes.

**Tasks:**
- Decompose `chat-interface-final.jsx` into smaller components:
  - `MessageCard`, `NavItem`, `ActionButton`, `IconButton`
  - `HighlightItem`, `BranchItem`, `MetricRow`
  - `ReviewModal`, `CollabModal`
  - `ContextMeter`, `Sidebar`, `ChatArea`
- Decompose `chat-selector.jsx` into: `ChatTableRow`, `BranchRow`, `Checkbox`, `InlineAction`
- Decompose `settings.jsx` into: `SettingsSection`, `SettingsCard`, `InfoTooltip`, `ToggleSwitch`, export/import modals
- Decompose `branch-panel-v3.jsx` into: `BranchCreationPanel`, `ContextProjection`, `SummaryPreview`
- Move shared components (buttons, inputs, modals) to `/components`
- Replace hardcoded mock data with props where possible (still using dummy data, but passed in rather than inline)
- Verify all animations work correctly in the real app context

**Done when:** All three views render identically to the standalone mockups, inside the routed app.

---

## Step 4: Build the IndexedDB Data Layer

**Goal:** A complete persistence layer that all features will use.

**Tasks:**
- Create `src/lib/db.js` using the `idb` library
- Define the database schema (version 1):
  - **conversations** store: `{ id, title, createdAt, updatedAt, pinned, model, parentId (for branches), storageBytes }`
  - **messages** store: `{ id, conversationId, role, content, createdAt, tokenCount, incomplete }`
  - **highlights** store: `{ id, conversationId, messageId, text, color }`
  - **notes** store: `{ id, conversationId, messageId, text, createdAt }`
  - **favorites** store: `{ id, conversationId, messageId }`
  - **pins** store: `{ id, targetConversationId, sourceConversationId, sourceMessageId, content, createdAt }` (pinned references from branch transfers — visual only, not sent to API)
  - **settings** store: `{ key, value }` (key-value pairs for all settings)
- Write CRUD functions for each store:
  - `createConversation()`, `getConversation()`, `listConversations()`, `updateConversation()`, `deleteConversation()`
  - `addMessage()`, `getMessages(conversationId)`, `updateMessage()`, `deleteMessage()`
  - Similar for highlights, notes, favorites, pins
  - `getSetting(key)`, `setSetting(key, value)`
- Write a `clearAllData()` function for the danger zone
- Write a `getStorageEstimate()` function wrapping `navigator.storage.estimate()`
- Write a `runIntegrityCheck()` function for startup (see Step 15)
- Add indexes: `conversationId` on messages/highlights/notes/favorites, `targetConversationId` on pins, `updatedAt` on conversations
- The `incomplete` field on messages defaults to `false`. Set to `true` during incremental streaming persistence and stream failures. Messages with `incomplete: true` render in ghost text style

**Done when:** You can import db.js and create/read/update/delete all data types from the browser console.

---

## Step 5: Build the API Key Encryption Module

**Goal:** API key is encrypted at rest in IndexedDB using Web Crypto API.

**Tasks:**
- Create `src/lib/crypto.js`
- Implement:
  - `generateEncryptionKey()` — creates a non-extractable AES-GCM 256-bit key via `crypto.subtle.generateKey`, stores it in IndexedDB
  - `encryptApiKey(plaintext)` — encrypts using AES-GCM with a fresh IV each time, returns `{ ciphertext, iv }`
  - `decryptApiKey(ciphertext, iv)` — decrypts and returns plaintext
  - `getOrCreateEncryptionKey()` — retrieves existing key from IndexedDB or generates a new one
- Wire into settings:
  - "Remember my key" mode: encrypt and store in IndexedDB
  - "Session only" mode: store in sessionStorage (unencrypted, auto-clears)
  - "Don't save" mode: hold in memory only (React state)
  - Validate button calls Anthropic's API to verify the key works
- Show validation status (valid/invalid/validating) with the existing UI feedback

**Done when:** API key round-trips through encryption correctly. Stored key is not readable in plain text in IndexedDB. Validation hits Anthropic's API.

---

## Step 6: Build the Provider Abstraction and Claude Adapter

**Goal:** A clean API layer that talks to Claude, structured so other providers can be added later.

**Tasks:**
- Create `src/providers/base.js` — defines the interface:
  ```javascript
  // Every provider must implement:
  // validateKey(apiKey) → { valid: boolean, error?: string }
  // sendMessage(apiKey, messages, model, onChunk) → full response
  // getModels() → [{ id, name, inputCost, outputCost, contextWindow }]
  // countTokens(apiKey, messages, model) → { inputTokens, outputTokens }
  ```
- Create `src/providers/anthropic.js` — implements the interface:
  - `validateKey`: call `/v1/messages` with a minimal prompt, check for 200. Differentiate error types:
    - 401 → invalid/revoked key
    - 403 / billing error → account issue (insufficient credits, payment failure)
    - 200 → valid
  - `sendMessage`: call `/v1/messages` with streaming enabled, call `onChunk` callback as tokens arrive
  - `getModels`: return hardcoded list of Haiku, Sonnet, Opus with costs and context windows
  - `countTokens`: call `/v1/messages/count_tokens` endpoint
- Define the continue instruction as a constant in the provider abstraction:
  > "Your previous response was interrupted. The partial response above is what was delivered. Continue exactly from where you left off — do not repeat, summarize, or restart any content that already appears above. Maintain the same tone, structure, and formatting."
- Create `src/providers/index.js` — exports a `getProvider(name)` function, defaults to Anthropic
- Handle errors gracefully: rate limits (429 → inline message), invalid key (401 → re-enter prompt), billing errors (403 → dashboard link), network failures, context length exceeded
- Handle CORS: Anthropic's API supports direct browser requests with the API key in the header
- Note: Anthropic API keys do not expire automatically. Do not use the word "expired" in user-facing copy

**Done when:** You can call `provider.sendMessage()` and get a streaming response from Claude in the browser. Validation differentiates invalid key vs billing issue.

---

## Step 7: Wire Up the Chat Interface to Real Data

**Goal:** The app sends real messages to Claude and displays streaming responses.

**Tasks:**
- Connect the text input and send button to `provider.sendMessage()`
- Stream response tokens into the message list in real time (append to assistant message as chunks arrive)
- **Incremental streaming persistence:** every ~3 seconds (or ~100 tokens), persist a snapshot of the assistant message to IndexedDB marked `incomplete: true`. On stream completion, final write flips to `incomplete: false`. Uses a throttled fire-and-forget pattern — writes in the background without blocking stream rendering
- Save each user message and completed assistant message to IndexedDB
- Load conversation history from IndexedDB when navigating to `/chat/:id`
- Show a typing/streaming indicator while the response is generating
- Handle the "stop generating" action
- **Send button behavior:**
  - Idle → "Send" button. Enabled when textarea has non-whitespace content
  - Streaming → transforms to Stop button (square icon, subtle red tint). SPRING_SNAPPY transition
  - Textarea remains editable during streaming (user can pre-compose). Enter while streaming triggers stop
  - 500ms debounce guard on send handler. Empty/whitespace input silently ignored
- **Token count indicator:** show estimated token cost of current input next to send button. Warning amber if >25% of remaining context. Informational only — never blocks
- Display token counts per message (from API response usage data)
- Wire the context meter to show real cumulative token usage vs. the model's context window
- **Mid-conversation key failure:** when send fails with 401 or billing error, show persistent banner above input: "Your API key is no longer working. Your conversation is safe — update your key in Settings to continue." Secondary line suggests exporting chat history
- **Rate limit handling:** on 429, show brief inline message below input that auto-clears on next successful send

**Done when:** You can have a real conversation with Claude, close the browser, reopen, and see the conversation preserved. Send button transforms during streaming. Key failures and rate limits show appropriate messages.

---

## Step 8: Wire Up the Chat Selector to Real Data

**Goal:** The conversation list shows real conversations and supports all management actions.

**Tasks:**
- Load conversations from IndexedDB on mount, sorted by `updatedAt` desc
- Make search filter across conversation titles
- Make column sorting work (last edited, created, size)
- "New Chat" creates a conversation in IndexedDB and navigates to `/chat/:id`
- Clicking a row navigates to that conversation
- Wire bulk actions: delete selected, pin/unpin
- **Per-conversation size indicator:** show approximate storage size (subtle secondary text) for each conversation row
- **Bulk action size total:** when selecting multiple conversations, show combined size: "3 selected — 12.7 MB"
- Show branch count badges from real data
- Expand/collapse to show real branches
- Auto-generate conversation titles: after the first user→assistant exchange, send a lightweight summarization call to Claude in the background to generate a short title. Display it automatically in the chat selector. Users can click-to-edit titles inline to rename
- **Storage warning banner:** when storage usage exceeds 80%, show a subtle amber banner at top of conversation list suggesting export or cleanup

**Done when:** Creating, finding, opening, and deleting conversations all work end-to-end. Per-conversation size is visible. Storage warning appears when appropriate.

---

## Step 9: Build the Context Health System

**Goal:** Real-time visibility into context window usage with branch-based compression when the threshold is hit.

**Tasks:**
- Track cumulative input + output tokens per conversation
- Wire the context meter (right sidebar) to show `tokensUsed / modelContextWindow`
- Color-code: green < 50%, amber < threshold (from settings), red above
- Show the warning threshold from settings (default 80%)
- Implement branch-based auto-compression:
  - When threshold is crossed, show a prompt (if setting is "Ask me first") or auto-trigger (if "Automatic")
  - **Compression creates a new branch**, not an in-place edit:
    1. Create a new branch from the current conversation
    2. Generate a compressed summary of the conversation via a Claude call
    3. The new branch starts with the summary as its foundation — clean context window
    4. The original conversation is preserved intact as a full archive
  - The user continues chatting in the new branch
  - **Branch creation uses a single IndexedDB transaction** spanning both the conversations and messages stores for atomicity
- Update token counts in real time as messages stream in
- **Message transfer from original branch — two options:**
  - "Send to branch" — injects the selected message into the active branch's context (uses tokens, Claude sees it). Show token count per message during selection (e.g., "~340 tokens")
  - "Pin for reference" — displays the message as a collapsible quote block in the UI. Visual only, no token cost, Claude does not see it
- Users can navigate back to the original branch at any time to find messages or transfer additional content
- **Stream failure recovery (ghost text):**
  - When a stream fails mid-response (no `stop_reason: "end_turn"`), save the partial message to IndexedDB marked as `incomplete`
  - Render the entire partial message at reduced opacity (~50-60%) to signal provisional state
  - Show a thin dashed border with a slow pulsing dot and "Response interrupted" label at the break point
  - Display a compact pill-style "Continue" button (accent blue on hover) at the break point
  - On continue: send the conversation back to the API including the partial response, with the continue instruction from the provider abstraction
  - As the continuation streams in, progressively fade the ghost text back to full opacity
  - If the continuation also fails, return to ghost state

**Done when:** The context meter reflects real usage. When the threshold is crossed, a new branch is created with a summary. The user can transfer or pin messages from the original branch into the new one. Stream failures show ghost text with a continue option.

---

## Step 10: Build Highlights, Notes, Favorites, and Pinned References

**Goal:** Message-level annotations that persist across sessions, plus pinned references from branch transfers.

**Tasks:**
- Highlights: select text in a message → color picker → save to IndexedDB with message ID and text range
- Notes: click note icon → expand note textarea → save to IndexedDB
- Favorites: click star → toggle in IndexedDB → show filled star
- **Pinned references:** display messages transferred via "Pin for reference" (from branch compression) as collapsible quote blocks. Stored in IndexedDB with source conversation ID and message ID. Visual only — not included in API calls
- Right sidebar "Highlights" section shows real highlights for current conversation, with occurrence counts and prev/next navigation
- Right sidebar "Favorites" section shows favorited messages
- Right sidebar "Pinned" section shows pinned reference blocks (collapsible)
- Search across highlights (for the review modal later)
- Delete highlights, notes, favorites, pinned references
- **Review modal category toggles:** the review modal includes toggles for each annotation type — Highlights, Notes, Favorites, Pinned References — all on by default. Users can turn off any category to exclude it from the review synthesis sent to Claude. This keeps reviews focused

**Done when:** You can highlight text, add notes, favorite messages, see pinned references from branch transfers, close the browser, reopen, and see them all preserved. The review modal respects the category toggles.

---

## Step 11: Build Conversation Branching

**Goal:** Fork conversations at any message to explore alternative paths, with the option to compress history at branch time.

**Tasks:**
- Data model: a branch is a new conversation with `parentId` pointing to the original, plus a `branchPoint` (message ID where it forked)
- "Branch from here" action on a message opens the **branch creation panel** (reference `branch-panel-v3.jsx`):
  - Two modes: **Full History** (copies all messages up to the fork point) or **Compressed Summary** (generates a Claude summary, branch starts with clean context)
  - Panel shows an inline context meter displaying the projected context usage for each mode
  - Compressed mode shows savings (e.g., "62% → ~8% context"), with a collapsible preview of the summary before committing
  - **Summary pre-generation timing:** savings percentage and context projection display immediately (calculated locally). The actual summary text generates only when the user clicks "Preview summary" for the first time. Result is cached in component state for the panel session. "Create Branch" is enabled without requiring a preview
  - Context meter animates to reflect the new percentage when the user selects a mode and creates the branch
  - **Branch creation uses a single IndexedDB transaction** spanning conversations and messages stores
- Left sidebar shows branches for the current conversation
- Chat selector shows branches nested under parent conversations (already designed in the UI)
- Switching between branches preserves scroll position in each
- Branch indicator on messages that have branches forking from them

**Done when:** You can branch a conversation with either full history or compressed summary, continue both paths independently, see the context savings reflected in the meter, and navigate between branches.

---

## Step 12: Build the Export/Import System

**Goal:** Two export formats — encrypted backups for security, plain JSON for portability.

**Tasks:**
- **Export modal with format toggle:**
  - **Encrypted (.apb):** passphrase → PBKDF2 (100,000 iterations, SHA-256) → AES-GCM. Package as `{ salt, iv, ciphertext, version: 1 }`. For secure backups
  - **Plain JSON (.json):** unencrypted JSON of all data. For portability — users can feed this into Claude, other tools, or scripts for analysis
- **Export flow (both formats):**
  1. Gather all data from IndexedDB (conversations, messages, highlights, notes, favorites, pinned references, settings)
  2. Serialize to JSON
  3. If encrypted: derive key, generate salt + IV, encrypt payload, trigger `.apb` download
  4. If plain: trigger `.json` download directly
- **Import flow:**
  1. Read file (detect format by extension or header)
  2. If `.apb`: prompt for passphrase, derive key, decrypt
  3. If `.json`: parse directly
  4. Merge into IndexedDB (skip duplicates by ID)
  5. Show success/failure with conversation count
- Wire both flows to the modals in the settings Data & Backups section
- Update "Last backup" timestamp in settings after successful export
- Show file size estimate in the export modal

**Done when:** You can export in both formats. Encrypted export round-trips correctly with the right passphrase and fails with the wrong one. Plain JSON export opens in any text editor and is valid JSON.

---

## Step 13: Build the Settings Persistence Layer

**Goal:** All settings are saved and applied throughout the app.

**Tasks:**
- Create a React context (`SettingsProvider`) that loads all settings from IndexedDB on app startup
- Wire each setting to its UI control in the settings page:
  - API key + storage mode → crypto module
  - Default model → provider calls
  - Budget alert threshold + enabled → usage tracking
  - Summary depth, context threshold, auto-compress → context health system
  - Theme (light/dark) → CSS class on root element
  - Text size (compact/default/large) → CSS variable
  - Backup reminder frequency → banner logic on chat selector
- Spending limit guidance callout: track dismissed/confirmed state
- Backup reminder logic: compare last backup timestamp against frequency setting, show banner on chat selector if overdue
- **Storage monitoring:** check `navigator.storage.estimate()` on startup and after writes. Store in context. Surface warnings at 80% (amber) and 95% (critical red) thresholds in chat selector and chat view respectively
- **Settings → Data & Backups storage section:** storage bar with used/quota, conversation count, message count

**Done when:** Changing any setting persists across sessions and affects the relevant feature. Storage usage is visible in settings.

---

## Step 14: Add CSP Header and Deploy

**Goal:** The app is live on the internet with proper security headers.

**Tasks:**
- Configure hosting (Netlify recommended for simpler header config):
  - `netlify.toml` or `_headers` file with:
    ```
    Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.anthropic.com; img-src 'self' data:; font-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'self'
    ```
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
- Set up auto-deploy from `main` branch
- Configure custom domain if desired
- Test that CSP doesn't block Framer Motion's runtime styles or Anthropic API calls
- Verify HTTPS is enforced

**Done when:** The app is accessible at a public URL with all security headers passing.

---

## Step 15: Polish, Test, and Release

**Goal:** A stable v0.1.0 that handles real usage gracefully.

**Tasks:**
- **Startup integrity check:** on app load, scan for orphaned conversations (zero messages) and unresolved `incomplete: true` messages. Orphaned conversations silently deleted. Incomplete messages rendered in ghost text state. No crash notification UI
- End-to-end testing of critical flows:
  - First-time setup: enter API key → validate → send first message
  - Long conversation: 20+ messages, context meter updates correctly
  - Export → clear all data → import with passphrase → everything restored
  - Branch creation and switching
  - Settings persist across sessions
- Edge case testing:
  - Network failure mid-stream → ghost text with continue option, partial message preserved via incremental persistence
  - Invalid API key → "This API key is not valid. Please check your key and try again." with red input border
  - Billing/account issue → amber warning directing to Anthropic dashboard
  - Mid-conversation key failure → persistent banner above input with Settings and export guidance
  - Rate limit (429) → brief inline message below input, auto-clears on success
  - Rapid-fire sends → send button disabled (transformed to Stop), 500ms debounce guard, empty input silently ignored
  - Very long messages → token count indicator next to send button, warning amber if >25% of remaining context
  - Empty states → designed placeholder with icon and call to action for each empty view (no conversations, no highlights, no notes, no favorites)
  - Browser storage full → warnings at 80%/95%, per-conversation size in selector, QuotaExceededError handled with modal and export option
  - Tab crash during streaming → on reopen, incomplete messages appear as ghost text with continue option (indistinguishable from network failure)
- Write the README with:
  - What it is, screenshot, key features
  - How to get an Anthropic API key
  - How to use (it's just a website)
  - How to self-host / run locally
  - Security model explanation
  - Contributing guidelines
- Tag `v0.1.0` and create a GitHub release

**Done when:** You'd feel comfortable sharing the link with someone and having them use it.

---

## Future (V2+)

- Dark theme
- Keyboard shortcuts
- Read-only share links
- Browser extension (Phase 2) with `chrome.storage.sync`
- Additional model providers (Mistral, OpenAI, etc.)
- Optional PIN/passphrase lock
- Docker self-host option (Phase 3)
- Collaboration mode presets (already in UI, needs backend logic)
- Review modal with AI-generated synthesis
- Automatic retry/stitching for interrupted streams (opt-in setting, default off)
- Key age tracking with rotation reminders (Anthropic recommends 60-90 day rotation)
- Multi-key support (when multi-provider lands)
- Message queuing during streaming (if user demand exists)
- Semantic caching for multi-model comparison workflows
- Message list virtualization (if performance issues arise with very long conversations)

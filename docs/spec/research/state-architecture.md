<!-- State, rendering and data access: audit
     Read-only audit by a research agent, 11 October 2026, of branch
     claude/almanac-docket-inventory at d570e5f. Filed as delivered, with paths
     made relative to the repo root. Facts first; the auditor's opinion is in
     its assessment section and carries no authority of its own. -->

# State, rendering and data-access architecture: audit (state-architecture)

**Baseline.** Branch `claude/almanac-docket-inventory`. I started at `d570e5f`; two docs-only commits landed while I worked (`0674e17`, `51136cd`). `git diff d570e5f HEAD -- src package.json vite.config.js eslint.config.js vitest.config.js index.html netlify.toml` is empty, so everything below holds for HEAD `51136cd`.

**Method.** Code reading, greps, one read-only ESLint run, inspection of the existing `dist/`. Nothing was edited, built, profiled or run in a browser. Re-render statements are derived from the code, not measured. `dist/` is gitignored and was built 3 June 2026; 21 `src` files have changed since, none adding a production dynamic import.

**Paths.** All paths are relative to `` (so `src/stores/ChatContext.jsx` is `src\stores\ChatContext.jsx`). Absolute paths of the key files are listed at the end.

---

## 1. Provider tree and context values

### Tree, outermost first
`src/main.jsx:27-33` and `src/App.jsx:39-109`:

```
StrictMode > UpgradeGate > App
 ErrorBoundary > MotionConfig(reducedMotion="user")
  PWAProvider > SettingsProvider > ConversationProvider > ChatProvider
   AnnotationsProvider > BranchPanelProvider > CollabModeProvider
    FileShelfProvider > DocumentProvider
     BrowserRouter > BackupProvider
      BranchShortcutHandler, BlueprintOverlay, DbStateNotice, Routes
```

- Every route element is wrapped in `<ErrorBoundary inline>`.
- One more context sits outside `src/stores/`: `ChatFrameContext` (`src/components/ChatFrameContext.jsx`), provided per chat by `ChatView.jsx:251,258` with a fresh `{ wrenchTarget }` object each render; one consumer (`NarrowChrome.jsx:29`).
- All providers sit above the router, so none unmounts on navigation.

### Dependencies between providers
- `ChatProvider` consumes `ConversationContext` (`ChatContext.jsx:19`).
- `AnnotationsProvider`, `CollabModeProvider`, `FileShelfProvider` and `DocumentProvider` each call `useChat()` (lines 59, 46, 56, 75 of their files).
- `DocumentProvider` writes conversations through `lib/db` directly (`DocumentContext.jsx:190, 526`), bypassing `ConversationContext`.

### Per context

Only `CollabModeContext` memoises its value. The other nine build a new object literal every render.

**ChatContext** (`src/stores/ChatContext.jsx`)
- Value, 12 fields (`:463-476`): `messages, isStreaming, streamingContent, tokenUsage, activeConversationId, persistError, clearPersistError, loadMessages, sendMessage, continueMessage, stopGenerating, clearMessages`.
- State: six `useState` (`:12-17`) and five refs (`:21-25`): `abortControllerRef, streamingMessageIdRef, persistIntervalRef, latestContentRef, messagesRef`.
- Triggers: `loadMessages`; `sendMessage` / `continueMessage` (several sets plus one per chunk); the 3 s persist interval on a quota error; `clearMessages`; and any `ConversationContext` change, because it consumes that context.
- `persistError` / `clearPersistError` have no consumer.

**ConversationContext** (`ConversationContext.jsx`)
- Value, 9 fields (`:107-117`): `conversations, activeConversationId, setActiveConversationId, loaded, loadConversations, createConversation, updateConversation, deleteConversation, deleteConversations`.
- State: `conversations` (the whole store in memory), a second `activeConversationId`, `loaded`.
- On mount (`:44-66`): `runIntegrityCheck()`, five flag-guarded migrations, then `listConversations()`.
- Triggers: create, update (every send writes `{model}`; three more writes for title, summary and tags; rename; pin), delete, `loadConversations`.
- Its `activeConversationId` / `setActiveConversationId` are used nowhere outside the file.

**SettingsContext** (`SettingsContext.jsx`)
- Value, 5 fields (`:84-90`): `settings` (13 keys, `:6-23`), `updateSetting` (plain function, re-created each render, `:78-81`), `loaded`, `storageUsage`, `refreshStorageEstimate`.
- Loads with 13 sequential `await getSetting(key)` (`:34-38`).
- Toggles `.dark` on `document.documentElement` (`:52-60`).
- Triggers: `updateSetting`; `refreshStorageEstimate` after every send (`input-render.jsx:272`).

**AnnotationsContext** (`AnnotationsContext.jsx`)
- Value, 14 fields (`:278-296`): `favorites` (Map), `notes` (Map), `highlights` (array), `showNotes` (Set), `activeConversationId`, `loaded`, `toggleFavorite, toggleNotePanel, saveNote, deleteNote, addHighlight, addHighlightFromSidebar, deleteHighlights, navigateHighlight`.
- State for one conversation, reloaded with three index reads when `useChat().activeConversationId` changes (`:86-108`).
- Re-renders on every ChatContext change.

**BranchPanelContext** (`BranchPanelContext.jsx`)
- Value, 4 fields (`:44-49`): `openForMessageId, isOpen, openBranchPanel, closeBranchPanel`.
- One piece of state. Consumes no other context, so it only re-renders on its own change.

**CollabModeContext** (`CollabModeContext.jsx`)
- Value, 6 fields, wrapped in `useMemo` (`:103-114`): `activePresets` (Set), `customInstruction, apply, clear, buildSystemPrompt, activeCount`.
- Resets when the active conversation changes (`:65-74`).

**FileShelfContext** (`FileShelfContext.jsx`)
- Value, 11 fields (`:181-193`): `files, contextFiles, activeFileId, setActiveFileId, uploading, uploadError, loaded, uploadFile, getParsedData, toggleContext, removeFile`.
- Holds a `parsedCache` ref of fully parsed rows per file (`:70`).
- Reloads per active conversation (`:78-105`).

**DocumentContext** (`DocumentContext.jsx`)
- Value, 50 fields (`:566-622`): 6 data (`paragraphs, submittedReplies, conversationTitle, branches, loaded, counts`), 26 UI state and setters, 18 mutators.
- On every active-conversation change it runs `getConversation + getSbrdDocument + getBranches` (`:140-144`).
- Auto-saves 1 s after any paragraph change (`:169-179`).

**PWAContext** (`PWAContext.jsx`)
- Value, 8 fields (`:125-139`): `isOnline, needsUpdate, applyUpdate, dismissUpdate, showInstallBanner, trackMessageSent, dismissInstallBanner, triggerInstallPrompt`.
- Only `isOnline` and `trackMessageSent` are consumed anywhere; the update and install banner state has no consumer.

**BackupContext** (`BackupContext.jsx`)
- Value, 6 fields (`:69-76`): `openBackup, closeBackup, modalOpen, armUndo, clearUndo, undoState`.
- `undoState.contents` holds a full in-memory copy of the previous data for 60 s.
- Registers a window keydown for Cmd/Ctrl+Shift+B (`:53-66`).

---

## 2. Streaming

### What happens per chunk
- `src/providers/anthropic.js:353-416` reads the SSE body. For each `content_block_delta` with a `text_delta` it calls `onChunk(event.delta.text)` synchronously (`:379-382`).
- The callback in `ChatContext.jsx:223-226` (and `:383-386` for continue) is:
  ```js
  (chunk) => {
    latestContentRef.current += chunk
    setStreamingContent(prev => prev + chunk)
  }
  ```
- Throttling: not found. There is no `requestAnimationFrame`, timer or transition around it. The only batching is React's own: all deltas parsed from one `reader.read()` result are set in one synchronous loop, so there is one render per network read that carries text.
- Persistence is throttled separately: `PERSIST_INTERVAL = 3000` (`:9`), `updateMessage(msgId, { content, incomplete: true })` (`:65-80`).
- During a stream the `messages` array does not change. The assistant placeholder keeps `content: ''` until the end (`:152-161, 291-297`).

### Is streaming text in the same context as the message list?
Yes. `messages` and `streamingContent` are two fields of the one ChatContext value (`:463-476`).

### What re-renders on each streaming update
1. `ChatProvider`, which produces a new value object, so all 17 `useChat()` call sites re-render.
2. `AnnotationsProvider`, `FileShelfProvider` and `DocumentProvider` re-render and each produce a new un-memoised value, so all their consumers re-render too (4, 9 and 3 call sites). `CollabModeProvider` re-renders, but its memoised value protects its 3 consumers.
3. `RoomShellChatHost` (`ChatView.jsx:201`) is a `useChat()` consumer. It re-renders and re-creates `<ChatDesktopChrome>` and `<RoomShell mode={mode} />`.
4. `RoomShell` is not memoised. It re-resolves the mode, rebuilds every `<RenderFn …/>` element (`RoomShell.jsx:242-249`) and re-renders the layout. Every block in the room therefore re-renders, whether or not it uses chat state.
5. `MessagesRender` re-creates `renderCard` (its deps include `streamingContent`, `messages-render.jsx:350-358`). `MessageList` maps every message (`MessageList.jsx:50`), so every `MessageCard` function runs.
6. The auto-scroll effect calls `scrollIntoView` on every update (`messages-render.jsx:262-264`).

Concrete neighbour cost in a Data Workspace room:
- `chart-canvas.jsx:24` and `table-canvas.jsx:24` pass `filters={[]}`, a fresh array each render.
- That invalidates `useMemo(..., [parsed, filters, activeFile])` in `ChartCanvas.jsx:44-95` and `TableCanvas.jsx:54-93`.
- So the chart re-aggregates the dataset and the table re-filters and re-sorts all rows on every streaming update.

### Consumer census for ChatContext

| Call site | Fields read |
|---|---|
| `views/ChatView.jsx:201` | loadMessages, clearMessages, activeConversationId |
| `stores/AnnotationsContext.jsx:59` | activeConversationId, messages |
| `stores/CollabModeContext.jsx:46` | activeConversationId |
| `stores/FileShelfContext.jsx:56` | activeConversationId |
| `stores/DocumentContext.jsx:75` | activeConversationId |
| `components/BranchShortcutHandler.jsx:32` | messages |
| `catalog/entries/messages-render.jsx:61` | messages, isStreaming, **streamingContent**, continueMessage, activeConversationId |
| `catalog/entries/input-render.jsx:60` | isStreaming, sendMessage, stopGenerating |
| `catalog/entries/branches-render.jsx:66` | messages, tokenUsage, activeConversationId |
| `catalog/entries/review-render.jsx:34` | messages, tokenUsage, activeConversationId |
| `catalog/entries/context-render.jsx:24` | messages (length), tokenUsage |
| `catalog/entries/highlights-render.jsx:30` | messages |
| `catalog/entries/notes-render.jsx:21` | messages |
| `catalog/entries/toc-render.jsx:27` | messages |
| `catalog/entries/file-shelf.jsx:31` | activeConversationId |
| `catalog/entries/summary-dashboard.jsx:18` | activeConversationId |
| `components/core/RippleAnalysis.jsx:49` | activeConversationId |

One of the 17 reads `streamingContent`; two read `isStreaming`.

### Memoisation that exists
- `React.memo`: not found anywhere in `src`.
- `useDeferredValue`, `startTransition`, `useTransition`: not found.
- `useSyncExternalStore`: one use, the network log (`components/NetworkActivityCard.jsx:22` over `lib/networkLog.js`).
- React Compiler: not installed (`vite.config.js:8` is a bare `react()`).
- Local `useMemo` / `useCallback` only:
  - `MessageCard.jsx:124-223` memoises the rendered markdown on `[id, displayContent, highlights, highlightTerms]`. Non-streaming cards therefore do not re-parse markdown, but their render functions still run, each with a `motion.div layout="position"` (`:232`).
  - The streaming card re-parses its whole accumulated text through `ReactMarkdown` on every update.
  - `MessageCard` receives 11 fresh inline closures per card (`messages-render.jsx:336-347`), so wrapping it in `memo` alone would not help.

### One conversation and one stream are assumed
- State is single-valued: one `messages` array, one `isStreaming` boolean, one `streamingContent` string, one `activeConversationId` (`:12-16`); one `abortControllerRef`, `streamingMessageIdRef`, `persistIntervalRef`, `latestContentRef` (`:21-24`).
- `sendMessage(apiKey, conversationId, …)` persists to `conversationId` but builds the API history from the single loaded list: `const currentMessages = messagesRef.current` (`:176`).
- A second concurrent call would overwrite the abort controller (`:166`), reset `latestContentRef.current = ''` (`:159`) and leak the first persist interval (`:66`). The only guard is in the UI: `if (isStreaming || !conversationId) return` (`input-render.jsx:190`). `handleContinue` has no such guard (`messages-render.jsx:266-278`).
- The streaming card is identified by a heuristic, not an id: `isStreaming && msg.role === 'assistant' && idx === visibleMessages.length - 1 && msg.content === ''` (`messages-render.jsx:310-314`).
- The target conversation comes from the URL: `const { id: conversationId } = useParams()` (`input-render.jsx:59`, `messages-render.jsx:60`).
- Four other providers key their single state on `useChat().activeConversationId`.
- The provider layer is not the blocker: `AnthropicProvider.sendMessage` keeps all state local to the call (`anthropic.js:279-423`), so concurrent calls are fine there.
- Other model calls already bypass ChatContext with throwaway controllers: `branches-render.jsx:150-156, 201-207`, `review-render.jsx:116-121`, `DocumentContext.jsx:443-451`, `SummaryDashboard.jsx:119`, `RippleScopeModal.jsx:101-103`.

---

## 3. Other contexts: consumer census

| Context | Call sites | Does one field change re-render all consumers? |
|---|---|---|
| Conversation | 11 | Yes. Also re-renders `ChatProvider`, which cascades to all 17 chat consumers. |
| Settings | 12 | Yes. `storageUsage` changes after every send, so all 12 re-render per send. |
| Annotations | 4 | Yes, and on every streaming update. |
| BranchPanel | 3 | Yes, but only on open or close. |
| CollabMode | 3 | Only when presets or instruction change (memoised). |
| FileShelf | 9 | Yes, and on every streaming update. |
| Document | 3 | Yes, and on every streaming update. Every keystroke in a paragraph, reply box or comment box also re-renders `DocumentCanvas`, `ClaudeComments` and `RippleAnalysis`. |
| PWA | 1 | Yes (single consumer). |
| Backup | 6 | Yes; rare changes. |

Call sites:
- **Conversation:** `ChatContext.jsx:19`, `SettingsView.jsx:96`, `SelectorLayout.jsx:848`, `chats-preview.jsx:87`, `branches-render.jsx:67`, `blueprint-render.jsx:69`, `favorites-preview.jsx:52`, `review-render.jsx:36`, `recent-activity-render.jsx:20`, `quick-stats-render.jsx:9`, `messages-render.jsx:69`.
- **Settings:** `SettingsView.jsx:95`, `SelectorLayout.jsx:849`, `branches-render.jsx:68`, `chats-preview.jsx:88`, `context-render.jsx:25`, `EditorRightRail.jsx:378`, `messages-render.jsx:62`, `input-render.jsx:61`, `review-render.jsx:37`, `FileShelf.jsx:210`, `ChartCanvas.jsx:25`, `SummaryDashboard.jsx:38`.
- **Annotations:** `messages-render.jsx:66`, `highlights-render.jsx:29`, `notes-render.jsx:20`, `review-render.jsx:35`.
- **BranchPanel:** `branches-render.jsx:69`, `messages-render.jsx:67`, `BranchShortcutHandler.jsx:33`.
- **CollabMode:** `collab-mode-render.jsx:26`, `input-render.jsx:63`, `messages-render.jsx:68`.
- **FileShelf:** entries `chart-canvas:20`, `file-shelf:32`, `table-canvas:18`, `summary-dashboard:17`; core `ChartCanvas:23`, `ColumnInspector:34`, `TableCanvas:18`, `SummaryDashboard:36`, `FileShelf:43`.
- **Document:** `ClaudeComments.jsx:74`, `DocumentCanvas.jsx:75`, `RippleAnalysis.jsx:48`.
- **PWA:** `input-render.jsx:62`.
- **Backup:** `BackupUndoToast:18`, `BackupStatusIndicator:24`, `BackupRestoreModal:88`, `BackupReminderBanner:16`, `SettingsView:719`, `HomepageTopBar:26`.

The in-memory conversation list drifts from IndexedDB, because several paths write through `lib/db` without telling the context:
- `addMessage` bumps `updatedAt` and `storageBytes` (`db.js:676-683`).
- `createBranch`.
- Direct `createConversation` calls in `HomepageView.jsx:67`, `blueprint-render.jsx:186`, `DocumentContext.jsx:526`, `buildWizard.js`.
- `SelectorLayout.jsx:851-855` compensates with `loadConversations()` on mount; its comment says so.

---

## 4. RoomShell and the per-room bus

### Mounting (`src/components/RoomShell.jsx`)
- Resolves `mode.layout.ref` in the layout registry (`:116`); sorts `mode.components` by `order` (`:138`).
- Resolves each `spec.ref` in the catalogue registry and skips unknown refs or undeclared slots (`:144-161`).
- Substitutes an empty-state template when a `softDependencies` entry is absent (`:219-237`).
- Otherwise pushes `<RenderFn key config hostAPI componentId />` into `slotContents[spec.slot]` (`:242-249`) and returns `<LayoutRender slotContents mode hostAPI />` (`:271-272`).
- Layouts drop the arrays into fixed markup (for example `three-panel.jsx:128-201`).
- During render it also writes into the bus object: `hostAPI._setMessageActions?.(messageActions)` (`:257`) and `_setInputActions` (`:261`).

### How blocks get data
- Props are only `{ config, hostAPI, componentId }`.
- Data comes from the app-level contexts (the file comment at `:18-35` makes this a rule), from `useParams()` in two entries, and from direct `lib/db` calls inside entries. `messages-render.jsx:46-54` imports seven db functions. `chats-preview`, `favorites-preview`, `library-preview` and `quick-stats-render` call `initDB()` and use the raw connection.

### The bus (`src/lib/hostAPI.js`)
- `createHostAPI()` (`:101-242`) returns a closure with `handlers: Map<string, Set<fn>>`.
- `subscribe` returns an unsubscribe function (`:113-130`).
- `publish` dispatches synchronously over a snapshot copy with a try/catch per handler (`:132-154`). There is no payload validation and no replay for late subscribers.
- It also carries four pull registries: message actions, input actions, armed tools, attachments (`:156-226`).
- Events in use: `voice-transcript`, `row-hover`, `file-context-changed`, `input-action:<id>`, `tool-armed-changed`, `message-sent`, `attachments-changed`, `attach:error`.
- `getMessageActions()` is read only by the dev demo (`RoomDemo.jsx:56`), not by `messages-render`.

### Could RoomShell render two rooms at once?
The shell and the bus can; the blocks cannot.
- The bus is instance-scoped: `useMemo(() => createHostAPI(), [mode?.id])` (`:104`).
- Module-level mutable state in `RoomShell.jsx` or `hostAPI.js`: not found.
- The registries (`catalog/index.js:53`, `catalog/layouts/index.js:16`) are filled at import and read-only afterwards.
- RoomShell is already rendered outside chat (`HomepageView.jsx:114`, `EditorPreviewSheet.jsx:69`, `RoomDemo.jsx:43`).

Two rooms would show the same conversation and collide, because:
- Blocks bind to the single app-level ChatContext and its four dependants.
- `input@1.0` sends to `useParams().id`.
- The room theme is set on `<html>` (`ChatView.jsx:220-233`).
- Scroll-to uses global ids: `document.getElementById('msg-…')` (`toc-render.jsx:58`, `notes-render.jsx:54`, `AnnotationsContext.jsx:262`).
- Narrow branches of three layouts are `h-[100dvh]` (`three-panel.jsx:87`, `canvas-centric.jsx:90`, `document-centric.jsx:64`).
- Width decisions use the window, not the board: `useIsNarrow(768)` reads `window.innerWidth` (`lib/useViewportWidth.js:17-31`, 12 call sites). Container queries: not found.

---

## 5. Lazy loading as it exists

### File convention
- 27 manifests in `src/catalog/entries/`, with 16 `-render.jsx` and 9 `-preview.jsx` files.
- Six entries have both (`collab-mode`, `file-attach`, `input`, `review`, `voice-input`, `web-search`).
- Eight define render and preview inline in the manifest file (`chart-canvas`, `claude-comments`, `column-inspector`, `document-canvas`, `file-shelf`, `ripple-analysis`, `summary-dashboard`, `table-canvas`).
- Three use the preview file as the live render (`chats`, `favorites`, `library`).
- The split exists for Fast Refresh, not code-splitting: "so react-refresh's only-export-components rule stays happy" (`input-render.jsx:35-38`).
- Every import is static: manifest to render/preview, and `catalog/index.js:24-50` to all 27 manifests.

### Three things block lazy blocks today
- `src/lib/db.js:5` has `import { listEntries } from '../catalog'` (used to seed `libraryComponents`, `:187-208`). The data layer therefore statically imports every block's UI code, and the entries import `lib/db` back, forming a cycle.
- `catalog/validate.js:222` requires `typeof entry.render === 'function'`. `React.lazy()` and `React.memo()` return objects, so registering either throws at import (`catalog/index.js:57-61`).
- The registry is used for metadata by `RoomShell`, `EditorView`, `EditorHoldingTray`, `LibraryOverlay`, `library-preview`, `roomIncludes`, `stacked-sections` and `CatalogDebugView`, all through the same eager module.

### Every dynamic import in `src`
- `App.jsx:30` `lazy(() => import('./views/MigrationPreview'))`, DEV only.
- `App.jsx:34` `lazy(() => import('./views/CatalogDebugView'))`, DEV only.
- `lib/crypto.js:15` `(await import('idb')).openDB(...)`; `idb` is also imported statically (`db.js:1`), so no chunk results.
- Others: not found.

### `vite.config.js`
- `manualChunks` is an object with five vendor groups (`:91-105`): `vendor-react` (react, react-dom, react-router-dom), `vendor-motion`, `vendor-markdown`, `vendor-charts`, `vendor-idb`.
- Workbox excludes `**/{catalog,component,module}-*.js` from precache (`:31`) and caches those names at runtime (`:66-78`).
- Nothing produces those names: there is no `chunkFileNames` and no function-form `manualChunks`. A lazily imported `messages-render.jsx` would be emitted as `messages-render-[hash].js`, would not match the pattern, and would be precached at install.

### Current split (`dist/assets`, built 3 June)

| File | Raw bytes | Gzip bytes |
|---|---|---|
| `index-CydCqmic.js` | 1,297,425 | 385,344 |
| `vendor-charts-…js` | 416,601 | 119,968 |
| `vendor-markdown-…js` | 156,656 | 47,134 |
| `vendor-motion-…js` | 123,417 | 40,613 |
| `vendor-react-…js` | 48,242 | 17,098 |
| `vendor-idb-…js` | 3,395 | 1,407 |
| `workbox-window.prod.es5-…js` | 5,761 | 2,406 |
| `index-D3RYbrLi.css` | 136,890 | 25,429 |

- No `catalog-*`, `component-*` or `module-*` file exists.
- The index chunk statically imports all five vendor chunks and `dist/index.html` modulepreloads them. Every route, including `/settings`, downloads about 2.05 MB raw (about 611 KB gzip) of JS.
- The index chunk holds all app code: every view, all 27 blocks, the editor, the wizard, backup.
- It also holds libraries not listed in `manualChunks`:
  - `react-dom/client`: the strings `createRoot` and `hydrateRoot` occur in the index chunk and not in `vendor-react`. The object form lists `react-dom`, not `react-dom/client`.
  - SheetJS: `xlsx` occurs 10 times; it is imported only by `lib/fileParser.js`.
  - Presumably also papaparse, @dnd-kit and lucide-react, since none is in `manualChunks`; this was not checked in the minified output.
- The only lazy chunk is `workbox-window`.

---

## 6. Data access

### `src/lib/db.js` exports
Constants: `DB_NAME` (`:7`), `DB_VERSION = 5` (`:8`), `DB_STATE_EVENT` (`:23`).

| Export (line) | What it does | Stores | Full scan |
|---|---|---|---|
| `initDB` (31) | open; upgrade v1 to v5; seed on first call per page | all; seeding does 27 gets on libraryComponents and 6 on librarySchemes each boot | one-off cursors in v4/v5 upgrade |
| `createConversation` (475) | put | conversations | no |
| `getConversation` (500) | get | conversations | no |
| `listConversations` (505) | `getAll`, sort by `updatedAt` in JS | conversations | **yes** |
| `updateConversation` (511) | get + put; always bumps `updatedAt` | conversations | no |
| `deleteConversation` (520) | cascade in about 8 separate transactions | messages, highlights, notes, favorites, pins, files, file_data, sbrd_documents, conversations | no (index reads) |
| `createBranch` (569) | copy messages up to the branch point into a new conversation; backfill `familyId` | conversations, messages | no |
| `getBranches` (644) | `getAll` conversations, filter `parentId` | conversations | **yes** |
| `addMessage` (654) | put; then get + put conversation | messages, conversations | no |
| `getMessages` (688) | `getAllFromIndex('conversationId')`, sort in JS | messages | whole conversation |
| `updateMessage` (694) | get + put; on content change get + put conversation | messages, conversations | no |
| `deleteMessage` (718) | get + delete; get + put conversation | messages, conversations | no |
| `addHighlight` (735), `getHighlights` (749), `deleteHighlight` (754) | | highlights | no |
| `addNote` (761), `getNotes` (774), `updateNote` (779), `deleteNote` (788) | | notes | no |
| `addFavorite` (795), `getFavorites` (807), `deleteFavorite` (812) | | favorites | no |
| `addPin` (819), `getPins` (833), `deletePin` (838) | | pins | no |
| `getSetting` (845), `setSetting` (851) | | settings | no |
| `addFile` (863), `listFiles` (883), `getFileData` (889), `updateFile` (894), `deleteFile` (903) | | files, file_data | no |
| `getSbrdDocument` (920), `saveSbrdDocument` (932) | | sbrd_documents | no |
| `getStorageEstimate` (945) | `navigator.storage.estimate` | none | n/a |
| `runIntegrityCheck` (955) | `getAll` conversations; per conversation load all its messages; delete empty ones | conversations, messages, sbrd_documents | **yes, plus N+1, every boot** |
| `exportAllData` (976) | legacy export | 8 stores | **yes, 8 times** |
| `importData` (992) | validate; get + put per item | 8 stores | no |
| `clearAllData` (1022) | clear 10 stores (not modes or library) | | n/a |

Data access outside `db.js`:
- `lib/modes.js`, `lib/catalog.js`, `lib/backup.js`, `lib/migration.js`, `lib/crypto.js` (which also opens a second database, `parliament-keystore`).
- Raw `initDB()` use inside UI files: `chats-preview.jsx:114`, `favorites-preview.jsx:28`, `library-preview.jsx:137`, `quick-stats-render.jsx:16`, `EditorLeftRail.jsx:85`, `EditorLibraryMode.jsx:126`, `SelectorLayout.jsx:146, 886, 1124`, `MigrationPreview.jsx:28`.

### Indexes that exist (`db.js:36-136`)
- conversations: `updatedAt` (never queried).
- messages, highlights, notes, favorites, files: `conversationId`.
- pins: `targetConversationId`.
- modes: `scope`.
- libraryLayouts, libraryRooms: `status`. libraryComponents: `tier`. libraryResources: `status`, `format`.
- No index on settings, file_data, sbrd_documents, librarySchemes.
- Not found: any index on `parentId`, `room`, `familyId`, `pinned`, `createdAt` or tags; any multiEntry or compound index; any text index; any use of `openCursor` or `IDBKeyRange` at runtime.
- Stores for dockets and runs do not exist. They are planned for v6 (`lib/docketModel.js:10-22`, `lib/migrations/v6Plan.js`), which only tests and the dev-only `MigrationPreview` import.

### List screens

**`/chats` (`views/SelectorLayout.jsx`)**
- Takes the whole conversation list from context and reloads it on mount (`:851-855`).
- On every change of `conversations` it runs `getAll('notes')` and `getAll('highlights')` (`:882-927`), then `getAll('favorites')` followed by one awaited `db.get('messages', id)` per favourite (`:145-172, 941-953`).
- Search is an in-memory substring test on each keystroke over title, `aiSummary`, note text, tags and `parentTitle` (`:962-975`). Highlights and message bodies are not searched, although the placeholder says "Search chats, notes, highlights, tags..." (`:1303`).
- Renders every row (`sortedChats.map`, `:1396-1412`), each a `motion.div`.
- Each row computes `allChats.filter(c => c.parentId === chat.id)` (`:520`), which is quadratic in row count.

**Homepage Chats (`catalog/entries/chats-preview.jsx`)**
- Same pattern: `getAll` notes and highlights when `conversations.length` changes (`:110-138`).
- Search covers title, `aiSummary` and tags only (`:150`), with the same placeholder (`:268`).
- All rows rendered (`:283-294`).

Pagination or virtualisation: not found, and no virtualisation library is installed. The only limits are `.slice(0, 12)` in `SelectConversationModal.jsx:51-57`, 50 items in the table of contents, and `PAGE_SIZE = 100` with "Load more" for data-file rows in `TableCanvas.jsx:7`.

### N+1 patterns
- `runIntegrityCheck` on every boot (`db.js:957-968`).
- Favourites hydration, duplicated in `SelectorLayout.jsx:145-172` and `favorites-preview.jsx:27-49`.
- `deleteConversations` loops `await deleteConversation(id)` (`ConversationContext.jsx:98-101`).
- Bulk regenerate calls `getMessages` per selected chat (`SelectorLayout.jsx:1173-1176`, `chats-preview.jsx:189-191`).
- The 13 sequential settings reads.

---

## 7. Routing

### Routes (`App.jsx:64-95`)

| Path | View | Params and state read |
|---|---|---|
| `/` | `HomepageView` | none. Redirects to `/build` or `/settings` when there is no key. If `chosenHomeRoomId` is set it creates a new conversation and redirects to `/chat/:id` (`HomepageView.jsx:62-74`). |
| `/chats` | `SelectorView` then `SelectorLayout` | none |
| `/chat/:id` | `ChatView` | `useParams().id` (`:54`) |
| `/settings` | `SettingsView` | none |
| `/edit` | `EditorView scope="room" blank` | `location.state.seedMode / initialTray / returnToRoomId / fromChat`; `?tab=` |
| `/edit/:roomId` | `EditorView scope="room"` | `useParams().roomId` (`:115`); `?tab=`; `state.fromChat` |
| `/edit-home` | `EditorView scope="homepage"` | none |
| `/build` | `BuildView` | `?ignite=<roomId>` (`BuildView.jsx:64-69`) |
| `/dev/migration`, `/catalog` | lazy, DEV only | none |

- Catch-all route: not found. An unknown path renders nothing inside `Routes`.
- `/docket/:num`: not found.

### Other readers of the URL
- `useParams()` inside blocks: `messages-render.jsx:60` (unused, `void conversationId` at `:360`) and `input-render.jsx:59` (the send target).
- `blueprint-render.jsx:122-134` parses `location.pathname`.
- `BranchShortcutHandler.jsx:39` tests `pathname.startsWith('/chat/')`.
- `BlueprintOverlay.jsx:57-63` closes on pathname change.

### `location.state` and query params
- `{ fromChat: true }`: set at `ChatView.jsx:296` and `NarrowChrome.jsx:58`; read at `EditorView.jsx:657, 735`.
- `{ seedMode, returnToRoomId, initialTray }`: set at `EditorView.jsx:270-272`; read at `:123-124, 278`. `seedMode` is a whole mode object carried in history state.
- `?tab=` (`EditorLeftRail.jsx:60-80`), `?ignite=`, and `?upgrade-gate` in DEV (`UpgradeGate.jsx:25`).

### Entering and leaving a chat
- **Enter.** `ChatView` resolves conversation and mode (`:67-117`), then `RoomShellChatHost` calls `loadMessages(conversationId)` and renders nothing until it resolves (`:205-214, 235-237`). The room theme is set on `<html>` (`:220-233`).
- **Leave.** The effect cleanup calls only `clearMessages()` (`:210-213`) and removes `data-scheme`.
- **Leaving does not abort a stream.** `stopGenerating` is called from one place, the Stop control (`input-render.jsx:291`). The provider's abort-on-unmount (`ChatContext.jsx:34-45`) never runs because the provider never unmounts.
- A stream that outlives its screen has these effects:
  - `isStreaming` stays true globally, which blocks sending in any other chat.
  - `setTokenUsage` adds to whichever chat is loaded (`:300-303`).
  - `generateMetadataIfNeeded(conversationId, completedMessages…)` builds `completedMessages` from `messagesRef.current`, the other chat's messages, and writes the result to the original id (`:306-311`).
- **Switching chat A to B** passes through `activeConversationId = null`; the dependent providers are written to ignore that.
- Pending message deletes are cancelled, not executed, on unmount (`messages-render.jsx:106-108`).

---

## 8. Module-level singletons and globals

### Module-scope mutable state
- `let dbInstance` (`lib/db.js:18`).
- `let keyDB` (`lib/crypto.js:10`).
- `const state = { entries, listeners }` and `let installed` (`lib/networkLog.js:9-12, 55`). `installFetchLogger` replaces `window.fetch` (`:63`).
- `let _bpScrollLockCount`, `let _bpPrevOverflow` (`blueprint-render.jsx:680-681`), a ref-counted lock on `document.body.style.overflow`.
- The two `REGISTRY` maps.
- `const providers = { anthropic: new AnthropicProvider() }` (`providers/index.js:3`), stateless. `getProvider('anthropic')` is hard-coded at 15 call sites.
- Custom `window.<name> =` properties: not found.
- `localStorage` is only removed from (`main.jsx:21`, `migration.js`); `sessionStorage` only at `crypto.js:151`.

### Custom window events
- `parliament-db-state`: dispatched `db.js:27` (from `:145, 151`); heard at `DbStateNotice.jsx:17`.
- `homepage-mode-changed`: dispatched `catalog/layouts/stacked-sections.jsx:300`; heard at `HomepageView.jsx:97` and `blueprint-render.jsx:106`.
- `blueprint-rooms-changed`: dispatched `blueprint-render.jsx:224, 249`; heard at `blueprint-render.jsx:107`.
- `BroadcastChannel('parliament')` exists in `lib/bus.js` (signals `hello`, `bye`, `changed`, `stop`) but has no consumer outside its test.

### Global key listeners

| Where | Target | Keys | Checks event target? |
|---|---|---|---|
| `stores/BackupContext.jsx:53-66` | window | Cmd/Ctrl+Shift+B opens backup | no |
| `components/BranchShortcutHandler.jsx:36-61` | window | Cmd/Ctrl+Shift+B opens branch panel, on `/chat/` only | no (deliberate) |
| `components/BlueprintOverlay.jsx:29-49` | window | Cmd/Ctrl+. toggles; Escape closes | no |
| `views/EditorView.jsx:482-510` | window | Escape; Cmd/Ctrl+Z; Cmd/Ctrl+Shift+Z or Y | **yes** (input, textarea, contentEditable) |
| `components/BackupRestoreModal.jsx:101-107` | window | Escape | no |
| `catalog/entries/blueprint-render.jsx:711-715, 816-820` | window | Escape (two modals) | no |
| `components/SelectConversationModal.jsx:37-44` | window | Escape | no |
| `components/LibraryOverlay.jsx:182-187` | window | Escape | no |
| `components/layouts/NarrowDrawer.jsx:21-28` | window | Escape | no |
| `components/editor/EditorApplyRoomDialog.jsx:64-70` | window | Escape | no |
| `components/editor/EditorPreviewSheet.jsx:22-29` | window | Escape | no |
| `components/editor/EditorMigrationDialog.jsx:25-31` | window | Escape | no |
| `components/build/wizard/LayoutPreviewOverlay.jsx:15-20` | document | Escape | no |
| `components/core/DocumentCanvas.jsx:114-136` | document | Ctrl+Alt+M comments on the selection | no (needs a selection in a paragraph) |
| `components/core/DocumentCanvas.jsx:139-157` | canvas element, capture | Space, PageUp, PageDown | yes |

- There is no stack or priority among the Escape handlers; every mounted one fires.
- The first two rows bind the same combination. On a chat with messages both the backup modal and the branch panel open.

### Other document-level listeners
- `mousedown` for outside-click: `InputArea.jsx:84-93`, `DocumentCanvas.jsx:160-169`.
- `mouseup`: `DocumentCanvas.jsx:84-111`.
- `pointermove` / `pointerup`, plus `document.body.style.cursor` and `userSelect`: `EditorLibraryMode.jsx:189-197`.
- `resize`: `useViewportWidth.js:26`, `EditorLibraryMode.jsx:494`.

### Single-document assumptions
- `document.getElementById('msg-…')`: `toc-render.jsx:58`, `notes-render.jsx:54`, `AnnotationsContext.jsx:262`.
- `document.querySelector(…)`: `TourTooltip.jsx:30`, `DocumentCanvas.jsx:357`, `sbrd/DocumentParagraph.jsx:146, 167`.
- `window.getSelection()`, 12 uses: `MessageCard.jsx:79, 106`, `DocumentCanvas.jsx:87, 118, 363-364`, `sbrd/diff.js:60, 70-71`, `sbrd/DocumentParagraph.jsx:79, 141, 154`.
- `document.execCommand`: `messages-render.jsx:288`, `DocumentCanvas.jsx:151`, `DocumentParagraph.jsx:178`.
- `createPortal(…, document.body)`: `blueprint-render.jsx:393-396, 725-809, 823-865`.
- Elements appended to `document.body`: `file-attach-render.jsx:51-60` (hidden file input), `backup.js:273-278`, `review-render.jsx:174-179`.
- `document.documentElement` for theme: `SettingsContext.jsx:54`, `ChatView.jsx:224`, `SchemePicker.jsx:21`.
- `window.confirm` (3 uses), `navigator.clipboard.writeText` (5 uses), `window.innerWidth` / `innerHeight` (`useViewportWidth.js`, `TourTooltip.jsx:55-56`).
- `new ResizeObserver` from the opener's global: `EditorLibraryMode.jsx:487`.

---

## 9. Styling

### Setup
- Tailwind 4.2.1 through `@tailwindcss/vite` (`vite.config.js:3, 9`).
- `src/index.css:1` is `@import "tailwindcss";`.
- No `tailwind.config.*`, no PostCSS config.
- `@theme`, `@layer`, `@utility`, `@custom-variant`, `@source`: not found.
- Everything after line 1 is unlayered, so hand-written classes outrank Tailwind utilities on the same element.
- Tailwind's `dark:` variant is used 0 times.

### Size and sections of `src/index.css` (3,333 lines, 108,173 bytes; built CSS 136,890 bytes)

| Lines | Section |
|---|---|
| 6-81 | Tokens: `:root` (8-44), `.dark` (47-81) |
| 83-151 | High-contrast overrides for `:root` and `.dark` |
| 153-310 | Six schemes as `[data-scheme="…"]` and `[data-scheme="…"].dark` |
| 312-410 | High-contrast variants of five schemes |
| 412-478 | Dark-mode patches for hard-coded Tailwind classes, e.g. `.dark .text-\[#191919\] { … !important }` |
| 480-591 | Document editor (`.sbrd-*`) |
| 592-612 | Data workspace (`.plcn-*`) |
| 613-706 | Message markdown (`.parliament-md`) |
| 707-848 | Shimmer keyframes, wizard ignition (`.wiz-*`), reduced motion |
| 849-3058 | A block headed "Homepage v2" that in fact holds: section cards (854), chat input card and rail card (988), chat page background and room frame (1014), editor cards (1048), layout panel toggle (1105), editor grid, tooltip, tray and Library mode (1164-1683), blueprint (1684), chats list (1745), bulk toolbar (1896), library and cards (1984), layout silhouette (2213), library overlay (2304), blueprint modal (about 2540-2862), favourites (2863) |
| 3059-3139 | Reduced motion; iOS zoom fix; misc |
| 3140-3276 | Mobile overrides |
| 3277-3333 | Mobile settings |

### How scheme variables are scoped
- Parliament default is on `:root`; dark is a `.dark` class on `<html>`.
- Other schemes are an attribute selector that works on any element. `ChatView.jsx:220-233` puts it on `<html>`; `EditorCanvas.jsx:221` puts it on a wrapper div, so nested scoping already works for token-based styles.
- The dark variant needs both on the same element (`[data-scheme="x"].dark`).

### How separable are chrome and room styles today?
Not structurally.
- One token set (`--p-*`, `--bp-*`, `--token-data-series-*`) serves both, so a room scheme on `<html>` also re-tints the chat top bar and any modal opened over it.
- Class names do not mark the boundary: `.chat-row`, `.chat-table`, `.chat-title` are the homepage list, while `.chat-input-card`, `.chat-room-frame`, `.chat-page-bg` are the room.
- Global element rules are few: `.dark body, .dark #root` (413) and one touch media rule on `input, textarea, select`.

### Inline styles versus classes
- JSX has 2,286 `className=` and 563 `style={` across 74 of 163 files.
- Inline styles are heaviest in `MigrationPreview` (44), `sbrd/cards` (35), `sbrd/DocumentParagraph` (28), `LayoutSilhouette` (27), `DocumentCanvas` (23), `IgnitionStep` (22), `SelectorLayout` (20).
- The newest chrome is fully inline by design (`UpgradeGate.jsx:11-12`, `DbStateNotice.jsx`).

### Colour values that are not tokens
- 536 hard-coded hex arbitrary classes; the top three are `[#B8A070]` 126, `[#787774]` 63, `[#E9E9E7]` 59.
- 143 `bg-white`.
- 953 token-based arbitrary classes, for comparison.
- In `index.css`, 411 lines contain hex against 306 using `var(--p-`, with 71 `!important`.
- Rooms therefore follow a scheme only partly.

---

## 10. Tests and tooling

### Tests
- Vitest 3.2.7; `vitest.config.js` sets `environment: 'node'` and `include: ['src/**/*.test.js']`. Its comment says pure logic only, no browser, no React.
- Five files, 37 tests: `lib/addresses.test.js` (8), `lib/backupMigrations.test.js` (5), `lib/bus.test.js` (5), `lib/migrations/v6Plan.test.js` (13), `lib/restorePlan.test.js` (6). Fixture: `lib/__fixtures__/backup-v1.json`.
- I did not run them, because Vitest writes a cache.
- Component tests, jsdom, happy-dom, Testing Library, fake-indexeddb: not installed.
- `scripts/smoke-test-v4-migration.mjs` needs an ad-hoc `fake-indexeddb` install.

### ESLint
- Flat config: `js.configs.recommended`, `reactHooks.configs.flat.recommended` (plugin 7.0.1, which includes the compiler-derived rules), `reactRefresh.configs.vite`, and `no-unused-vars` with `varsIgnorePattern: '^[A-Z_]'`.
- `npx eslint src --format json`: 215 files linted, 76 with problems, **123 errors and 2 warnings**.

| Rule | Count |
|---|---|
| `no-unused-vars` | 81 |
| `react-refresh/only-export-components` | 29 |
| `react-hooks/set-state-in-effect` | 6 |
| `no-empty` | 3 |
| `react-hooks/immutability` | 2 |
| `react-hooks/refs` | 2 |
| `react-hooks/exhaustive-deps` (warning) | 2 |

- Of the unused-vars, 52 are `motion`, used as `<motion.div>`. This is a config artefact: the pattern exempts only capitalised names. 8 are `Icon` parameters; 11 sit in `providers/base.js` interface stubs.
- Hook findings:
  - `set-state-in-effect`: `TourTooltip.jsx:27`, `ChartCanvas.jsx:37`, `ColumnInspector.jsx:42`, `TableCanvas.jsx:46`, `CollabModeContext.jsx:71`, `PWAContext.jsx:62`.
  - `refs`: `IgnitionStep.jsx:323`, `useVoiceInput.js:23`.
  - `immutability`: `messages-render.jsx:191`, `ChartRenderer.jsx:155`.
  - `exhaustive-deps`: `messages-render.jsx:198`, `MessageCard.jsx:223`.
- `npm run lint` is `eslint .` and only `dist` is ignored. `.claude/worktrees/` is untracked, not gitignored, and holds 4,740 js/jsx files from old checkouts. I did not run the repo-wide command; it would traverse them.

### Type checking and CI
- No `tsconfig` or `jsconfig`, no TypeScript, no `.ts` files, no `@ts-check`, no PropTypes.
- `@types/react` and `@types/react-dom` are installed but nothing consumes them.
- JSDoc is partial: 61 files with blocks, 69 `@param`, 5 `@type`, 0 `@typedef`.
- CI: not found (no `.github/`, no hooks). `netlify.toml` builds with `npm run build` only.

---

## 11. Assessment (separate from the facts above)

### a. Smallest sound change for per-chunk re-renders and several streams

**Recommendation: an external store keyed by conversation id, read with `useSyncExternalStore`.**

Why splitting contexts is not enough:
- It would stop neighbours re-rendering for one conversation, but React 19 context still has no selectors. A keyed map in one context re-renders every consumer on any key's change.
- One provider per board would isolate streams, but would tie a stream's life to a component's.
- The spec puts execution outside surfaces (`CLAUDE.md:34-35`: the command line "is the actor on every surface; surfaces do not execute"). Run state therefore has to live where the command line, a docket block and a table row can all reach it.
- The repo already has the pattern in miniature (`lib/networkLog.js` with `NetworkActivityCard.jsx:22`), and a plain module fits the existing node-only test setup.

Shape:
- **New `src/stores/chatStore.js`, no React.**
  - `conversations: Map<id, { messages, tokenUsage }>`.
  - `streams: Map<id, { messageId, text, status, startedAt }>`, with each stream owning its own `AbortController` and persist timer.
  - Topic-keyed `subscribe` (`messages:<id>`, `stream:<id>`, `status:<id>`).
  - Commands `load / release / send / continue / stop`.
  - History built from the store by id, replacing `ChatContext.jsx:176`.
  - Text accumulates immediately but listeners are notified at most once per frame or about 40 ms.
- **Hooks:** `useMessages(id)`, `useStreamText(id)`, `useIsStreaming(id)`, `useTokenUsage(id)`. Snapshots must be cached references.
- **A tiny `ConversationScope` context** whose value is the id string, provided per board. It replaces `useParams()` in `input-render.jsx:59` and `messages-render.jsx:60`.

Files that change:
- `stores/ChatContext.jsx` becomes a facade for 11 of its 12 fields. It must not expose `streamingContent`, or every caller subscribes to it again.
- `catalog/entries/messages-render.jsx` and `components/core/MessageCard.jsx`: a small streaming leaf calls `useStreamText`; `memo` on the card; stable callbacks that take an id; the streaming message identified by `messageId`.
- `catalog/entries/input-render.jsx`: status selector and scope id.
- `views/ChatView.jsx`: provide the scope and stop consuming the whole context.
- The four dependent providers: read only the id and memoise their values.
- `components/BranchShortcutHandler.jsx`: read the last message inside the handler.
- `catalog/validate.js:222`: accept `memo` and `lazy` components.
- `providers/anthropic.js` needs no change.

If something smaller is wanted first (four files): move `streamingContent` out of the ChatContext value and `useMemo` the Chat, Annotations, FileShelf and Document values. That removes the cascade but does not give several streams.

Second-order gains once the store exists:
- Split streaming markdown into blocks and memoise all but the last.
- Scroll on a throttle.
- Fix `filters={[]}` in the two canvas entries.

**Timer.** A run's `startedAt` and status change rarely and belong in the store. The ticking belongs in a leaf that owns its own once-a-second state, as `BackupUndoToast.jsx:24-31` already does, so nothing above it re-renders.

### b. Keep, wrap or replace, and in what order

- **Keep, and only memoise the value:** `PWAContext`, `BackupContext`, `SettingsContext` (consider moving `storageUsage` out), `ChatFrameContext`.
- **Wrap now, replace later:** `ChatContext` (to the store), `ConversationContext` (to a records layer with change notification, which the table needs), `AnnotationsContext` (keyed by conversation, with per-message selectors).
- **Re-scope from app level to per board, mounted only when a block needs them:** `DocumentContext`, `FileShelfContext`, `CollabModeContext`, `BranchPanelContext`. This also removes work done for every chat regardless of room.

Order of least risk:
1. Fix the lint config (`motion` false positives) so the hook rules are readable; add a dev render counter to measure before and after.
2. Introduce `ConversationScope`. Plumbing only, no behaviour change.
3. Move stream state into the keyed store behind the `useChat()` facade. Decide explicitly whether streams continue when their screen closes.
4. Narrow and memoise the four dependent providers.
5. Move messages into the store; send by id.
6. Row-level subscriptions and `memo`.
7. Per-board provider scoping, and `data-scheme` on the room wrapper instead of `<html>` (pattern at `EditorCanvas.jsx:221`).
8. One write path that emits change signals (in-tab, plus `lib/bus.js` across tabs). Add indexes in the v6 migration, which must be shown first under the repo's stored-data rule.
9. Lazy blocks: remove `db.js:5`'s catalogue import, split manifest metadata from render, add a Suspense and error boundary per block, and add a `chunkFileNames` rule so the Workbox pattern matches.
10. Pop-out plumbing.

### c. What breaks when part of the tree renders into a pop-out window

React context and a module store both reach through portals, and React delegates events on the portal container. So state is not the problem; the DOM-global assumptions are. Everything in this list is reasoned from the code and from browser behaviour, not tested.

- **No styles.** The new document has no Tailwind, no `index.css`, no font faces. The opener's stylesheet nodes must be copied in (and mirrored in dev). `.dark` and `data-scheme` are set on the opener's `<html>` only.
- **Global key handlers.** All 14 window or document key listeners in section 8 listen on the opener. Escape and shortcuts will not fire when focus is in the pop-out.
- **Selection.** All 12 `window.getSelection()` calls read the opener's selection. The highlight popover and the whole document editor break. Use `el.ownerDocument`.
- **Lookups.** `document.getElementById('msg-…')` and the `querySelector` calls search the opener, so scroll-to and the tour fail.
- **Outside-click.** Listeners on the opener's `document` will not close menus in the pop-out.
- **Portals to `document.body`.** The three in `blueprint-render.jsx` land in the opener. The body scroll lock also locks the opener.
- **Width.** `useIsNarrow` measures the opener (12 call sites), while CSS media queries and `100dvh` follow the pop-out, so the two disagree.
- **Clipboard, confirm and file picker.** These run against the opener: `navigator.clipboard` will probably reject for lack of focus, `window.confirm` appears on the opener, and the hidden file input in the opener's body may be refused for lack of user activation there.
- **Focus.** There is no focus trap or focus restore anywhere (nine `aria-modal` dialogs). `element.focus()` does not raise the window.
- **Animation and timers.** framer-motion (57 files) and all timers run on the opener's frame loop and clock. When the opener tab is hidden its `requestAnimationFrame` stops and timers are throttled. Cards that mount at `opacity: 0` (`MessageCard.jsx:24-30, 226-234`) may stay invisible in the pop-out, and a timer driven from the opener would stall. This is the highest-risk item and should be prototyped first.
- **Observers.** `new ResizeObserver` built from the opener's global is tied to the opener's rendering.
- **StrictMode.** Effects run twice in dev, so opening a window from an effect needs a guard.

### d. What to restructure under current React 19 practice, and what to leave

Restructure:
- Un-memoised context values holding hot state (section 1). The React Compiler would cut collateral cost but not the granularity problem, and it skips components that break the rules the hooks plugin already reports (10 sites).
- Refs written during render (`messages-render.jsx:84`, `useVoiceInput.js:23`). React 19.2 has `useEffectEvent` for this.
- App-level providers that load and write per conversation regardless of which blocks are mounted.
- The data layer: the `db.js` and catalogue import cycle; raw `initDB()` in UI files; the boot-time integrity scan; `getBranches` full scan; the two duplicated favourites loaders.
- List screens: no deferral on search input, quadratic per-row work, an animated wrapper per row.
- Error and loading boundaries exist per route only; lazy blocks need one per block.
- Width by container, not window.

Leave alone:
- The per-room bus (instance-scoped and clean).
- RoomShell's resolve pipeline (memoise its result on `mode`).
- `EditorView`'s reducer and history.
- The pure `lib/` modules and their tests.
- `PWAContext`, `BackupContext`, `BranchPanelContext` as they are.
- StrictMode.
- The stateless provider class.

For the table: a few thousand rows of metadata fit in memory (the app already holds every conversation). The work is a single notifying write path, fixed-height windowed rows, and at larger scale a row store with indexes on type, time, number, room and tags (multiEntry) plus a term index for body search.

---

## Defects noticed in passing (from code reading, not reproduced)

1. **Shortcut clash.** Cmd/Ctrl+Shift+B is bound twice (`BackupContext.jsx:56`, `BranchShortcutHandler.jsx:46-48`).
2. **Continue shows no progress.** A resumed message has non-empty content, so the `msg.content === ''` test (`messages-render.jsx:314`) never selects it and the card shows the old text until the stream ends. The Continue button stays clickable with no guard.
3. **Stream survives navigation** with the side effects listed in section 7, including title, summary and tags generated from another chat's messages.
4. **A document row is written for every chat opened.** `DocumentProvider` seeds a paragraph when none exists (`DocumentContext.jsx:148-152`) and auto-saves 1 s later (`:169-179`), for any room.
5. **Empty conversations are deleted at every boot** (`db.js:959-968`). This includes one another tab has just created. A chat that has acquired a row under item 4 is exempt.
6. **Search placeholders promise more than is searched** (section 6).
7. **Inter is shipped but not applied.** `main.jsx:3` imports the font and seven woff2 files are precached, but no rule sets the family; the built `--font-sans` is the system stack.
8. **Tailwind may be scanning the old worktrees.** `.claude/worktrees/` is not gitignored, so its class names may be ending up in the CSS. Unverified.
9. **Voice input may be blocked in production.** `netlify.toml:45` sets `microphone=()`. This belongs to the security audit; verify there.

---

## Key files (absolute paths)

- `src\App.jsx`
- `src\main.jsx`
- `src\stores\ChatContext.jsx`
- `src\stores\ConversationContext.jsx`
- `src\stores\AnnotationsContext.jsx`
- `src\stores\DocumentContext.jsx`
- `src\stores\FileShelfContext.jsx`
- `src\stores\CollabModeContext.jsx`
- `src\stores\BranchPanelContext.jsx`
- `src\stores\SettingsContext.jsx`
- `src\stores\PWAContext.jsx`
- `src\stores\BackupContext.jsx`
- `src\views\ChatView.jsx`
- `src\views\SelectorLayout.jsx`
- `src\components\RoomShell.jsx`
- `src\components\BranchShortcutHandler.jsx`
- `src\components\core\MessageCard.jsx`
- `src\components\core\MessageList.jsx`
- `src\catalog\index.js`
- `src\catalog\validate.js`
- `src\catalog\entries\messages-render.jsx`
- `src\catalog\entries\input-render.jsx`
- `src\catalog\entries\chats-preview.jsx`
- `src\catalog\entries\chart-canvas.jsx`
- `src\catalog\entries\table-canvas.jsx`
- `src\catalog\entries\blueprint-render.jsx`
- `src\lib\hostAPI.js`
- `src\lib\db.js`
- `src\lib\bus.js`
- `src\lib\networkLog.js`
- `src\lib\useViewportWidth.js`
- `src\providers\anthropic.js`
- `src\index.css`
- `vite.config.js`
- `eslint.config.js`
- `vitest.config.js`
- `netlify.toml`
- `dist\assets` (stale build, 3 June 2026)

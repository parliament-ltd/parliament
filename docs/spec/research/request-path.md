# Request path, collaboration mode, review, first run, voice, settings: code audit

Read-only audit of branch `claude/almanac-docket-inventory` at `d570e5f`, run on
11 October 2026 by a research agent. `src/` had no uncommitted changes, so every
line number is the committed code. Paths are relative to the repo root. "Not
found" means all of `src/` was searched and nothing turned up.

Facts are in sections 1 to 7. Opinion is only in section 8.

## Corrections first: where the plan documents assume something the code does not do

1. **Parrots as the spec describes them do not exist.** `editing-in-place-spec.md:340` lists a default model, tool preferences, a selector in the input area, "My Parrots" in Settings, its own IndexedDB store and a `parrotId` on conversations. None of these is in the code. A persona is `{ id, title, instruction }`, all personas are one JSON string under the settings key `parrotPersonas`, and the only UI is inside `CollabModal`. `plan-brief.md` (R23, "the persona editor in `SettingsView.jsx`") names something that is not there: `SettingsView.jsx` has no match for "parrot" or "persona".
2. **Ticking a saved persona has never changed what is sent**, in V1 or now. Only the text in the custom-instruction box is sent. The modal's "Combined system prompt" preview shows the persona; the real prompt omits it (section 2b).
3. **Collab state is memory only.** It resets on conversation change and on reload, and nothing records on a reply which presets applied.
4. **The preset names match the spec only in words.** Code uses Title Case ("Challenge Artifacts"); two of five ids differ from the spec's commands (`alternatives` vs `collab:alts`, `uncertainty` vs `collab:uncertain`); and the existing "challenge" prompt asks the model to critique its own output, where the spec says "Question what it is given".
5. **One automatic spend exists:** three Haiku calls after the first exchange. Everything else is started by a click. "Automatic" compression spends nothing: it only opens the branch panel.
6. **Only web search can be armed.** `calculate` and `create_chart` are declared but nothing arms them, so the client tool loop is unreachable. `ToolToggles.jsx` (named in `plan-brief.md`) has no importer. `countTokens` has no caller.
7. **File shelf "in context" files never reach the model in chat**, despite the UI copy. "Auto-analyze", "Suggest charts" and "Export results" are buttons with no handler.
8. **Review differs from the "carried forward" table** (`editing-in-place-spec.md:330-339`): no branch chips, no pins toggle, no collaboration activity, the reflection text is discarded rather than becoming a note, "Save as Markdown" exports the chat rather than the review, and brief and detailed send the same content.
9. **`IgnitionStep` and `useShimmer` are two separate animations.** `useShimmer` is used only by Settings. Both use `#D4A843`, not the `#C4A94D` the bar document cites.

## 1. The request path

### 1a. What happens on Send

1. **Typing.** `InputRender` holds the text in local state (`src/catalog/entries/input-render.jsx:65`). Enter without Shift sends, or stops when a stream is running (`src/components/core/InputArea.jsx:95-100`; no IME composition check). Nothing touches the network while typing.
2. **Guards** in `handleSend` (`input-render.jsx:183-288`): nothing to send (`:189`), streaming or no conversation id (`:190`), offline (`:191-194`), 500 ms debounce (`:195-197`).
3. **Key.** `loadApiKey(settings.storageMode)` (`:201`) reads `settings['parliament-api-key']` and decrypts it with a non-extractable AES-GCM key held in a second database, `parliament-keystore` (`src/lib/crypto.js:110-138`, `:68-78`, `:12-24`). It is decrypted on every send, not cached. The plaintext is then passed as a function argument through `ChatContext.sendMessage` to the provider and to the three auto-metadata calls.
4. **Provider and model.** `getProvider('anthropic')` is hardcoded (`:212`). The model is `settings.defaultModel` (`:259`), default `'claude-sonnet'` (`src/stores/SettingsContext.jsx:8`), resolved by `_resolveModel` (`src/providers/anthropic.js:161-164`) against `getModels()` (`:124-131`): `claude-haiku-4-5-20251001`, `claude-sonnet-4-6`, `claude-opus-4-6`, `claude-opus-4-7`. `conversation.model` is written after each send (`src/stores/ChatContext.jsx:133-135`) but never read for sending. `mode.meta.preferredProvider` exists (`src/lib/modes.js:178`), is always null and is never read.
5. **System prompt:** `buildSystemPrompt()` (`:213`). **Tools:** `hostAPI.getArmedTools()` (`:219`). **Attachments:** `:229-244`.
6. The composer is cleared before the call (`:246`), so a failed send still empties it.
7. **`ChatContext.sendMessage`** (`src/stores/ChatContext.jsx:124-345`) stores the user message (`:143-148`) and an empty assistant placeholder with `incomplete: true` (`:152-157`), creates an AbortController (`:166`), starts a 3 s persist timer (`:169`), then builds the messages array:
   ```js
   const baseHistory = historyMessages
     .filter(m => m.content) // Exclude any empty messages
     .map(m => ({ role: m.role, content: m.content }))   // :185-187
   ```
   It is every message of the conversation held in ChatContext state. No truncation, no window management. Hide and delete live in `messages-render.jsx` local state (`:81`, `:115-136`) and never update ChatContext, so **hidden messages, and messages deleted earlier in the session, are still sent**.
8. **Provider call** (`ChatContext.jsx:219-230`, then `anthropic.js:279-296`): POST `https://api.anthropic.com/v1/messages` with `{ model, max_tokens: 8192, stream: true, messages, system?, tools? }`.
9. **After the stream:** final write (`:279-297`), token usage (`:300-303`), auto metadata (`:306-311`). `input-render` then publishes `message-sent` (`:271`). Error copy is at `:274-282` (401 and 403 both read as a key problem).

**Every call site of `loadApiKey`** (13, in 12 files):

| File:line | Argument | Purpose |
|---|---|---|
| `src/catalog/entries/input-render.jsx:201` | `settings.storageMode` | chat send |
| `src/catalog/entries/messages-render.jsx:268` | `settings.storageMode` | Continue |
| `src/catalog/entries/branches-render.jsx:129` | `settings.storageMode` | compressed branch |
| `src/catalog/entries/branches-render.jsx:190` | `settings.storageMode` | summary preview |
| `src/catalog/entries/review-render.jsx:86` | `settings.storageMode` | synthesis |
| `src/views/SelectorLayout.jsx:1165` | `settings?.storageMode \|\| 'session'` | regenerate |
| `src/catalog/entries/chats-preview.jsx:185` | `settings?.persistKey ? 'persistent' : 'session'` (no `persistKey` setting exists; already in `conflicts.md` Part 4) | regenerate |
| `src/stores/DocumentContext.jsx:403` | none | Submit and Branch |
| `src/components/core/SummaryDashboard.jsx:75` | none | insights |
| `src/components/core/sbrd/RippleScopeModal.jsx:36` | none | ripple scan |
| `src/views/HomepageView.jsx:36` | `'persistent'` | presence check only |
| `src/views/SelectorView.jsx:23` | `'persistent'` | presence check only |
| `src/components/build/wizard/IgnitionStep.jsx:114` | `'persistent'` | presence check only |

- Writers: `saveApiKey` at `SettingsView.jsx:146` and `IgnitionStep.jsx:255`; `deleteApiKey` at `SettingsView.jsx:840`.
- There is one storage key and no provider parameter (`crypto.js:82`, `:84`, `:110`).
- **"Don't save" mode is broken.** `saveApiKey(…, 'memory')` stores nothing (`crypto.js:98-102`), `loadApiKey('memory')` returns null (`:130-132`), and nothing else holds the key. Chat send then reports "No API key configured", while the three call sites that pass no argument ignore the mode and use any stored key.
- `getProvider(` has 17 call sites in 13 files, all `'anthropic'` or the default. `ChatContext.jsx:4` also imports `executeClientTool` straight from `providers/anthropic`.

### 1b. Everything that spends tokens

All network traffic goes through four `fetch` calls in `src/providers/anthropic.js` (`:178`, `:218`, `:291`, `:426`). No other `fetch`, XHR, WebSocket, EventSource or `sendBeacon` exists in `src/`.

| # | What | Started by | Call site | Model | Sends |
|---|---|---|---|---|---|
| 1 | Chat send | User (Send, Enter) | `input-render.jsx:255`, `ChatContext.jsx:219` | `settings.defaultModel` | Full history, this turn's image and PDF blocks, collab system prompt, armed tools |
| 2-4 | Title, summary, tags | **Automatic**, once, when a chat has exactly two messages (`ChatContext.jsx:94`) | `ChatContext.jsx:98`, `:102`, `:106`, then `anthropic.js:451`, `:469`, `:487` | `claude-haiku` (`anthropic.js:182`) | First two messages cut to 500 or 400 characters plus an instruction; `max_tokens` 30, 80, 40; three parallel requests; no abort; failures only `console.warn` |
| 5 | Continue | User | `messages-render.jsx:272`, `ChatContext.jsx:379` | `settings.defaultModel` | Messages before the partial, the partial as assistant, the continue instruction as user; current collab prompt; no tools |
| 6 | Review synthesis | User | `review-render.jsx:116` | `claude-haiku` (`:119`) | Last 20 messages cut to 300 characters, plus instruction with annotations |
| 7 | Branch summary preview | User | `branches-render.jsx:201` | `claude-haiku` (`:204`) | Messages up to the anchor cut to 500 characters, plus `SUMMARY_PROMPT` (`:57-60`) |
| 8 | Compressed branch | User | `branches-render.jsx:150` | `claude-haiku` (`:153`) | The same payload again; the preview is not reused |
| 9 | Submit and Branch | User, after a confirm modal | `DocumentContext.jsx:444` | `claude-sonnet` (`:447`) | Whole document and comments in the system prompt (`:425-440`) |
| 10 | Ripple scope scan | User ("Scan N Chats") | `RippleScopeModal.jsx:103` | `claude-haiku` (`:106`) | One sequential call per selected chat, both documents in full (`:76-98`); writes flags into the other chats' documents (`:145-149`) |
| 11 | Dashboard insights | User | `SummaryDashboard.jsx:119` | `settings.defaultModel` (`:122`) | Schema and first 50 rows as CSV (`:78-115`) |
| 12 | Regenerate summaries, homepage | User (bulk) | `chats-preview.jsx:195-197` | `claude-haiku` | Three calls per selected chat, all in parallel |
| 13 | Regenerate summaries, `/chats` | User (bulk) | `SelectorLayout.jsx:1187-1191` | `claude-haiku` | Same |
| 14 | Validate key, Settings | User | `SettingsView.jsx:140`, `anthropic.js:218` | `claude-haiku` | `max_tokens: 1`, message "hi" |
| 15 | Validate key, wizard | User | `IgnitionStep.jsx:238` | `claude-haiku` | Same |

What the user is told beforehand:
- **Rows 2-4:** nothing in the chat. The only mention is one line in the `/chats` tour (`SelectorLayout.jsx:44`). No setting turns them off.
- **Row 1 with web search:** a chip reading "· Uses API credits", hidden below the `sm` breakpoint (`InputArea.jsx:228`).
- **Row 10:** an estimate of `selected × 500` tokens at $3 per million (`RippleScopeModal.jsx:211-212`), unrelated to document size or to Haiku.
- **Row 11:** copy says a sample is sent (`SummaryDashboard.jsx:232-235`).
- **Rows 6, 7, 8, 9:** no model or cost is named.

Not spending:
- `countTokens` (`anthropic.js:425-441`): no caller.
- FileShelf quick actions (`FileShelf.jsx:198-200`; `QuickAction` at `:312-329` has no `onClick`).
- `ClaudeComments.jsx`: no call. Replies arrive through row 9.
- Auto-compress: section 7.

### 1c. How the system prompt is assembled

There is exactly one contributor:

```js
const buildSystemPrompt = useCallback(() => {
  const parts = []
  for (const id of activePresets) {
    const prompt = PRESET_PROMPTS[id]
    if (prompt) parts.push(prompt)
  }
  if (customInstruction.trim()) parts.push(customInstruction.trim())
  return parts.join('\n\n')
}, [activePresets, customInstruction])      // src/stores/CollabModeContext.jsx:93-101
```

It is passed as `systemPrompt || undefined` (`ChatContext.jsx:228`) and added as `...(systemPrompt ? { system: systemPrompt } : {})` (`anthropic.js:287`). **With no collab active there is no system prompt at all.**

| Possible contributor | Status |
|---|---|
| Collab presets | Yes, in the order ticked (Set insertion order) |
| Custom instruction | Yes, last |
| Parrot persona | No, unless its text is also in the custom box |
| Room or component contributions | Not found. No mechanism in hostAPI or mode files |
| File context | Not found. `contextFiles` is never read by the send path; `file-context-changed` has no production subscriber. `FileShelf.jsx:184-186` says "Claude can reference data from files marked with the link icon" |
| Text attachments | In the user message, not the system prompt, wrapped as `<attached_file>` with a "not instructions" line (`src/lib/fileUpload.js:147-155`) |
| Pins "for reference" | Not sent (`messages-render.jsx:407-408`) |
| Highlights | Not sent in chat; only in the Review synthesis prompt |
| Summary of earlier context | Not a system prompt. A compressed branch stores it as the new chat's first message, role `assistant` (`branches-render.jsx:167-172`) |
| Continue instruction | A trailing user message (`src/providers/base.js:80-82`, `ChatContext.jsx:360-366`) |

Other calls carry their own system prompts: title, summary, tags (`anthropic.js:7-27`), ripple scan, Submit and Branch.

### 1d. Streaming, stop, `incomplete`, Continue

- **Per chunk:** `latestContentRef.current += chunk; setStreamingContent(prev => prev + chunk)` (`ChatContext.jsx:223-226`). One state update per text delta in a provider at the app root whose value object is not memoised (`:463-476`). 21 files call `useChat()`.
- **Display:** the last assistant message shows `streamingContent` while its stored content is empty (`messages-render.jsx:310-316`).
- **Persistence:** every 3 s to IndexedDB with `incomplete: true` (`ChatContext.jsx:9`, `:65-80`). A quota error sets `persistError`, which no component reads.
- **Stop:** `stopGenerating` aborts (`:445-449`). The partial is kept as `incomplete: true` (`:316-328`) and the AbortError is swallowed (`:335`).
- **Empty placeholder left behind.** If nothing arrived, the placeholder is removed from state only (`:329-332`), not from IndexedDB. It reappears after reload as an empty ghost card with no Continue.
- **Navigation does not abort.** `ChatView` calls `clearMessages()` on exit (`src/views/ChatView.jsx:210-213`), which leaves the stream running. There is one `isStreaming`, one controller and one `streamingContent` for the whole app.
- **Ghost text:** `incomplete` and not streaming gives a dashed border, 0.55 opacity and a Continue button (`src/components/core/MessageCard.jsx:231`, `:239`, `:418-427`).
- **Continue** (`ChatContext.jsx:349-442`) reuses the record. Because the display test needs empty content, **the continued text is not shown live**; the card updates on completion. Nothing blocks a second Continue click mid-stream.
- **Stop reasons:** only `tool_use` is acted on (`:236`). A reply cut by `max_tokens` (8192, `anthropic.js:284`) is stored as complete. SSE `error` events are not handled (`anthropic.js:361-415`), so a stream that errors mid-way is also stored as complete.
- **Token meter:** `tokenUsage.input` adds each request's full `input_tokens` (`ChatContext.jsx:300-303`), so it over-counts within a session. After reload it is zero, because user messages have no `tokenCount` (`:54-61`).

### 1e. Tools

- **Declared** in `anthropic.js`: `WEB_SEARCH_TOOL` (`{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }`, `:35-39`), `CALCULATE_TOOL` (`:43-56`), `CREATE_CHART_TOOL` (`:58-93`), `getAvailableTools()` (`:134-158`), `executeClientTool` (`:102-121`).
- **Armed per message** only by `web-search@1.0`. The "+" menu item publishes `input-action:web-search`; the component toggles and calls `hostAPI._armTool` (`src/catalog/entries/web-search-render.jsx:55-76`); `input-render` reads the registry at send time; `message-sent` resets it (`:98-103`), only after a successful send.
- **Server tool results are not captured.** The parser forwards `text_delta` only (`anthropic.js:379-382`). Search results and citation data are dropped. Links render as citations only if the model writes markdown links (`MessageCard.jsx:218`). `CitedMarkdown.jsx` is unused.
- **Client tool loop** (`ChatContext.jsx:210-276`, up to five turns): chart calls become fenced `chart` blocks prepended to the reply (`:242-247`, `:281`), drawn by `ChartRenderer` (`MessageCard.jsx:208-214`). Unreachable today. If enabled, text streamed before a tool call is dropped from the saved message (`:274`).
- **Availability:** file attach and voice ship only in the Pocket Chat template (`src/lib/seedTemplates.js:147-149`). Web search ships in four templates, not Quiet Room. Wizard-built rooms get messages and input plus chosen features only (`src/lib/buildWizard.js:378-397`).

### 1f. Network log

- `installFetchLogger()` wraps `window.fetch` at startup (`src/lib/networkLog.js:57-97`, `src/main.jsx:9`).
- **Per request:** `id, timestamp, method, host, path` (pathname plus query string), `status, ok, durationMs, error` (`:69-79`). No body, headers, model, tokens or caller.
- The entry is pushed only when the response headers arrive, so in-flight requests are invisible and a stream's duration is time to headers. Ring buffer of 100, memory only.
- **Shown** in Settings, About and security (`SettingsView.jsx:1236`): a flat newest-first list with the copy "Only requests to api.anthropic.com should appear" (`src/components/NetworkActivityCard.jsx:43-45`). No grouping.
- **Attribution: not possible.** The wrapper sees only `(input, init)`. All fifteen rows above look identical in the log.
- **Not seen by the wrapper:** anything that is not `window.fetch`. That includes `<link rel="preconnect" href="https://api.anthropic.com">` in `index.html:24`, which opens a connection to Anthropic on every page load before any key or choice; service worker fetches; and browser speech recognition.

### 1g. hostAPI, tiers, capabilities

**Surface** (`src/lib/hostAPI.js:228-241`): `publish`, `subscribe`, `getMessageActions`, `_setMessageActions`, `getInputActions`, `_setInputActions`, `getArmedTools`, `_armTool`, `_disarmTool`, `getAttachments`, `_setAttachments`, `_eventCount`.

**Events:** `voice-transcript`, `row-hover`, `file-context-changed` (`:30-34`); `tool-armed-changed`, `message-sent` (`:56`); `attachments-changed` (`:60`); prefixes `input-action:` and `attach:` (`:55`). In use: `input-action:voice-toggle`, `input-action:web-search`, `input-action:file-attach`, `attach:error`. Payloads are not validated (`:13-17`).

**Delivery:** `RoomShell` makes one instance per room (`src/components/RoomShell.jsx:104`) and passes `{ config, hostAPI, componentId }` to every component (`:243-248`) and to the layout (`:272`).

**What it does not have:** any model, key, network or storage method. Components import `providers`, `crypto` and `db` directly. The object is shared, the `componentId` is supplied by the caller, and the underscore prefix is convention only. `getMessageActions()` has no production reader.

**Tiers** (`src/lib/catalog.js:22-29`): utility, reader, composer, integrator, agent, persister. The comment:

> "This file does NOT enforce the rule programmatically; it is enforced editorially in catalog reviews." (`src/lib/catalog.js:14-15`)

**What gates at runtime: nothing.**
- `tier` is checked against the list at registration; `'agent'` only logs a dev warning (`src/catalog/validate.js:161-168`).
- `capabilityRequirements` is checked for shape (`:182-188`) and printed on the dev-only `/catalog` page (`src/views/CatalogDebugView.jsx:138-146`). `RoomShell`, hostAPI and the editor never read it.
- `mode.requestedPermissions` is always `[]` (`modes.js:192`) and never read.
- Strings in use: `storage:read`, `storage:write`, `model:complete`, `microphone`.

**Declarations that do not match behaviour:**

| Entry | Declares | Actually does |
|---|---|---|
| `messages` (reader) | `storage:read` | Calls the model (Continue); deletes messages; writes messages, pins and conversations into other chats (`messages-render.jsx:131-136`, `:168-229`) |
| `summary-dashboard` | `storage:read` | Calls the model |
| `ripple-analysis` | storage only | Calls the model N times and writes other chats' documents |
| `document-canvas` | storage only | Triggers the Sonnet call |
| `chats` | storage only | Calls the model 3N times |
| `file-shelf` (composer) | storage only | No model call |

## 2. Collaboration mode and Parrots

### 2a. The five presets

Defined twice with identical text: `COLLAB_PRESETS` (`src/components/CollabModal.jsx:15-51`) and `PRESET_PROMPTS` (`CollabModeContext.jsx:33-39`).

| id | Label | Prompt text added |
|---|---|---|
| `challenge` | Challenge Artifacts | "Before presenting any artifact or substantial output, critically evaluate it first. Identify assumptions, potential gaps, and weaknesses. Present your self-critique alongside the output." |
| `reasoning` | Show Reasoning | "Walk me through your reasoning before giving me the answer. Show your thought process step by step." |
| `pushback` | Push Back on Me | "Push back if my assumptions are wrong. Don't just agree with me — tell me when you think I'm heading in the wrong direction." |
| `alternatives` | Offer Alternatives | "When answering, provide alternative approaches or perspectives. Don't just give one answer — show me the landscape of options." |
| `uncertainty` | Flag Uncertainty | "Tell me what you're uncertain about. Distinguish between what you're confident in and where you're making educated guesses." |

- **Combining:** joined with a blank line, in tick order, custom text last. The modal's preview uses definition order (`CollabModal.jsx:151-161`), so it can differ from what is sent.
- **Storage:** React state in `CollabModeProvider` at the app root (`CollabModeContext.jsx:53`, `:58`; `src/App.jsx:55`). Memory only. Cleared when the active conversation changes between two different ids (`:65-74`) and on reload.
- **Mounted** only when the wizard's "Collaboration Mode" feature is chosen (`buildWizard.js:212-226`) or it is added in the editor. No seeded template includes it.

### 2b. Parrot personas

- **Shape:** `{ id: 'persona_' + Date.now(), title, instruction }` (`CollabModal.jsx:106-107`). No model, no tool preferences.
- **Stored:** `setSetting('parrotPersonas', JSON.stringify(list))` (`:53`, `:110`, `:124`, `:141`). No store of its own; no `parrotId` anywhere.
- **Backups:** `.parliament` files include it, because only `parliament-api-key` is blocklisted (`src/lib/backupFormat.js:15`). The older JSON and `.apb` export includes it too.
- **UI:** only inside `CollabModal`: a card list with tick, inline edit and delete (`:258-362`) and a "Parrot Persona: Custom Interaction" block (`:364-423`). Settings section: not found. Input-area selector: not found.
- **How it reaches the prompt: it does not.** Ticking adds the persona id to the set (`:316`). Apply passes `(localPresets, localCustom)` unchanged (`:96-99`). `buildSystemPrompt` skips ids that are not built-in. The context's comments say the modal merges persona text into the custom instruction (`CollabModeContext.jsx:48-57`, `:86-92`); it does not. V1 behaved the same: `git show c5ed4e0^:src/adapters/albatross/ChatLayout.jsx` lines 540-553 iterate the five presets and the custom text only.
- Right after "Save Persona" the text is still in the box, so that one session works by accident. The badge does not count personas (`:111-113`).

### 2c. What a migration to collabs has to carry

1. The five built-in texts, from one source instead of two, with a decision on the "challenge" wording and the two id renames.
2. `parrotPersonas`: parse the JSON string; each entry becomes a "yours" collab (`title` to name, `instruction` to text). Ids are timestamps, so collisions are possible.
3. Old backups will keep arriving with `parrotPersonas`, so the conversion has to run on restore as well.
4. No active state to migrate.
5. No per-reply history exists. Message records are `{ id, conversationId, role, content, tokenCount, incomplete, createdAt, attachmentMeta? }` (`src/lib/db.js:654-672`). "A reply names the collabs it worked under" needs new fields and applies from then on only.
6. Rooms that mount `collab-mode@^1.0` need that reference handled when the block retires.

## 3. Review

- **Entry:** a "Review" button (`review-render.jsx:185-195`) opening `ReviewModal`. `review@1.0` is in no seeded template and no wizard feature; it reaches a room only through the editor.
- **Shown** (`src/components/ReviewModal.jsx`): summary depth (`:131-174`), three toggles for highlights, notes, favorites (`:177-201`), the highlight and note lists, session stats (`:238-247`), the synthesis block (`:250-288`), "Prompts for reflection" (`:291-306`), a "Your reflection" box (`:309-320`), then Dismiss and Save as Markdown.
- **Synthesis call** (`review-render.jsx:85-128`):
  - Model `claude-haiku`. No system prompt. No way to cancel.
  - Messages: the last 20, each cut to 300 characters (`:105-107`).
  - Final instruction: "Provide a {brief|detailed} synthesis of our conversation.{annotations}\n\nFocus on: key decisions, conclusions, open questions, and action items. {Keep it under 150 words. | Be thorough but concise, under 400 words.} Respond with ONLY the synthesis." (`:108-113`).
  - Annotations by toggle (`:91-103`): unique highlight texts; note texts; the first 100 characters of each favorited message. Pins are not included.
  - The result lives in modal state and is lost on close.
- **Summary depth** changes only the word limit. The tooltip says otherwise (`ReviewModal.jsx:150-152`). Three definitions exist and none is wired to another: modal state (`:30`), the unread `summaryDepth` setting, and the manifest's `['brief','standard','deep']` (`src/catalog/entries/review.jsx:41-46`). `ReviewRender` reads only `config.triggerLabel`.
- **Session stats source:** `useChat().tokenUsage` (see the caveat in 1d) and `messages.length`. Cost is fixed at Sonnet prices: `input × 3 / 1e6 + output × 15 / 1e6` (`ReviewModal.jsx:45-46`). `contextUsage` and `branches` are passed in and never rendered.
- **Prompts for reflection** are built locally with no call (`:49-69`). Clicking one does nothing.
- **"Your reflection"** is local state (`:31`), never saved or exported.
- **Save as Markdown** (`review-render.jsx:135-181`) downloads the conversation: title, date, highlight terms, favorites, every message with its note. It does not include the synthesis, the reflection or the stats, and it writes raw content including `<attached_file>` blocks.

## 4. Other model-backed components

| Component | Trigger | Model | Note |
|---|---|---|---|
| SummaryDashboard | User click | `settings.defaultModel` | The V1 auto-run was removed (`SummaryDashboard.jsx:63-69`). `sampleRows` config is ignored; 50 is hardcoded |
| RippleAnalysis | None itself | n/a | Flags come from Submit and Branch or the scope scan |
| RippleScopeModal | User click | `claude-haiku` | The backdrop and X still close the modal mid-scan (`:221`, `:239`) while the loop keeps running and writing |
| ClaudeComments | None | n/a | Display and local edits only |
| Submit and Branch | User, confirm modal | `claude-sonnet` | With no key it skips the call and still creates the branch (`DocumentContext.jsx:403-404`, `:510-512`) |
| FileShelf "Auto-analyze", "Suggest charts" | Nothing happens | n/a | No handler |
| Compressed branch | User click | `claude-haiku` | Preview and create are separate calls, so the saved summary can differ from the one previewed. On error it falls back to a full-history branch (`branches-render.jsx:177-182`) |

## 5. First run and tours

**The gate** (`src/views/HomepageView.jsx:35-56`):

```js
const [apiKey, wizardDone, tourDone, chosenHomeRoomId] = await Promise.all([
  loadApiKey('persistent'), getSetting('tourCompleted_wizard'),
  getSetting('tourCompleted_settings'), getSetting('chosenHomeRoomId'),
])
if (!apiKey && !wizardDone) { navigate('/build', { replace: true }); return }
if (!apiKey && !tourDone)   { navigate('/settings', { replace: true }); return }
```

- `/chats` has its own gate (`src/views/SelectorView.jsx:22-30`). `/chat/:id` has none.
- The only way to set `tourCompleted_wizard` is to reach Ignition's "connected" phase, which needs a valid or saved key. There is no keyless path to `/`.

**Flags** (raw keys in the `settings` store, included in backups):

| Flag | Written | Read |
|---|---|---|
| `tourCompleted_wizard` | `src/views/BuildView.jsx:202`, `:206` | `HomepageView.jsx:37` |
| `tourCompleted_settings` | `SettingsView.jsx:110` | `SettingsView.jsx:104`, `HomepageView.jsx:38`, `SelectorView.jsx:24` |
| `tourCompleted_selector` | `SelectorLayout.jsx:866` | `SelectorLayout.jsx:860` |

**Tours.** `src/components/TourTooltip.jsx` is a generic card; Skip and Done both call `onDone`. Two tours exist:
- `SETTINGS_TOUR_STEPS` (`SettingsView.jsx:42-61`), started at `:103-107`, rendered at `:185` and `:291`.
- `SELECTOR_TOUR_STEPS` (`SelectorLayout.jsx:29-54`), started at `:859-863`, rendered at `:1509`.
- Orphan `data-tour` anchors with no tour: `chat-input`, `context-health`, `sbrd-comments`, `sbrd-canvas`, `sbrd-ripple`, and `settings-btn` on `HomepageTopBar.jsx:96`.

**IgnitionStep** (`src/components/build/wizard/IgnitionStep.jsx`):
- On mount it decrypts the key to choose a mode (`:112-124`).
- Saved key: "Continue" runs the animation with no network call (`:267-271`).
- No key: a password field and "Validate" call `getProvider().validateKey` (`:238`), then `saveApiKey` (`:254-255`), then the animation. Failures show `invalid` or `billing_error` copy (`:245-249`).
- In "Don't save" mode it still says "Connected. Your room is ready." with nothing stored.
- **Animation** (`:59-63`, `:199-224`; CSS at `src/index.css:746-817`): sweep bar 0.75 s; card flash at 80 ms; lit at 480 ms; chips cascade 110 ms apart with a 0.55 s flash; "Connected" at 1200 ms with a breathing dot. Colours `#D4A843` and `#F5E6B8`. Reduced motion is handled (`:830-847`).
- On "connected" the room is persisted and the flag is set (`:276-284`).

**useShimmer** (`src/hooks/useShimmer.js:12-32`): phases at 0, 200, 400, 500 ms, reset at 2000 ms, once per mount. Used only by `SettingsView.jsx:98`, fired after a successful validate (`:147`). It drives a 1 s sweep line (`:194-210`), `shimmer-card`, `shimmer-nav`, `shimmer-sidebar-border` (`index.css:714-744`), and a green "Connected" pill (`:231-245`) that reflects a validation in this mount, not whether a key is stored.

**PWAContext** (`src/stores/PWAContext.jsx`) tracks `isOnline` (`:19-30`), service worker registration and `needRefresh` (`:36-46`), and the install prompt state (`:66-120`).
- **Confirmed: no UI renders install or update prompts.** The only consumer is `input-render.jsx:62`, for `isOnline` and `trackMessageSent`.
- `vite.config.js:14` sets `registerType: 'prompt'`, so a new service worker waits for `updateServiceWorker(true)`, which only the unused `applyUpdate` calls.
- `beforeinstallprompt` is suppressed (`:72`) and nothing replaces it.

**Home** (`chosenHomeRoomId`): set by a toggle in the editor (`src/components/editor/EditorRightRail.jsx:397-401`). When set, every visit to `/` creates a new conversation in that room and redirects to it (`HomepageView.jsx:62-80`). The Study is then unreachable through `/`, and each visit leaves an empty conversation until the next boot's integrity check (`db.js:955-969`).

## 6. Voice input

`src/hooks/useVoiceInput.js`, 86 lines:

- **API:** `window.SpeechRecognition || window.webkitSpeechRecognition` (`:25-27`, `:45-47`). No `getUserMedia` or `MediaRecorder` anywhere in `src/`.
- **Options** (`:49-52`): `continuous = false`, `interimResults = true`, `maxAlternatives = 1`, `lang` from component config, default `'en-US'`. **No `processLocally` or other on-device option: not found.**
- **Flow:** `start()` aborts any earlier session and starts a new one (`:38-83`). `input-render` appends final transcripts only (`:164-172`).
- **Errors** (`:58-64`): `no-speech` and `aborted` are swallowed; any other code is exposed. The production component shows it only as a tooltip, "Mic error: {code}" (`src/catalog/entries/voice-input-render.jsx:107-113`). On narrow screens the component renders nothing (`:76-77`), so mobile errors are invisible. On an unsupported browser the mobile mic button still shows and does nothing (`:63`).
- **Does the UI say where audio goes? No.** The only wording is "using your browser's voice recognition" (`src/catalog/entries/voice-input.jsx:28`) and the tooltips.
- **Production header:** `netlify.toml:45` sends `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`, which disables the microphone for the page's own origin. The auditor expects this makes `start()` fail with `not-allowed` on the deployed site while working in local dev. Not tested.
- Speech traffic is made by the browser, so it bypasses the page's `connect-src` and never appears in the network log. Which browsers send audio to a server is outside what the code shows; see `security-audit.md`.

## 7. Settings

### `DEFAULT_SETTINGS` (`src/stores/SettingsContext.jsx:6-23`)

| Key | Default | Meaning | Read by anything? |
|---|---|---|---|
| `storageMode` | `'persistent'` | `'persistent'` or `'memory'` | Yes (1a) |
| `defaultModel` | `'claude-sonnet'` | Model for chat, Continue, dashboard; context-window lookup | Yes |
| `theme` | `'light'` | Toggles `.dark` on `<html>` (`:52-60`) | Yes |
| `fontSize` | `'default'` | Text size | Only the preview paragraph (`SettingsView.jsx:1164`) |
| `contextThreshold` | `80` | Warning threshold | Only as the fallback for the auto-open effect (`branches-render.jsx:226-228`). The meter uses component config, default 75 (`context-render.jsx:40-42`) |
| `autoCompress` | `'prompt'` | `'prompt'`, `'automatic'`, `'disabled'` | Only `'automatic'` does anything |
| `summaryDepth` | `'brief'` | Review depth | No |
| `budgetAlert` | `20` | Dollar threshold | No |
| `budgetEnabled` | `true` | Budget switch | No |
| `backupReminder` | `'weekly'` | Reminder frequency | No. The banner uses its own fixed 30-day rule |
| `lastBackup` | `null` | n/a | Never read or written |
| `spendingLimitDismissed` | `false` | Hides the "set a limit" card | Yes |
| `chosenHomeRoomId` | `null` | Home room | Yes |

### `SettingsView.jsx` sections

| Section | Controls | Writes |
|---|---|---|
| API Configuration (`:417-487`) | Key field and Validate; "Key Storage" radio (`:88-91`) | The key via `saveApiKey` (`:146`); `storageMode` |
| Model Preferences (`:491-543`) | One card per provider model with dollar prices | `defaultModel` |
| Usage & Spending (`:547-626`) | "Current Session" stats that are literal `'0'`, `'0'`, `'$0.00'` (`:554-558`); budget toggle and slider; "Set limit on Anthropic" link | `budgetEnabled`, `budgetAlert`, `spendingLimitDismissed` |
| Context & Defaults (`:630-687`) | Summary depth; threshold slider 10 to 95; Auto-Compress radio | `summaryDepth`, `contextThreshold`, `autoCompress` |
| Data & Backups (`:729-1111`) | Backup and restore; storage meter; reminder; `.apb` and JSON export; import; Delete Everything | `backupReminder` |
| Appearance (`:1115-1174`) | Light or dark; text size | `theme`, `fontSize` |
| About & Security (`:1178-1239`) | Version, privacy copy (`:1209-1224`), network log | Nothing |

### What "Automatic" compression does

The logic is one effect in `src/catalog/entries/branches-render.jsx:230-239`:

```js
useEffect(() => {
  if (settings.autoCompress !== 'automatic') return
  if (contextUsage < threshold) return
  if (openForMessageId) return
  if (!messages.length) return
  handleCompressContext()        // = openBranchPanel(last.id), :214-218
}, [...])
```

- It **opens the Branch creation panel** on the latest message. No model call, no branch, until the user picks a mode and clicks Create. The Settings copy says "Create a compressed branch automatically" (`SettingsView.jsx:677`).
- It runs only in rooms that mount `branches@1.0`.
- `openForMessageId` is a dependency, so closing the panel while still over the threshold reopens it at once.
- The threshold is reached early because of the token-meter over-count (1d).
- `'prompt'` ("Show a prompt when the threshold is reached") and `'disabled'` have no code. The only threshold feedback is the meter's own card (`src/components/core/ContextMeter.jsx:79-105`).

## 8. Assessment (the auditor's opinion, separate from the facts above)

### Carry over largely as is

- **Provider internals:** the SSE parser, 401/403/429 mapping and model table in `anthropic.js`, and the `cost` shape in `base.js`, which already reserves `free-local`.
- **`crypto.js` primitives.** They need a provider dimension, not a rewrite.
- **The armed-tools and attachments registries with their chip strips.** This is already "features of the input" in mechanism: arm for the next message, chip with a remove control, reset on `message-sent`. `fileUpload.js` carries over too.
- **`buildSystemPrompt`'s join.** Tick order already gives "they stack in the order ticked".
- **`networkLog.js`'s buffer and subscription.**
- **Both ignition animations.** They are self-contained CSS plus small state machines and can be re-pointed at `api:`.
- **The synthesis recipe in `review-render.jsx`,** as a starting point for Reflect.

### Needs changes

1. **One gateway.** Nine files call provider network methods outside `ChatContext`, and twelve read the key. The fifteen rows in 1b are a ready-made list of caller labels for the network log.
2. **Keys.** Key the store by provider and have the gateway pick the key from the provider id, so no caller can hand key A to provider B. Add a presence check that does not decrypt. Fix or remove "Don't save".
3. **A prompt envelope with named contributors, recorded on the reply.** Without stored collab ids, provider, model and usage per reply, "a reply names the collabs it worked under", Reflection's session figures and "this month" in Settings cannot be built.
4. **Collab persistence and scope.** Today's memory-only reset contradicts "until turned off".
5. **Anthropic shapes outside the provider.** Tool-result blocks (`ChatContext.jsx:250-271`), attachment blocks (`fileUpload.js:166-188`), hardcoded model ids in five callers, and the usage field names.
6. **Auto metadata.** It needs a decision before keyless sources ship: a Wikipedia answer has no model to title it.
7. **Reflection cannot reuse the review wiring directly.** It reads the active conversation through ChatContext and AnnotationsContext. A board that reads chat 201 beside chat 207 needs readers by id; the plain `db.js` functions exist.
8. **The first-run gate, the three flags and both tours** can go together. The gate is the only thing that forces a key.

### Risks

1. **Bypass.** A gateway is a convention unless direct imports are prevented. Components share one JavaScript realm and can import `crypto.js` and `fetch`. Capability checks will hold for first-party code through a lint rule and a single import path; they are not a boundary against third-party blocks. This supports the brief's suggestion that such blocks arrive by pull request.
2. **Spend the user is not shown.** The three auto-metadata calls; the second summary call when a previewed branch is created; a ripple scan that keeps running after its modal closes; a chat stream that keeps running after navigating away.
3. **The privacy sentence in the welcome letter.** Voice input as built, and the preconnect to Anthropic on every load, both sit outside "the provider you pick". The key copy "Never leaves your browser" (`IgnitionStep.jsx:492`, `SettingsView.jsx:476`) is also not literally true, since the key is sent to the provider.
4. **Persona migration.** What users see ticked is not what has been sent. After migration, ticked personas will start to take effect.
5. **Context the user cannot see.** Hidden and deleted messages are still sent, and the meter over-counts. Any "the Enter line names what goes" promise needs the real payload.
6. **Other providers and message order.** A compressed branch starts with an assistant message, and failed sends can leave two user messages in a row.
7. **Replace restore clears the `settings` store** except `browserFingerprint` (`src/lib/backup.js:361-382`), which removes the stored API key. A separate key store, already in the plan, avoids this.
8. **The log records query strings.** Source searches, and any provider that puts a key in the URL, would be shown.
9. **Silent truncation.** Mid-stream errors and `max_tokens` stops are stored as complete replies.

### Not verified in this audit

- Whether `microphone=()` blocks speech recognition on the deployed site (not tested).
- Where each browser sends speech audio.
- Whether Anthropic or Mistral accept a history that starts with an assistant message or has consecutive user messages.
- Whether the hardcoded prices (`anthropic.js:126-129`) are current.

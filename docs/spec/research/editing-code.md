<!-- Editing in place: what the existing code offers
     Read-only audit by a research agent, 11 October 2026, of branch
     claude/almanac-docket-inventory at b7f3419. Filed as delivered, with paths
     made relative to the repo root. Facts first; the auditor's opinion is in
     its assessment section and carries no authority of its own. -->

# Editing in place: what the existing code offers

**Scope and method.** Repository ``, branch `claude/almanac-docket-inventory` at commit `b7f3419`. This is static reading plus two read-only `node` runs of `wordDiff`. Nothing was run in a browser, and no file was created, changed or deleted. Statements inferred from code but not observed running are marked "by reading" and listed at the end.

**Path convention.** The file tables give each absolute path once. After that I cite `FileName.jsx:line`; every basename is unique within the tables.

**Two things to know first.**
- The feature's spec is now in the repo, untracked: `docs\spec\editing-in-place-spec.md`, with its mockup `docs\spec\parliament-inline-editing-v5.html`. Both appeared at 16:48 during this session. I read the spec to judge fit; "spec" below means that file.
- Grep hits under `.claude\worktrees\` are about 30 other checkouts at other commits, not this branch. I excluded them.

## Bottom line

1. **Secretarybird's editor cannot be the engine.** It is one native `contentEditable` element per paragraph: the browser edits the DOM and the code reads `textContent` back. Tracked changes are not recorded. They are a word-level diff of `text` against `baseline`, recomputed on render and drawn in a non-interactive overlay above text made transparent. Struck words never exist in the editable text, and there are no edit records, edit ids or offset anchors.
2. **What is worth carrying over is smaller:** the paragraph list with split, join and retype mutators (as a pattern), the slash menu's filter and keyboard logic, two caret helpers, the suggestion and comment cards, the selection tooltips, the model-call scaffolding and the shared-context pattern.
3. **The chat has no message editing today.** A message is a Markdown string in `messages.content`, rendered by `react-markdown` and read as a string in about 25 other places.
4. **No file in scope uses `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML` or `insertAdjacentHTML`.** The risks are three `document.execCommand` calls and unguarded rich `contentEditable`.
5. **Two Secretarybird fixes exist only on branch `refactor/main`** and are missing here, and several stored fields have readers but no writer.

---

## 1. Secretarybird document editing

### Files

| Absolute path | Lines | Purpose |
|---|---|---|
| `src\components\core\DocumentCanvas.jsx` | 540 | Toolbar (Markup, Accept All, Clear All, Export, Submit Edits), selection tooltip, submit modal, toast; maps paragraphs to rows |
| `src\components\core\sbrd\DocumentParagraph.jsx` | 532 | One `contentEditable` row: input handling, slash menu, diff overlay, inline comment input, gutter cards |
| `src\components\core\sbrd\diff.js` | 72 | `wordDiff` plus caret helpers `getTextOffset` and `setCursorAt` |
| `src\components\core\sbrd\renderers.jsx` | 95 | `DiffText`, `HighlightedText`, `ClaudeInlineSuggestionPreview` |
| `src\components\core\sbrd\cards.jsx` | 404 | `ClaudeOriginCard`, `ClaudeSuggestionCard`, `MarginComment`, `CommentCard`, `RippleCard`, `SidebarSectionLabel` |
| `src\components\core\sbrd\RippleScopeModal.jsx` | 378 | Cross-document scan (`runRippleScan`) and its modal |
| `src\stores\DocumentContext.jsx` | 631 | All document state, mutators, autosave, Submit and branch |
| `src\components\core\ClaudeComments.jsx` | 156 | Margin list of suggestions, comments and notes |
| `src\components\core\RippleAnalysis.jsx` | 128 | Margin list of ripple flags, Ripple toggle, Expand Scope |
| `src\catalog\entries\document-canvas.jsx` | 62 | Catalog manifest |
| `src\catalog\entries\claude-comments.jsx` | 67 | Catalog manifest (no `-render` or `-preview` sibling exists) |
| `src\catalog\entries\ripple-analysis.jsx` | 72 | Catalog manifest (no sibling exists) |
| `src\lib\db.js` | 1031 | Stores and record shapes |

There are no tests for any of these; the only test files are five under `src\lib`.

### 1a. Data model

```js
// paragraph (DocumentContext.jsx:49-57, 207-214; optional fields added later)
{ id: 'p-<uuid>', type: 'paragraph'|'title'|'heading'|'heading2'|'quote',
  text: string, baseline: string, comments: Comment[],
  claudeSuggestions?: Suggestion[],     // set to undefined when empty
  ripple?: { paraId, type, severity, summary, sourceEdit?, sourceDoc? } | null,  // one per paragraph
  claudeOrigin?: true, claudeNote?: string }   // read and cleared, never written
// comment (DocumentContext.jsx:267)
{ id: 'c<Date.now()>', text, selectedText: string|null, claudeReply: null | { text } }
// suggestion (DocumentContext.jsx:480-485, 495-500; RippleScopeModal.jsx:133-138)
{ id: 'cr-…' | 'rs-…' | 'ripple-<convId>-…', find, replace, reasoning }
// submittedReplies (DocumentContext.jsx:252)
{ [commentId]: [{ text }] }
// stored record (db.js:932-941)
{ conversationId, paragraphs, suggestionStates, submittedReplies, updatedAt }
```

- **Where persisted:** database `parliament` (version 5), object store `sbrd_documents`, key path `conversationId` (`db.js:75`). The whole record is rewritten 1 second after any change (`DocumentContext.jsx:169-179`).
- **`suggestionStates` is vestigial.** No component reads or writes it. The autosave omits it (`DocumentContext.jsx:174`); only `RippleScopeModal.jsx:147` passes an old value through. In the first Secretarybird commit (`fe3b881`) it was `{ [paraId]: 'accepted'|'rejected' }` for a read-only mock that stored `segments: [{ type: 'text'|'deletion'|'insertion'|'suggestion', content }]`. `migrateParagraph` (`DocumentContext.jsx:61-72`) still collapses that shape on load.
- **`claudeOrigin` and `claudeNote` have no writer.** Their writer was the V1 sidebar chat (`parseClaudeResponse` in `git show 8be9942^:src/adapters/secretarybird/ChatLayout.jsx`, lines 231-285), dropped in PR-11b. So "Added by Claude" cards can only appear from old data.
- **`submittedReplies` are never sent to the model.** The Submit prompt uses only each comment's `text` and `selectedText` (`DocumentContext.jsx:413-423`).
- **Memory only:** `showMarkup` (default off, reset per conversation), `rippleEnabled` (default on, not reset), selection and expansion state (`DocumentContext.jsx:86-96, 128-137`).

### 1b. How editing works

It is native `contentEditable`, in the boolean (rich) form, on four elements: `DocumentParagraph.jsx:204, 240, 276, 322`. React passes no children; the code writes and reads `textContent`.

- **Events handled:** `onInput`, `onKeyDown`, `onPaste`, `onCompositionStart`, `onCompositionEnd`. **Not handled (not found):** `beforeinput`, cut, drop, dragover, blur, selectionchange.
- **The browser mutates the DOM, then the code reads it back:**
  ```js
  // DocumentParagraph.jsx:89-93
  if (isComposing.current) return
  skipNextSync.current = true
  const text = e.currentTarget.textContent
  onTextChange(para.id, text)
  ```
- **Intercepted before the browser acts:** Enter (always), Backspace when the caret is at offset 0, paste, and Arrow, Enter and Escape while the slash menu is open (`DocumentParagraph.jsx:104-172`).
- **Caret preservation.** A layout effect keyed only on `para.text` rewrites the DOM when it disagrees with state, saving and restoring one offset:
  ```js
  // DocumentParagraph.jsx:78-86
  if (el.textContent !== target) {
    ... savedOffset = getTextOffset(el, sel.anchorNode, sel.anchorOffset)
    el.textContent = target
    if (savedOffset !== null) setCursorAt(el, savedOffset)
  }
  ```
  `skipNextSync` skips this after the user's own typing. Only the anchor is saved, so a range collapses to a caret. `getTextOffset` (`diff.js:42-50`) walks text nodes; if the anchor is an element node it never matches and returns the total length.
- **IME:** a ref flag makes `handleInput` and `handleKeyDown` return early during composition, and `compositionend` calls `handleInput` once (`DocumentParagraph.jsx:68, 90, 105, 209-210`). There is no check of `e.nativeEvent.isComposing` or key code 229.
- **Paste:** plain text only, re-inserted through a deprecated API:
  ```js
  // DocumentParagraph.jsx:174-179
  e.preventDefault()
  const text = e.clipboardData.getData('text/plain')
  if (!text) return
  document.execCommand('insertText', false, text)
  ```
  There is no length limit and no newline handling. Drop is not intercepted.
- **Other focus code:** a capture-phase keydown on the canvas redirects Space, PageUp and PageDown from non-editable targets to the last paragraph and inserts a space with `execCommand` (`DocumentCanvas.jsx:139-157`).
- **One editing host per paragraph.** No code moves the caret between paragraphs with arrow keys, and a selection cannot be edited across paragraphs.

### 1c. Tracked changes

They are a diff of `text` against `baseline`, computed at render time. Nothing is tracked per keystroke.

- **Algorithm** (`diff.js:8-36`): tokenise with `/\S+|\s+/g` (words with attached punctuation, and whitespace runs, are tokens), build a full longest-common-subsequence table, walk it to emit `{ type: 'unchanged'|'deleted'|'inserted', text }` per token. Time and memory are O(m × n).
- **Measured** (Node 24, one word changed mid-text): 300 words 3.9 ms; 1,000 words 20.5 ms and a 15 MB table; 2,000 words 78 ms and 61 MB; 4,000 words 308 ms and 244 MB.
- **Output shape, from running it:**
  - `"eleven years"` to `"nearly a century"` gives `+nearly + ␠ +a −eleven =␠ +century −years`. Added words come before struck ones, and a phrase replacement interleaves.
  - `"colour"` to `"color"` strikes and re-adds the whole word.
  - `"a b a b a b"` to `"a b a b"` always strikes the tail, wherever the user actually deleted.
- **When `baseline` moves:** seed (`''`), the new half of a split (its own text), `acceptOrigin`, Accept All, Clear All, and the branch copy at Submit. `acceptSuggestion` changes `text` only (`DocumentContext.jsx:306-308`), so an accepted model suggestion then shows as the user's own tracked change.
- **With Markup on the paragraph stays editable.** Nothing conditions `contentEditable` on `showMarkup`. The editable's text colour becomes `transparent`, and a sibling `absolute inset-0 pointer-events-none select-none` element renders `<DiffText baseline text>` (`DocumentParagraph.jsx:335-356`). Deleted words exist only in that overlay, never in the editable element.
- **Cost per keystroke:** `DocumentCanvas.jsx:219-224` runs `wordDiff` twice per changed paragraph on every render to compute `deletionCount` and `insertionCount`, which are never used. `DiffText` adds a third run when Markup is on. Nothing in `sbrd\` is memoised and the context value is rebuilt each render (`DocumentContext.jsx:566`).

### 1d. The "/" menu

- **Types** (`DocumentParagraph.jsx:22-27`): Title (`title`), Heading 1 (`heading`), Heading 2 (`heading2`), Quote (`quote`). There is no option to return to plain text.
- **Opens** when the paragraph's whole trimmed text starts with "/" and has no newline, checked after the character is already in the text (`DocumentParagraph.jsx:94-101`). It is not caret-aware.
- **Filters** by the text after "/", lowercased, as a substring of the label or id (`:108-110`).
- **Picks** with ArrowUp, ArrowDown, Enter, hover and click; Escape closes but leaves the typed text (`:111-136, 376-388`).
- **Stores** the type in `para.type` via `setParagraphType` (`DocumentContext.jsx:234-236`), then sets the paragraph's text to `''` (`DocumentParagraph.jsx:125-126`).
- **Rendered only for body paragraphs.** The title and heading branches (`:190-296`) have no menu, placeholder, comment input, suggestions, ripple banner or gutter, though the keyboard handling still runs there.

### 1e. Enter and Backspace

- **Enter** always splits at the anchor offset; a selected range is not deleted first (`DocumentParagraph.jsx:139-151`). `splitParagraph` (`DocumentContext.jsx:200-217`) keeps the first half in place with its comments and old baseline, and creates a new paragraph with `baseline` equal to its text and empty comments. A heading or title is followed by a paragraph; a quote is followed by another quote. Focus moves on the next animation frame by indexing `document.querySelectorAll('[data-para-id] [data-editable]')`, a document-wide query.
- **Backspace** at offset 0 with a collapsed caret calls `mergeParagraph` (`DocumentContext.jsx:219-232`), which returns `{ ...prevPara, text: mergedText }`. The second paragraph's type, baseline, comments, suggestions and ripple flag are discarded. On the first paragraph it does nothing. There is no unformat step and no Delete-at-end handling.
- **Both read as edits.** Because changes are a diff against baseline, a split shows the moved text as deleted and a join shows it as inserted.

### 1f. Comments, suggestions, Submit

- **Anchoring:** paragraph id plus a `selectedText` string, taken from `window.getSelection().toString().trim()` on mouseup or Ctrl+Alt+M (`DocumentCanvas.jsx:84-136`; stored at `DocumentContext.jsx:260-267`). No offsets. The highlight uses the first `indexOf` match (`renderers.jsx:44-66`).
- **Claude replies and suggestions are requested only by Submit** (`DocumentContext.jsx:396-551`): one streamed call through `getProvider('anthropic').sendMessage` with model `'claude-sonnet'`, user turn `'Please review the submission above.'`, and everything else in the system prompt. Each paragraph is sent as `[id] text (changed from: "baseline")` (`:407-411`); no word-level diff is sent.

```text
You are reviewing a document submission with tracked changes and user comments.

Document state (paragraphs show current text; changed paragraphs note the original):
${docLines}

User comments:
${commentLines}

Respond ONLY with a valid JSON object — no prose, no markdown fences:
{
  "commentReplies": [{"commentId": "...", "reply": "...", "suggestions": [{"find": "exact verbatim text to replace", "replace": "replacement text", "reasoning": "brief reason"}]}],
  "rippleFlags": [{"paraId": "...", "type": "contradiction|dependency_break|opportunity|tone_shift|duplication", "severity": "low|medium|high", "summary": "...", "sourceEdit": "..."}],
  "rippleSuggestions": [{"paraId": "...", "suggestions": [{"find": "exact text to find", "replace": "replacement", "reasoning": "brief reason"}]}]
}

Reply to every comment helpfully and concisely. When a comment requests a text edit, rewrite, or improvement, include "suggestions" for that reply — each suggestion must use a short, unique, verbatim substring of the paragraph as "find". Omit "suggestions" when the comment is a question or general feedback that does not call for a text change. Include rippleFlags only for genuine cross-paragraph impacts caused by the edits — omit if none. Include rippleSuggestions with concrete fix suggestions for flagged paragraphs — omit if none.
```
  (The two ripple keys and the last two sentences are included only when `rippleEnabled`.)

- **Parsing:** `fullResponse.match(/\{[\s\S]*\}/)` then `JSON.parse` (`:454-456`). Replies become `comment.claudeReply = { text }`; suggestions are appended to `claudeSuggestions`. Malformed JSON and API errors are swallowed (`:506-512`).
- **After the call, Submit always** saves the document, creates a new conversation `Branch: <title>` with `parentId` and the same room, writes it a copy with `baseline = text` and comments cleared, and shows a toast (`:517-544`). It does this even with no API key or a failed call. The user stays in the original.
- **Accept** (`:301-310`): `p.text.replace(sugg.find, sugg.replace)`, which is first occurrence only, then the suggestion is removed. **Reject** (`:312-318`) removes it.
- **Accept All** (`:348-365`) applies every pending suggestion, sets `baseline = text` on every paragraph, and clears `claudeNote` and `claudeOrigin`.
- **Clear All** (`:367-386`) does exactly the same and also empties comments and ripple flags. It accepts; it does not discard. There is no reject-all, no revert to baseline, and no undo.

### 1g. Ripple

- **Trigger 1:** Submit, when `rippleEnabled` (default on). It is the same call as above; flags are per paragraph, one each.
- **Trigger 2:** Expand Scope (`RippleAnalysis.jsx:73-81`), then "Scan N Chats". `runRippleScan` (`RippleScopeModal.jsx:26-172`) loops sequentially over the chosen conversations, one `'claude-haiku'` call each, user turn `'Check cross-document consistency.'`, with this system prompt (`:76-98`):

```text
You are a cross-document consistency checker for a writing tool.

DOCUMENT A — "${sourceTitle}" (paragraph IDs in brackets):
${currentDocText}${editContext}

DOCUMENT B — "${extTitle}" (paragraph IDs in brackets):
${extDocText}

Find inconsistencies, contradictions, or continuity breaks between the two documents — mismatched facts, character names, timeline events, locations, or tone conflicts.

Respond ONLY with valid JSON, no prose, no markdown fences:
{
  "currentFlags": [{"paraId":"id-from-DOCUMENT-A","type":"contradiction|inconsistency|dependency_break|tone_shift","severity":"low|medium|high","summary":"one sentence, name '${extTitle}'"}],
  "externalFlags": [{"paraId":"id-from-DOCUMENT-B","type":"contradiction|inconsistency|dependency_break|tone_shift","severity":"low|medium|high","summary":"one sentence, name '${sourceTitle}'"}],
  "externalSuggestions": [{"paraId":"id-from-DOCUMENT-B","find":"exact verbatim text to replace — must exist word-for-word in the paragraph","replace":"corrected text","reasoning":"brief reason referencing Document A"}]
}

RULES:
- currentFlags and externalFlags paraIds must come from their respective document only.
- externalSuggestions paraIds must come ONLY from Document B IDs above.
- "find" must be a short, unique, verbatim substring of the paragraph's current text.
- Provide a suggestion for every externalFlag where a concrete text fix is possible.
- If no inconsistencies, return: {"currentFlags":[],"externalFlags":[],"externalSuggestions":[]}
```
  `editContext` lists changed paragraphs as `was: "…100 chars" → now: "…100 chars"` (`:46-51`).

- **What comes back and where it goes:** `currentFlags` are filtered to valid ids and set on the open document through `setRipplesByParaId`. `externalFlags` and `externalSuggestions` (kept only if `find` is in the text) are written straight into the other conversation's `sbrd_documents` record (`:125-149`).
- **Display:** `RippleCard` in the margin with type, severity, summary, excerpt, "Go to paragraph" and "Dismiss" (`cards.jsx:318-391`), plus an inline banner under the paragraph when Markup is on (`DocumentParagraph.jsx:434-453`). Fixes appear as ordinary green "Suggested edit" cards. "Go to paragraph" only tints the row; no code scrolls.
- **Scope:** the modal lists every other conversation (`listConversations()` minus the current one, `RippleScopeModal.jsx:185-197`). It is not branch-aware.
- **`sbrd-ripple-scope-<id>`:** array of chosen conversation ids, written only when "Save Scope" is ticked (`:160-162`), read to preselect on open (`:188-195`).
- **`sbrd-ripple-manifest-<id>`:** `{ scannedAt, scannedDocs, entries: [{ doc, flags, suggestions }] }`, written only when "Generate Revision Manifest" is ticked and something was found (`:163-169`). Nothing reads it. Neither key is removed when the conversation is deleted.
- **Not found:** a link from a suggestion to the edit that caused it, a one-at-a-time review bar, keyboard accept or reject, or any notion of "the same change in another branch". The existing feature flags inconsistencies.

### 1h. Export

- **Copy Clean Text** (`DocumentCanvas.jsx:172-182`): paragraphs joined by blank lines with `# `, `## ` or `> ` prefixes, to the clipboard.
- **Export with Markup** (`:184-216`): a `.md` download named after the conversation title. Changed paragraphs are rebuilt from `wordDiff`, each deleted token wrapped as `~~…~~` and each inserted token as `**…**`, joined without separators. Whitespace tokens are wrapped too, which produces sequences such as `**nearly**** ****a**`. Comments and Claude replies follow as blockquotes. Suggestions, ripple flags and user replies are not exported.

### 1i. Limitations and fragile spots

There are no TODO or FIXME comments in these files (searched). Found by reading:

- **Two fixes are missing from this branch.** Commits `974d659` (exempt `INPUT` and `TEXTAREA` from the Space hijack) and `50ecd25` (turn Markup on when a document has pending suggestions; count suggestions in scan results) are on `refactor/main` only. Here the guard at `DocumentCanvas.jsx:142-144` exempts only `contentEditable`, and the inline "Add a comment…" input sits inside the canvas.
- **Every opened conversation gets a document record.** `DocumentProvider` is mounted app-wide (`App.jsx:57`), seeds a paragraph when none exists, and autosaves it 1 second later with no check on the room (`DocumentContext.jsx:148-152, 169-179`). The boot integrity check then never removes such empty chats (`db.js:961-968`), and a cross-document scan would call the model for them.
- **The pending save is cancelled, not flushed,** on conversation switch (`DocumentContext.jsx:178`).
- **`String.replace` takes the model's replacement string as a pattern,** so `$&`, `$'` and `$$` in a suggestion are interpreted (`DocumentContext.jsx:306, 354, 373`).
- **A type change that kept the text would render empty,** because the sync effect depends on `para.text` alone and the element is re-created (`DocumentParagraph.jsx:74-87`).
- **Model and provider are hard-coded** (`'anthropic'`, `'claude-sonnet'`, `'claude-haiku'`), and document text is interpolated into the system prompt without delimiters.
- **The scan's cost line is a constant:** 500 tokens per chat at $3 per million (`RippleScopeModal.jsx:211-212`).
- **The Drafting Desk chat panel never sees the document;** only the three components above call `useDocument()`.

---

## 2. Chat message rendering

| Absolute path | Lines | Purpose |
|---|---|---|
| `src\components\core\MessageCard.jsx` | 462 | One message: Markdown render, highlights, action buttons, note panel, Continue |
| `src\components\core\MessageList.jsx` | 77 | Scroll container, empty state, hidden-count pill |
| `src\components\core\CitationLink.jsx` | 107 | Link renderer with scheme block-list and domain tooltip |
| `src\components\core\CitedMarkdown.jsx` | 108 | Unused; nothing imports it |
| `src\components\core\ChartRenderer.jsx` | 246 | SVG bar, line, area and pie charts from JSON |
| `src\catalog\entries\messages-render.jsx` | 504 | Live list: hide, delete with undo, send to branch, pin, copy, continue |
| `src\catalog\entries\messages.jsx` | 81 | Catalog manifest and preview |
| `src\stores\ChatContext.jsx` | 485 | Messages state, send, stream, continue |

**2a. Assistant content.** `MessageCard.jsx:216-221` renders `<ReactMarkdown remarkPlugins={[remarkGfm]} components={{ …, a: CitationLink, code: chartCodeComponent }}>`. Versions are `react-markdown` 10.1.0 and `remark-gfm` 4.0.1.
- There are no rehype plugins and no `rehype-raw`. Raw HTML in the Markdown is rendered as literal text (`node_modules\react-markdown\lib\index.js:360-365`).
- The default URL transform keeps only http, https, irc, ircs, mailto, xmpp and relative URLs (same file, `:421-444`). `CitationLink.jsx:8-13` adds its own block on `javascript:`, `data:`, `vbscript:` and `file:`.
- Citations are not a data structure. They are whatever Markdown links the model wrote; the stream parser handles only text and tool-input deltas (`anthropic.js:379-386`).
- Charts are `create_chart` tool calls turned into fenced `chart` code blocks and prepended to the reply text (`ChatContext.jsx:242-247, 281`), then rendered by the `code` override (`MessageCard.jsx:208-214`).
- Headings get ids `msg-<id>-h-<n>` from a render-time counter (`MessageCard.jsx:186-195`). The table of contents rebuilds the same numbering by regex over the raw string (`toc-render.jsx:24, 93-114`).

**2b. User messages** go through the same Markdown path. The only difference is that persisted `<attached_file>…</attached_file>` blocks are stripped for display (`MessageCard.jsx:49-54`, `fileUpload.js:196-199`) and attachment chips are shown (`MessageCard.jsx:323-349`). The stored prompt still contains those blocks.

**2c. Actions.**

| Action | Button | Implementation |
|---|---|---|
| Favorite | `MessageCard.jsx:265-270` | `toggleFavorite`, `AnnotationsContext.jsx:116-128`; store `favorites` |
| Note | `MessageCard.jsx:271-273`, panel `:387-414` | `toggleNotePanel` and `saveNote` on blur, `AnnotationsContext.jsx:131-164` |
| Branch | `MessageCard.jsx:274-276` | `openBranchPanel`, then `createBranch` (`db.js:569-638`) or a summary branch (`branches-render.jsx:117-187`) |
| Delete | `MessageCard.jsx:277-279` | Hide at once, database delete after 20 s, Undo banner (`messages-render.jsx:123-149, 476-504`) |
| Hide | `MessageCard.jsx:293-295` | `handleHide`, `messages-render.jsx:115-121` |
| Send to branch | `MessageCard.jsx:296-298` | Copies role and content into another conversation (`messages-render.jsx:168-180`) |
| Pin for reference | `MessageCard.jsx:299-301` | `addPin` with a content snapshot; shown as plain text (`messages-render.jsx:181-195, 410-466`) |
| Copy | `MessageCard.jsx:302-304` | Raw `msg.content` to the clipboard, with an `execCommand('copy')` fallback (`messages-render.jsx:280-291`) |
| Highlight a selection | `MessageCard.jsx:78-107, 351-383` | `addHighlight` |

Actions contributed by other components are collected by `RoomShell` but no menu renders them (`messages-render.jsx:27-29`).

**2d. Hide message** is a `Set` in component state (`messages-render.jsx:81`). It is not stored, and it resets on conversation switch (`:89-102`). Hidden messages are still sent to the model, because the history is built from all messages (`ChatContext.jsx:176-187`). The "N messages hidden" pill has no handler: `onShowHidden` is never passed (`MessageList.jsx:63`, `messages-render.jsx:368-375`).

**2e. Ghost text and Continue.** Streaming content is saved every 3 seconds with `incomplete: true` (`ChatContext.jsx:9, 65-80`). An incomplete message gets a dashed border and a Continue button (`MessageCard.jsx:238-240, 418-427`). Continue resends the history with the partial reply and a fixed instruction, then appends to the same record (`ChatContext.jsx:349-442`, `base.js:80-82`). The 0.55 opacity branch at `MessageCard.jsx:231` is unreachable because `index` defaults to 0.

**2f. Existing message editing: not found.** `updateMessage` is called only from the streaming and continue paths in `ChatContext.jsx` (lines 71, 284, 318, 395, 419). I searched `src` for resend, regenerate, retry and edit handlers and found none for messages.

**Where `content` is read as a string** (the reach of changing its type): `ChatContext.jsx:186-187, 356-373`; `AnnotationsContext.jsx:210, 244`; `messages-render.jsx:176-221, 314-338`; `toc-render.jsx:80, 97`; `notes-render.jsx:34`; `highlights-render.jsx:51`; `favorites-preview.jsx:42`; `review-render.jsx:101-165`; `branches-render.jsx:146, 197`; `chats-preview.jsx:193`; `SelectorLayout.jsx:162, 1182`; `db.js:623-629, 703, 727`; `validate.js:52`; `v6Plan.js:118`; `anthropic.js:201-203`.

---

## 3. Highlights

| Absolute path | Lines | Purpose |
|---|---|---|
| `src\components\core\HighlightList.jsx` | 172 | List of terms with previous, next, remove, add form |
| `src\catalog\entries\highlights-render.jsx` | 86 | Groups records by lowercased text, counts occurrences |
| `src\catalog\entries\highlights.jsx` | 86 | Catalog manifest |
| `src\stores\AnnotationsContext.jsx` | 305 | Favorites, notes, highlights state and mutators |

- **They are terms, matched across the whole conversation.** The record stores a `messageId`, but rendering ignores it: every card receives the full list (`messages-render.jsx:334`) and marks every case-insensitive, word-bounded match (`MessageCard.jsx:111-163`, `textUtils.js:15-34`).
- **Rendering is string splitting at the React level.** Component overrides for `p`, `li`, `td`, `th`, `strong`, `em`, `blockquote` and `h1` to `h4` walk their children, split strings and wrap matches in `<mark>` (`MessageCard.jsx:165-206`). There is no DOM manipulation and no remark plugin. Fenced code blocks are not covered.
- **A term that crosses an inline element can never match,** since each string child is searched alone. The text is captured from the rendered selection (`MessageCard.jsx:79-80`), while counts and navigation search the raw Markdown (`highlights-render.jsx:50-53`, `AnnotationsContext.jsx:241-246`).
- **Shape** (store `highlights`, index `conversationId`; `db.js:735-747`): `{ id, conversationId, messageId, text, color, createdAt }`. `messageId` may be null for terms added from the side rail (`AnnotationsContext.jsx:211`), although `validate.js:62` requires an id.
- **Colour quirk:** "blue" and "purple" share `#B8A070` (`constants.js:11-17`), so the lookup at `MessageCard.jsx:117` always returns blue's background.

## 4. Notes

| Absolute path | Lines | Purpose |
|---|---|---|
| `src\components\core\NoteList.jsx` | 21 | Stub; used only by the catalog preview |
| `src\catalog\entries\notes-render.jsx` | 111 | Live side list: note text, message snippet, scroll and delete |
| `src\catalog\entries\notes.jsx` | 69 | Catalog manifest |

- **One note per message in practice.** State is a `Map` keyed by `messageId` (`AnnotationsContext.jsx:96`), and `saveNote` updates the existing record or deletes it when the text is empty (`:144-164`).
- **Shape** (store `notes`; `db.js:761-772`): `{ id, conversationId, messageId, text, createdAt }`. `validate.js:72` allows a null `messageId`, but no interface creates such a note.
- **Editing** is a `<textarea>` inside the card, saved on blur (`MessageCard.jsx:402-409`).

---

## 5. Security-relevant facts

Not found anywhere in `src`: `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `eval`, `new Function`.

| What | Where | Can it carry untrusted text? |
|---|---|---|
| `document.execCommand('insertText', false, text)` | `DocumentParagraph.jsx:178` | Yes, pasted text. It is read as `text/plain` and inserted as text, so no HTML is parsed. Deprecated API. |
| `document.execCommand('insertText', false, ' ')` | `DocumentCanvas.jsx:151` | No, a literal space. |
| `document.execCommand('copy')` | `messages-render.jsx:288` | Yes, message content, but only into the clipboard through a temporary `<textarea>`. |
| `contentEditable` (rich) | `DocumentParagraph.jsx:204, 240, 276, 322` | Content is set with `el.textContent = target` (`:84`) from `para.text`, which can hold typed or pasted text and accepted model suggestions. That sink is text-only. Drop, cut and formatting shortcuts are not intercepted, so the browser can add markup inside the node; state only ever receives `textContent`. |
| `e.target.contentEditable === 'true'` | `DocumentCanvas.jsx:144` | Read only. |
| `ReactMarkdown` | `MessageCard.jsx:218` | Yes, model output and user prompts. Raw HTML becomes text and unsafe link schemes are removed (see 2a). No `img` override exists; remote images are blocked in production by `img-src 'self' data:` (`netlify.toml:35`), and `vite.config.js` sets no policy for development. |
| `JSON.parse` of model output | `DocumentContext.jsx:456`, `RippleScopeModal.jsx:113`, `ChartRenderer.jsx:203` | Yes. Values are rendered as React text or SVG attributes. Submit coerces suggestion fields with `String()`; the scan stores flags and suggestions as received (`RippleScopeModal.jsx:119, 133-141`). |
| Selector built from an id | `DocumentCanvas.jsx:357`, `DocumentParagraph.jsx:167` | Ids are local UUIDs, but imported backups do not validate paragraph contents (`validate.js:130-144`). A malformed id can throw; it cannot run script. |
| Model text in system prompts | `DocumentContext.jsx:425-440`, `RippleScopeModal.jsx:76-98` | Yes, document text, comments and other chats' titles, without delimiters. The scan's output is written into other conversations' documents (`RippleScopeModal.jsx:145-149`). The user must accept each suggestion, except that Accept All and Clear All apply all of them. |
| Blob download | `DocumentCanvas.jsx:208-214` | Document text as `text/markdown`; file name from the conversation title. |

---

## 6. Assessment (my judgement, not fact)

No requirement is met by existing code as it stands, so nothing below is rated A. A-grade building blocks are listed after the table.

| Requirement | Rating | What exists | What must change, or why it does not fit |
|---|---|---|---|
| Blocks model | B as a pattern, C as storage | A paragraph list of `{ id, type, text }` with `updateParagraphText`, `splitParagraph`, `mergeParagraph`, `setParagraphType` (`DocumentContext.jsx:196-236`) | Five types against the spec's ten. Annotations live inside the paragraph object. Storage is one record per conversation in `sbrd_documents`, while replies live in `messages`. Existing replies are Markdown strings needing conversion both ways. |
| Strike instead of delete | C | Native deletion plus a diff against `baseline` in an overlay | Struck text must be in the editable flow. The diff orders added before struck, interleaves phrases, works on whole words, cannot place a deletion among repeats, and treats split and join as edits. |
| One id per edit | C | Nothing. Ids exist for paragraphs, comments and suggestions only | Needs an edit record: block, offset, struck, added, state. The shared number space covers only chat, note, highlight and docket (`addresses.js:17`). |
| Anchors by block and offset | C for stored anchors, B for helpers | Comments: paragraph plus a string. Suggestions: a `find` string. Highlights: terms. `getTextOffset` and `setCursorAt` (`diff.js:42-72`) | The helpers suit DOM-to-offset mapping once they handle element anchors, both ends of a range, non-text atoms and struck spans. |
| "/" menu | B | Option table, substring filter, arrow, Enter, Escape, hover and click handling (`DocumentParagraph.jsx:22-27, 107-137, 365-395`) | Trigger on the keystroke at a block start instead of reading "/" back from the text. Keep the block's text on a type change. Add six types and "Text". Restore focus. Fix the `para.text`-only effect. Render it for every block type. |
| Enter and Backspace | B | The split and merge mutators and their focus hand-off | Re-home anchors on split and join (merge discards them today). Add list exit and unformat-before-join. Handle a selection. Scope the focus query to one reply. Prefer `beforeinput` input types to `keydown`. |
| Markup switch | B for the flag, C for rendering | `showMarkup` and its button (`DocumentCanvas.jsx:290-299`) | The spec inverts the design: markup is the editable view and clean is read-only. The transparent-text overlay should not be carried over. |
| Asks | B, mostly new | Comment capture from a selection, the floating tooltip, the Submit prompt's reply-plus-suggestions shape, and `MessageCard`'s own selection popover | Needs a point anchor as well as a range, a queued, sent and answered state, sending with the next prompt in `ChatContext.sendMessage` rather than a separate flow that forks a branch, and an in-place answer with undo. |
| Accept and reject | B | `acceptSuggestion`, `rejectSuggestion`, `ClaudeSuggestionCard`, `ClaudeInlineSuggestionPreview` (struck original plus replacement, in green) | Apply by offset splice, not `String.replace`. Keep the original so undo works. The preview is a duplicate paragraph below the text, not in the flow. Accept All also resets the user's own changes. |
| Ripple review | C for the flow, B for parts | The on/off flag, the sequential per-target loop with progress, id filtering of the response | Today it flags inconsistencies across user-picked chats. It is not branch-aware, has no link to a source edit and no review bar. Branch copies get new message ids with no link to their source (`db.js:618-628`); only `createdAt` and the text match. |

**Reusable close to as-is:** `CitationLink.jsx`; `ChartRenderer.jsx`; `provider.sendMessage` (`base.js:19`); the `AnnotationsContext` pattern of load-on-switch with a `loaded` gate and stable empty values; `wordDiff` for read-only comparison only; the card components in `cards.jsx` after restyling (they use gold for comment chrome, which `CLAUDE.md` reserves for the live action).

**Fragile by current practice:**
- **`execCommand`** for paste and the Space redirect.
- **Browser-default `contentEditable`** for all typing and deleting, with no `beforeinput` handler and no handling of drop, cut or formatting shortcuts.
- **IME handling** rests on a ref alone. Safari fires the committing Enter's `keydown` after `compositionend`, and Android keyboards often report `Unidentified` keys, so the Enter and Backspace handlers can be bypassed.
- **Diffing on every keystroke,** up to three times per changed paragraph, with quadratic memory. Acceptable for short paragraphs; not for a whole reply (see the measurements in 1c).
- **One editing host per block** loses cross-block selection and arrow navigation. The mockup uses one host per reply.
- **The mockup is not a production base either.** It applies edits by DOM surgery in a document-level `beforeinput` handler and stores `innerHTML` (`parliament-inline-editing-v5.html:596-598, 650-676`), with no composition handling. The spec itself says storage should be blocks.
- **`MessageCard` wraps each card in `motion.div layout="position"`** with an entrance delay of `index × 0.08` seconds (`MessageCard.jsx:24-30, 226-233`), which will work against live in-place edits.

**Decisions the existing code forces:**
1. Where inline formatting, tables, links, images and chart blocks go in a `{ id, type, text }` block. The spec's ten types do not cover what replies contain today.
2. Whether to keep `content` as the original string beside new block and edit data. I recommend keeping it: the spec says the model keeps reading the original, and about 25 readers plus `validate.js:52` expect a string.
3. Highlights are conversation-wide terms today; the spec anchors them to a passage.
4. New stores that reference message or block ids must be added to `restorePlan.js:67-97` and `validate.js:326-339`. `createBranch` copies only role, content, token count and time.
5. The hidden `<attached_file>` blocks inside stored prompts must survive a prompt edit.
6. `docketModel.js:27` describes a done step as locked, while the spec makes its prompt editable per branch. That is worth a line in `conflicts.md`.

---

## Read from code, not observed running

- Multi-line paste probably loses its line breaks in state, because rich `contentEditable` represents them as elements and the code reads `textContent`.
- After picking a slash option the re-created element is probably not refocused.
- Clicking a comment card in the document gutter probably clears the active comment at once, because the click bubbles to the row's `onClick` (`cards.jsx:126`, `DocumentParagraph.jsx:305`).
- Choosing "Add comment" on a heading or title shows no input and leaves the tooltip suppressed.
- During Continue the card probably keeps showing the old partial text until the stream ends (`messages-render.jsx:310-317`).
- The consequences of the app-wide document autosave (1i) were not checked against a live database.
- The entrance delay on long conversations was not measured.

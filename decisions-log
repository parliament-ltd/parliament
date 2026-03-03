# Decisions Log — Project Apollo

Architecture and design decisions with rationale. This document records what was decided, what alternatives were considered, and why. The decisions themselves are implemented in CLAUDE.md (what the app does) and ROADMAP.md (when and how to build it). This file preserves the reasoning trail for future reference.

---

## Stream Failure Recovery

### Decided
- Ghost text pattern: entire partial message fades to 50-60% opacity
- Thin dashed border with slow pulsing dot and "Response interrupted" label at break point
- Compact pill-style "Continue" button (accent blue on hover) at break point
- On continue: send conversation + partial response to API with trailing instruction to continue
- Progressive fade-back to full opacity as continuation streams in
- Partial messages saved to IndexedDB with incomplete: true flag

### Resolved

1. **Automatic retry vs explicit continue only**
   **Decision: V2+ as opt-in setting. Not in v0.1.0.**
   Silent retries violate the trust principle of never spending API budget without user awareness. The ghost text "Continue" button is lightweight enough that the friction is minimal. If added later, it would be a toggle in Settings → Context & Defaults: "Automatically resume interrupted responses" — default off. Risks remain: stitched responses can repeat or shift tone, retry loops can burn tokens silently, and detecting clean vs dirty break points is unreliable.

2. **Summary pre-generation timing for compressed branches**
   **Decision: Generate on first preview click (middle ground).**
   When the user selects Compressed Summary in the branch creation panel, the savings percentage and context projection display immediately (calculated locally from token counts — no API call). The summary itself generates only when the user clicks "Preview summary" for the first time. This fires one API call, and the result is cached in component state for the rest of the panel session. Switching to Full History and back reuses the cache. Closing and reopening the panel clears the cache (conversation may have changed). The "Create Branch" button is enabled without requiring a preview — users can commit without reading the summary if they trust the compression.

3. **Continue instruction phrasing**
   **Decision: Use a concise structural instruction appended as a user message after the partial assistant response.**
   Starting phrasing:
   > "Your previous response was interrupted. The partial response above is what was delivered. Continue exactly from where you left off — do not repeat, summarize, or restart any content that already appears above. Maintain the same tone, structure, and formatting."
   
   The conversation array sent to the API: `[...prior messages, { role: "assistant", content: partialResponse }, { role: "user", content: continueInstruction }]`. This phrasing should be tested against different interruption types (mid-sentence, mid-list, mid-code-block) during implementation and lives as a constant in the provider abstraction for easy iteration.

---

## Edge Cases — Resolved

### 4. Invalid or Expired API Key
**Status: Decided**

Key facts: Anthropic API keys don't expire automatically. They stay active until manually revoked or the account has billing issues.

**Validation at key entry (Settings page):**
- "Validate" button fires a lightweight API call (`/v1/messages` with minimal prompt)
- Differentiate by HTTP status:
  - 401 → "This API key is not valid. Please check your key and try again."
  - 403 / billing error → "This API key was recognized but your account may have insufficient credits or a billing issue. Please check your Anthropic dashboard."
  - 200 → Green success: "API key is valid — connected to Anthropic"
- Error text appears as faded red (`text-[#EF4444]`) below the input with an AlertCircle icon
- Input border turns red on invalid (`border-[#EF4444]`), resets when user starts typing
- Do not use the word "expired" — it implies a time-based mechanism that doesn't exist

**Mid-conversation key failure:**
- When a send fails with 401 or billing error, show a persistent banner above the input area (not a modal)
- Banner text: "Your API key is no longer working. Your conversation is safe — update your key in Settings to continue."
- Secondary line: "You can export your chat history from Settings → Data & Backups."
- Banner persists until key is updated or manually dismissed

**Not in v0.1.0:**
- No revocation system (Anthropic handles key revocation)
- No multi-key support (one key, one provider — revisit in V2 with multi-provider)
- No key age tracking or rotation reminders (keys don't expire; revisit in V2)
- Key "rotation" = paste new key over old one (already supported by current design)

### 5. Very Long Messages (Rendering Performance)
**Status: Decided**

- Token count indicator next to the send button showing estimated cost of current input
- Subtle warning color if input would consume >25% of remaining context window
- Informational only — no hard blocks. Power users get to drive
- Message list virtualization and expand/collapse for very long messages deferred to V2 if performance issues arise in testing

### 6. Empty States
**Status: Decided**

- Each empty state (no conversations, no highlights, no notes, no favorites) gets a designed placeholder
- Text-based with a relevant icon — no illustrations for v0.1.0
- Include a call to action where applicable (e.g., empty chat list: "Start your first conversation")
- Specific designs to be finalized during Step 15 polish phase

### 7. Browser Storage Full
**Status: Decided**

**Detection:**
- Check `navigator.storage.estimate()` on app startup and after every IndexedDB write
- Warning threshold: 80% usage. Critical threshold: 95%
- Store estimate in React context so components can read it

**User-facing indicators:**
- Settings → Data & Backups: storage bar showing used/quota, conversation count, message count
- Chat selector: subtle amber banner at 80%+ with "export or clean up" suggestion
- Chat view: persistent red banner at 95%+ with Export and Manage Chats action buttons

**Making cleanup actionable:**
- Per-conversation size indicator in the chat selector (subtle secondary text, always present)
- Size as a sortable column in the conversation list (alongside last edited, created)
- Selected-items size total in the bulk action bar during multi-select: "3 selected — 12.7 MB"

**On write failure (QuotaExceededError):**
- Message remains visible in React state but shows inline error: "This message couldn't be saved — storage is full."
- Trigger a modal explaining the situation with export option and storage stats
- No full read-only mode — app stays functional in memory, persistence failures surfaced individually

### 8. Rapid-Fire Sends
**Status: Decided**

- Send button transforms to Stop button while streaming (visual state change using `isStreaming` flag in `ChatContext`)
- Textarea remains editable during streaming so users can pre-compose their next message
- 500ms debounce guard on the send handler as a safety net against double-clicks and keyboard repeats
- Empty/whitespace-only input silently ignored (no error message)
- Rate limit (429) errors from Anthropic: brief inline message below input that auto-clears on next successful send
- No message queue, no semantic cache, no async queue, no input content filtering, no redundancy detection

### 9. Tab or Browser Crash Mid-Conversation
**Status: Decided**

**Incremental streaming persistence:**
- During streaming, persist a snapshot of the assistant message to IndexedDB every ~3 seconds (or ~100 tokens), marked `incomplete: true`
- On stream completion, final write flips to `incomplete: false`
- A crash during streaming becomes indistinguishable from a network failure — the ghost text recovery system handles both

**Startup integrity check:**
- On app load, scan for orphaned conversations (zero messages) and unresolved `incomplete: true` messages
- Orphaned conversations: silently deleted
- Incomplete messages: rendered in ghost text state with Continue/dismiss options
- No "crash detected" modal or notification — the app just looks correct on reopen

**Multi-store atomicity:**
- Branch creation and other multi-store operations wrapped in a single IndexedDB transaction
- No write-ahead log needed for v0.1.0

---

## Summary

All items resolved as of March 2026. Future decisions (V2+) should be appended below as new sections.

| # | Topic | Status | Priority |
|---|-------|--------|----------|
| 1 | Auto-retry with stitching | **Decided: V2+ opt-in** | Low for v0.1.0 |
| 2 | Summary pre-generation timing | **Decided: Generate on first preview click** | Before Step 11 |
| 3 | Continue instruction phrasing | **Decided: Starting phrasing defined** | Before Step 9 |
| 4 | Invalid/expired API key | **Decided** | High for v0.1.0 |
| 5 | Very long messages | **Decided** | Medium for v0.1.0 |
| 6 | Empty states | **Decided** | Medium for v0.1.0 |
| 7 | Browser storage full | **Decided** | Medium for v0.1.0 |
| 8 | Rapid-fire sends | **Decided** | High for v0.1.0 |
| 9 | Tab crash recovery | **Decided** | Low for v0.1.0 |

All v0.1.0 items resolved. Append V2+ decisions below as new sections.

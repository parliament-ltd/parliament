# Implementation Guide — Auto-Title Generation + Chat Selector Build-Out (V6)

## Overview

This guide covers two consecutive steps from the roadmap:

1. **Auto-title generation** — after first user→assistant exchange, background API call to generate a short title
2. **AI summary generation** — parallel to auto-title, generate a one-line summary for the chat selector
3. **Step 8: Chat Selector build-out** — V6 design: flat branch model, global view toggle, inline summaries/notes/highlights/branches, interactive count badges, Topics column, de-emphasis logic, zone-based click targets

## Files to modify

### Auto-Title + AI Summary Generation

| File | Change |
|------|--------|
| `src/providers/base.js` | Add `generateTitle(apiKey, messages, model)` and `generateSummary(apiKey, messages, model)` to the interface |
| `src/providers/anthropic.js` | Implement both — lightweight non-streaming API calls |
| `src/stores/ChatContext.jsx` | After first assistant response completes, trigger both title and summary generation in background |
| `src/stores/ConversationContext.jsx` | Ensure `updateConversation` supports `title`, `aiSummary`, `notes`, `tags`, `familyId`, `parentId`, `parentTitle` fields |

### Chat Selector Build-Out

| File | Change |
|------|--------|
| `src/views/SelectorView.jsx` | Full rewrite to V6 design — reference `chat-selector-v6.jsx` mockup |

### IndexedDB Schema Changes

| Store | New/Changed Fields |
|-------|-------------------|
| `conversations` | Add: `aiSummary` (string), `familyId` (string, nullable), `parentTitle` (string, nullable, denormalized), `tags` (string array) |
| `notes` | Existing `messageId` field maps to V6's `messageRef`. Notes created from the table have `messageId: null` |
| `highlights` | Add: `multiline` (boolean) — or derive from text length at display time |

## Key Architecture Changes from Previous Version

### Flat Branch Model

The old SelectorView used a nested model: root conversations with branches nested underneath via expand/collapse. The V6 design treats all conversations as flat peers in the table.

**What this means in code:**
- Remove `rootsWithBranches` / `allBranches` separation logic
- Remove `expandedChats` state and `toggleExpanded` handler
- Remove `BranchRow` component entirely
- All conversations (parents and branches) live in a single flat list
- Branch relationships are only visible in the Branches global view
- `allVisibleIds` now maps directly from `sortedChats` (no nested branch IDs)

### Global View Toggle + Row Overrides

**New state:**
```javascript
const [globalView, setGlobalView] = useState('summary')    // 'summary' | 'notes' | 'highlights' | 'branches'
const [rowOverrides, setRowOverrides] = useState({})        // { chatId: 'notes' | 'highlights' | 'branches' | null }
```

**Effective view per row:** `rowOverrides[chat.id] || globalView`

**Changing global view clears all overrides:** `handleGlobalViewChange = (view) => { setGlobalView(view); setRowOverrides({}) }`

**Badge click toggles override:** clicking a badge when override is already that view → clears it back to global. When override is something else → sets it.

### Row De-emphasis

Rows with no content for the active **global** view render at 45% opacity. Per-row overrides are not considered for de-emphasis — only the global view matters. This keeps the visual pattern consistent.

```javascript
const isRowDeemphasized = (chat) => {
  if (globalView === 'notes') return !chat.notes || chat.notes.length === 0
  if (globalView === 'highlights') return !chat.highlights || chat.highlights.length === 0
  if (globalView === 'branches') {
    const isBranch = !!chat.parentId
    const hasChildren = conversations.some(c => c.parentId === chat.id)
    return !isBranch && !hasChildren
  }
  return false  // Summary view: no de-emphasis
}
```

### Smart Pin Toggle

Replaces separate Pin/Unpin actions. Single icon, dynamic label:
```javascript
const pinLabel = useMemo(() => {
  const anyUnpinned = [...selected].some(id => {
    const c = conversations.find(ch => ch.id === id)
    return c && !c.pinned
  })
  return anyUnpinned ? 'Pin' : 'Unpin'
}, [selected, conversations])
```

### Search Expanded

Old: searched only titles. New: searches titles, AI summaries, notes text, tags, and parent titles.

### Topics Column

Replaces the Size column. Tags displayed as stacked colored pills with a color lookup map. Non-sortable — the Size sort option is removed from the header.

### Family Colors

```javascript
const FAMILY_COLORS = ['#4A7AE5', '#22C55E', '#E5A620', '#7C6CD4', '#EF4444', '#06B6D4', '#EC4899', '#F97316']

function buildFamilyColorMap(conversations) {
  const families = [...new Set(conversations.filter(c => c.familyId).map(c => c.familyId))]
  const map = {}
  families.forEach((fid, i) => { map[fid] = FAMILY_COLORS[i % FAMILY_COLORS.length] })
  return map
}
```

### Lighter Metadata

All column header labels and metadata values (Edited, Created) use `#C0C8D4` instead of the old `#6B7C93`. Footer text also uses `#C0C8D4`. Favorites sidebar count badge also uses `#C0C8D4`.

### Simplified Footer

Old: showed conversation count, branch count, highlight count, etc.
New: shows only conversation count and total storage size.

## Integration Order

1. Apply `providers/base.js` changes (add `generateSummary` to interface)
2. Apply `providers/anthropic.js` changes (implement `generateSummary`)
3. Apply IndexedDB schema changes (add fields to conversations store)
4. Apply `stores/ConversationContext.jsx` changes (support new fields)
5. Apply `stores/ChatContext.jsx` changes (trigger both title and summary generation)
6. Apply `views/SelectorView.jsx` V6 rewrite
7. Test end-to-end: send a message → title and summary auto-generate → appear in selector → global view toggle works → badge overrides work → search finds notes/tags → bulk actions work

## Notes

- Auto-title and AI summary both use `haiku` (cheapest model) regardless of the user's selected model
- Both are fire-and-forget — failures are silent (conversation keeps "New conversation" / empty summary)
- The title prompt asks for 2-6 words, no quotes, no periods
- The summary prompt asks for one sentence, max 120 characters, describing what was discussed
- Click-to-edit titles in the selector allow users to override auto-generated titles
- Notes can be created from the chat selector table (general notes, `messageRef: null`) or from the conversation UI (message-anchored, `messageRef: <number>`)
- Tag generation is TBD — can be part of the same summary call or a separate lightweight call. Stored as `tags: string[]` on the conversation record

# PR-19g — Library jargon audit

Check each row. Leave the old as-is to skip, or edit the "New" cell to
override my suggestion. I'll apply approved rewrites in one commit on
this PR-19g branch after you sign off.

**Legend:**
- ✅ I think this needs a rewrite (suggested below)
- 🟡 Borderline — flag if it feels jargony to you
- ⬜ Suggested name/displayName change (separate from description)

---

## Rooms (5 available + 2 coming-soon)

### ✅ Data Workspace
- **Old:** A canvas for charts and tables with a chat panel to help you analyze. The Pelican experience, decomposed.
- **New:** A canvas for charts and tables with a chat panel for analysis. Drop in a CSV or XLSX and ask Claude what's in it.
- [ ] Approve

### 🟡 Drafting Desk
- **Old:** A document canvas with margin annotations. Tracked changes, comments, and ripple analysis ride alongside the draft.
- **New:** A document writing surface with tracked changes and margin comments. Claude leaves comments and flags consistency issues across paragraphs as you draft.
- [ ] Approve  [ ] Keep old

### 🟡 Pocket Chat
- **Old:** A focused mobile chat. Highlights, branches, and review just a tap away in the sheet.
- **New:** A focused mobile chat. Highlights, branches, and review are one tap away in the slide-up sheet.
- [ ] Approve  [ ] Keep old

### ⬜ Kingfisher (coming soon) — rename?
- **Old name:** Kingfisher
- **Suggested new name:** Reading Room
- **Old description:** Deep reading. A wide reading area with annotation gutters for working through long documents and research.
- **New description:** A wide reading surface for long documents and research, with annotation gutters down the side. For when the work is reading, not chatting.
- [ ] Approve name + description
- [ ] Approve description only, keep name "Kingfisher"
- [ ] Keep both old

### ⬜ Starling (coming soon) — rename?
- **Old name:** Starling
- **Suggested new name:** Side-by-Side
- **Old description:** Two panes side by side for collaboration. Compare conversations or pair a chat with a document.
- **New description:** Two equal panes side by side. Compare two conversations, or pair a chat with a document.
- [ ] Approve name + description
- [ ] Approve description only, keep name "Starling"
- [ ] Keep both old

### (Writing Studio, Quiet Room — descriptions are clear, no change.)

---

## Layouts (5 available + 2 coming-soon)

### 🟡 Canvas-centric
- **Old:** A center artifact (chart, table) flanked by a left rail and a chat panel. For working with data and files.
- **New:** A center canvas (chart, table, dashboard) flanked by a sidebar and a chat panel. For working with data and files.
- [ ] Approve  [ ] Keep old

### 🟡 Document-centric
- **Old:** An editable document body with margin gutters for comments and analysis. For writing and editing.
- **New:** An editable document with margin gutters for comments and analysis alongside the draft. For writing and editing.
- [ ] Approve  [ ] Keep old

### (Three-panel, Single column with sheet, Stacked sections, Reading pane, Split view — descriptions are clear, no change.)

---

## Components

### ✅ blueprint
- **Old:** Floor-plan view of the rooms the user has built; cross-references chat rows.
- **New:** A floor-plan view of every room you've built. Hover a chat row to spotlight which room it lives in.
- [ ] Approve

### ✅ branches
- **Old:** Branch navigation list with parent/child links; owns the Branch creation panel.
- **New:** A list of conversation branches with links to the parent and any child branches. Includes a panel for creating new branches.
- [ ] Approve

### ✅ chats
- **Old:** Conversation list with search, view toggle, bulk actions; publishes row-hover on the bus.
- **New:** A searchable conversation list with view toggles and bulk actions. Hovering a row highlights its room on the blueprint.
- [ ] Approve

### ✅ claude-comments
- **Old:** Per-paragraph comment thread with reply lifecycle. Comments anchor to selected text; Claude replies arrive on Submit & Branch.
- **New:** Per-paragraph comment threads in the document margin. Highlight text to add a comment; Claude responds when you submit the draft for review.
- [ ] Approve

### ✅ collab-mode
- **Old:** System-prompt presets and saved Parrot Personas applied to the next user send.
- **New:** Saved instructions and personas applied to your next message. Set Claude's tone, role, or focus before sending.
- [ ] Approve

### 🟡 column-inspector
- **Old:** Type-tagged column list with null counts, sample values, and an expand-to-detail row for the active dataset.
- **New:** A column list for your dataset, with types, null counts, sample values, and an expandable detail row.
- [ ] Approve  [ ] Keep old

### 🟡 context
- **Old:** Token / message / context-window meter with threshold warnings.
- **New:** A meter showing how much of Claude's context window you've used, with warnings when you're approaching the limit.
- [ ] Approve  [ ] Keep old

### ✅ document-canvas
- **Old:** Paper-style writing surface with tracked changes, slash-command menu, and a Submit & Branch flow that snapshots the current draft.
- **New:** A paper-style writing surface with tracked changes and a slash-command menu. Submitting the draft creates a new branch and snapshots the current version.
- [ ] Approve

### ✅ favorites
- **Old:** Cross-cutting saved-message snippets pulled from every conversation.
- **New:** Saved message snippets from every conversation in one place.
- [ ] Approve

### ✅ file-shelf
- **Old:** Staged files for data-workspace rooms. Drop CSV/XLSX/JSON; toggle which files Claude can reference.
- **New:** A staging area for data files (CSV, XLSX, JSON) used in this room. Toggle which files Claude can reference.
- [ ] Approve

### 🟡 highlights
- **Old:** Saved highlight terms with occurrence navigation, color tagging, and inline add form.
- **New:** Saved highlight terms with color tags and an inline add form. Jump between occurrences with one click.
- [ ] Approve  [ ] Keep old

### 🟡 input
- **Old:** Message composer with send / stop, attachment, and tool-toggle menu.
- **New:** The message box, with send / stop, attachments, and a menu for tool toggles like Web Search.
- [ ] Approve  [ ] Keep old

### ✅ library
- **Old:** Browse rooms, layouts, components, schemes, and (placeholder) resources.
- **New:** Browse rooms, layouts, components, schemes, and resources to install or learn from.
- [ ] Approve

### ✅ ripple-analysis
- **Old:** Cross-paragraph and cross-document consistency flags. Runs on Submit & Branch; expand scope to scan other chats.
- **New:** Flags consistency issues across paragraphs and across documents. Runs when you submit a draft; widen the scope to scan other chats.
- [ ] Approve

### ✅ summary-dashboard
- **Old:** KPI cards, AI-generated insights (on click), distributions, and data-quality flags for the active dataset.
- **New:** Headline-stat cards, on-demand AI insights, value distributions, and data-quality flags for the current dataset.
- [ ] Approve

### ✅ toc (Table of Contents)
- **Old:** Scrollable list of user-message labels that scroll-jump to their target on click.
- **New:** A scrollable table of contents for the conversation. Click any entry to jump to that point.
- [ ] Approve

### ✅ voice-input
- **Old:** Mic button that publishes Web Speech API transcripts on the room bus.
- **New:** A mic button that transcribes speech to text using your browser's voice recognition.
- [ ] Approve

### ✅ web-search
- **Old:** Arm the active provider's web_search tool for the next outgoing message. Uses API credits.
- **New:** Lets Claude search the web on your next message. Uses Anthropic API credits.
- [ ] Approve

### (chart-canvas, file-attach, messages, notes, quick-stats, recent-activity, review, scratchpad, table-canvas — descriptions are clear, no change.)

---

## Schemes (6)

(Descriptions are short and clear. No changes proposed.)

---

## Resources (6, all coming-soon)

### ✅ Marketing-adjacent intro video
- **Old:** Marketing-adjacent intro video. Homepage tour, a room in action, the build flow at a high level.
- **New:** A short intro video. Homepage tour, a room in action, and the build flow at a glance.
- [ ] Approve

### (Other 5 resources — descriptions are clear, no change.)

---

## Notes

- **Rename impact:** if you approve renaming Kingfisher → Reading Room
  or Starling → Side-by-Side, those changes propagate to: the template's
  `displayName` in [src/lib/seedTemplates.js](src/lib/seedTemplates.js),
  the library card title, the library overlay title, and (eventually)
  any blueprint room label if a user instantiates one of them. No URL
  or ID changes — the template ID stays `kingfisher@1.0` /
  `starling@1.0` to avoid breaking installs.
- **Seed-version bumps:** every changed room description bumps
  `SEED_VERSIONS` for that template so users with an existing install
  re-seed and see the new copy. Layouts seed is fire-once (no version
  bump), so changes to layout descriptions only affect fresh installs
  until we add a layout-seed-version tracker.
- **Component descriptions** are not user-facing during normal use —
  they only show in the library overlay. Worth fixing anyway since
  the library is meant to be browsable.

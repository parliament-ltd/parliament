# Deprecated

Code retired from the app with Stefan's approval, one item at a time
(CLAUDE.md: nothing is deleted without approval; approved items move here
first). Nothing here is imported or built. Each file says what it was, which
retirement line approved it, and how to put it back.

| File | Retirement | Approved | What it was |
|---|---|---|---|
| `anthropic-metadata-calls.js` | R32 | 21 October 2026 | The three silent requests for a chat's title, summary and tags, replaced by one named request (C62) |
| `views/HomepageView.jsx` | R3 | 22 October 2026 | The Study, the homepage view at /, with its first-run gate (R15) |
| `views/SelectorView.jsx` | R4 | 22 October 2026 | The /chats page |
| `views/SelectorLayout.jsx` | R4 | 22 October 2026 | The /chats layout, with its tooltip tour (R15) |
| `catalog/entries/blueprint.jsx` | R1 | 22 October 2026 | The homepage's Blueprint section |
| `catalog/entries/blueprint-render.jsx` | R1 | 22 October 2026 | The homepage's Blueprint section, drawn |
| `lib/blueprintShapes.js` | R1 | 22 October 2026 | The Blueprint section's shapes and packing |
| `components/BlueprintOverlay.jsx` | R2 | 22 October 2026 | The Blueprint overlay and its Cmd/Ctrl+. shortcut |
| `catalog/entries/chats.jsx` | R5 | 22 October 2026 | The homepage's Chats section |
| `catalog/entries/chats-preview.jsx` | R5 | 22 October 2026 | The homepage's Chats section, its preview |
| `catalog/entries/favorites.jsx` | R6 | 22 October 2026 | The homepage's Favorites section |
| `catalog/entries/favorites-preview.jsx` | R6 | 22 October 2026 | The homepage's Favorites section, its preview |
| `catalog/entries/quick-stats.jsx` | R7 | 22 October 2026 | The homepage's quick stats |
| `catalog/entries/quick-stats-render.jsx` | R7 | 22 October 2026 | The homepage's quick stats, drawn |
| `catalog/entries/recent-activity.jsx` | R7 | 22 October 2026 | The homepage's recent activity |
| `catalog/entries/recent-activity-render.jsx` | R7 | 22 October 2026 | The homepage's recent activity, drawn |
| `catalog/entries/scratchpad.jsx` | R7 | 22 October 2026 | The homepage's scratchpad |
| `catalog/entries/scratchpad-render.jsx` | R7 | 22 October 2026 | The homepage's scratchpad, drawn |
| `catalog/entries/library.jsx` | R8 | 22 October 2026 | The homepage's Library section |
| `catalog/entries/library-preview.jsx` | R8 | 22 October 2026 | The homepage's Library section, its preview |
| `components/BackupStatusIndicator.jsx` | R27 | 22 October 2026 | The backup status dot in the top bar |
| `components/BackupReminderBanner.jsx` | R27 | 22 October 2026 | The backup banner on the homepage (its rules stay in lib/backupReminder.js, which Records' line uses) |
| `components/TourTooltip.jsx` | R15 | 22 October 2026 | The tooltip tours of the homepage, /chats and Settings |
| `lib/homepageSeed.js` | R3, R11 | 22 October 2026 | The seed that gave every install the Study, the homepage room |
| `styles/homepage.css` | R12 (first part) | 22 October 2026 | The rules of `src/index.css` that only the homepage used: Blueprint, Chats, its bulk toolbar, Favorites |

Files keep their old path under `src/deprecated/`, so putting one back is a move. Their imports point where they used to and are not resolved here.

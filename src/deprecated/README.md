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
| `components/ReviewModal.jsx` | R40 | 27 October 2026 | The Review modal: a synthesis of the open chat and questions for reflection; replaced by the Reflection board (C237 (d)) |
| `catalog/entries/review.jsx` | R40 | 27 October 2026 | The Review block, which opened the modal |
| `catalog/entries/review-render.jsx` | R40 | 27 October 2026 | The Review block, drawn, and its synthesis call |
| `catalog/entries/review-preview.jsx` | R40 | 27 October 2026 | The Review block, its preview |
| `views/SettingsView.jsx` | R37, with R10 and R28 | 23 October 2026 | The old Settings page at /settings, with its `.apb` and JSON export buttons and the options nothing read; /settings now opens the Settings board |
| `views/EditorView.jsx` | R16 to R21, R33 | 27 October 2026 | The old room editor at /edit and /edit/:id: its canvas, rails, tray, dialogs and drag and drop; replaced by the Lab (stage 13, C250 (b)) |
| `views/BuildView.jsx` | R14 | 27 October 2026 | The build wizard at /build; replaced by new:room guided, the templates in the Library and duplicate: (C250 (b)) |
| `components/editor/EditorApplyRoomDialog.jsx` | R21 | 27 October 2026 | The dialog that applied another room to the one in the editor; replaced by duplicate: |
| `components/editor/EditorCanvas.jsx` | R16, R33 | 27 October 2026 | The editor's canvas, with drag and drop, the Showcase glow and connector lines; replaced by the Canvas board |
| `components/editor/EditorHoldingTray.jsx` | R17 | 27 October 2026 | The holding tray, where removed blocks waited; replaced by rm: and undo: |
| `components/editor/EditorLeftRail.jsx` | R19 | 27 October 2026 | The editor's left rail; replaced by the Library board |
| `components/editor/EditorLibraryMode.jsx` | R19 | 27 October 2026 | The editor's library mode; replaced by the Library board |
| `components/editor/EditorMigrationDialog.jsx` | R21 | 27 October 2026 | The layout-swap dialog; replaced by the Enter line saying what moves |
| `components/editor/EditorPreviewSheet.jsx` | R20 | 27 October 2026 | The preview sheet; replaced by trying the room with p> |
| `components/editor/EditorRightRail.jsx` | R18 | 27 October 2026 | The inspector, the editor's right rail, where panel buttons were set; replaced by the room line and the Blocks board (panel buttons stay as stored) |
| `components/editor/EditorTopBar.jsx` | R19 | 27 October 2026 | The editor's top bar and its pills; replaced by the bar |
| `components/build/TemplateGallery.jsx` | R14 | 27 October 2026 | The wizard's template gallery; replaced by the templates in the Library |
| `components/build/wizard/DensityLayoutStep.jsx` | R14 | 27 October 2026 | A step or part of the build wizard; replaced by new:room guided |
| `components/build/wizard/DeviceStep.jsx` | R14 | 27 October 2026 | A step or part of the build wizard; replaced by new:room guided |
| `components/build/wizard/FeaturesStep.jsx` | R14 | 27 October 2026 | A step or part of the build wizard; replaced by new:room guided |
| `components/build/wizard/IgnitionStep.jsx` | R14 | 27 October 2026 | A step or part of the build wizard; replaced by new:room guided |
| `components/build/wizard/LayoutPreviewOverlay.jsx` | R14 | 27 October 2026 | A step or part of the build wizard; replaced by new:room guided |
| `components/build/wizard/LayoutWireframe.jsx` | R14 | 27 October 2026 | A step or part of the build wizard; replaced by new:room guided |
| `components/build/wizard/NameSchemeStep.jsx` | R14 | 27 October 2026 | A step or part of the build wizard; replaced by new:room guided |
| `components/build/wizard/PurposeStep.jsx` | R14 | 27 October 2026 | A step or part of the build wizard; replaced by new:room guided |
| `components/build/wizard/StepHeader.jsx` | R14 | 27 October 2026 | A step or part of the build wizard; replaced by new:room guided |
| `components/build/wizard/TileGrid.jsx` | R14 | 27 October 2026 | A step or part of the build wizard; replaced by new:room guided |
| `components/build/wizard/WizardEntry.jsx` | R14 | 27 October 2026 | A step or part of the build wizard; replaced by new:room guided |
| `components/build/wizard/WizardReceipt.jsx` | R14 | 27 October 2026 | A step or part of the build wizard; replaced by new:room guided |
| `components/build/wizard/WizardTrack.jsx` | R14 | 27 October 2026 | A step or part of the build wizard; replaced by new:room guided |
| `lib/editorReducer.js` | R16 to R21 | 27 October 2026 | The old editor's state and its actions |
| `lib/editorHistory.js` | R16 to R21 | 27 October 2026 | The old editor's undo history; replaced by undo: |
| `lib/buildWizard.js` | R14 | 27 October 2026 | The build wizard's choices turned into a room |
| `lib/layoutMigration.js` | R36 | 27 October 2026 | The old editor's layout swap, with SLOT_FALLBACKS, one of the old copies of slot data; replaced by the layout manifests and the layout rule (lib/lab.js) |

Files keep their old path under `src/deprecated/`, so putting one back is a move. Their imports point where they used to and are not resolved here.

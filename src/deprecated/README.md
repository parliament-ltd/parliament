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
| `views/ChatView.jsx` | R42 | 27 October 2026 | Today's chat page at /chat/:id, one chat in its room, full page, with a wrench to the old editor; /chat/:id now shows the chat in its room on the new screens |
| `components/CollabModal.jsx` | R22, R23 | 27 October 2026 | The collaboration window and its persona editor; replaced by frameworks in the bar (personas became your frameworks, A13) |
| `catalog/entries/collab-mode.jsx` | R22 | 27 October 2026 | The collaboration block, which opened that window |
| `catalog/entries/collab-mode-render.jsx` | R22 | 27 October 2026 | The collaboration block, drawn |
| `catalog/entries/collab-mode-preview.jsx` | R22 | 27 October 2026 | The collaboration block, its preview |
| `stores/CollabModeContext.jsx` | R22 | 27 October 2026 | Collaboration mode's state, kept in memory only |
| `catalog/entries/web-search.jsx` | R24 | 27 October 2026 | The web search block; now a feature of the room's input, carried by the bar (C248) |
| `catalog/entries/web-search-render.jsx` | R24 | 27 October 2026 | The web search block, drawn; now a feature of the room's input, carried by the bar (C248) |
| `catalog/entries/web-search-preview.jsx` | R24 | 27 October 2026 | The web search block, its preview; now a feature of the room's input, carried by the bar (C248) |
| `catalog/entries/voice-input.jsx` | R24 | 27 October 2026 | The voice input block; now a feature of the room's input, carried by the bar (C248) |
| `catalog/entries/voice-input-render.jsx` | R24 | 27 October 2026 | The voice input block, drawn; now a feature of the room's input, carried by the bar (C248) |
| `catalog/entries/voice-input-preview.jsx` | R24 | 27 October 2026 | The voice input block, its preview; now a feature of the room's input, carried by the bar (C248) |
| `catalog/entries/file-attach.jsx` | R24 | 27 October 2026 | The file attach block; now a feature of the room's input, carried by the bar (C248) |
| `catalog/entries/file-attach-render.jsx` | R24 | 27 October 2026 | The file attach block, drawn; now a feature of the room's input, carried by the bar (C248) |
| `catalog/entries/file-attach-preview.jsx` | R24 | 27 October 2026 | The file attach block, its preview; now a feature of the room's input, carried by the bar (C248) |
| `catalog/entries/input-render.jsx` | R25 | 27 October 2026 | The room's own composer, drawn by the input block; the bar is the composer |
| `catalog/entries/input-preview.jsx` | R25 | 27 October 2026 | The input block's preview, the composer |
| `components/core/InputArea.jsx` | R25 | 27 October 2026 | The composer itself: the message box, send and stop, the + menu |
| `components/BranchCreationPanel.jsx` | R26 | 27 October 2026 | The branch panel: a branch with the whole history or from a summary; replaced by new:branch, open: with a summary and again: |
| `stores/BranchPanelContext.jsx` | R26 | 27 October 2026 | The branch panel's state |
| `components/BranchShortcutHandler.jsx` | R26 | 27 October 2026 | Cmd/Ctrl+Shift+B for the branch panel, on today's chat page |
| `hooks/useMode.js` | R30 | 27 October 2026 | The V2 mode loader hook, used by nothing |
| `components/core/ToolToggles.jsx` | R30 | 27 October 2026 | Toggle buttons for a room's tools, used by nothing |
| `components/core/CitedMarkdown.jsx` | R30 | 27 October 2026 | Markdown with citation marks, used by nothing |
| `public/flight_logo.png` | R30 | 27 October 2026 | An old logo image, used by nothing; it was served from `public/` |
| `components/HomepageTopBar.jsx` | R9 | 22 October 2026, moved 27 October | The homepage's top bar, above the Study |
| `lib/exportAllData.js` | R10 | 22 October 2026, moved 27 October | The old JSON export, once in `db.js`; its files still restore |
| `hooks/useShimmer.js` | R43 | 27 October 2026 | The power-on shimmer hook, used by nothing; the ignition is `chrome/ignition.js` |
| `styles/index-old.css` | R12 (second part) | 22 October 2026, moved 27 October | The 167 rules of `src/index.css` that nothing live draws: the old editor, the wizard, the old Settings, /chats, the section drag |

Files keep their old path under `src/deprecated/`, so putting one back is a move. Their imports point where they used to and are not resolved here.

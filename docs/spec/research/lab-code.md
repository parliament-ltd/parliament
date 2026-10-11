<!-- The Lab and the catalogue: the existing code and what can be salvaged
     Read-only audit by a research agent, 11 October 2026, of branch
     claude/almanac-docket-inventory at b7f3419. Filed as delivered, with paths
     made relative to the repo root. Facts first; the auditor's opinion is in
     its assessment section and carries no authority of its own. -->

# The Lab and the catalogue: map of the existing code and what can be salvaged

Repo root ``, branch `claude/almanac-docket-inventory`, HEAD `b7f3419`. Read-only: nothing was created, edited or deleted.

Conventions: I give the absolute path the first time a file appears in a section and `File.jsx:line` after that. "Wired" means the production render reads the value. For fit judgments I also read `docs\spec\arrangements-boards-blocks-decisions.md` and the data model inside `docs\spec\parliament_lab_v7_blocks.html` (lines 976-1066, 1524-1847). Both are untracked files in the working tree.

## 0. Headline findings

1. **A room's scheme is applied two different ways.** The chat route sets `data-scheme` on `<html>` (global). The editor canvas sets it on its own wrapper (scoped). The CSS selectors support scoping, but the dark and Parliament high-contrast variants do not (section 6).
2. **There is no command layer.** No parser, verb table or name resolver exists in `src` (not found). The reducer has a primitive for most commands, but every one takes ids, refs and slot ids. Nothing resolves names, picks a first free slot, checks capacity or refuses required blocks.
3. **`slotTargets` is declared on all 27 manifests and never consulted when placing.** Shipped templates and the wizard contradict it in at least 9 places, and no component targets the `outline` slot. Capacity is never enforced.
4. **The slot vocabulary does not match the new design.** Code has 13 slot ids with `single`/`stack` capacity. The v7 mockup uses five words (`left`, `right`, `main`, `input`, `sheet`) with numeric capacities. This is the largest structural gap.
5. **Layout knowledge is duplicated in about ten places**, scheme knowledge in five, block metadata in six. Refs are spelled three ways (`x@1.0`, `x@^1.0`, bare name), which already causes visible bugs.
6. **Web search and file attach render nothing** and talk to input over the room event bus. `InputArea.jsx` already takes those features as props, so folding them in is mostly moving about 250 lines and writing a mode-file migration.
7. **Undo is a whole-state snapshot (50 deep)**, so "a layout change drops a block and `undo:` restores it" already works mechanically. Name and device are not undoable, typing in a config field burns one step per keystroke, and undo after save leaves the dirty flag wrong.
8. **15 of the 33 config keys declared by room blocks are not read by their render**, including messages `density` and `showTimestamps` and highlights `defaultColor`.
9. **`deviceClass` is stored but nothing renders from it.** Layouts switch to their phone tree on `window.innerWidth < 768`.
10. **`input@1.0` takes the conversation id from the URL** (`useParams().id`), so it cannot send from `/edit/:roomId`.
11. **`@dnd-kit` is imported by six files.** One is the homepage layout, which the layout registry loads at boot, so the dependency cannot be dropped until `stacked-sections` is dealt with.

---

## 1. EditorView and `src/components/editor/`

Total: 5,092 lines (EditorView 937 + nine editor components 4,155).

**`src\views\EditorView.jsx` (937 lines).** Route component for `/edit` (blank), `/edit/:roomId` and `/edit-home`. Props: `scope = 'room'`, `blank = false` (line 113). It owns the draft through `useReducer(editorHistoryReducer)` (129-133) and holds local state `loaded`, `loadError`, `saving`, `toast`, `pendingLayoutSwap`, `pendingRoomApply`, `previewOpen`, `modes`, `libraryOpen`, `leftRailOpen` (137-158). Non-drag logic: load (161-200), `handleSave` (406-442), `handleBuild` (452-476, saves then goes to `/build?ignite=`), keyboard undo/redo/Esc (482-510), Build/Edit pill forking `onStartCopy`/`onSwitchToEdit` (233-289), Library commit `handleCommitLibrary` (333-403), and the pure helper `applyBagToMode` (46-111). Under 768px it renders `EditorTooNarrow` instead (128, 652-665, 893-937). **Drag and drop:** import (18), sensors (515-518), `collisionDetection` (528-533), `handleDragEnd` (535-643), and the `<DndContext>` wrapping the whole render (718-879). `handleDragEnd` is the editor's real controller: it is the only place that turns a user gesture into `PLACE_COMPONENT`, `MOVE_COMPONENT`, `RESTORE_FROM_TRAY`, a layout swap or a room apply.

**`...\src\components\editor\EditorTopBar.jsx` (317).** Back, "The Lab" crumb, device chip, scheme chip, Library/Build/Edit pills, undo/redo, Preview, and one primary button that reads Build when `meta.builtAt == null`, else Save (89). 21 props (30-72), no state. Disabled reasons are computed at 98-108. No drag code; only a tooltip that mentions dropping (198). Quirk: the scheme chip calls `onSchemeChange(schemeRef)` with the current ref (195), which dispatches a no-op `APPLY_SCHEME`, marks the room dirty, adds an undo step and strips `scheme.sourceRoomId`.

**`...\editor\EditorLeftRail.jsx` (530).** Four tabs (Layouts, Components, Schemes, Rooms) with search. Props: `scope, currentLayoutRef, currentSchemeRef, placedComponentRefs, catalogEntries, modes, defaultTab, open, onToggle`. State: `tab` (synced to `?tab=`), `layouts` (read from IndexedDB `libraryLayouts`, 82-95), `search`, `prevQuery`. **Drag:** four `Draggable*Card` wrappers using `useDraggable` (414-509). Clicking a card does nothing ("drag is the only verb", 23-24). Not drag-specific: filter helpers (245-281), `sortRooms` (521-530), the surface check (328-329).

**`...\editor\EditorCanvas.jsx` (384).** Draws the draft as a schematic: slot zones with placeholder block cards. Props: `mode, selection, catalogEntries, onSelectRoom, onSelectSlot, onSelectComponent`; no state. Holds two tables: `AREA_KIND_BY_SLOT` (19-33) and `LAYOUT_GEOMETRY` (51-101, Tailwind grid classes per layout, a hand-made approximation of each layout renderer). `ComponentSkeleton` (341-384) draws fake content, with special cases for messages, input and context. It applies the scheme scoped: `data-scheme={schemeAttr}` on the wrapper (116-121, 221). **Drag:** `CanvasDropTarget` (`useDroppable` id `canvas-root`, 212-235), `SlotDropTarget` (`useDroppable` `slot-<id>`, 239-298, with "Drop a component here" copy), `ComponentPreview` (`useDraggable` `placed-<id>`, 306-336).

**`...\editor\EditorRightRail.jsx` (728).** The inspector. Three collapsible sections: Layout (171-210, with `PANEL_TOGGLE_SLOTS` at 28-37), Room (309-370: name, device, scheme select), Components (214-281). Props: `mode, selection, catalogEntries, onUpdateConfig, onSetName, onSetDeviceClass, onApplyScheme, onSetPanelButton, onRemoveComponent`. State: three open flags, `expandedComponentId`, `prevSelKey`. `ComponentField` (582-651) is schema-driven: boolean gives a toggle, number a number input, enum a segmented control up to 4 options and a select beyond, string a text input, object/array a read-only hint. `ChosenHomeSection` (377-448) is the "Make this room your home" switch. Private primitives `Field, SectionLabel, Hint, Toggle, Segmented` (653-728) duplicate the shared ones in `src\components\`. No drag code, only copy that mentions dropping (174, 190, 220, 223, 315, 573).

**`...\editor\EditorHoldingTray.jsx` (103).** The strip under the canvas. Props: `tray, onDismiss`. Each chip is a `useDraggable` (59-68) with `fromTray: true`. It is entirely drag-dependent: dragging a chip onto a slot is the only way to restore it.

**`...\editor\EditorMigrationDialog.jsx` (148).** Modal listing "X goes to slot Y" and "X goes to the holding tray (reason)" from a migration plan. Props: `targetLayoutRef, plan, mode, catalogEntries, onCancel, onConfirm`. No drag code, but it opens only from a layout drop (`EditorView.jsx:579-585`). Has its own `friendlyLayoutName` map (139-148).

**`...\editor\EditorApplyRoomDialog.jsx` (250).** Modal with Layout / Scheme / Components toggles and a per-component checklist. Props: `sourceMode, currentMode, catalogEntries, onCancel, onConfirm, onOpenHomepageEditor`. State: `applyLayout, applyScheme, applyComponentsRaw, componentChecked`. Opens only from a room drop (`EditorView.jsx:545-564`).

**`...\editor\EditorPreviewSheet.jsx` (79).** Slide-in sheet that renders `<RoomShell mode={mode} />` on the unsaved draft with `pointerEvents: 'none'` (65-70). Props: `open, mode, onClose`. It sets no `data-scheme`, so the preview shows the page's scheme, not the room's.

**`...\editor\EditorLibraryMode.jsx` (1,016).** Replaces the canvas when the Library pill is on. See section 7. No dnd-kit; it has pointer-drag resize handles for its three sections (178-198).

---

## 2. The state machine

### 2a. `src\lib\editorReducer.js` (579 lines)

State shape (lines 6-12): `{ mode, selection: {type:'room'|'slot'|'component', id?}, tray: [{compId, ref, fromSlot, reason, config, sourceRoomId?}], libraryBag, dirty }`. There are 22 action types.

| # | Action (line) | Payload | Effect on the draft | Undoable |
|---|---|---|---|---|
| 1 | `SELECT_ROOM` (86) | none | selection = room | no |
| 2 | `SELECT_SLOT` (88) | `slotId` | selection = slot | no |
| 3 | `SELECT_COMPONENT` (90) | `componentId` | selection = component | no |
| 4 | `CLEAR_SELECTION` (92) | none | selection = room | no |
| 5 | `SET_NAME` (96) | `name` | `mode.meta.name`; dirty | **no** |
| 6 | `SET_DEVICE_CLASS` (106) | `deviceClass` | `mode.deviceClass`; dirty | **no** |
| 7 | `APPLY_SCHEME` (113) | `schemeRef, sourceRoomId?` | replaces `mode.scheme` with `{ref[, sourceRoomId]}`; dirty | yes |
| 8 | `SET_PANEL_BUTTON` (126) | `slotId, enabled` | `mode.layoutConfig.panelButtons[slotId]`; dirty | yes |
| 9 | `PLACE_COMPONENT` (146) | `ref, slot, id?, config?` | appends a new instance with `order` = max in slot + 1; selects it; dirty. No check of fit, capacity, surface or duplicates | yes |
| 10 | `MOVE_COMPONENT` (167) | `componentId, slot` | sets `slot` and a new `order`; dirty. An unknown id still produces a new state and an undo step | yes |
| 11 | `MOVE_COMPONENT_TO_TRAY` (181) | `componentId` | removes the instance and appends a tray chip (`reason: 'removed from canvas'`); dirty. No guard for messages or input | yes |
| 12 | `UPDATE_COMPONENT_CONFIG` (220) | `componentId, patch` | shallow-merges `patch` into `config`; dirty | yes |
| 13 | `SWAP_LAYOUT` (235) | `layoutRef, sourceRoomId?` | re-plans the migration, moves or removes components, appends orphans to the tray, sets `mode.layout`; dirty | yes |
| 14 | `RESTORE_FROM_TRAY` (286) | `compId, slot` | re-adds the chip as a component with the same id; removes the chip; dirty | yes |
| 15 | `DISMISS_FROM_TRAY` (312) | `compId` | removes the chip. The only true delete | yes |
| 16 | `MARK_SAVED` (320) | `mode?` | swaps in the saved mode; dirty = false | no |
| 17 | `RESET_TO` (331) | `mode, initialTray?` | fresh state; seeds the tray if given | clears history |
| 18 | `INIT_FROM_LAYOUT` (346) | `layoutRef, sourceRoomId?` | replaces the mode with `createBlankMode(layoutRef)`: empty name, **no components** | yes (history cleared if mode was null) |
| 19 | `APPLY_ROOM` (366) | `sourceMode, applyLayout, applyScheme, applyComponents, componentRefsToApply` | optional layout swap; sweeps **all** current components to the tray and inserts the chosen source components; optional scheme. `componentRefsToApply` actually holds component ids (437) | yes (cleared if mode was null) |
| 20 | `LIBRARY_TOGGLE` (464) | `kind, ref, room?` | toggles a ref in `libraryBag`; a room also adds its layout, scheme and component refs | no, not dirty |
| 21 | `LIBRARY_CLEAR` (543) | none | empties the bag | no |
| 22 | `ADD_REFS_TO_TRAY` (546) | `refs[], sourceRoomMap?` | one new tray chip per ref not already in the tray; dirty | yes |

Not found in the reducer: a remove that does not go through the tray, a reorder within a slot, a duplicate-room action, any name lookup.

### 2b. `...\src\lib\editorHistory.js` (131 lines)

- State is `{ past, present, future }`. `HISTORY_ACTIONS` (25-49) lists 12 types (the header comment says eight; it is stale). `HISTORY_LIMIT = 50` (54).
- A history action pushes the previous `present` (the whole editor state: mode, selection, tray, bag, dirty) onto `past` and clears `future` (107-118).
- `UNDO` pops `past` and puts the current state at the front of `future`; `REDO` reverses it (66-84).
- `RESET_TO` drops history (86-92). So does the first `INIT_FROM_LAYOUT` or `APPLY_ROOM` on a null mode (103-105).
- Three consequences that matter for a design built on `undo:`:
  - `SET_NAME` and `SET_DEVICE_CLASS` update `present` in place. Undoing an earlier step also silently reverts a later rename, because the older snapshot carries the older name.
  - Text fields dispatch `UPDATE_COMPONENT_CONFIG` on every keystroke (`EditorRightRail.jsx:634-643`), so typing 20 characters uses 20 of the 50 steps.
  - `dirty` lives inside the snapshot. Load, place a block, save, undo: the state returns to the loaded snapshot with `dirty: false`, so Save is disabled (`EditorTopBar.jsx:90-94`) although the draft now differs from what is stored.
- No tests exist for the reducer, history, layout migration, wizard or catalogue (the five test files in `src` cover addresses, backup, bus, v6 plan and restore plan).

### 2c. `...\src\lib\layoutMigration.js` (213 lines)

- `LAYOUT_SLOTS` (30-59): slot inventory per layout with `id`, `capacity`, `label`. It is a hand copy of the layout manifests and has drifted: `canvas` is `single` here (40) and `stack` in the manifest (`canvas-centric.jsx:57`). It is the only place slot labels exist.
- `SLOT_FALLBACKS` (70-150): for each target layout, a map from source slot id to target slot id or `null` with a reason. It is keyed on slots, not blocks, by design (66-69).
- `planLayoutMigration({ fromLayout, toLayout, components })` (169-197) returns `{ moves: [{compId, fromSlot, toSlot}], orphans: [{compId, fromSlot, reason}], targetSlots }`. `fromLayout` is unused (170). A component keeps its slot if the target has the same id, else follows the fallback, else is an orphan.
- `applyLayoutMigration({ components, moves, orphans })` (204-213) returns the array without orphans and with slots rewritten. `order` is not recomputed.
- It ignores capacity and `slotTargets`. Example: canvas-centric to three-panel sends three canvas components to `msg-area`, which is `single`.
- A layout with no entry (the two coming-soon ones) orphans everything.
- **How the tray is fed:** the caller turns `plan.orphans` into tray chips. That mapping is written three times: `SWAP_LAYOUT` (`editorReducer.js:254-266`), `APPLY_ROOM` (404-415) and `applyBagToMode` (`EditorView.jsx:63-76`). The other feeders are `MOVE_COMPONENT_TO_TRAY`, `ADD_REFS_TO_TRAY`, the `APPLY_ROOM` sweep and `RESET_TO.initialTray`. Save and Build refuse while the tray is non-empty (`EditorView.jsx:416-419, 462-465`).

### 2d. New commands against existing actions

| Command | Closest existing code | Missing |
|---|---|---|
| `add:highlights, notes, "Deep Calm"` | `handleCommitLibrary` (`EditorView.jsx:333-403`) does the same job for the bag: `SWAP_LAYOUT` or `INIT_FROM_LAYOUT`, `APPLY_SCHEME`, then `ADD_REFS_TO_TRAY`. Its "one layout, one scheme" refusal is at 341-356 | Blocks go to the tray, not to slots. No first-free-slot resolver. It dispatches up to three undo steps, not one. No name resolver |
| `place:highlights right` | `PLACE_COMPONENT {ref, slot}` for a new block; `MOVE_COMPONENT {componentId, slot}` for an existing one | Slot word to slot id; capacity and fit checks with a reason; finding the instance by name |
| `rm:notes` | `MOVE_COMPONENT_TO_TRAY {componentId}` | A plain remove; the refusal for messages and input; name to instance |
| `set:highlights colour yellow` | `UPDATE_COMPONENT_CONFIG {componentId, patch}` | Word to schema key (`colour` to `defaultColor`); value validation; and `defaultColor` is not wired (section 4) |
| `set:input web search on` | none. Today this is `PLACE_COMPONENT` of `web-search@1.0` | Input features (section 4c) |
| `layout:"Document-centric"` | `SWAP_LAYOUT {layoutRef}`; `INIT_FROM_LAYOUT` when there is no mode | Drop instead of tray; capacity-aware placement; baseline blocks when a room gets its first layout (the mockup adds messages and input, `parliament_lab_v7_blocks.html:1603-1604`) |
| `theme:"Deep Calm"` | `APPLY_SCHEME {schemeRef}` | Name to ref; refusing the current theme |
| `device:mobile` | `SET_DEVICE_CLASS {deviceClass}` with `'visual-touch-phone'` | Not undoable; has no effect on the canvas |
| `name:"Essay room"` | `SET_NAME {name}` | Not undoable; no uniqueness check |
| `duplicate:"Writing Studio"` | No action. `createCopyOfMode(source)` (`modes.js:251-282`) and `createModeFromTemplate(template)` (`modes.js:152-197`), then `RESET_TO` through router state (`EditorView.jsx:233-273`) | The copy gets an empty name, not "Writing Studio 2"; resolving yours first, then templates |
| `new:room` | `/edit` dispatches `RESET_TO {mode: null}`. `createBlankMode()` with no argument already returns a room with `layout: null` (`modes.js:229`) | The editor treats "no room" as `mode === null`, not as an empty room |
| `new:room guided` | none; the wizard is a separate route | Guide state and its step list |
| `inspect:highlights` | `SELECT_COMPONENT` drives the right rail | Interface only |
| `undo:` | `UNDO` | See 2b. `REDO` also exists |
| (v7) rail buttons | `SET_PANEL_BUTTON {slotId, enabled}` | The mockup uses one value `both/left/right/none` |
| (v7) move up / move down | not found | A reorder action |

---

## 3. Slots and layouts

**`src\lib\slots.js` (81).** Five universal slot ids (`left-rail`, `right-rail`, `right-rail-extra`, `msg-area`, `input-dock`, 16-22) and eight layout-specific ones (`canvas`, `chat-panel`, `inspector`, `document`, `outline`, `margin`, `sheet`, `section-slot`, 33-42). Capacities are `single`, `stack`, `overlay` (61-65); `overlay` is unused. Only `ALL_SLOT_IDS` and `SLOT_CAPACITY_VALUES` are imported elsewhere, by the two validators.

**`...\src\catalog\layouts\index.js` (53)** registers five manifests at module load and throws if one is invalid (18-25). `getLayoutEntry(ref)` is exact match. `listLayoutEntries()` has no caller.

**`...\src\catalog\layouts\validate.js` (88).** A layout manifest is `{ name, version, displayName, description?, scope: 'room'|'homepage', slots: [{id, capacity}], render }`. There is no label, no numeric capacity and no geometry.

| Layout file (lines) | Scope | Slots (capacity) | How it draws |
|---|---|---|---|
| `three-panel.jsx` (203) | room | left-rail (stack), msg-area (single), input-dock (single), right-rail (stack), right-rail-extra (stack) | Left aside `w-72`; centre messages plus input; right aside `w-72` with right-rail and right-rail-extra in **one** column (182-185). Empty rails are not drawn |
| `canvas-centric.jsx` (216) | room | left-rail (stack), canvas (stack), chat-panel (stack), inspector (stack), input-dock (single) | Left aside; centre canvas plus input; right aside with chat-panel above and inspector below (`max-h-72`) |
| `document-centric.jsx` (132) | room | outline (single), document (single), margin (stack), chat-panel (stack) | Outline aside `w-56`; document; right aside `w-80` with margin above and chat-panel below. **No input-dock**: input is mounted in `chat-panel` |
| `single-column-with-sheet.jsx` (108) | room | msg-area (single), input-dock (single), sheet (stack) | One column with a collapsible sheet under the input (88-104). No phone branch; it is the phone layout |
| `stacked-sections.jsx` (302) | **homepage** | section-slot (stack) | Each child is wrapped in `SectionCard` with a title from `config.section.title`. Sections reorder by drag |

- **Phone trees.** Three-panel, canvas-centric and document-centric switch on `useIsNarrow(768)`, which reads `window.innerWidth` (`src\lib\useViewportWidth.js:17-31`), and use `h-[100dvh]`. They respond to the viewport, not to their container, so a live room drawn inside a narrow board renders its desktop tree.
- **How `stacked-sections` differs.** It is the only homepage layout and the only one with behaviour: it owns a `DndContext` and writes the new order straight to IndexedDB with `saveMode` (269-302), then fires `homepage-mode-changed`. It bypasses any editor state.
- **Homepage-only:** `stacked-sections@1.0` alone.
- **Coming soon:** `reading-pane@1.0` and `split-view@1.0` exist only as `libraryLayouts` rows (`src\lib\db.js:280-301`) and as the layouts of the Kingfisher and Starling templates. No manifest, no slot table, no silhouette: not found.
- **Capacity is not enforced anywhere.** `RoomShell.jsx:43-47` says so. Pocket Chat puts four components in `input-dock`, which is `single`.
- **Against the v7 mockup** (`parliament_lab_v7_blocks.html:976-990`): three-panel `{left:2, main:1, input:2, right:3}`, document-centric `{main:2, input:2, right:3}`, canvas-centric `{left:3, main:1, input:2}`, sheet `{main:1, input:2, sheet:3}`, stacked sections `{main:3, input:2}` as a room layout. Code has an outline in document-centric and a right column in canvas-centric; the mockup has neither. The mockup's Data Workspace template has no messages block (line 1040), which contradicts "every room has one".

---

## 4. The catalogue

### 4a. Files and manifest shape

- **`src\catalog\index.js` (119).** In-memory `Map` of 27 manifests keyed `name@version`. `register` throws on an invalid manifest at boot (55-68). `getEntry(ref)` is exact match (107-109); `listEntries({tier})`.
- **`...\src\catalog\validate.js` (237).** Required: `name` (kebab), `version`, `displayName`, `author`, `description`, `tier`, `slotTargets` (non-empty array of `{slot, primary?, fallbackOk?}`), `capabilityRequirements` (array of free strings), `configSchema` (camelCase keys; field `{type: boolean|number|string|enum|object|array, options?, label?, default?}`), `render`. Optional: `icon`, `surfaces` (`room`, `homepage`, `both`), `softDependencies`, `contributions.messageActions`, `previewRender`. Not validated: `contributions.inputActions`, `default` values. Not found: `placement`, `features`, `required` or `essential`, a capability vocabulary, `execute`.
- **`...\src\lib\catalog.js` (179).** Tier constants plus get/list/put helpers for the five `library*` stores. Only `TIER_VALUES` (`catalog/validate.js:21`) and `listRooms` (`BuildView.jsx:56`) are imported; the rest has no caller.
- **`...\src\catalog\emptyStates.jsx` (95).** Three fallback templates. `RoomShell.jsx:174-237` substitutes one when a block's `softDependencies` component is absent. This works and is used.
- **`...\src\catalog\dev-modes.js` (52).** One hand-built mode for the dev `/catalog` page.
- **`...\src\components\RoomShell.jsx` (273).** Resolves layout and components, skips unknown refs and undeclared slots with a dev-only warning (144-161), builds `slotContents`, and collects `messageActions` and `inputActions` (192-215). `getMessageActions()` is read only by the dev demo, so those contributions go nowhere in production.

### 4b. Every entry

`*` marks the primary slot target. `†` marks a config key the production render does not read.

| name | displayName | tier | surface | slotTargets | capabilities | configSchema | render file |
|---|---|---|---|---|---|---|---|
| messages | Messages | reader | room | msg-area*, chat-panel | storage:read | showTimestamps: boolean = true †; density: enum comfortable/compact †. `MessagesRender()` takes no props (`messages-render.jsx:59`) | messages-render.jsx |
| input | Input | composer | room | input-dock*, msg-area, sheet | storage:read, storage:write, model:complete | placeholder: string; subscribeToVoice: boolean = true; cardLayout: boolean = false (forced on under 768px) | input-render.jsx, input-preview.jsx |
| toc | Table of contents | reader | room | left-rail*, right-rail, right-rail-extra, sheet, margin | storage:read | mode: enum user-prompts/response-headings; maxItems: number = 50; truncateAt: number = 60 | toc-render.jsx |
| highlights | Highlights | reader | room | left-rail*, right-rail, right-rail-extra, margin, sheet | storage:read, storage:write | defaultColor: enum blue/yellow/green/purple/red †; showAddForm: boolean † (`highlights-render.jsx:69-74`) | highlights-render.jsx |
| notes | Notes | reader | room | left-rail*, right-rail, right-rail-extra, margin, sheet | storage:read, storage:write | showAddButton: boolean †; sortOrder: enum newest/oldest/message-order | notes-render.jsx |
| branches | Branches | composer | room | left-rail*, right-rail, right-rail-extra, margin, sheet | storage:read, storage:write, model:complete | showParentLink: boolean; defaultBranchMode: enum full-history/compressed-summary; showCompressButton: boolean; contextThreshold: number = 75 | branches-render.jsx |
| context | Context health | reader | room | right-rail*, right-rail-extra, left-rail, sheet | storage:read | contextThreshold: number = 75; autoCompress: boolean † (reserved); displayMode: enum meter/compact/ambient | context-render.jsx |
| collab-mode | Collaboration mode | composer | room | right-rail*, right-rail-extra, left-rail, input-dock, sheet | storage:read, storage:write | triggerLabel: string; showBadge: boolean | collab-mode-render.jsx, -preview |
| review | Review | composer | room | right-rail*, sheet | storage:read, model:complete | triggerLabel: string; summaryDepth: enum brief/standard/deep †; includeHighlights, includeNotes, includeFavorites, includePins: boolean † | review-render.jsx, -preview |
| voice-input | Voice input | composer | room | input-dock*, right-rail, right-rail-extra, left-rail, sheet | microphone | lang: string = en-US; buttonLabel: string † (preview only) | voice-input-render.jsx, -preview |
| blueprint | Blueprint | reader | homepage | section-slot* | storage:read | showCounts: boolean † | blueprint-render.jsx |
| chats | Chats | composer | homepage | section-slot* | storage:read, storage:write | defaultView: enum summary/notes/highlights/branches; publishHoverEvents: boolean † | none; chats-preview.jsx is the render |
| library | Library | reader | homepage | section-slot* | storage:read | defaultTab: enum † (the render reads `config.defaultFilter`, `library-preview.jsx:127`) | none; library-preview.jsx is the render |
| favorites | Favorites | reader | homepage | section-slot* | storage:read, storage:write | maxItems: number = 30 † | none; favorites-preview.jsx is the render |
| quick-stats | Quick stats | reader | homepage | section-slot* | storage:read | none | quick-stats-render.jsx |
| recent-activity | Recent activity | reader | homepage | section-slot* | storage:read | limit: number = 5 | recent-activity-render.jsx |
| scratchpad | Scratchpad | utility | homepage | section-slot* | storage:read, storage:write | placeholder: string | scratchpad-render.jsx |
| file-shelf | File shelf | composer | room | left-rail*, right-rail, sheet | storage:read, storage:write | acceptedTypes: string † | inline in manifest |
| chart-canvas | Chart canvas | reader | room | canvas*, msg-area | storage:read | chartType: enum bar/line/area/scatter/pie | inline; soft-depends on file-shelf |
| table-canvas | Table canvas | reader | room | canvas*, msg-area | storage:read | pageSize: number = 100 † | inline; soft-depends on file-shelf |
| summary-dashboard | Summary dashboard | composer | room | canvas*, msg-area | storage:read | sampleRows: number = 50 † | inline; soft-depends on file-shelf |
| column-inspector | Column inspector | reader | room | inspector*, right-rail, right-rail-extra, sheet | storage:read | none | inline; soft-depends on file-shelf |
| document-canvas | Document canvas | composer | room | document* | storage:read, storage:write | none | inline |
| claude-comments | Comments | composer | room | margin*, right-rail | storage:read, storage:write | none | inline; soft-depends on document-canvas |
| ripple-analysis | Ripple analysis | composer | room | margin*, right-rail | storage:read, storage:write | none | inline; soft-depends on document-canvas |
| web-search | Web search | composer | room | input-dock, chat-panel, right-rail, right-rail-extra, sheet (none primary) | model:complete | none | web-search-render.jsx (returns null), -preview |
| file-attach | File attach | composer | room | input-dock, chat-panel, right-rail, right-rail-extra, sheet (none primary) | model:complete | none | file-attach-render.jsx (returns null), -preview |

Facts that follow from the table:

- **Essential.** No manifest has an `essential` or `required` field (not found). `essential` appears only on component instances in the homepage seed (`db.js:361-405`), two migrations (`migration.js:360, 408-415, 505-509`) and the dev mode. Templates and the wizard do not set it. Nothing reads it.
- **Capabilities are never read at runtime**, only shown on the dev page. Values in use: `storage:read`, `storage:write`, `model:complete`, `microphone`. summary-dashboard, document-canvas and ripple-analysis make model calls without declaring `model:complete`. `mode.requestedPermissions` is always `[]`.
- **Surfaces.** 20 entries are `['room']`, 7 are `['homepage']`, none is `both`. This is the nearest thing to `placement`, with different semantics.
- **`slotTargets` disagrees with shipped placements.** Templates: input in `chat-panel` (Drafting Desk, `seedTemplates.js:126`), context in `inspector` (Data Workspace, 95). Wizard (`buildWizard.js:160-255`): toc and branches in `outline`; context in `inspector` and `margin`; highlights in `inspector`; collab-mode in `inspector` and `chat-panel`. No manifest lists `outline`. The wizard can put two blocks in `outline`, which is `single`.
- **Multiple instances.** `PLACE_COMPONENT` never dedupes, and config is per instance. The mockup assumes one of each block per room and stores settings by block id.

### 4c. Web search, voice input and file attach

**Where they are mounted** (`src\lib\seedTemplates.js`):
- web-search: `input-dock`, order 10, in Writing Studio (61), Data Workspace (98) and Pocket Chat (148); `chat-panel`, order 10, in Drafting Desk (127).
- voice-input: `input-dock`, order 1, in Pocket Chat (147), and added to older phone rooms by `migrateInjectVoiceInput` (`migration.js:328-374`).
- file-attach: `input-dock`, order 11, in Pocket Chat only (149).
- Wizard-built rooms get none of the three, so their `+` button is disabled (`InputArea.jsx:82, 115`).

**How they talk to input.** Through the room event bus, not React context. `src\lib\hostAPI.js` (242) carries pub/sub plus three registries.
1. Each manifest declares `contributions.inputActions` (`web-search.jsx:53-61`, `file-attach.jsx:59-67`, `voice-input.jsx:60-69` with `primary: 'right'`).
2. `RoomShell.jsx:205-215, 261` collects them into `hostAPI._setInputActions`.
3. `input-render.jsx:88-100` reads `getInputActions()` and passes `overflowActions` and `rightPrimaryAction` to `InputArea`. The memo depends only on `hostAPI`, which is stable per `mode.id`, so the menu would go stale if the mode changed under a live room.
4. A tap publishes `input-action:<id>` (`input-render.jsx:105-108`).
5. `web-search-render.jsx` (109) toggles `armed`, calls `_armTool` or `_disarmTool` (55-68) and resets on `message-sent` (98-103). Input reads `getArmedTools()` at send (219). It is a per-message toggle.
6. `file-attach-render.jsx` (167) appends a hidden `<input type="file">` to `document.body` (49-77), reads files through `lib/fileUpload.js`, calls `_setAttachments` (82-85), reports `attach:error` and clears on `message-sent`.
7. `voice-input-render.jsx` (121) wraps `useVoiceInput` and publishes `voice-transcript`; input appends final transcripts (`input-render.jsx:164-172`). On desktop it draws its own mic button in its slot; under 768px it returns null and the mic appears inside the input card. The desktop inline layout of `InputArea` ignores `rightPrimaryAction`.

**What folding them in takes.**
- `InputArea.jsx` (466) already takes `overflowActions`, `rightPrimaryAction`, `armedTools`, `attachments` and their callbacks as props (45-63). It needs no structural change, only a mic affordance in the desktop inline layout.
- `input-render.jsx` absorbs the three renders' logic (roughly 50, 120 and 40 lines) as local state or three small hooks, and builds the menu from config instead of from the bus. Events `input-action:*`, `tool-armed-changed`, `attachments-changed`, `attach:error` and the `armedTools`, `attachments` and `inputActions` registries become internal.
- `input.jsx` gains three boolean config keys, a feature list, the voice language key, and capabilities that depend on which features are on.
- Stored data: existing rooms hold `web-search@^1.0`, `voice-input@^1.0` and `file-attach@^1.0` instances. If those manifests are unregistered, `RoomShell` skips them silently and the rooms lose the features. That needs a shown migration that sets the input config from the presence of those instances, updated templates with bumped `SEED_VERSIONS` (`seedTemplates.js:219-232`), and a reader for old backups.
- `input-render.jsx:59` takes the conversation id from `useParams()` and returns early without one (190). `messages-render.jsx` reads the same param and discards it (60, 360).

---

## 5. Mode files (rooms)

**`src\lib\modes.js` (287), full API:**
- `loadMode(id)` (61), `listModes({scope})` (72), `loadHomepageMode()` (83). All three fill a missing `meta.builtAt` at read time (47-56).
- `saveMode(mode)` (99-129): requires `id` and `scope` and nothing else; stamps `schema`, `parliamentVersion` and `meta.modified`; keeps the original `created`.
- `deleteMode(id)` (136): no guard for conversations that point at the room.
- `createModeFromTemplate(template, overrides)` (152-197): fresh ids, `builtAt: null`, and it saves.
- `createBlankMode(layoutRef?)` (211-236): unsaved, empty name, `parliament@1.0`, no components.
- `createCopyOfMode(source)` (251-282): unsaved, fresh ids, **empty name**, `builtAt: null`.
- Constants `MODE_SCHEMA`, `MODE_SCOPES` (the second has no importer).

**Schema with an example.** This is what `createModeFromTemplate` produces from the Writing Studio template (reconstructed from `seedTemplates.js:47-68` and `modes.js:168-194`, not read from a live database):

```json
{
  "schema": "parliament-mode/1.0",
  "parliamentVersion": "0.4.0",
  "id": "mode_<uuid>",
  "scope": "room",
  "meta": { "name": "Writing Studio", "author": null, "description": "...", "icon": "pen-tool",
            "preferredProvider": null, "created": "<iso>", "modified": "<iso>", "builtAt": null },
  "deviceClass": "visual-pointer",
  "layout": { "ref": "three-panel@^1.0" },
  "scheme": { "ref": "parliament@^1.0" },
  "components": [
    { "id": "comp_<uuid>", "ref": "messages@^1.0",   "slot": "msg-area",         "order": 0,  "config": {} },
    { "id": "comp_<uuid>", "ref": "input@^1.0",      "slot": "input-dock",       "order": 0,  "config": {} },
    { "id": "comp_<uuid>", "ref": "web-search@^1.0", "slot": "input-dock",       "order": 10, "config": {} },
    { "id": "comp_<uuid>", "ref": "branches@^1.0",   "slot": "left-rail",        "order": 0,  "config": {} },
    { "id": "comp_<uuid>", "ref": "highlights@^1.0", "slot": "right-rail",       "order": 0,  "config": {} },
    { "id": "comp_<uuid>", "ref": "notes@^1.0",      "slot": "right-rail-extra", "order": 0,  "config": {} },
    { "id": "comp_<uuid>", "ref": "context@^1.0",    "slot": "right-rail",       "order": 1,  "config": {} }
  ],
  "pipelines": [], "requestedPermissions": [], "buildIntent": null
}
```

Optional fields seen elsewhere: `layoutConfig.panelButtons[slotId]`; `sourceRoomId` on `layout`, `scheme` and components; `components[].essential`; `buildIntent` as `{source:'wizard', purposes, devices, density, buildAnother}` or `{derivedFrom, decomposedAt}`.

**`seedTemplates.js` (271).** Every template uses `parliament@^1.0`.

| Template | Status | Device | Layout | Components (slot, order) |
|---|---|---|---|---|
| Writing Studio | available | desktop | three-panel | as in the example above |
| Data Workspace | available | desktop | canvas-centric | file-shelf (left-rail 0); chart-canvas, table-canvas, summary-dashboard (canvas 0, 1, 2); column-inspector, context (inspector 0, 1); messages (chat-panel 0); input (input-dock 0); web-search (input-dock 10) |
| Drafting Desk | available | desktop | document-centric | document-canvas (document 0); claude-comments, ripple-analysis (margin 0, 1); messages, input, web-search (chat-panel 0, 1, 10) |
| Pocket Chat | available | phone | single-column-with-sheet | messages (msg-area 0); input, voice-input, web-search, file-attach (input-dock 0, 1, 10, 11); highlights, branches (sheet 0, 1) |
| Quiet Room | available | desktop | three-panel | messages (msg-area 0); input (input-dock 0) |
| Kingfisher | coming-soon | desktop | reading-pane | none |
| Starling | coming-soon | desktop | split-view | none |

`seedLibraryRooms` (257-271) re-seeds a template only when its `SEED_VERSIONS` number rises.

**`...\src\lib\roomIncludes.js` (104).** `buildIncludes(room)` gives a bulleted list of layout, scheme and unique components with descriptions; used only by `blueprint-render.jsx:254`. `buildPillLabels` has no caller. It holds its own label tables and its own `normalizeRef`.

**`...\src\lib\refs.js` (25).** `normalizeRef` strips a leading `^` or `~` and a trailing `.0`; `findCatalogEntry(entries, ref)` matches after that. This is prefix stripping, not range resolution; real semver resolution is not found. There are five copies of `normalizeRef`: here, `RoomShell.jsx:79`, `stacked-sections.jsx:48`, `roomIncludes.js:36`, `LibraryOverlay.jsx:49`.

**Ref spelling causes bugs today.** Templates and the wizard write `x@^1.0`; cards dragged in the editor write `x@1.0`; several UI checks compare raw strings:
- "Current" on a layout card: `l.id === currentLayoutRef` (`EditorLeftRail.jsx:302`).
- "Active" on a scheme card: `ref === currentSchemeRef` (404).
- "Placed" on a component card: `placedRefs.has(ref)` (`EditorView.jsx:686`, `EditorLeftRail.jsx:335`).
- The bag's conflict check builds a `Set` of raw refs (`EditorView.jsx:341-348`), so `three-panel@^1.0` plus `three-panel@1.0` counts as two layouts.
- `LAYOUT_META`, wizard `SCHEMES` and `LayoutWireframe` are keyed by the caret form, so `IgnitionStep.jsx:133` finds no label for a bare ref.

**`...\src\lib\validate.js` (366).** This is the backup validator. `validateMode` (151-172) checks only `id`, `schema`, `scope`, that `components` is an array, and that `meta`, `layout`, `scheme` and `layoutConfig` are objects. A room validator (known refs, valid slots, capacity, required blocks) is not found.

**Device class.** `mode.deviceClass` is `'visual-pointer'` or `'visual-touch-phone'`. It is written by the editor (`editorReducer.js:106`), the wizard (`buildWizard.js:362-370`, where desktop wins if both are picked) and templates. It is read only for the top-bar chip, the right-rail segmented control and a "MOBILE/DESKTOP" label in `blueprint-render.jsx:722`. `RoomShell`, the layouts and `EditorCanvas` do not read it.

**"Set as home".** `chosenHomeRoomId` is a setting (`src\stores\SettingsContext.jsx:22`). It is set in `EditorRightRail.jsx:377-448`, only for saved rooms with `builtAt != null`, behind a confirm dialog. `src\views\HomepageView.jsx:62-80` reads it on `/`: if the room exists it **creates a new conversation every visit** and redirects to `/chat/:id`; a stale pointer is cleared.

**Other.** Room export and import as a file: not found, although `EditorRightRail.jsx:363-365` tells users a room "can be exported as a mode file". A conversation's `room` field must resolve through `loadMode` (`ChatView.jsx:95-108`), so a chat created against an unsaved draft cannot be opened later. Conversations have no origin field for "tried in the Lab"; the only tag field is the AI-written `tags` array (`ChatContext.jsx:106-108`).

---

## 6. Themes

**`src\lib\schemes.js` (850).**
- Six schemes: `parliament@1.0` (Parliament Default), `cool-bright@1.0`, `deep-calm@1.0`, `soft-violet@1.0`, `fresh-teal@1.0`, `amber-glow@1.0` (827-834).
- Each has four variants: `light`, `dark`, `light-hc`, `dark-hc`.
- Each sets 26 tokens (`TOKEN_KEYS`, 44-59): `bg-base, bg-surface, bg-subtle, bg-alt`; `text-primary, text-secondary, text-muted, text-light`; `border, border-subtle`; `gold, gold-light, gold-muted` (the accent, whatever its colour); `scrollbar-thumb`; `bp-floor, bp-wall, bp-hatch, bp-line, bp-label, bp-soft, bp-grid`; `data-series-1..5`.
- The file is metadata. Its header says the CSS is the runtime truth and the two are maintained by hand (9-13). Exports `getSchemeDefinition`, `SCHEME_VARIANTS` and `TOKEN_KEYS` have no importer.

**The CSS** (`src\index.css`).
- Variable names: `--p-<token>`, `--bp-*`, `--token-data-series-N`.
- `:root` holds Parliament light (8-44); `.dark` holds Parliament dark (47-81).
- Each other scheme is `[data-scheme="x"]` and `[data-scheme="x"].dark` (193-310).
- `[data-scheme="parliament"]` (180-190) exists so a nested element can return to Parliament; it has a light block only.
- High contrast is `@media (prefers-contrast: more)` for `:root` and `.dark` (97-151) and for the five other schemes (313-410).
- `prefers-reduced-motion` is handled separately (830, 1159 and others). `prefers-color-scheme` and `forced-colors` are not used.
- The `.dark` class is put on `<html>` from the theme setting (`SettingsContext.jsx:52-60`).

**The key question.** It depends on the surface.

Chat route: global. `src\views\ChatView.jsx:220-233`:

```js
const name = schemeName(ref)
const html = document.documentElement
if (name === 'parliament') {
  html.removeAttribute('data-scheme')
} else {
  html.setAttribute('data-scheme', name)
}
return () => { html.removeAttribute('data-scheme') }
```

This changes the CSS variables for the whole page while a chat is open, including the chat's own top bar.

Editor canvas: scoped. `EditorCanvas.jsx:120-121` computes `canvasScheme = schemeName(schemeRef)` and line 221 puts `data-scheme={schemeAttr}` on the canvas wrapper `<div>`. The editor chrome keeps the page scheme.

Elsewhere: `EditorPreviewSheet.jsx` applies no scheme; `HomepageView.jsx` ignores the homepage mode's scheme; the dev `SchemePicker` sets it on `<html>`.

**What blocks "a theme applies inside the room's edges only".**
1. `[data-scheme="x"].dark` needs `.dark` on the same element. On a scoped wrapper inside a dark page, the light tokens win.
2. `[data-scheme="parliament"]` has no dark and no high-contrast block, so a nested Parliament room is always light and normal contrast.
3. Hard-coded colours bypass the variables: 415 hex literals in `src\components\core`, 105 in `src\catalog\entries`, and `bg-white` in every layout file and most blocks (for example `InputArea.jsx:253, 278, 411`).
4. `--p-gold-tint`, `--p-gold-tint-2`, `--p-gold-deep`, `--p-error`, `--p-warning`, `--p-success`, `--p-accent-gold` and `--p-code-bg` are referenced but never defined. The wizard's selected-tile backgrounds use the first two with no fallback.

**`src\views\SchemePicker.jsx` (188).** Dev-only panel on `/catalog`. Buttons for the six schemes plus Dark and High contrast toggles. It simulates high contrast by injecting a `<style>` built from the `light-hc` and `dark-hc` variants (20-66), and resets on unmount.

---

## 7. The Library interfaces that exist today

There are three, each reading a different subset.

| Interface | Rooms | Layouts | Components | Schemes | Resources |
|---|---|---|---|---|---|
| `EditorLeftRail.jsx` | the user's `modes` | IndexedDB `libraryLayouts`, filtered by scope | in-code manifests | in-code `SCHEMES` | none |
| `EditorLibraryMode.jsx` | the user's `modes` | IndexedDB `libraryLayouts` | in-code manifests | in-code `SCHEMES` | none |
| `library-preview.jsx` (homepage) | `libraryRooms` templates | `libraryLayouts` | `libraryComponents`, enriched from manifests | `librarySchemes` | six static placeholders |

No interface shows both the user's rooms and the templates.

**`EditorLibraryMode.jsx` (1,016).**
- **The bag** is `state.libraryBag = { layouts, components, schemes, rooms, sourceRooms }` (`editorReducer.js:52-60`), toggled by `LIBRARY_TOGGLE`. It is transient and not undoable, but it lives in reducer state, so it survives a change of filter or search.
- **Three stacked sections**, each collapsible and resizable:
  - Showcase (411-581): cards for what is in the room, in the tray, or in the bag, tagged "In room" or "In tray", with a coloured glow and SVG lines linking items that came from the same room (441-537).
  - Library (586-665): filter chips All / Layouts / Components / Schemes / Rooms (48-54), a search box, and a grid of `LibraryCard` with a check badge.
  - Details (670-754): the last clicked item, with a room's contents or a layout's slots. It is a separate section at the bottom, not under the row.
- **A card click** (205-220) removes from the bag if bagged, mutates the draft if placed, dismisses if in the tray, otherwise adds to the bag.
- **Apply.** There is no Apply button. Clicking the Build or Edit pill runs `handleCommitLibrary` (`EditorView.jsx:333-403`): refuse two layouts or two schemes, swap the layout, apply the scheme, and send new components **to the holding tray**. Hovering the x on the active layout or scheme with exactly one replacement queued commits that swap (`EditorView.jsx:298-325`).
- **Bug:** coming-soon layouts are clickable here (`CatalogCard` passes no `disabled`, 649-665). Bagging one and committing orphans every component and leaves an unrenderable room.
- **Pure helpers** (759-1016): `buildShowcaseItems`, `isInBag`, `isInDraft`, `isInTray`, `buildCatalogItems`, `filterCatalogItems`, `describeShowcaseSummary`, `colorForRoomId`.

**`src\components\LibraryOverlay.jsx` (247).** Right-side slide-in for the homepage Library. Shows preview, description, author, date, installs, version, status and a per-kind extra block: a room's includes (73-119), a layout's slots read from the layout registry (121-133), a component's "Fits in slots" from `slotTargets` (135-145). The primary button ("Add as room", "Add to layouts") only closes the overlay (234-241).

**`...\src\components\LibraryCard.jsx` (186).** Shared card: preview, type pill, status pill, name, author, optional installs and call-to-action. Optional drag props `dragRef, dragListeners, dragAttributes, isDragging` (57-60, 66-68); it imports nothing from dnd-kit. `Preview` (104-112) picks per kind: icon, silhouette, three-colour swatch, room silhouette, resource glyph. `ICON_BY_NAME` (39-44) is a static list that must be extended for every new manifest icon.

**`...\src\components\LayoutSilhouette.jsx` (133).** A hand-drawn thumbnail per layout id, with a generic fallback (25-31) used for the coming-soon layouts.

**`...\src\catalog\entries\library.jsx` (38) and `library-preview.jsx` (278).** The homepage Library block. Reads four stores (136-143) and overlays the manifest's `icon`, `surfaces` and `description` at read time (149-177), because the stored rows are written once and never refreshed. Resources are a static array (43-122), all coming-soon; the `libraryResources` store is never written.

**How library rows relate to manifests** (`db.js:155-342`):
- `libraryComponents`: copied from the manifests once per id (187-208) with `id, name, version, displayName, description, tier, slotTargets, author, installedCount: 0`. No `icon`, `surfaces` or `configSchema`. Never updated or deleted.
- `libraryLayouts`: seeded once when the table is empty (215-309), `slots: []`. The only source for the coming-soon layouts and for `status` and `scopes`.
- `librarySchemes`: one row per scheme with the full variants (323-342).
- `libraryRooms`: the templates, re-seeded by version.
- All five stores are included in backups (`backup.js:162-166, 452-456`).

---

## 8. The wizard

**`src\views\BuildView.jsx` (482).** Seven screens: 0 welcome and path picker, 1 purpose, 2 device, 3 density and layout, 4 features, 5 name and scheme, 6 ignition. Paths from screen 0 (141-161): guided; template gallery; custom, which builds an empty-config room and opens the editor. "Open in editor" on screens 3 to 5 builds from the answers so far (178-188). `?ignite=<roomId>` jumps to screen 6 for a room that already exists (69-102). `handlePersist` (199-208) calls `igniteExistingRoom` or `buildAndOpenRoom` and sets `tourCompleted_wizard`.

**`...\src\lib\buildWizard.js` (424).**

| Piece | Lines | Kind |
|---|---|---|
| `makeInitialWizardConfig()` | 39-50 | pure |
| `PURPOSES` (writing, research, coding, thinking) | 59-64 | data. Purpose does **not** choose the layout (52-57); it only sets the default name |
| `DEVICES` (desktop, mobile) | 74-77 | data |
| `DENSITIES`, `LAYOUTS_BY_DENSITY` | 87-97 | data: minimal gives single-column; balanced gives three-panel; full offers three-panel, canvas-centric, document-centric |
| `LAYOUT_META` | 99-120 | data: label, short and long copy |
| `deriveLayout(config)` | 127-133 | pure |
| `FEATURES` | 151-257 | data: seven features (one is a coming-soon stub) with `catalogRef`, `config`, tags and `slotByLayout` |
| `SCHEMES` | 266-273 | data: a second scheme table with `bg, dot, line`, values differing from `lib/schemes.js` |
| `wizardComponentsFor(layoutRef, features)` | 378-397 | pure: baseline plus features that have a slot in that layout |
| `baselineComponentsFor`, `orderInSlot`, `defaultName`, `pickDeviceClass` | 355-424 | pure, not exported. The baseline is messages and input, with their slot per layout |
| `buildModeFromWizard(config)` | 286-311 | writes IndexedDB through `createModeFromTemplate` |
| `buildAndOpenRoom(config)` | 313-328 | writes: sets `builtAt`, creates a conversation |
| `igniteExistingRoom(roomId)` | 340-353 | writes: sets `builtAt`, creates a conversation |

**`src\components\build\**` (2,096 lines).**
- `TemplateGallery.jsx` (100): template cards.
- `WizardEntry.jsx` (152): the three-path picker.
- `PurposeStep.jsx` (66), `DeviceStep.jsx` (27), `TileGrid.jsx` (91): multi-select tiles.
- `DensityLayoutStep.jsx` (185): density tiles, then layout cards, auto-selecting when only one fits.
- `FeaturesStep.jsx` (173): checklist.
- `NameSchemeStep.jsx` (156): name, scheme grid, summary card.
- `IgnitionStep.jsx` (642): API key check or entry (`getProvider().validateKey`, `saveApiKey`, 229-263), a timed animation, then persist and three exit buttons.
- `LayoutWireframe.jsx` (246): a third set of layout thumbnails in three sizes, keyed by caret refs. `LayoutPreviewOverlay.jsx` (73), `WizardReceipt.jsx` (56), `WizardTrack.jsx` (70), `StepHeader.jsx` (29).

**Reusable by a command-driven guide.** The pure data and functions above. The wizard collects answers and builds once; the guide applies one command per answer, so the control flow in `BuildView` does not carry over. `slotByLayout` and `baselineComponentsFor` encode where each block is expected to land in each layout; that is useful as expected values when writing the first-free-slot resolver, but a generic resolver supersedes the tables. The v7 guide has six steps (layout from "what is this room for", device, blocks, web search, theme, name; `parliament_lab_v7_blocks.html:1311-1322`), so it maps purpose to layout directly, which the wizard does not.

---

## 9. Every `@dnd-kit` import in `src`

| File:line | Import | Used for |
|---|---|---|
| `src\views\EditorView.jsx:18` | `DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors, rectIntersection` from `@dnd-kit/core` | The context around the editor, sensors, collision rule, `handleDragEnd` |
| `...\src\components\editor\EditorLeftRail.jsx:32` | `useDraggable` from `@dnd-kit/core` | Layout, component, scheme and room cards as drag sources |
| `...\src\components\editor\EditorCanvas.jsx:11` | `useDraggable, useDroppable` from `@dnd-kit/core` | Canvas and slot drop targets; placed blocks draggable between slots |
| `...\src\components\editor\EditorHoldingTray.jsx:15` | `useDraggable` from `@dnd-kit/core` | Tray chips |
| `...\src\catalog\layouts\stacked-sections.jsx:27-35` | `DndContext, DragOverlay, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors` from `@dnd-kit/core` | Homepage section reorder |
| `...\stacked-sections.jsx:36-40` | `SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy` from `@dnd-kit/sortable` | same |
| `...\stacked-sections.jsx:41` | `restrictToVerticalAxis, restrictToParentElement` from `@dnd-kit/modifiers` | same |
| `...\src\components\SectionCard.jsx:16` | `useSortable` from `@dnd-kit/sortable` | Section drag handle |
| `...\src\components\SectionCard.jsx:17` | `CSS` from `@dnd-kit/utilities` | Transform string |

Packages in `package.json:14-17`: `core ^6.3.1`, `modifiers ^9.0.0`, `sortable ^10.0.0`, `utilities ^3.2.2`. Not referenced in `vite.config.js`.

**What drag and drop does today.** In the Lab it is the only way to place a block, move one, restore one from the tray, and choose a layout or apply a room from the left rail. On the homepage it reorders sections.

**What breaks if the dependency is removed.** The four editor files stop compiling, which takes down `/edit`, `/edit/:roomId` and `/edit-home`. `stacked-sections.jsx` also stops compiling, and it is imported by `src\catalog\layouts\index.js:10`, which `RoomShell` imports. So the build fails for every route that draws a room, including `/` and `/chat/:id`, until that layout is removed from the registry or loses its sortable code. Other "drag" code is native and unaffected: file drops in `BackupRestoreModal.jsx` and `FileShelf.jsx`, and the resize handles in `EditorLibraryMode.jsx`.

---

## 10. Files that look unused

Method: I parsed every static import, re-export and dynamic `import()` in the 215 `.js`/`.jsx` files and walked from `src\main.jsx`. 206 are reachable. I confirmed each result below with a name search.

| File | Import sites | Verdict |
|---|---|---|
| `src\views\RoomDemo.jsx` | `src\views\CatalogDebugView.jsx:15` (rendered at 61) | Dev only. `CatalogDebugView` is lazy-loaded only when `import.meta.env.DEV` (`App.jsx:33-35`, route `/catalog` at 84-95) |
| `...\src\views\SchemePicker.jsx` | `CatalogDebugView.jsx:16` (rendered at 60) | Dev only |
| `...\src\catalog\dev-modes.js` | `RoomDemo.jsx:21` | Dev only |
| `...\src\hooks\useMode.js` | none | Unused. Its header still describes a context that no longer exists |
| `...\src\components\core\ToolToggles.jsx` | none | Unused |
| `...\src\components\core\CitedMarkdown.jsx` | none | Unused |
| `...\src\lib\bus.js` | `src\lib\bus.test.js:2` only | Not in the app yet; it is the cross-tab signal bus |
| `...\src\views\MigrationPreview.jsx`, `src\lib\migrations\v6Plan.js`, `src\lib\docketModel.js`, `src\lib\addresses.js` | `App.jsx:29-31` (dev lazy route `/dev/migration`), plus tests | Dev only |
| `src\lib\*.test.js` (five) and `src\lib\__fixtures__\backup-v1.json` | the test runner; the fixture is read with `readFileSync` in `v6Plan.test.js:6` and `restorePlan.test.js:6` | Tests |

Unused exports inside files that are in use:
- `lib\catalog.js`: everything except `TIER_VALUES` and `listRooms`.
- `catalog\layouts\index.js`: `listLayoutEntries`.
- `lib\schemes.js`: `getSchemeDefinition`, `SCHEME_VARIANTS`, `TOKEN_KEYS`.
- `lib\roomIncludes.js`: `buildPillLabels` and the three label tables.
- `lib\modes.js`: `MODE_SCOPES`.
- `lib\slots.js`: `UNIVERSAL_SLOTS`, `LAYOUT_SPECIFIC_SLOTS`, `SLOT_CAPACITY`, `isKnownSlot`, `isUniversalSlot`.
- `hostAPI.getMessageActions` is used only by the dev demo.

---

## 11. Assessment (my judgment, separate from the facts above)

`CLAUDE.md` says nothing is deleted without item-by-item approval, so group C is a list of candidates, not a recommendation to remove anything now. `docs\design-snapshots\lab-current.html`, `wizard-current.html` and `homepage-editor-current.html` already record how the current surfaces look.

### A. Reusable as they are

- `lib\editorHistory.js` as a mechanism: snapshot, undo, redo, hard reset. It is what makes "no holding tray" possible.
- `lib\refs.js` (`normalizeRef`, `findCatalogEntry`), provided it becomes the only copy.
- `lib\modes.js`: `loadMode`, `listModes`, `saveMode`, `createBlankMode`, `createModeFromTemplate`, `deleteMode`.
- `RoomShell`'s resolution pipeline and the `softDependencies` plus `emptyStates.jsx` mechanism.
- `hostAPI` publish and subscribe.
- `InputArea.jsx`, `lib\fileUpload.js`, `hooks\useVoiceInput.js`: the feature logic for the input block already sits behind props and plain functions.
- The light scheme blocks in `index.css`, and `SCHEMES` with `schemeName`.
- `LayoutSilhouette.jsx` and `LibraryCard`'s `Preview` for Library thumbnails.
- The shared `SegmentedControl`, `Toggle`, `Button`, `Card` in `src\components\`.
- Wizard data: `PURPOSES`, `DEVICES`, `LAYOUT_META` copy, and `baselineComponentsFor` as the rule for required blocks.
- The `chosenHomeRoomId` setting and its stale-pointer check.

### B. Reusable with changes

- **`editorReducer.js`.** Keep `APPLY_SCHEME`, `SET_NAME`, `SET_DEVICE_CLASS`, `SET_PANEL_BUTTON`, `PLACE_COMPONENT`, `MOVE_COMPONENT`, `UPDATE_COMPONENT_CONFIG`, `SWAP_LAYOUT`, `INIT_FROM_LAYOUT`, `MARK_SAVED`, `RESET_TO`. Add a plain remove, a reorder, and one compound "apply plan" action so `add:` is a single undo step. Make name and device undoable.
- **History bookkeeping.** Coalesce typing. Take `dirty` out of the snapshot and derive it by comparing with the last saved revision. Decide whether selection and ticks belong in snapshots.
- **`planLayoutMigration` and `applyLayoutMigration`.** Keep the plan-then-apply split and the `{moves, orphans}` shape. The plan is exactly what an "Enter will do X" line needs. Replace the rule inside (see rebuild 3).
- **Catalogue manifests and `catalog\validate.js`.** Add `placement`, features, required, and a fixed capability vocabulary including `execute`. Fix the three missing `model:complete` declarations. Audit `slotTargets`. Give each setting a short user word and discrete options: numbers and free strings cannot be segmented choices, and 15 declared keys need wiring or removing.
- **`input.jsx` and `input-render.jsx`.** Fold in the three features (4c) and take the conversation id from `ChatContext.activeConversationId` or a prop instead of the URL.
- **Layout renderers.** Take width from the container or a prop so `device:mobile` and a room drawn inside a board can show the phone tree.
- **`ComponentField` in `EditorRightRail.jsx:582-651`.** The schema-to-control mapping is the seed of the Blocks board rows.
- **`EditorLibraryMode.jsx` pure helpers** (`buildCatalogItems`, `filterCatalogItems`, `isInDraft`) and the idea of ticks held in state, without rooms in the selection.
- **`EditorPreviewSheet`'s approach** (RoomShell on the unsaved draft) as the basis for trying a room, with the scheme applied and the room saved first so the chat can be reopened.
- **`ChatView`'s scheme effect.** Move it to a wrapper element.
- **`createCopyOfMode`.** Give the copy a non-colliding name.
- **`seedTemplates.js`.** Remove the three feature components and set input config instead, with version bumps.

### C. Not needed any more (candidates)

- `EditorHoldingTray.jsx`, the `tray` state, `MOVE_COMPONENT_TO_TRAY`, `RESTORE_FROM_TRAY`, `DISMISS_FROM_TRAY`, `ADD_REFS_TO_TRAY`, `RESET_TO.initialTray`, the "empty the tray first" guards, and the tray CSS (`index.css:1247-1323`).
- `EditorMigrationDialog.jsx` (the Enter line states the plan) and `EditorApplyRoomDialog.jsx` with `APPLY_ROOM` (rooms are duplicated, not applied).
- `EditorLeftRail.jsx` and `EditorRightRail.jsx` as rails; `EditorTopBar.jsx`'s Library/Build/Edit pills; `onStartCopy`, `onSwitchToEdit`, `applyBagToMode`.
- The Showcase, room-source glow, connector lines and `sourceRoomId` stamping.
- All dnd-kit wiring in the editor and `EditorTooNarrow`'s drag-and-drop explanation.
- `BuildView.jsx`, the wizard step components, `TemplateGallery.jsx`, `LayoutWireframe.jsx` and the ignition animation, once the guide lives in the Lab. The API-key entry in `IgnitionStep` needs a home elsewhere first.
- The nine web-search, voice-input and file-attach files (740 lines) once folded in, and the `inputActions`, `armedTools` and `attachments` registries.
- `useMode.js`, `ToolToggles.jsx`, `CitedMarkdown.jsx`: unused today regardless of the refactor.
- The homepage blocks and `stacked-sections`, as the decisions document already proposes; this is also the precondition for dropping dnd-kit.

### Rebuild rather than adapt

1. **The editor view layer** (`EditorView.jsx`, `EditorCanvas.jsx` and the rails). Their organising principle is drag source, drop target, dialog; `handleDragEnd` is the controller. The new controller is parse, plan, show, Enter, dispatch. A parser, a verb table with a plan step per verb, and a name resolver are all new.
2. **The slot model.** Make the layout manifest the single source: slot id, user word, label, numeric capacity, column. Derive the slot table, the canvas geometry and the thumbnails from it. Today there are three drifted copies, capacity is fiction, and `place:highlights right` has no meaning in a vocabulary of 13 ids. This also means deciding how the mockup's five words map onto layouts that have two right-hand slots or an outline.
3. **The layout-change rule.** `SLOT_FALLBACKS` moves by slot, ignores capacity and what a block fits, and assumes a tray. The new rule works per block: keep the slot if it exists and has room, else the block's fits in order, else drop it and say so. That is a different algorithm, not a patch.
4. **One catalogue read layer.** A single function should return rooms (yours and templates), layouts, blocks, themes, boards and resources from the manifests, the layout registry, `SCHEMES` and the stores. The stored component, layout and scheme rows are stale snapshots that already need patching at read time.
5. **Ref and name handling.** One normaliser and one resolver, with comparisons always on normalised refs. The current mix produces wrong "Current", "Placed" and "Active" labels and false layout conflicts.
6. **Theme scoping for dark and high contrast.** The nested selectors need a form that works on an inner element. The hard-coded colours in blocks and layouts are a separate, larger clean-up that decides how true "inside its edges only" can be.

### Questions the code raises that the design should answer

- **Saving.** Does the Lab save on every command, or keep an explicit save? Today it is explicit, with a dirty flag and a separate first-time Build step tied to `meta.builtAt`.
- **Duplicates.** Can a room hold two of the same block? Commands address blocks by name, and code allows duplicates with per-instance settings.
- **Web search "on".** Does it mean the option is offered per message (today's behaviour) or always sent?
- **The homepage editor.** What happens to `/edit-home` and `scope: 'homepage'`, which the reducer and migration table still support?
- **Catalogue wording.** Several mockup block descriptions do not match what the code does: Collaboration (a second person, versus system-prompt presets), Summary (conversation summary, versus dataset statistics), Ripple (later messages, versus document consistency), Review, Chart, Table and File shelf. Step list has no code.

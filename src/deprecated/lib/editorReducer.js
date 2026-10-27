// Retired with R16 to R21, approved by Stefan on 27 October 2026 (C250 (b)).
// Was src/lib/editorReducer.js. Nothing imports it and it is not built.
// To restore: move it back with the rest of the old editor and wizard, and put back their routes in App.jsx.
// Editor draft-mode reducer (PR-8). Pure state machine — no IndexedDB
// reads/writes happen here. EditorView wraps this in useReducer and
// persists on Save via lib/modes.saveMode.
//
// State shape:
//   {
//     mode:        parliament-mode/1.0 mode object (the draft)
//     selection:   { type: 'room'|'slot'|'component', id?: string }
//     tray:        Array<{compId, ref, fromSlot, reason, config}>  // orphans pulled out by a layout migration
//     libraryBag:  PR-44 shopping-cart state for Library mode (see below)
//     dirty:       boolean — true if mutated since last load/save
//   }
//
// Selection is held alongside mode rather than on the mode itself — it's
// pure UI state and does not belong in the saved file.
//
// Tray entries hold enough of the component spec that dragging them back
// onto a slot (RESTORE_FROM_TRAY) reconstitutes a full component spec.
//
// PR-44: libraryBag is the user's set of Library-mode selections — the
// "shopping cart" that feeds Build mode in PR-45. Shape:
//   {
//     layouts:     string[]  // layout refs (e.g. 'three-panel@1.0')
//     components:  string[]  // component refs (e.g. 'highlights@1.0')
//     schemes:     string[]  // scheme refs (e.g. 'parliament@1.0')
//     rooms:       string[]  // mode ids of checked rooms
//     sourceRooms: { layouts|components|schemes: { ref: roomId[] } }
//   }
// sourceRooms tracks which rooms (if any) contributed each item, so the
// Showcase can render colored-glow grouping by source room. An item not
// present in sourceRooms (or with an empty list) was added directly via
// a Library card click, not via a room.
//
// Library actions do NOT set dirty: the bag is transient UI state, not
// part of the saved mode file. They also don't push to the editor's
// undo/redo history (see editorHistory.js) — undo there covers canvas
// changes only.

import { applyLayoutMigration, planLayoutMigration } from './layoutMigration'
import { createBlankMode } from './modes'

export function makeInitialState(mode) {
  return {
    mode: cloneMode(mode),
    selection: { type: 'room' },
    tray: [],
    libraryBag: emptyLibraryBag(),
    dirty: false,
  }
}

function emptyLibraryBag() {
  return {
    layouts: [],
    components: [],
    schemes: [],
    rooms: [],
    sourceRooms: { layouts: {}, components: {}, schemes: {} },
  }
}

// PR-44: pluralised bag key for a given item kind.
// 'layout' → 'layouts', etc. 'room' → 'rooms'.
function bagKeyFor(kind) {
  return `${kind}s`
}

function cloneMode(mode) {
  if (!mode || typeof mode !== 'object') return mode
  return JSON.parse(JSON.stringify(mode))
}

function genId(prefix = 'comp') {
  return `${prefix}_${crypto.randomUUID()}`
}

function nextOrder(mode, slot) {
  const inSlot = (mode.components || []).filter((c) => c.slot === slot)
  return inSlot.length === 0 ? 0 : Math.max(...inSlot.map((c) => c.order ?? 0)) + 1
}

export function editorReducer(state, action) {
  switch (action.type) {

    // ─── Selection ───────────────────────────────────────
    case 'SELECT_ROOM':
      return { ...state, selection: { type: 'room' } }
    case 'SELECT_SLOT':
      return { ...state, selection: { type: 'slot', id: action.slotId } }
    case 'SELECT_COMPONENT':
      return { ...state, selection: { type: 'component', id: action.componentId } }
    case 'CLEAR_SELECTION':
      return { ...state, selection: { type: 'room' } }

    // ─── Room metadata ───────────────────────────────────
    case 'SET_NAME':
      return {
        ...state,
        mode: {
          ...state.mode,
          meta: { ...(state.mode.meta || {}), name: action.name },
        },
        dirty: true,
      }

    case 'SET_DEVICE_CLASS':
      return {
        ...state,
        mode: { ...state.mode, deviceClass: action.deviceClass },
        dirty: true,
      }

    case 'APPLY_SCHEME': {
      // PR-46d: optional sourceRoomId stamps the scheme with the room
      // it came from (when applied via a Library room bundle), so the
      // Showcase can glow draft items by their original source.
      const newScheme = { ref: action.schemeRef }
      if (action.sourceRoomId) newScheme.sourceRoomId = action.sourceRoomId
      return {
        ...state,
        mode: { ...state.mode, scheme: newScheme },
        dirty: true,
      }
    }

    case 'SET_PANEL_BUTTON':
      // PR-27: opt-in per-slot panel-toggle metadata. Stored at
      // mode.layoutConfig.panelButtons[slotId] = boolean. Absence
      // means no toggle button is rendered at runtime (default off).
      return {
        ...state,
        mode: {
          ...state.mode,
          layoutConfig: {
            ...(state.mode.layoutConfig || {}),
            panelButtons: {
              ...(state.mode.layoutConfig?.panelButtons || {}),
              [action.slotId]: action.enabled,
            },
          },
        },
        dirty: true,
      }

    // ─── Component placement ─────────────────────────────
    case 'PLACE_COMPONENT': {
      // Place a NEW instance of `ref` in `slot`. Caller can pass an
      // existing config; otherwise empty.
      const newComp = {
        id: action.id || genId('comp'),
        ref: action.ref,
        slot: action.slot,
        order: nextOrder(state.mode, action.slot),
        config: action.config || {},
      }
      return {
        ...state,
        mode: {
          ...state.mode,
          components: [...(state.mode.components || []), newComp],
        },
        selection: { type: 'component', id: newComp.id },
        dirty: true,
      }
    }

    case 'MOVE_COMPONENT': {
      // Move an EXISTING component to a new slot.
      const components = (state.mode.components || []).map((c) =>
        c.id === action.componentId
          ? { ...c, slot: action.slot, order: nextOrder(state.mode, action.slot) }
          : c
      )
      return {
        ...state,
        mode: { ...state.mode, components },
        dirty: true,
      }
    }

    case 'MOVE_COMPONENT_TO_TRAY': {
      // PR-49a: "Remove from spot" no longer drops the component
      // outright — it sends the instance to the holding tray so the
      // user can either restore it (drag back onto a slot) or
      // confirm-delete via the tray's x. Same safety pattern dnd-kit
      // already gives orphans from a layout swap.
      //
      // Preserves the component's id (as compId), ref, config, and
      // sourceRoomId so RESTORE_FROM_TRAY rehydrates the same instance
      // it removed. No dedup against existing tray refs: two distinct
      // placed instances become two distinct chips.
      const target = (state.mode.components || []).find(
        (c) => c.id === action.componentId
      )
      if (!target) return state
      const components = (state.mode.components || []).filter(
        (c) => c.id !== action.componentId
      )
      const chip = {
        compId: target.id,
        ref: target.ref,
        fromSlot: target.slot || null,
        reason: 'removed from canvas',
        config: target.config || {},
      }
      if (target.sourceRoomId) chip.sourceRoomId = target.sourceRoomId
      const selection =
        state.selection.type === 'component' && state.selection.id === action.componentId
          ? { type: 'room' }
          : state.selection
      return {
        ...state,
        mode: { ...state.mode, components },
        tray: [...(state.tray || []), chip],
        selection,
        dirty: true,
      }
    }

    case 'UPDATE_COMPONENT_CONFIG': {
      // Merge `patch` into the selected component's config.
      const components = (state.mode.components || []).map((c) =>
        c.id === action.componentId
          ? { ...c, config: { ...(c.config || {}), ...action.patch } }
          : c
      )
      return {
        ...state,
        mode: { ...state.mode, components },
        dirty: true,
      }
    }

    // ─── Layout swap (with migration) ────────────────────
    case 'SWAP_LAYOUT': {
      // Re-plan the migration each call rather than trusting a cached
      // plan — the canvas state may have changed between dialog open
      // and confirm.
      const plan = planLayoutMigration({
        fromLayout: state.mode.layout?.ref,
        toLayout: action.layoutRef,
        components: state.mode.components || [],
      })

      const movedComponents = applyLayoutMigration({
        components: state.mode.components || [],
        moves: plan.moves,
        orphans: plan.orphans,
      })

      // PR-46d: orphans carry their sourceRoomId into the tray so it
      // re-appears when they're restored. Same dance the new-from-
      // Library entries do via ADD_REFS_TO_TRAY's sourceRoomMap.
      const orphanIds = new Set(plan.orphans.map((o) => o.compId))
      const orphanSpecs = (state.mode.components || []).filter((c) => orphanIds.has(c.id))
      const newTray = plan.orphans.map((o) => {
        const spec = orphanSpecs.find((s) => s.id === o.compId) || {}
        return {
          compId: o.compId,
          ref: spec.ref,
          fromSlot: o.fromSlot,
          reason: o.reason,
          config: spec.config || {},
          sourceRoomId: spec.sourceRoomId || null,
        }
      })

      // PR-46d: optional sourceRoomId for the swapped-in layout.
      const newLayout = { ref: action.layoutRef }
      if (action.sourceRoomId) newLayout.sourceRoomId = action.sourceRoomId

      return {
        ...state,
        mode: {
          ...state.mode,
          layout: newLayout,
          components: movedComponents,
        },
        tray: [...state.tray, ...newTray],
        selection: { type: 'room' },
        dirty: true,
      }
    }

    // ─── Tray ────────────────────────────────────────────
    case 'RESTORE_FROM_TRAY': {
      // Drop a tray chip onto a slot — re-add as a fresh component spec.
      // PR-46d: carry the chip's sourceRoomId onto the placed instance
      // so the Library Showcase can glow it by its original source.
      const chip = state.tray.find((t) => t.compId === action.compId)
      if (!chip) return state
      const newComp = {
        id: action.compId, // keep stable id — same instance
        ref: chip.ref,
        slot: action.slot,
        order: nextOrder(state.mode, action.slot),
        config: chip.config || {},
      }
      if (chip.sourceRoomId) newComp.sourceRoomId = chip.sourceRoomId
      return {
        ...state,
        mode: {
          ...state.mode,
          components: [...(state.mode.components || []), newComp],
        },
        tray: state.tray.filter((t) => t.compId !== action.compId),
        selection: { type: 'component', id: newComp.id },
        dirty: true,
      }
    }

    case 'DISMISS_FROM_TRAY':
      return {
        ...state,
        tray: state.tray.filter((t) => t.compId !== action.compId),
        dirty: true,
      }

    // ─── Save lifecycle ──────────────────────────────────
    case 'MARK_SAVED':
      // Optionally swap in the saved mode (saveMode returns one with a
      // stamped meta.modified). Selection and tray are preserved so the
      // editor stays where the user was. History is preserved by the
      // wrapping history reducer — undo past a save is allowed.
      return {
        ...state,
        mode: action.mode ? cloneMode(action.mode) : state.mode,
        dirty: false,
      }

    case 'RESET_TO': {
      // Replace state entirely. Used on initial load — the history
      // wrapper treats this as a hard reset and discards undo history.
      // PR-48d: an optional initialTray seeds the holding tray (used
      // when forking from Edit with a populated Library bag — bag
      // components land on the fork's tray, not the source).
      const fresh = makeInitialState(action.mode)
      if (Array.isArray(action.initialTray) && action.initialTray.length > 0) {
        fresh.tray = [...action.initialTray]
        fresh.dirty = true
      }
      return fresh
    }

    // ─── Blank-canvas materialization (PR-19d) ───────────
    case 'INIT_FROM_LAYOUT': {
      // Materializes a fresh mode when the user drops a layout on a
      // blank canvas. The history wrapper clears undo when state.mode
      // was previously null — see editorHistory.js.
      // PR-46d: optional sourceRoomId stamps the layout with the room
      // it was sourced from (Library room bundle).
      const fresh = createBlankMode(action.layoutRef)
      if (action.sourceRoomId && fresh.layout) {
        fresh.layout.sourceRoomId = action.sourceRoomId
      }
      return {
        mode: fresh,
        selection: { type: 'room' },
        tray: [],
        libraryBag: state.libraryBag || emptyLibraryBag(),
        dirty: true,
      }
    }

    // ─── Room application (PR-19d) ───────────────────────
    case 'APPLY_ROOM': {
      // Compound action — apply some/all of: layout, scheme, components
      // from a source mode onto the current canvas. Single undo entry.
      //
      // When state.mode is null (blank canvas), we materialize a base
      // from the source's layout regardless of applyLayout — there has
      // to be a layout for components to land in.
      //
      // Edge: if applyComponents is true but applyLayout is false AND
      // layouts differ, we no-op the components branch (the dialog
      // disables this combination upstream; this is defense-in-depth).
      const {
        sourceMode,
        applyLayout,
        applyScheme,
        componentRefsToApply,
      } = action

      const base = state.mode || createBlankMode(sourceMode.layout?.ref)
      const baseLayoutRef = base.layout?.ref
      const sourceLayoutRef = sourceMode.layout?.ref
      const layoutsDiffer = baseLayoutRef !== sourceLayoutRef

      let nextMode = { ...base }
      let nextTray = [...state.tray]

      // 1) Layout swap (with migration of any current components)
      if (applyLayout && layoutsDiffer && sourceLayoutRef) {
        const plan = planLayoutMigration({
          fromLayout: baseLayoutRef,
          toLayout: sourceLayoutRef,
          components: nextMode.components || [],
        })
        const moved = applyLayoutMigration({
          components: nextMode.components || [],
          moves: plan.moves,
          orphans: plan.orphans,
        })
        const orphanIds = new Set(plan.orphans.map((o) => o.compId))
        const orphanSpecs = (nextMode.components || []).filter((c) => orphanIds.has(c.id))
        const newTray = plan.orphans.map((o) => {
          const spec = orphanSpecs.find((s) => s.id === o.compId) || {}
          return {
            compId: o.compId,
            ref: spec.ref,
            fromSlot: o.fromSlot,
            reason: o.reason,
            config: spec.config || {},
          }
        })
        nextMode = { ...nextMode, layout: { ref: sourceLayoutRef }, components: moved }
        nextTray = [...nextTray, ...newTray]
      }

      // 2) Components: sweep current → tray, place selected source comps.
      // Skip silently if layouts differ and we didn't apply the new layout
      // (no valid slots for the incoming components).
      const canApplyComponents =
        action.applyComponents && (!layoutsDiffer || applyLayout)
      if (canApplyComponents) {
        const refsToApply = new Set(componentRefsToApply || [])
        // Push current components into the tray.
        const sweptToTray = (nextMode.components || []).map((c) => ({
          compId: c.id,
          ref: c.ref,
          fromSlot: c.slot,
          reason: 'replaced by applied room',
          config: c.config || {},
        }))
        // Build new component instances from the source's components.
        const incoming = (sourceMode.components || [])
          .filter((c) => refsToApply.has(c.id))
          .map((c) => ({
            id: `comp_${crypto.randomUUID()}`,
            ref: c.ref,
            slot: c.slot,
            order: c.order ?? 0,
            config: c.config || {},
          }))
        nextMode = { ...nextMode, components: incoming }
        nextTray = [...nextTray, ...sweptToTray]
      }

      // 3) Scheme
      if (applyScheme && sourceMode.scheme?.ref) {
        nextMode = { ...nextMode, scheme: { ref: sourceMode.scheme.ref } }
      }

      return {
        ...state,
        mode: nextMode,
        tray: nextTray,
        selection: { type: 'room' },
        dirty: true,
      }
    }

    // ─── PR-44: Library mode shopping cart ───────────────
    case 'LIBRARY_TOGGLE': {
      // Toggle an item in the bag. `kind` is 'layout' | 'component' |
      // 'scheme' | 'room'. For rooms, the room's constituent layout,
      // scheme, and components are also added (or, on toggle-off, the
      // room is dropped from sourceRooms — constituent items stay so
      // the user can manage them independently).
      const { kind, ref } = action
      const key = bagKeyFor(kind)
      const bag = state.libraryBag || emptyLibraryBag()
      const list = bag[key] || []
      const present = list.includes(ref)

      if (present) {
        let nextBag = {
          ...bag,
          [key]: list.filter((r) => r !== ref),
          sourceRooms: { ...bag.sourceRooms },
        }
        // Drop sourceRooms tracking for this item (if any).
        if (kind !== 'room' && nextBag.sourceRooms[key]) {
          const { [ref]: _drop, ...rest } = nextBag.sourceRooms[key]
          nextBag.sourceRooms = { ...nextBag.sourceRooms, [key]: rest }
        }
        // Toggling off a room: drop this room id from every item's
        // source list. Constituent items stay in the bag; only the
        // colored-glow association is severed.
        if (kind === 'room') {
          for (const itemKind of ['layouts', 'components', 'schemes']) {
            const map = nextBag.sourceRooms[itemKind] || {}
            const updated = {}
            for (const [itemRef, roomIds] of Object.entries(map)) {
              const filtered = roomIds.filter((id) => id !== ref)
              if (filtered.length > 0) updated[itemRef] = filtered
            }
            nextBag.sourceRooms = { ...nextBag.sourceRooms, [itemKind]: updated }
          }
        }
        return { ...state, libraryBag: nextBag }
      }

      // Toggle on.
      let nextBag = {
        ...bag,
        [key]: [...list, ref],
        sourceRooms: { ...bag.sourceRooms },
      }

      // Rooms expand into their constituent layout/scheme/components.
      // The room id is passed through action.room as a snapshot.
      if (kind === 'room' && action.room) {
        const room = action.room
        const roomId = ref
        const layoutRef = room.layout?.ref || null
        const schemeRef = room.scheme?.ref || null
        const compRefs = [...new Set((room.components || []).map((c) => c.ref))]

        const addWithSource = (itemKey, itemRef) => {
          if (!itemRef) return
          const itemList = nextBag[itemKey] || []
          if (!itemList.includes(itemRef)) {
            nextBag[itemKey] = [...itemList, itemRef]
          }
          const srcMap = nextBag.sourceRooms[itemKey] || {}
          const existing = srcMap[itemRef] || []
          if (!existing.includes(roomId)) {
            nextBag.sourceRooms = {
              ...nextBag.sourceRooms,
              [itemKey]: { ...srcMap, [itemRef]: [...existing, roomId] },
            }
          }
        }
        addWithSource('layouts', layoutRef)
        addWithSource('schemes', schemeRef)
        for (const r of compRefs) addWithSource('components', r)
      }

      return { ...state, libraryBag: nextBag }
    }

    case 'LIBRARY_CLEAR':
      return { ...state, libraryBag: emptyLibraryBag() }

    case 'ADD_REFS_TO_TRAY': {
      // PR-45: bag components commit to the holding tray on Library
      // close. Each ref becomes a fresh tray chip the user can drag
      // onto a slot. Skip empties / dupes against existing tray chips
      // so a re-commit doesn't pile up duplicate entries.
      // PR-46d: action may carry a sourceRoomMap (ref → roomId) so the
      // chip — and later the placed instance after RESTORE_FROM_TRAY —
      // retains the originating room for Showcase glow grouping.
      const existing = new Set((state.tray || []).map((t) => t.ref))
      const refs = (action.refs || []).filter((r) => r && !existing.has(r))
      if (refs.length === 0) return state
      const newEntries = refs.map((ref) => {
        const entry = {
          compId: genId('comp'),
          ref,
          fromSlot: null,
          reason: 'added from Library',
          config: {},
        }
        const src = action.sourceRoomMap?.[ref]
        if (src) entry.sourceRoomId = src
        return entry
      })
      return {
        ...state,
        tray: [...(state.tray || []), ...newEntries],
        dirty: true,
      }
    }

    default:
      return state
  }
}

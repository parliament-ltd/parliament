// Editor draft-mode reducer (PR-8). Pure state machine — no IndexedDB
// reads/writes happen here. EditorView wraps this in useReducer and
// persists on Save via lib/modes.saveMode.
//
// State shape:
//   {
//     mode:       parliament-mode/1.0 mode object (the draft)
//     selection:  { type: 'room'|'slot'|'component', id?: string }
//     tray:       Array<{compId, ref, fromSlot, reason, config}>  // orphans pulled out by a layout migration
//     dirty:      boolean — true if mutated since last load/save
//   }
//
// Selection is held alongside mode rather than on the mode itself — it's
// pure UI state and does not belong in the saved file.
//
// Tray entries hold enough of the component spec that dragging them back
// onto a slot (RESTORE_FROM_TRAY) reconstitutes a full component spec.

import { applyLayoutMigration, planLayoutMigration } from './layoutMigration'
import { createBlankMode } from './modes'

export function makeInitialState(mode) {
  return {
    mode: cloneMode(mode),
    selection: { type: 'room' },
    tray: [],
    dirty: false,
  }
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

    case 'APPLY_SCHEME':
      return {
        ...state,
        mode: { ...state.mode, scheme: { ref: action.schemeRef } },
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

    case 'REMOVE_COMPONENT': {
      const components = (state.mode.components || []).filter(
        (c) => c.id !== action.componentId
      )
      // If the removed component was selected, fall back to the room.
      const selection =
        state.selection.type === 'component' && state.selection.id === action.componentId
          ? { type: 'room' }
          : state.selection
      return {
        ...state,
        mode: { ...state.mode, components },
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

      // Convert orphans into tray entries that retain enough of the
      // component spec to reconstitute on RESTORE_FROM_TRAY.
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
        }
      })

      return {
        ...state,
        mode: {
          ...state.mode,
          layout: { ref: action.layoutRef },
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
      const chip = state.tray.find((t) => t.compId === action.compId)
      if (!chip) return state
      const newComp = {
        id: action.compId, // keep stable id — same instance
        ref: chip.ref,
        slot: action.slot,
        order: nextOrder(state.mode, action.slot),
        config: chip.config || {},
      }
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

    case 'RESET_TO':
      // Replace state entirely. Used on initial load — the history
      // wrapper treats this as a hard reset and discards undo history.
      return makeInitialState(action.mode)

    // ─── Blank-canvas materialization (PR-19d) ───────────
    case 'INIT_FROM_LAYOUT': {
      // Materializes a fresh mode when the user drops a layout on a
      // blank canvas. The history wrapper clears undo when state.mode
      // was previously null — see editorHistory.js.
      const fresh = createBlankMode(action.layoutRef)
      return {
        mode: fresh,
        selection: { type: 'room' },
        tray: [],
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

    default:
      return state
  }
}

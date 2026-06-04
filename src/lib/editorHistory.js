// Editor undo / redo (PR-8b). Wraps editorReducer in a history stack.
//
// State shape:
//   {
//     past:    Array<EditorState>  // older states, oldest first
//     present: EditorState          // current state (what EditorView renders)
//     future:  Array<EditorState>  // redo stack, next-redo first
//   }
//
// History push rule: only the eight mutating actions listed in
// HISTORY_ACTIONS push the prior `present` onto `past`. Selection
// changes, MARK_SAVED, and other meta mutations update `present` in
// place without touching past/future. Any history-pushing action
// clears `future` (the redo branch is invalidated by a new edit).
//
// RESET_TO is treated specially: it discards history entirely. That's
// the right behavior on initial load and on page reload (history is
// session-scoped).
//
// MARK_SAVED is intentionally NOT in HISTORY_ACTIONS — saving doesn't
// add a step you can undo, and per spec users can undo *past* a save.

import { editorReducer, makeInitialState } from './editorReducer'

const HISTORY_ACTIONS = new Set([
  'PLACE_COMPONENT',
  'MOVE_COMPONENT',
  // PR-49a: removing a placed component sends it to the holding tray
  // (no true-delete action exists for canvas components anymore — the
  // tray's x via DISMISS_FROM_TRAY is the only permanent removal path).
  'MOVE_COMPONENT_TO_TRAY',
  'SWAP_LAYOUT',
  'APPLY_SCHEME',
  'UPDATE_COMPONENT_CONFIG',
  'RESTORE_FROM_TRAY',
  'DISMISS_FROM_TRAY',
  // PR-19d: room application + first-layout materialization. When
  // these fire on top of a populated canvas they record one undo step.
  // When they fire on a blank canvas (state.mode was null), we clear
  // history below — otherwise the user could undo into a null mode.
  'INIT_FROM_LAYOUT',
  'APPLY_ROOM',
  // PR-27: per-slot panel-toggle opt-in is a real mode-file mutation;
  // a misclick should be undoable like any other field edit.
  'SET_PANEL_BUTTON',
  // PR-45: Library mode's apply-on-close commits bag components into
  // the holding tray. Treat each commit batch as one undoable step.
  'ADD_REFS_TO_TRAY',
])

// Cap above the 20-state spec floor. Each entry holds a cloned mode
// plus a small selection/tray snapshot — for typical room sizes this
// is well under a megabyte at the cap.
const HISTORY_LIMIT = 50

export function makeInitialHistoryState(mode) {
  return {
    past: [],
    present: makeInitialState(mode),
    future: [],
  }
}

export function editorHistoryReducer(state, action) {
  switch (action.type) {
    case 'UNDO': {
      if (state.past.length === 0) return state
      const previous = state.past[state.past.length - 1]
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future],
      }
    }

    case 'REDO': {
      if (state.future.length === 0) return state
      const next = state.future[0]
      return {
        past: [...state.past, state.present],
        present: next,
        future: state.future.slice(1),
      }
    }

    case 'RESET_TO':
      // Hard reset on initial load. Drop history.
      return {
        past: [],
        present: editorReducer(state.present, action),
        future: [],
      }

    default: {
      const wasBlank = state.present.mode === null
      const newPresent = editorReducer(state.present, action)
      if (newPresent === state.present) return state

      // PR-19d: materializing a mode from a blank canvas (null mode) is
      // a fresh start. Undo would land back on null and break the canvas,
      // so we drop history for that one transition. Subsequent edits
      // accumulate normally.
      if (wasBlank && (action.type === 'INIT_FROM_LAYOUT' || action.type === 'APPLY_ROOM')) {
        return { past: [], present: newPresent, future: [] }
      }

      if (HISTORY_ACTIONS.has(action.type)) {
        const newPast = [...state.past, state.present]
        const trimmedPast =
          newPast.length > HISTORY_LIMIT
            ? newPast.slice(newPast.length - HISTORY_LIMIT)
            : newPast
        return {
          past: trimmedPast,
          present: newPresent,
          future: [],
        }
      }

      return { ...state, present: newPresent }
    }
  }
}

export function canUndo(state) {
  return state.past.length > 0
}

export function canRedo(state) {
  return state.future.length > 0
}

// The bar's field: what mode it is in, what is typed in each mode, and
// whether it is open, folded into a circle or out of the way (bar
// reference, "The field" and "Minimising while editing in place"; C44 and
// A3, ruled 15 October). Drawing comes later, to the token sheet; this is
// the behaviour, as a reducer the bar will run.
//
// The rules:
// - A leader at position 0 changes the mode: `>` to command, which keeps its
//   `>` in the field; `p>` or `prompt>` to prompt and `s>` or `search>` to
//   search, which are swallowed.
// - What was typed stays with the mode it was typed in, so typing `>` again
//   brings back an unfinished command.
// - Escape never deletes text. It takes the field to the mode the screen
//   rests in (search on the Almanac and the welcome page, prompt in a room
//   and a docket); in the resting mode it returns you to what you were
//   doing, and folds the field again if you were editing a reply.
// - Backspace only deletes text. Deleting the `>` leaves command mode. In
//   prompt and search the leader is gone already, so Backspace in an empty
//   field does nothing.
// - After a command runs the field resets to `>` and keeps focus.
// - Clicking into a reply folds the field into a circle (C108, which
//   replaced the hexagon); Cmd/Ctrl+K or a
//   click opens it in the mode it was left in. Hovering opens it without
//   taking focus, and it folds again when the pointer leaves unless
//   something was typed.
// - A prompt edited in the chat and sent to the bar (C214 (b)) is held, not
//   written out (Stefan, 29 October: "instead of writing the entire text,
//   which can be a lot, let's have a placeholder"). The field shows a short
//   placeholder in its place; Enter sends the held words as they are.
//   Typing replaces them with what is typed, and Backspace, Delete or
//   Escape clear them. A leader to another mode leaves them held, as text
//   typed in a mode stays with it.

import { leaderOf } from '../commands/parse'

export const MODES = Object.freeze(['search', 'command', 'prompt'])

/**
 * @typedef {{ mode: 'search'|'command'|'prompt', resting: 'search'|'prompt',
 *   text: { search: string, command: string, prompt: string },
 *   focused: boolean, minimised: boolean, editingReply: boolean, peek: boolean,
 *   held: boolean }} FieldState
 *   held: the prompt's text is a prompt edited in the chat, shown as a
 *   placeholder until it is sent, typed over or cleared
 */

/** @param {'search'|'prompt'} resting the mode this screen rests in @returns {FieldState} */
export function initialField(resting = 'search') {
  return { mode: resting, resting, text: { search: '', command: '', prompt: '' }, focused: false, minimised: false, editingReply: false, peek: false, held: false }
}

/** What the field holds: the `>` stays in command mode; the other leaders are swallowed. */
export const fieldValue = (state) => (state.mode === 'command' ? `>${state.text.command}` : state.text[state.mode])

/** Whether the field shows a held prompt as its placeholder (the prompt mode only). */
export const showsHeld = (state) => Boolean(state.held) && state.mode === 'prompt' && Boolean(state.text.prompt)

/** What the input shows: nothing in place of a held prompt, which the placeholder stands for. */
export const shownValue = (state) => (showsHeld(state) ? '' : fieldValue(state))

/**
 * Whether what was typed into the field drops the prompt it holds: anything
 * but a leader to another mode, which leaves it held for when the field
 * comes back to the prompt.
 */
export function dropsHeld(state, value) {
  if (!showsHeld(state)) return false
  const leader = leaderOf(String(value ?? ''))
  return !(leader && leader.mode !== 'prompt')
}

// The field after an edit, given its whole new value.
function input(state, value) {
  const text = { ...state.text }
  const peek = false // typing keeps a hovered field open

  if (state.mode === 'command') {
    if (!value.startsWith('>')) {
      // The `>` was deleted: back to the resting mode, with what is left.
      text.command = ''
      if (value) text[state.resting] = value
      return { ...state, mode: state.resting, text, peek }
    }
    const body = value.slice(1)
    const inner = leaderOf(body)
    if (inner && inner.mode !== 'command') {
      // `p>` or `s>` typed after the `>`.
      text.command = ''
      const rest = body.slice(inner.length)
      if (rest) text[inner.mode] = rest
      return { ...state, mode: inner.mode, text, peek }
    }
    text.command = body
    return { ...state, text, peek }
  }

  const leader = leaderOf(value)
  if (leader && leader.mode !== state.mode) {
    // A leader at position 0 changes the mode. What was typed before stays
    // with the mode it was typed in. A leader typed in front of that text
    // leaves it behind; anything else after the leader is the new mode's.
    const rest = value.slice(leader.length)
    if (rest && rest !== state.text[state.mode]) text[leader.mode] = rest
    return { ...state, mode: leader.mode, text, peek }
  }
  if (leader && leader.swallow) {
    // `p>` in prompt mode, or `s>` in search: swallowed.
    text[state.mode] = value.slice(leader.length)
    return { ...state, text, peek }
  }
  text[state.mode] = value
  return { ...state, text, peek }
}

/**
 * @param {FieldState} state
 * @param {{ type: string, value?: string, resting?: 'search'|'prompt' }} action
 *   input (value), escape, recall (value), ran (to: 'prompt' after focus:), draft (value, focus), drop, sent, clearSearch, setSearch (value), surface (resting), focus, blur, open,
 *   editReply, doneEditing, hover, leave
 * @returns {FieldState}
 */
export function fieldReducer(state, action) {
  switch (action.type) {
    case 'input': {
      const value = String(action.value ?? '')
      // Typed over a held prompt: what is typed takes its place.
      if (dropsHeld(state, value)) return input({ ...state, held: false, text: { ...state.text, prompt: '' } }, value)
      return input(state, value)
    }

    case 'drop':
      // A held prompt cleared, unsent (Backspace, Delete or Escape on it).
      return state.held ? { ...state, held: false, text: { ...state.text, prompt: '' } } : state

    case 'escape':
      // Escape on a held prompt clears it, and nothing else (Stefan, 29 October).
      if (showsHeld(state) && (state.focused || state.peek)) return { ...state, held: false, text: { ...state.text, prompt: '' } }
      if (!state.focused && !state.peek) return state
      if (state.mode !== state.resting) return { ...state, mode: state.resting }
      return { ...state, focused: false, peek: false, minimised: state.editingReply }

    case 'recall':
      // A line brought back from the history with the arrow keys.
      return { ...state, mode: 'command', text: { ...state.text, command: String(action.value ?? '') } }

    case 'ran':
      // After a command runs, the field resets to `>` and keeps focus, or
      // turns to prompt mode where the command asks for it (focus:, W §7).
      return { ...state, mode: action.to === 'prompt' ? 'prompt' : 'command', text: { ...state.text, command: '' }, focused: true }

    case 'draft':
      // A prompt written into the field from a room, to edit and send: a
      // prompt and its reply joined (stage 11, piece 2; C214 (b)).
      // It opens the field, folded while the reply was edited.
      // Without focus (joined by typing), it is filled and opened, and the
      // person goes on typing where they were. Held: the placeholder shows
      // in its place, and Enter sends it.
      return { ...state, mode: 'prompt', text: { ...state.text, prompt: String(action.value ?? '') }, focused: action.focus !== false, minimised: false, editingReply: false, peek: false, held: Boolean(String(action.value ?? '')) }

    case 'sent':
      // A prompt went, or a search was done with: its text is cleared.
      return { ...state, text: { ...state.text, [state.mode]: '' }, held: state.mode === 'prompt' ? false : state.held }

    case 'clearSearch':
      // clear:filters or clear:search on Records (C132 (c)): the search goes,
      // and nothing else changes.
      return state.text.search ? { ...state, text: { ...state.text, search: '' } } : state

    case 'setSearch': {
      // A saved search opened on Records (C140): the field holds its words,
      // and nothing else changes.
      const value = String(action.value ?? '')
      return state.text.search === value ? state : { ...state, text: { ...state.text, search: value } }
    }

    case 'surface': {
      // The addressed screen changed, and with it the resting mode.
      const resting = action.resting === 'prompt' ? 'prompt' : 'search'
      const mode = state.mode === state.resting ? resting : state.mode
      return { ...state, resting, mode }
    }

    case 'focus':
      return { ...state, focused: true, minimised: false, peek: false }
    case 'blur':
      return { ...state, focused: false }
    case 'open':
      // Cmd/Ctrl+K, or a click on the circle: open in the mode it was left in.
      return { ...state, focused: true, minimised: false, peek: false }

    case 'editReply':
      return { ...state, editingReply: true, minimised: true, focused: false, peek: false }
    case 'doneEditing':
      return state.editingReply ? { ...state, editingReply: false, minimised: false, peek: false } : state

    case 'hover':
      return state.minimised ? { ...state, minimised: false, peek: true } : state
    case 'leave':
      return state.peek && !state.focused ? { ...state, minimised: true, peek: false } : state

    default:
      return state
  }
}

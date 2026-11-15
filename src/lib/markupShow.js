// The markup menu (C301 (b); Stefan, 15 November): what shows in the text,
// each kind ticked or not, and how your typing is kept. Settings of this
// device, as calm was (C253 (d)), and not in backups.
//
//   markupShow  { edits, highlights, prompts, comments }, each shown unless false
//   markupMode  'editing': what you type is the text, and goes with your next prompt
//               'suggesting': what you type is kept held back, marked, until accepted

/** Every kind the menu lists, in its order. */
export const MARK_KINDS = Object.freeze(['edits', 'highlights', 'prompts', 'comments'])

/** The kinds drawn in the text today. Comments come into the text with C301 (c); until then their row waits. */
export const SHOWN_KINDS = Object.freeze(['edits', 'highlights', 'prompts'])

/** A stored markupShow as four booleans: anything not set to false shows. */
export function showOf(stored) {
  const s = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {}
  return Object.fromEntries(MARK_KINDS.map((k) => [k, s[k] !== false]))
}

/** A stored markupMode, 'editing' unless it says suggesting. */
export const modeOf = (stored) => (stored === 'suggesting' ? 'suggesting' : 'editing')

/** The shell's classes for the kinds hidden, as ' hide-edits hide-prompts'. */
export const hiddenClasses = (show) => SHOWN_KINDS.filter((k) => show?.[k] === false).map((k) => ` hide-${k}`).join('')

// The keys that reach the bar (bar reference, "The field"; docket spec §5;
// settings spec §5; P2, ruled).
//
// - `/` jumps to the field, but only when no other text field has focus:
//   there it is a character, and in a reply it opens the block menu.
// - Cmd/Ctrl+K opens the field from anywhere, inside text fields and replies
//   included.
// - Escape, inside the field, follows the field's rule (field.js).
// - Nothing fires while an input method is composing, so typing Japanese or
//   Chinese never trips a shortcut.
//
// The hint line names only the keys that work where focus is.

const TEXT_INPUTS = new Set(['text', 'search', 'url', 'email', 'tel', 'password', 'number', ''])

/** Whether an element takes typed text, so `/` belongs to it. */
export function isTextField(el) {
  if (!el) return false
  if (el.isContentEditable) return true
  const tag = String(el.tagName || '').toUpperCase()
  if (tag === 'TEXTAREA') return true
  if (tag === 'INPUT') return TEXT_INPUTS.has(String(el.type ?? '').toLowerCase())
  return false
}

/**
 * What a key press means for the bar: 'open', 'focus', 'escape', or null.
 * @param {{ key: string, metaKey?: boolean, ctrlKey?: boolean, altKey?: boolean, shiftKey?: boolean, isComposing?: boolean }} event
 * @param {{ inTextField?: boolean, inBar?: boolean }} where focus is
 */
export function barKey(event, { inTextField = false, inBar = false } = {}) {
  if (event.isComposing) return null
  const mod = Boolean(event.metaKey || event.ctrlKey)
  if (mod && !event.altKey && !event.shiftKey && String(event.key).toLowerCase() === 'k') return 'open'
  if (event.key === '/' && !mod && !event.altKey && !inTextField && !inBar) return 'focus'
  if (event.key === 'Escape' && inBar) return 'escape'
  return null
}

/** The hint the line advertises where focus is: 'slashOrK' outside text fields, else 'kOnly'. */
export const hintFor = ({ inTextField = false } = {}) => (inTextField ? 'kOnly' : 'slashOrK')

/**
 * How the modifier is written on this computer: ⌘ on Apple's systems, Ctrl
 * elsewhere. Read from the platform, never the browser's name.
 * @param {{ userAgentData?: { platform?: string }, platform?: string }} [nav]
 */
export function modKey(nav = globalThis.navigator) {
  const platform = nav?.userAgentData?.platform || nav?.platform || ''
  return /mac|iphone|ipad|ipod/i.test(platform) ? '⌘' : 'Ctrl'
}

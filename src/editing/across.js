// Selecting across cards in a chat (C280 (d); Stefan, 29 October: "It
// doesn't seem I'm able to select across from the prompt to the reply").
//
// A prompt and its finished reply are one editor (C215 (a)), so a selection
// already runs from one into the other there, and joining them (C214) works
// as before. Everywhere else each card's text is an editor of its own, or
// none: a prompt above the tabs of several branches, a reply in a tab, a
// source's list of results, a reply still arriving or cut off, and one turn's
// reply above the next prompt. A browser never lets a selection that starts
// inside one editing host run out of it, nor (Chromium) one from outside run
// into it: it stops at the edge of the card.
//
// So, for as long as a mouse drag runs out of the editor it started in (or
// into one from outside it), every editor in the chat stops being one. The
// selection is then the page's, as on any page, and copies as one. Nothing
// can be typed into it; a key that would edit does nothing.
//
// The editors come back:
// - when the drag ends inside one editor: at once, with the selection kept
//   and that editor focused, so it can be struck (Ctrl+Shift+X) or asked
//   about as any selection in a reply;
// - otherwise on the next press of the pointer anywhere, before the press
//   does anything, so a click places the cursor as it always did;
// - or on the next key, unless it copies the selection or extends it (Shift
//   with an arrow, Home, End or a page key), so Tab reaches every editor again.
// Shift and a click in another card extends the selection across, the same
// way. The keyboard is not changed: Shift and the arrows select inside an
// editor, as before.
//
// Copying across, the words a screen reader is told at the edges of an edit
// (keys.js, announcePlugin) are left out, as the editor itself leaves them
// out of what it copies; it goes as plain text.
//
// The decisions are pure (pressed, moved, lifted, keyed) and tested;
// watchAcross wires them to one chat's element.

let released = false
const listeners = new Set()

/** Whether the chat's editors have let go for a selection across cards. */
export const isReleased = () => released

/** Told whenever the editors let go or come back. @returns {() => void} unsubscribe */
export function onRelease(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function set(on) {
  if (released === on) return
  released = on
  for (const fn of [...listeners]) fn(on)
}

/** The editors let go: a selection may run across cards. */
export const release = () => set(true)
/** The editors come back. */
export const restore = () => set(false)

/**
 * Whether a drag runs out of the editor it started in, or into one from
 * outside: hosts are editors (their root elements), or null for text that is
 * no editor's.
 */
export const crosses = (startHost, overHost) => startHost !== overHost

/**
 * A press of the pointer.
 * @param {{ released: boolean, primary: boolean, mouse: boolean, inChat: boolean, onControl: boolean,
 *   shift: boolean, anchorInChat: boolean, anchorHost: unknown, targetHost: unknown }} p
 *   primary: the main button; mouse: a mouse or pen, not a finger; onControl:
 *   on a button, link or field; anchorHost: the editor where the selection
 *   starts now, or null
 * @returns {{ act: 'release'|'restore'|null, drag: { host: unknown }|null }}
 *   drag: what the press starts watching, or null
 */
export function pressed(p) {
  const watch = p.primary && p.mouse && p.inChat && !p.onControl
  // Shift and a click in another card: the selection runs on from where it starts.
  if (watch && p.shift && p.anchorInChat && crosses(p.anchorHost, p.targetHost)) return { act: 'release', drag: { host: p.anchorHost } }
  return { act: p.released ? 'restore' : null, drag: watch ? { host: p.targetHost } : null }
}

/**
 * The pointer moved.
 * @param {{ drag: { host: unknown }|null, released: boolean, held: boolean, inChat: boolean, overHost: unknown }} m
 *   held: the main button is still down; overHost: the editor under the pointer, or null
 * @returns {'release'|null}
 */
export function moved(m) {
  if (!m.drag || m.released || !m.held || !m.inChat) return null
  return crosses(m.drag.host, m.overHost) ? 'release' : null
}

/**
 * The pointer let go.
 * @param {{ drag: { host: unknown }|null, released: boolean, anchorHost: unknown, focusHost: unknown }} l
 *   anchorHost, focusHost: the editors the selection starts and ends in, or null
 * @returns {'restore'|null} restore: the selection lies in one editor, which takes it back
 */
export function lifted(l) {
  if (!l.drag || !l.released) return null
  return l.anchorHost != null && l.anchorHost === l.focusHost ? 'restore' : null
}

const MODIFIERS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'AltGraph', 'CapsLock', 'OS'])
const EXTENDS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'])

/**
 * A key pressed while the editors have let go.
 * @param {{ released: boolean, key: string, ctrl?: boolean, meta?: boolean, shift?: boolean, alt?: boolean }} k
 * @returns {'restore'|null} restore: any key but a modifier, a copy (Ctrl or
 *   Cmd with C or Insert) or Shift extending the selection
 */
export function keyed(k) {
  if (!k.released || MODIFIERS.has(k.key)) return null
  const mod = Boolean(k.ctrl || k.meta)
  if (mod && !k.alt && (String(k.key).toLowerCase() === 'c' || k.key === 'Insert')) return null
  if (k.shift && !mod && !k.alt && EXTENDS.has(k.key)) return null
  return 'restore'
}

// ── The page ──────────────────────────────────────────────

const CONTROLS = 'button, a[href], input, textarea, select, [role="button"], [role="tab"], [role="menu"], [role="menuitem"]'
const elementOf = (node) => (node?.nodeType === 1 ? node : node?.parentElement ?? null)
/**
 * The editor a node is in: a ProseMirror editor's root, or null. A card's own
 * lines drawn by an editor (a prompt's and its reply's) count as in it.
 */
const hostOf = (node) => elementOf(node)?.closest?.('.ProseMirror') ?? null

// What the selection holds as text, as the page shows it, without the unseen
// words at the edges of an edit: they are hidden (editing.css, .p-copying)
// for the moment the text is read. What cannot be selected (the tabs of
// several branches, their arrows) is left out by the browser.
function copied(root, sel) {
  root.classList.add('p-copying')
  try { return sel.toString() } finally { root.classList.remove('p-copying') }
}

/**
 * Watches one chat's element for selections across its cards.
 * @param {HTMLElement} root the chat
 * @returns {() => void} stop watching
 */
export function watchAcross(root) {
  const doc = root?.ownerDocument
  if (!doc) return () => {}
  let drag = null
  const selection = () => doc.getSelection?.() ?? null

  function onDown(e) {
    const sel = selection()
    const anchor = sel?.rangeCount ? sel.anchorNode : null
    const out = pressed({
      released,
      primary: e.button === 0,
      mouse: e.pointerType !== 'touch',
      inChat: root.contains(e.target),
      onControl: Boolean(elementOf(e.target)?.closest?.(CONTROLS)),
      shift: e.shiftKey,
      anchorInChat: Boolean(anchor && root.contains(anchor)),
      anchorHost: hostOf(anchor),
      targetHost: hostOf(e.target),
    })
    drag = out.drag
    if (out.act === 'release') release()
    else if (out.act === 'restore') restore()
  }
  function onMove(e) {
    if (!drag) return
    // What is under the pointer, read from the point: while a selection is
    // dragged, a browser may send every move to where the drag began.
    const over = doc.elementFromPoint?.(e.clientX, e.clientY) ?? elementOf(e.target)
    if (moved({ drag, released, held: (e.buttons & 1) === 1, inChat: Boolean(over && root.contains(over)), overHost: hostOf(over) }) === 'release') release()
  }
  function onUp() {
    const sel = selection()
    const was = drag
    drag = null
    if (!sel?.rangeCount) return
    const anchorHost = hostOf(sel.anchorNode)
    if (lifted({ drag: was, released, anchorHost, focusHost: hostOf(sel.focusNode) }) !== 'restore') return
    // Back to one editor, the selection kept: focused, it reads the selection
    // as its own, ready to strike or ask about.
    const { anchorNode, anchorOffset, focusNode, focusOffset } = sel
    restore()
    anchorHost.focus({ preventScroll: true })
    try { sel.setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset) } catch { /* the selection stays as the browser left it */ }
  }
  // Copied across cards: the words, as plain text.
  function onCopy(e) {
    if (!released || !e.clipboardData) return
    const sel = selection()
    if (!sel?.rangeCount || sel.isCollapsed || !root.contains(sel.anchorNode) || !root.contains(sel.focusNode)) return
    e.clipboardData.setData('text/plain', copied(root, sel))
    e.preventDefault()
  }

  function onKey(e) {
    if (keyed({ released, key: e.key, ctrl: e.ctrlKey, meta: e.metaKey, shift: e.shiftKey, alt: e.altKey }) === 'restore') restore()
  }

  // Captured, so the editors are back before a press or a key does anything.
  doc.addEventListener('pointerdown', onDown, true)
  doc.addEventListener('pointermove', onMove, true)
  doc.addEventListener('pointerup', onUp, true)
  doc.addEventListener('keydown', onKey, true)
  doc.addEventListener('copy', onCopy, true)
  return () => {
    doc.removeEventListener('pointerdown', onDown, true)
    doc.removeEventListener('pointermove', onMove, true)
    doc.removeEventListener('pointerup', onUp, true)
    doc.removeEventListener('keydown', onKey, true)
    doc.removeEventListener('copy', onCopy, true)
    if (drag) drag = null
  }
}

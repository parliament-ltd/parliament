// Windows of their own, for pop: (refactor-plan.md, stage 3; the pop-out
// prototype, research/popout-prototype.md; plan §2 rule 7).
//
// A popped window has no code of its own: it is blank, same-origin and
// never navigated, and the tab draws into it through a portal. Its styles
// arrive as links to the built stylesheet, never as copied text, so the
// policy can drop 'unsafe-inline'; only the development server, which
// injects styles as text, has them copied. Its title names the board, never
// anything someone wrote.
//
// The bar (pop:command) takes the window that stays on top where the browser
// has one (Document Picture-in-Picture); boards open ordinary windows. One
// always-on-top window per tab (Almanac spec §4; C107).

const SIZES = { bar: { width: 600, height: 150 }, board: { width: 760, height: 600 } }
// Room for a window's own frame and title bar, outside the size asked for.
const FRAME = { width: 16, height: 80 }

/** A size asked for, kept between a least one and the screen, leaving room for the window's frame; the usual size when none is asked. */
export function fitSize(asked, usual, screen = globalThis.screen) {
  if (!asked) return usual
  const most = { width: (screen?.availWidth || 4000) - FRAME.width, height: (screen?.availHeight || 3000) - FRAME.height }
  return {
    width: Math.round(Math.min(Math.max(asked.width, 320), most.width)),
    height: Math.round(Math.min(Math.max(asked.height, 240), most.height)),
  }
}

/**
 * Copies the page's stylesheets into another document: links always, and
 * style text only in development. Returns how many of each went.
 */
export function copyStyles(from, to, { dev = Boolean(import.meta.env?.DEV) } = {}) {
  const counts = { links: 0, inline: 0 }
  for (const node of from.querySelectorAll('link[rel="stylesheet"], style')) {
    const isLink = node.tagName === 'LINK'
    if (!isLink && !dev) continue
    to.head.appendChild(node.cloneNode(true))
    counts[isLink ? 'links' : 'inline']++
  }
  return counts
}

function prepare(win, { title, from }) {
  const doc = win.document
  doc.title = title
  doc.documentElement.lang = from.documentElement.lang || 'en'
  doc.documentElement.dir = from.documentElement.dir || 'ltr'
  copyStyles(from, doc)
  doc.body.className = 'ch-window'
  const container = doc.createElement('div')
  container.className = 'ch-window-root'
  doc.body.appendChild(container)
  return { win, container }
}

/**
 * Opens a window and returns { win, container }, or null when the browser
 * would not open one. Call it from the key press or click that asked, so a
 * pop-up blocker lets it through.
 * at: where on which screen it opens, for pop:… display 2 (C259 (e)); the browser places it there once it allows.
 * size: the inside of the window, for a board the size it had on the page (C280); a board not on the page opens at the usual size.
 * @param {{ what: 'bar'|'board', name: string, title: string, onTop?: boolean, at?: { left: number, top: number }|null, size?: { width: number, height: number }|null, from?: Document, host?: Window }} options
 */
export async function openPopout({ what, name, title, onTop = false, at = null, size: asked = null, from = document, host = window }) {
  const size = fitSize(asked, SIZES[what])
  try {
    if (onTop && host.documentPictureInPicture?.requestWindow) {
      const win = await host.documentPictureInPicture.requestWindow(size)
      return prepare(win, { title, from })
    }
    const place = at ? `,left=${Math.round(at.left)},top=${Math.round(at.top)}` : ''
    const win = host.open('', name, `popup,width=${size.width},height=${size.height}${place}`)
    if (!win) return null
    // A window of this name left from before is reused: start it empty.
    win.document.body.replaceChildren()
    return prepare(win, { title, from })
  } catch {
    return null
  }
}

/**
 * Puts a popped window at the left or right of its screen, where the browser
 * allows it: the screen named (another display, C259 (e)) or the one it is on.
 */
export function placePopout({ win }, side, screen = null) {
  try {
    const width = win.outerWidth || SIZES.board.width
    const s = screen ?? { left: win.screen?.availLeft ?? 0, top: win.screenY ?? 0, availWidth: win.screen?.availWidth ?? width }
    const left = side === 'left' ? s.left : s.left + s.availWidth - width
    win.moveTo(left, screen ? s.top : win.screenY ?? 0)
  } catch { /* the browser decides where windows go */ }
}

/** Moves a popped window to a place on a screen (C259 (e)), where the browser allows it. */
export function movePopout({ win }, at) {
  try { if (at) win.moveTo(Math.round(at.left), Math.round(at.top)) } catch { /* the browser decides where windows go */ }
}

/** Closes a popped window, if it is still open. */
export function closePopout(handle) {
  try { if (handle?.win && !handle.win.closed) handle.win.close() } catch { /* already gone */ }
}

/** Calls back once when a popped window is closed by the person or the browser. */
export function onPopoutClosed({ win }, callback) {
  let done = false
  const fire = () => { if (!done) { done = true; callback() } }
  win.addEventListener('pagehide', fire)
  return () => { done = true; win.removeEventListener('pagehide', fire) }
}

// The screens this computer has, for the map (arrange:) and pop:… display 2
// (stage 14, piece 4; C259). The browser says whether a second screen is
// attached without asking; their sizes, places and putting windows on them
// need its permission, asked once, at an Enter that says so first. Chrome
// and Edge have this; elsewhere everything stays on one screen.
//
// What is read stays in the page. Nothing here is stored or sent.
//
// Each function takes the global object, so tests can pass a stand-in.

/**
 * What can be known now, without asking: whether this browser can place
 * windows, whether a second screen is attached, and the permission's state.
 * @returns {Promise<{ can: boolean, extended: boolean, width: number|null, permission: 'granted'|'denied'|'prompt'|null }>}
 */
export async function screensNow(g = globalThis) {
  const can = typeof g.getScreenDetails === 'function'
  const extended = g.screen?.isExtended === true
  // This screen's width is known without asking.
  const width = Number(g.screen?.width) > 0 ? g.screen.width : null
  return { can, extended, width, permission: can ? await permissionOf(g) : null }
}

/** The permission's state, under its name or the name it had before. */
async function permissionOf(g) {
  for (const name of ['window-management', 'window-placement']) {
    try {
      const status = await g.navigator.permissions.query({ name })
      return status.state
    } catch { /* not known by that name */ }
  }
  return null
}

/**
 * Numbers screens (C259 (c)): the main screen is display 1, the others left
 * to right as they stand, top to bottom where stacked.
 * @param {object[]} list the browser's screens
 * @param {object|null} current the one this window is on
 */
export function numberScreens(list, current = null) {
  const main = list.find((s) => s.isPrimary) ?? list[0]
  const rest = list.filter((s) => s !== main).sort((x, y) => (x.left - y.left) || (x.top - y.top))
  return [main, ...rest].filter(Boolean).map((s, i) => ({
    n: i + 1,
    width: s.width,
    height: s.height,
    left: s.availLeft ?? s.left ?? 0,
    top: s.availTop ?? s.top ?? 0,
    availWidth: s.availWidth ?? s.width,
    availHeight: s.availHeight ?? s.height,
    current: current ? s === current : false,
  }))
}

/**
 * The screens in full, which asks the browser's permission the first time.
 * Call it from the Enter that said so. Calls back when screens are added,
 * taken away, or the window moves to another.
 * @returns {Promise<{ list: object[], stop: () => void }|null>} null when refused or not possible
 */
export async function readScreens(onChange = null, g = globalThis) {
  if (typeof g.getScreenDetails !== 'function') return null
  try {
    const details = await g.getScreenDetails()
    const now = () => numberScreens([...details.screens], details.currentScreen)
    const fire = () => onChange?.(now())
    details.addEventListener?.('screenschange', fire)
    details.addEventListener?.('currentscreenchange', fire)
    return {
      list: now(),
      stop: () => {
        details.removeEventListener?.('screenschange', fire)
        details.removeEventListener?.('currentscreenchange', fire)
      },
    }
  } catch {
    return null
  }
}

/**
 * Where a window for display n opens: the top of that screen, at the left
 * or right edge when its side says so. null when the screen is not here,
 * and the window opens on this one (C259 (e)).
 */
export function placeOn(list, n, side = null, width = 760) {
  const s = (list ?? []).find((x) => x.n === n)
  if (!s) return null
  const left = side === 'right' ? s.left + s.availWidth - width : side === 'left' ? s.left : s.left + Math.max(0, Math.round((s.availWidth - width) / 2))
  return { left, top: s.top }
}

/**
 * What the Enter line says about pop:… display n, given what is known of
 * the screens (C259 (d), (e), (f)). The plan's own line when the window
 * can go there.
 * @param {{ message: string, values: object }} says
 * @param {{ can: boolean, extended: boolean, permission: string|null, list: object[]|null }|null} displays
 */
export function popDisplayLine(says, displays) {
  const { board, display } = says.values
  if (!displays) return says
  if (!displays.can) return { message: 'popDisplayCannot', values: { board } }
  if (displays.list) return displays.list.some((s) => s.n === display) ? says : { message: 'popDisplayNone', values: { board, display } }
  // With one screen, that matters more than the permission.
  if (!displays.extended) return { message: 'popDisplayNone', values: { board, display } }
  if (displays.permission === 'denied') return { message: 'popDisplayRefused', values: { board } }
  return { message: 'popDisplayAsk', values: { board, display } }
}

/** True when an Enter that places windows has to ask the browser first. */
export const mustAsk = (displays) => Boolean(displays?.can && displays.extended && !displays.list && displays.permission !== 'denied')

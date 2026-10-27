// What the screens map draws (stage 14, piece 4; C259 (a), (b)): each
// screen with the boards and windows on it, the board the bar points at,
// and, while a command is typed, what would move before Enter. Pure.
//
// A screen is { key, n, width, height, current, items }. n and width are
// null for "another screen" before the browser has said more (C259 (d)).
// An item is { board, addressed, mark } where mark is null, 'leaving'
// (where a board stands now, as it moves) or 'ghost' (where it will land),
// with window: true for a popped one.

const HERE = 'here'
const OTHER = 'other'

/** The screens to draw, from what is known of them. */
export function screensOf(displays) {
  if (displays?.list?.length) {
    return displays.list.map((s) => ({ key: `d${s.n}`, n: s.n, width: s.width, height: s.height, current: s.current }))
  }
  const here = { key: HERE, n: null, width: displays?.width ?? null, height: null, current: true }
  return displays?.can && displays.extended ? [here, { key: OTHER, n: null, width: null, height: null, current: false }] : [here]
}

/** The screen a board stands on in an arrangement: its window's, or this one's. */
function placesOf(a, screens) {
  const here = screens.find((s) => s.current) ?? screens[0]
  const places = new Map()
  for (const column of a.columns) for (const board of column) places.set(board, { key: here.key, window: false })
  for (const p of a.popped) {
    // A window for a screen not here opens on this one (C259 (e)); before
    // the screens are known, one for another display sits on "another screen".
    const on = p.display == null ? here
      : screens.find((s) => s.n === p.display) ?? (screens.some((s) => s.key === OTHER) && p.display > 1 ? screens.find((s) => s.key === OTHER) : here)
    places.set(p.board, { key: on.key, window: true })
  }
  return places
}

/**
 * The map: the screens, each with what is on it now, and with next (the
 * line typed, before Enter) what would leave and where it would land.
 * @param {object} a the arrangement now
 * @param {object|null} next the arrangement after the line typed, if any
 * @param {object|null} displays what is known of the screens
 */
export function mapOf(a, next, displays) {
  const screens = screensOf(displays)
  const now = placesOf(a, screens)
  const after = next ? placesOf(next, screens) : now
  const pointed = (next ?? a).addressed
  const items = Object.fromEntries(screens.map((s) => [s.key, []]))
  // Boards in their order on the page now, then windows; then what arrives.
  const order = [...a.columns.flat(), ...a.popped.map((p) => p.board)]
  for (const board of order) {
    const was = now.get(board)
    const will = after.get(board)
    const moved = !will || will.key !== was.key || will.window !== was.window
    // Where a board that moves is going: a screen and whether in a window, or nowhere when it closes.
    const goes = will ? screens.find((s) => s.key === will.key) : null
    const to = moved && will ? { n: goes?.n ?? null, current: Boolean(goes?.current), window: will.window } : null
    items[was.key].push({ board, addressed: board === pointed && !moved, mark: moved ? 'leaving' : null, window: was.window, ...(moved ? { to } : {}) })
  }
  for (const [board, will] of after) {
    const was = now.get(board)
    if (was && was.key === will.key && was.window === will.window) continue
    items[will.key].push({ board, addressed: board === pointed, mark: 'ghost', window: will.window })
  }
  return screens.map((s) => ({ ...s, items: items[s.key] }))
}

/** The line under the map's screens, at its foot (C259 (d), (f)). */
export function mapFoot(displays) {
  if (!displays?.can) return 'cannot'
  // With one screen, that matters more than the permission.
  if (displays.list ? displays.list.length < 2 : !displays.extended) return 'one'
  if (displays.permission === 'denied') return 'refused'
  return null
}

/** The saved arrangement the screen is now, exactly, if any: boards, windows, bar and widths. */
export function savedNow(a, saved) {
  const shape = (x) => JSON.stringify([x.columns, x.popped.map((p) => [p.board, p.display ?? null, p.side ?? null]), x.addressed, x.bar, x.widths ?? {}])
  const here = shape(a)
  return (saved ?? []).find((s) => shape(s) === here) ?? null
}

/** The command a click on a board in the map writes (C259 (a)). */
export function moveCommand(item, word, screens) {
  if (item.window) return `pop:back ${word}`
  const other = screens.find((s) => !s.current)
  return other ? `pop:${word} display ${other.n ?? 2}` : `pop:${word}`
}

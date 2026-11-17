import { useEffect, useRef } from 'react'

// The boards on a phone, one above another (17 November; Stefan: "boards
// in mobile should be placed vertically and should try to take up the
// width of the phone ... is there some way we could let user quickly tap
// to different boards"). Each board is the width of the screen and as tall
// as the screen above the bar, scrolling inside; the page scrolls from one
// to the next and comes to rest on a board's top (chrome.css).
//
// - The bar points at the board that fills the screen once scrolling stops,
//   so a search searches the board in sight and the Enter line, when it
//   speaks, names it. A prompt still goes to the room the screen holds.
// - When the bar is pointed at a board some other way (the plus menu, a
//   command, the arrows), the page scrolls to it.
// - Two arrows at the right edge, in navy, go to the board above and the
//   one below; with one board, none.
//
// The boards are found in the stage by their place: the stage's columns in
// order, each column's boards in order. A column whose boards do not all
// draw is left out, rather than pointing the bar at the wrong one.

/** Each board's card in the stage, in the order of the arrangement's columns. */
function cardsIn(stage, columns) {
  if (!stage) return []
  const out = []
  const cols = [...stage.querySelectorAll(':scope > .ch-col')]
  cols.forEach((col, j) => {
    const boards = columns[j] ?? []
    const kids = [...col.children]
    if (kids.length !== boards.length) return
    kids.forEach((el, i) => out.push({ board: boards[i], el }))
  })
  return out
}

/**
 * The board in sight: of the cards, the one most on screen between the top
 * and the bar. Pure, given each card's top and bottom and the view's.
 * @param {{ board: string, top: number, bottom: number }[]} cards
 * @param {number} top @param {number} bottom
 */
export function boardInSight(cards, top, bottom) {
  let best = null
  let most = 0
  for (const c of cards) {
    const seen = Math.min(c.bottom, bottom) - Math.max(c.top, top)
    if (seen > most) { most = seen; best = c.board }
  }
  return best
}

/** The boards before and after the one the bar points at, in the page's order. */
export function besideOf(order, addressed) {
  const at = order.indexOf(addressed)
  if (at < 0) return { above: null, below: order[0] ?? null }
  return { above: order[at - 1] ?? null, below: order[at + 1] ?? null }
}

/**
 * @param {{ on: boolean, stage: { current: HTMLElement|null }, columns: string[][], addressed: string,
 *   onAddress: (board: string) => void }} args
 */
export function usePhoneBoards({ on, stage, columns, addressed, onAddress }) {
  const shown = useRef(null) // the board the page was last scrolled to, or settled on
  const now = useRef({ columns, addressed, onAddress })
  useEffect(() => { now.current = { columns, addressed, onAddress } })

  // Pointed at another way: the page goes to it. The first time, at once.
  useEffect(() => {
    if (!on) { shown.current = null; return }
    if (!addressed || shown.current === addressed) return
    const first = shown.current == null
    shown.current = addressed
    const card = cardsIn(stage.current, columns).find((c) => c.board === addressed)
    card?.el.scrollIntoView({ block: 'start', behavior: first ? 'auto' : 'smooth' })
  }, [on, addressed, columns, stage])

  // Scrolled: once the page rests, the bar points at the board in sight.
  useEffect(() => {
    if (!on) return undefined
    let t = 0
    const settle = () => {
      const { columns: cols, addressed: was, onAddress: point } = now.current
      const dock = document.querySelector('.ch-dock.bottom')
      const bottom = dock ? dock.getBoundingClientRect().top : window.innerHeight
      const cards = cardsIn(stage.current, cols).map(({ board, el }) => {
        const r = el.getBoundingClientRect()
        return { board, top: r.top, bottom: r.bottom }
      })
      const seen = boardInSight(cards, 0, bottom)
      if (!seen || seen === was) return
      shown.current = seen
      point(seen)
    }
    const onScroll = () => { window.clearTimeout(t); t = window.setTimeout(settle, 160) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); window.clearTimeout(t) }
  }, [on, stage])
}

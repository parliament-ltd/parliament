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
      // Typing in the bar, the keyboard moves the page: the bar stays where it points.
      if (document.activeElement?.closest?.('.ch-dock')) return
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

/**
 * How much of the screen's foot a phone's keyboard covers, kept as --kb on
 * the page, so the bar rises above it (17 November; Stefan: "the text
 * input box gets covered by the keyboard"). A browser that shrinks the page
 * for the keyboard (interactive-widget, in index.html) leaves it 0; one that
 * only shrinks what is seen, as Safari does, gives the difference. Pinched
 * in, it is 0, so zooming does not lift the bar.
 * @param {boolean} on
 */
export function useKeyboardGap(on) {
  useEffect(() => {
    const vv = typeof window === 'undefined' ? null : window.visualViewport
    const root = document.documentElement
    if (!on || !vv) { root.style.removeProperty('--kb'); return undefined }
    const measure = () => {
      const gap = Math.abs(vv.scale - 1) > 0.01 ? 0 : keyboardGap(window.innerHeight, vv.height, vv.offsetTop)
      root.style.setProperty('--kb', `${gap}px`)
    }
    measure()
    vv.addEventListener('resize', measure)
    vv.addEventListener('scroll', measure)
    return () => {
      vv.removeEventListener('resize', measure)
      vv.removeEventListener('scroll', measure)
      root.style.removeProperty('--kb')
    }
  }, [on])
}

/** What a keyboard covers, in whole pixels: the page's height less what is seen of it. Pure. */
export const keyboardGap = (pageHeight, seenHeight, seenTop) => Math.max(0, Math.round(pageHeight - seenHeight - seenTop))

/**
 * On a phone, words highlighted in a text bring the keyboard up, to change
 * them (17 November; Stefan: "for mobile, let's have to edit, and then we
 * keep the prompt bar for adding prompts"). A phone raises its keyboard for
 * the text that has the caret, and a long press can select words without
 * giving it the caret, so the text is given it, and the selection put back
 * as it was. Only texts on the boards that can be changed; the bar's field
 * is not one of them.
 * @param {boolean} on
 */
export function useKeyboardForWords(on) {
  useEffect(() => {
    if (!on) return undefined
    const onSelect = () => {
      const sel = document.getSelection()
      if (!sel || sel.isCollapsed || !sel.rangeCount) return
      const at = sel.anchorNode?.nodeType === 1 ? sel.anchorNode : sel.anchorNode?.parentElement
      const text = at?.closest?.('.ch-stage [contenteditable="true"]')
      const active = document.activeElement
      if (!text || active === text || text.contains(active)) return
      const range = sel.getRangeAt(0).cloneRange()
      text.focus({ preventScroll: true })
      const now = document.getSelection()
      const same = now && now.rangeCount > 0
        && now.getRangeAt(0).compareBoundaryPoints(Range.START_TO_START, range) === 0
        && now.getRangeAt(0).compareBoundaryPoints(Range.END_TO_END, range) === 0
      if (now && !same) { now.removeAllRanges(); now.addRange(range) }
    }
    document.addEventListener('selectionchange', onSelect)
    return () => document.removeEventListener('selectionchange', onSelect)
  }, [on])
}

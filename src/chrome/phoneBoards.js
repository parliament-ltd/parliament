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
 * A board swiped to the side closes, on a phone (C310; Stefan, 17
 * November: "can we swipe left on a board to close as long as there's
 * sufficient clearance between the command bar and the boards"). The swipe
 * starts on a board, above the bar with room to spare, so the bar's own
 * swipe never closes one; it goes further across than down; it is not a
 * long press, which selects words, nor in a text being written in, nor on
 * something that scrolls sideways itself. The board follows the finger and,
 * let go past a third of the screen or flicked, slides off and closes as
 * close: would, said under the bar and taken back by undo:; else it slides
 * back. To the left, or to the right where the page reads right to left.
 * lineFor(board): its close: line, or null where it cannot close;
 * onClose(board, line): runs it.
 * @param {{ on: boolean, stage: { current: HTMLElement|null }, columns: string[][], lineFor: (board: string) => string|null, onClose: (board: string, line: string) => void }} props
 */
export function useSwipeToClose({ on, stage, columns, lineFor, onClose }) {
  const now = useRef({ columns, lineFor, onClose })
  useEffect(() => { now.current = { columns, lineFor, onClose } })
  useEffect(() => {
    if (!on) return undefined
    let s = null
    const reset = (el, animate) => {
      el.style.transition = animate ? `transform ${SLIDE_MS}ms ease, opacity ${SLIDE_MS}ms ease` : ''
      el.style.transform = ''
      el.style.opacity = ''
    }
    const down = (e) => {
      const root = stage.current
      if (e.pointerType === 'mouse' || !e.isPrimary || !root?.contains(e.target)) return
      const card = cardsIn(root, now.current.columns).find((c) => c.el.contains(e.target))
      if (!card || !now.current.lineFor(card.board)) return
      if (!swipeStartsClear(e.target, e.clientY)) return
      s = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), card, on: false, dx: 0, width: card.el.getBoundingClientRect().width || window.innerWidth, dir: document.documentElement.dir === 'rtl' ? 1 : -1 }
    }
    const move = (e) => {
      if (!s || e.pointerId !== s.id) return
      const dx = e.clientX - s.x
      const dy = e.clientY - s.y
      if (!s.on) {
        if (Math.abs(dy) > SWIPE_GO && Math.abs(dy) > Math.abs(dx)) { s = null; return }
        if (Math.abs(dx) < SWIPE_GO || Math.abs(dx) < 1.5 * Math.abs(dy)) return
        // A long press selects words; a selection, or the wrong way, is no swipe.
        const sel = window.getSelection?.()
        if (performance.now() - s.t > LONG_PRESS_MS || (sel && !sel.isCollapsed) || Math.sign(dx) !== s.dir) { s = null; return }
        s.on = true
        s.card.el.style.transition = ''
      }
      s.dx = s.dir < 0 ? Math.min(0, dx) : Math.max(0, dx)
      s.card.el.style.transform = `translateX(${s.dx}px)`
      s.card.el.style.opacity = String(Math.max(0.35, 1 - Math.abs(s.dx) / s.width))
    }
    const up = (e) => {
      if (!s || e.pointerId !== s.id) return
      const was = s
      s = null
      if (!was.on) return
      const fast = Math.abs(was.dx) / Math.max(1, performance.now() - was.t) > FLICK && Math.abs(was.dx) > 60
      const line = now.current.lineFor(was.card.board)
      if (e.type === 'pointercancel' || !line || (Math.abs(was.dx) < was.width * CLOSE_AT && !fast)) { reset(was.card.el, true); return }
      const el = was.card.el
      el.style.transition = `transform ${SLIDE_MS}ms ease, opacity ${SLIDE_MS}ms ease`
      el.style.transform = `translateX(${was.dir * was.width * 1.1}px)`
      el.style.opacity = '0'
      window.setTimeout(() => {
        now.current.onClose(was.card.board, line)
        // Still there (close: refused): back in its place.
        window.setTimeout(() => { if (el.isConnected) reset(el, true) }, 120)
      }, SLIDE_MS)
    }
    // On the page, since the stage comes and goes as the space loads.
    document.addEventListener('pointerdown', down)
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerup', up)
    document.addEventListener('pointercancel', up)
    return () => {
      document.removeEventListener('pointerdown', down)
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerup', up)
      document.removeEventListener('pointercancel', up)
    }
  }, [on, stage])
}

// A swipe: this far across before it counts; a long press is this long; let
// go past this share of the width, or this fast (px a ms), it closes.
const SWIPE_GO = 16
const LONG_PRESS_MS = 420
const CLOSE_AT = 1 / 3
const FLICK = 0.6
const SLIDE_MS = 200
// Room to spare above the bar, so its own swipe never reaches a board.
const BAR_CLEARANCE = 24

/**
 * Whether a swipe may start here: above the bar with room to spare, not in
 * a text being written in or a field, and not on something that scrolls
 * sideways itself (a wide table).
 */
export function swipeStartsClear(target, y) {
  const dock = document.querySelector('.ch-dock')
  if (dock && y > dock.getBoundingClientRect().top - BAR_CLEARANCE) return false
  if (!target?.closest) return false
  if (target.closest('input, textarea, select, .ch-ref, .ch-tk-grip, [role="slider"]')) return false
  const editing = target.closest('[contenteditable="true"]')
  if (editing && editing.contains(document.activeElement)) return false
  for (let el = target; el && !el.classList?.contains('ch-card'); el = el.parentElement) {
    const cs = window.getComputedStyle(el)
    if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 1) return false
  }
  return true
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

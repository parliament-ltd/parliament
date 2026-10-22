// Which rows of a long table to draw (refactor-plan.md, stage 6, piece 2;
// C142). Only the rows in view, and about a screen either side, are drawn;
// the rest are blank space of the height they will take. A row's height is
// known once it has been drawn; until then it is guessed. Pure, so it is
// tested without a browser.

/** The height a row is taken to have before it has been drawn, in pixels. */
export const ROW_GUESS = 52

/**
 * @param {Array<number|undefined>} heights each row's height, where known
 * @param {number} top where the view starts, measured from the top of the rows
 * @param {number} bottom where it ends
 * @param {{ guess?: number, overscan?: number }} [opts] overscan: how far beyond the view to draw, in pixels
 * @returns {{ start: number, end: number, before: number, after: number }}
 *   start and end: the rows to draw (end not included); before and after: the space for the rest
 */
export function rowRange(heights, top, bottom, { guess = ROW_GUESS, overscan = 0 } = {}) {
  const n = heights.length
  const from = top - overscan
  const to = bottom + overscan
  let y = 0
  let start = n
  let end = n
  let before = 0
  for (let i = 0; i < n; i++) {
    const h = heights[i] ?? guess
    if (start === n && y + h > from) { start = i; before = y }
    if (y >= to) { end = i; break }
    y += h
  }
  if (start === n) before = y
  let after = 0
  for (let i = end; i < n; i++) after += heights[i] ?? guess
  return { start, end: Math.max(start, end), before, after }
}

/**
 * The part of an element that can be seen, measured from its own top: the
 * window, cut by every ancestor that clips what overflows it.
 * @param {Element} el
 * @returns {{ top: number, bottom: number }}
 */
export function seenPart(el) {
  const win = el.ownerDocument.defaultView
  const box = el.getBoundingClientRect()
  let top = 0
  let bottom = win.innerHeight
  for (let p = el.parentElement; p; p = p.parentElement) {
    if (!/(auto|scroll|hidden|clip)/.test(win.getComputedStyle(p).overflowY)) continue
    const r = p.getBoundingClientRect()
    top = Math.max(top, r.top)
    bottom = Math.min(bottom, r.bottom)
  }
  return { top: top - box.top, bottom: bottom - box.top }
}

// The ink pot in the prompt field: a quiet sign that a reply is arriving
// (C114, from Stefan's parliament-inkpot.js and .svg, 21 October). Its
// drawing is the quill in its ink pot (Fills.jsx); its motion is in
// chrome.css under "The ink pot".
//
//   start()  a reply is arriving: the ink drains and the quill re-dips,
//            over and over, until told otherwise
//   done()   the reply arrived: the quill dips once and the pot refills
//            from wherever it was
//   stop()   the reply was stopped: the ink freezes where it is and spills
//            down the side. start() after a stop clears the spill and
//            carries on draining from the same level
//   reset()  back to a full pot at rest, as when the field moves to
//            another room
//
// Only classes, the browser's animations and the element's own style are
// touched, so nothing here needs an inline style sheet. Timers and frames
// run on the clock of the window the field is in.
//
// A fast answer (a source, in under a second) would leave the pot looking
// still, since the drawing's drain is slow. So a reply starting dips the
// level a little at once, and the refill waits until the pot has drained
// for SHOWN ms (29 October). The drawing's own cycle is unchanged.

/** How long the pot drains, at least, before it refills. */
export const SHOWN = 1500
/** The first dip of the level as a reply starts, and how long it takes. */
const FIRST = { depth: 1.4, ms: 1100 }

// `svg` is the element that carries the state classes: the pot's own group.
export function inkPot(svg) {
  const ink = svg.querySelector('.pq-ink')
  const pen = svg.querySelector('.pq-pen')
  const lvl = svg.querySelector('.pq-lvl')
  const win = svg.ownerDocument?.defaultView ?? window
  const reduce = () => Boolean(win.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  let startedAt = null
  let waiting = null
  const cancel = (el, ids) => el?.getAnimations?.().forEach((a) => ids.includes(a.id) && a.cancel())
  const clear = () => {
    if (waiting != null) { win.clearTimeout(waiting); waiting = null }
    cancel(ink, ['pq-refill'])
    cancel(lvl, ['pq-first', 'pq-back'])
    ink.style.animation = ''
  }
  const pot = {
    start() {
      clear()
      startedAt = win.performance?.now?.() ?? Date.now()
      svg.classList.remove('is-stopped')
      svg.classList.add('is-writing')
      if (!reduce() && lvl?.animate) {
        const a = lvl.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${FIRST.depth}px)` }], { duration: FIRST.ms, easing: 'cubic-bezier(.3,.6,.4,1)', fill: 'forwards' })
        a.id = 'pq-first'
      }
    },
    stop() {
      if (waiting != null) { win.clearTimeout(waiting); waiting = null }
      svg.classList.remove('is-writing')
      svg.classList.add('is-stopped')
    },
    done() {
      // A fast answer: keep draining until the pot has shown it.
      const ran = startedAt == null ? SHOWN : (win.performance?.now?.() ?? Date.now()) - startedAt
      if (ran < SHOWN && waiting == null) {
        waiting = win.setTimeout(() => { waiting = null; startedAt = null; pot.done() }, SHOWN - ran)
        return
      }
      if (waiting != null) return
      startedAt = null
      const dipped = lvl?.getAnimations?.().find((a) => a.id === 'pq-first')
      if (dipped) {
        const at = win.getComputedStyle(lvl).transform
        dipped.cancel()
        const back = lvl.animate([{ transform: at === 'none' ? 'translateY(0)' : at }, { transform: 'translateY(0)' }], { duration: reduce() ? 0 : 900, delay: reduce() ? 0 : 250, easing: 'cubic-bezier(.3,.6,.4,1)', fill: 'both' })
        back.id = 'pq-back'
        back.finished.then(() => back.cancel()).catch(() => {})
      }
      const still = reduce()
      const from = win.getComputedStyle(ink).transform
      svg.classList.remove('is-writing', 'is-stopped')
      ink.style.animation = 'none'
      const a = ink.animate(
        [{ transform: from === 'none' ? 'translateY(0)' : from }, { transform: 'translateY(0)' }],
        { duration: still ? 0 : 900, delay: still ? 0 : 250, easing: 'cubic-bezier(.3,.6,.4,1)', fill: 'both' },
      )
      // fill both: the ink holds its level through the delay, rather than flashing full first.
      a.id = 'pq-refill'
      if (!still) {
        pen.animate([
          { transform: 'translate(0,0)' },
          { transform: 'translate(-.5px,1.1px)', offset: 0.35 },
          { transform: 'translate(-.5px,1.1px)', offset: 0.6 },
          { transform: 'translate(0,0)' },
        ], { duration: 1100, easing: 'ease-in-out' })
      }
      a.finished.then(() => {
        if (!svg.classList.contains('is-writing')) { a.cancel(); ink.style.animation = '' }
      }).catch(() => {})
    },
    reset() {
      clear()
      startedAt = null
      svg.classList.remove('is-writing', 'is-stopped')
    },
  }
  return pot
}

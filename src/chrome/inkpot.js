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

// `svg` is the element that carries the state classes: the pot's own group.
export function inkPot(svg) {
  const ink = svg.querySelector('.pq-ink')
  const pen = svg.querySelector('.pq-pen')
  const win = svg.ownerDocument?.defaultView ?? window
  const reduce = () => Boolean(win.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  const clear = () => {
    ink.getAnimations?.().forEach((a) => a.id === 'pq-refill' && a.cancel())
    ink.style.animation = ''
  }
  return {
    start() {
      clear()
      svg.classList.remove('is-stopped')
      svg.classList.add('is-writing')
    },
    stop() {
      svg.classList.remove('is-writing')
      svg.classList.add('is-stopped')
    },
    done() {
      const still = reduce()
      const from = win.getComputedStyle(ink).transform
      svg.classList.remove('is-writing', 'is-stopped')
      ink.style.animation = 'none'
      const a = ink.animate(
        [{ transform: from === 'none' ? 'translateY(0)' : from }, { transform: 'translateY(0)' }],
        { duration: still ? 0 : 900, delay: still ? 0 : 250, easing: 'cubic-bezier(.3,.6,.4,1)', fill: 'forwards' },
      )
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
      svg.classList.remove('is-writing', 'is-stopped')
    },
  }
}

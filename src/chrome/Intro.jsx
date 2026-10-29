import { useEffect, useRef, useState } from 'react'
import BirdsMark from './BirdsMark'
import { introTimes } from './firstLoad'

// The birds on first load (C279 (e)): laid over the welcome page as it
// first shows. One bird comes in, then two, then three; they hold a moment,
// and the paper they sit on fades, which is the welcome page fading in.
// Then it is gone. Decoration only: hidden from screen readers, never
// focused, and the bar keeps its focus. A key or a click skips straight to
// the page. The timings are firstLoad.js's; the stylesheet draws the motion.

/** @param {{ onEnd: () => void }} props onEnd: the birds are done, or skipped */
export default function Intro({ onEnd }) {
  const [times] = useState(() => introTimes({ reduced: Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) }))
  const ended = useRef(onEnd)
  useEffect(() => { ended.current = onEnd }, [onEnd])

  useEffect(() => {
    const end = () => ended.current()
    const timer = window.setTimeout(end, times.end)
    // A click, not a press: the whole click lands on the birds, so nothing
    // under them is clicked as they go.
    window.addEventListener('keydown', end, true)
    window.addEventListener('click', end, true)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', end, true)
      window.removeEventListener('click', end, true)
    }
  }, [times])

  const ms = (n) => `${n}ms`
  return (
    <div
      className="ch-intro"
      aria-hidden="true"
      // Pressing here moves no focus: the bar keeps it.
      onMouseDown={(e) => e.preventDefault()}
      style={{
        '--intro-bird': ms(times.bird), '--intro-2': ms(times.birds[1]), '--intro-3': ms(times.birds[2]),
        '--intro-out': ms(times.out), '--intro-fade': ms(times.fade),
      }}
    >
      <BirdsMark className="ch-intro-mark" apart />
    </div>
  )
}

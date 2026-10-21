import { useEffect, useId, useLayoutEffect, useRef } from 'react'
import { STARS, STAR_TILE } from './stars'
import { shapeAt, turnAt, ease } from './moon'
import { MOTION } from './motion'

// The field's fills and glyphs, as the bar reference draws them (9 October):
// navy with star dots for command, paper with a skewed mosaic for prompt, the
// magnifier for search and the quill in its ink pot for prompt.

export function CommandFill() {
  const id = useId()
  return (
    <svg preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <pattern id={id} width={STAR_TILE.width} height={STAR_TILE.height} patternUnits="userSpaceOnUse" patternTransform={STAR_TILE.transform}>
          <g fill="#fff">
            {STARS.map(([x, y, o], i) => <circle key={i} cx={x} cy={y} r={STAR_TILE.r} opacity={o} />)}
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}

export function PromptFill() {
  const id = useId()
  return (
    <svg aria-hidden="true">
      <defs>
        <pattern id={id} width="16" height="24" patternUnits="userSpaceOnUse" patternTransform="skewY(-17)">
          <g fill="none" stroke="var(--ch-tri)" strokeWidth=".7">
            <path d="M0 0V24M16 0V24" />
            <path d="M0 0H16M0 24H16" />
            <path d="M0 0L16 24" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}

export function Magnifier({ on }) {
  return (
    <svg className={`ch-glyph mag${on ? ' on' : ''}`} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3" />
      <line x1="10.2" y1="10.2" x2="13.8" y2="13.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

export function Quill({ on }) {
  return (
    <svg className={`ch-glyph quill${on ? ' on' : ''}`} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.3 14.8h8.5l-.7 5.1a1.5 1.5 0 0 1-1.5 1.3H8.5a1.5 1.5 0 0 1-1.5-1.3z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M5.2 14.8h10.7" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M21.3 2.3c-5.7 1.2-9.1 5-9.8 10l3.1-1c3.9-1.4 6.4-4.6 6.7-9z" fill="currentColor" />
      <path d="M11.9 12.2 10.4 14.7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// The command mark while the field folds: the chevron travels from the place
// of the typed > to the centre of the circle and becomes the crescent moon on
// the way, over the same time as the fold, and goes back as it opens (C108,
// C112). The travel is CSS; the shape is drawn straight onto the path, frame
// by frame, on the clock of the window the bar is in. With reduced motion it
// shows the moon at once.
export function MoonMark({ folded, win = window }) {
  const mark = useRef(null)
  const path = useRef(null)
  const turn = useRef(null)
  const t = useRef(folded ? 1 : 0)
  // The first shape, before anything moves.
  useLayoutEffect(() => {
    path.current?.setAttribute('d', shapeAt(t.current))
    turn.current?.setAttribute('transform', `rotate(${turnAt(t.current).toFixed(2)} 12 12)`)
  }, [])
  useEffect(() => {
    const draw = (v) => {
      t.current = v
      path.current?.setAttribute('d', shapeAt(v))
      turn.current?.setAttribute('transform', `rotate(${turnAt(v).toFixed(2)} 12 12)`)
    }
    const target = folded ? 1 : 0
    const from = t.current
    if (from === target) { draw(target); return undefined }
    if (win.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { draw(target); return undefined }
    let raf = 0
    let start = null
    const duration = MOTION.morph * Math.abs(target - from)
    // Seen while it moves either way, so the way back shows too.
    const node = mark.current
    node?.setAttribute('data-moving', '')
    const step = (now) => {
      if (start === null) start = now
      const u = Math.min(1, (now - start) / duration)
      draw(from + (target - from) * ease(u))
      if (u < 1) raf = win.requestAnimationFrame(step)
      else node?.removeAttribute('data-moving')
    }
    // Folding, the chevron holds and travels a while before it changes (C113).
    const wait = folded ? MOTION.hold + MOTION.morphAfter : 0
    const timer = win.setTimeout(() => { raf = win.requestAnimationFrame(step) }, wait)
    return () => { win.clearTimeout(timer); win.cancelAnimationFrame(raf); node?.removeAttribute('data-moving') }
  }, [folded, win])
  return (
    <svg ref={mark} className={`ch-mark${folded ? ' on' : ''}`} viewBox="0 0 24 24" aria-hidden="true">
      <g ref={turn}><path ref={path} /></g>
    </svg>
  )
}

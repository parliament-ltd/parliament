import { useEffect, useId, useLayoutEffect, useRef } from 'react'
import { STARS, STAR_TILE } from './stars'
import { shapeAt, turnAt, ease } from './moon'
import { MOTION } from './motion'
import { inkPot } from './inkpot'

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

// The quill in its ink pot, holding ink (Stefan's parliament-inkpot.svg,
// 21 October; C114). At rest the pot is full and still. While a reply
// arrives the ink drains and the quill re-dips; when it has arrived the pot
// refills; when it is stopped the ink spills down the side (inkpot.js).
// `ink` is 'writing', 'done', 'stopped' or null; `inkKey` names the chat the
// field points at, and a new one puts the pot back to rest.
const POT = 'M6.3 14.8h8.5l-.7 5.1a1.5 1.5 0 0 1-1.5 1.3H8.5a1.5 1.5 0 0 1-1.5-1.3z'

// The pot's state lives on an inner group whose class React never changes,
// so changing mode, which redraws the svg's class, cannot wipe it.
export function Quill({ on, ink = null, inkKey = null }) {
  const root = useRef(null)
  const pot = useRef(null)
  const was = useRef({ ink: null, key: inkKey })
  const clip = `pq-in-${useId().replace(/[^A-Za-z0-9_-]/g, '')}`

  useEffect(() => {
    if (!root.current) return
    if (!pot.current) pot.current = inkPot(root.current)
    const p = pot.current
    const prev = was.current
    was.current = { ink, key: inkKey }
    if (prev.key !== inkKey) {
      p.reset()
      if (ink === 'writing') p.start()
      return
    }
    if (ink === prev.ink) return
    if (ink === 'writing') p.start()
    else if (prev.ink === 'writing' && ink === 'stopped') p.stop()
    else if (prev.ink === 'writing' && ink === 'done') p.done()
  }, [ink, inkKey])

  return (
    <svg className={`ch-glyph quill${on ? ' on' : ''}`} viewBox="0 0 24 24" aria-hidden="true">
      <defs><clipPath id={clip}><path d={POT} /></clipPath></defs>
      <g ref={root} className="pq">
      <g clipPath={`url(#${clip})`}>
        <g className="pq-lvl">
          <g className="pq-ink">
            <path className="pq-surf" d="M4 16.3q2.2-.45 4.4 0t4.4 0 4.4 0V24H4z" fill="currentColor" />
          </g>
        </g>
      </g>
      <g className="pq-spill">
        <path className="pq-run" d="M15.6 15.2c.5 1.6-.1 3.6.4 6.6" fill="none" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" pathLength="8" />
        <path className="pq-pud" d="M11.6 22.3c.9-.6 2.6-.75 4.2-.6 1.5.15 2.4.5 2.2.9-.2.45-1.6.65-3.2.65-1.7 0-3.6-.35-3.2-.95z" fill="currentColor" />
        <circle className="pq-drop" cx="19.4" cy="22.5" r=".45" fill="currentColor" />
      </g>
      <path d={POT} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M5.2 14.8h10.7" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <g className="pq-pen">
        <path d="M21.3 2.3c-5.7 1.2-9.1 5-9.8 10l3.1-1c3.9-1.4 6.4-4.6 6.7-9z" fill="currentColor" />
        <path d="M11.9 12.2 10.4 14.7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </g>
      </g>
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

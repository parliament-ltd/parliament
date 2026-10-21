import { useId } from 'react'
import { STARS, STAR_TILE } from './stars'

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

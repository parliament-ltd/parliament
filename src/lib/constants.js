/* ── Animation Springs ───────────────────────────────────── */

export const SPRING_SNAPPY = { type: 'spring', stiffness: 500, damping: 30 }
export const SPRING_SMOOTH = { type: 'spring', stiffness: 300, damping: 28 }
export const SPRING_GENTLE = { type: 'spring', stiffness: 200, damping: 24 }

/* ── Design Tokens ───────────────────────────────────────── */

export const DUSTY_GOLD = '#C4A94D'

export const HIGHLIGHT_COLORS = [
  { id: 'blue',   color: '#B8A070', bg: 'rgba(184,160,112,0.18)' },
  { id: 'yellow', color: '#D9730D', bg: 'rgba(229,166,32,0.15)' },
  { id: 'green',  color: '#0F7B6C', bg: 'rgba(34,197,94,0.15)' },
  { id: 'purple', color: '#B8A070', bg: 'rgba(124,108,212,0.15)' },
  { id: 'red',    color: '#E03E3E', bg: 'rgba(239,68,68,0.15)' },
]

/* ── Context Health Color ────────────────────────────────── */

/**
 * Returns a traffic-light color based on context usage relative to threshold.
 * @param {number} usage     - 0–100 percentage
 * @param {number} threshold - 0–100 threshold percentage
 */
export function getContextColor(usage, threshold) {
  if (usage < threshold / 2) return '#0F7B6C'
  if (usage < threshold)     return '#D9730D'
  return '#E03E3E'
}

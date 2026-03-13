/* ── Animation Springs ───────────────────────────────────── */

export const SPRING_SNAPPY = { type: 'spring', stiffness: 500, damping: 30 }
export const SPRING_SMOOTH = { type: 'spring', stiffness: 300, damping: 28 }
export const SPRING_GENTLE = { type: 'spring', stiffness: 200, damping: 24 }

/* ── Design Tokens ───────────────────────────────────────── */

export const DUSTY_GOLD = '#C4A94D'

export const HIGHLIGHT_COLORS = [
  { id: 'blue',   color: '#4A7AE5', bg: 'rgba(74,122,229,0.15)' },
  { id: 'yellow', color: '#E5A620', bg: 'rgba(229,166,32,0.15)' },
  { id: 'green',  color: '#22C55E', bg: 'rgba(34,197,94,0.15)' },
  { id: 'purple', color: '#7C6CD4', bg: 'rgba(124,108,212,0.15)' },
  { id: 'red',    color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
]

/* ── Context Health Color ────────────────────────────────── */

/**
 * Returns a traffic-light color based on context usage relative to threshold.
 * @param {number} usage     - 0–100 percentage
 * @param {number} threshold - 0–100 threshold percentage
 */
export function getContextColor(usage, threshold) {
  if (usage < threshold / 2) return '#22C55E'
  if (usage < threshold)     return '#E5A620'
  return '#EF4444'
}

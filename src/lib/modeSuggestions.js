/**
 * Mode suggestion rules.
 *
 * Each rule evaluates a signals object and returns a suggestion descriptor or null.
 * Signals:
 *   - mode: string (current active mode)
 *   - attachment: object|null (the uploaded file, with .name property)
 *   - highlightCount: number
 */

export const SUGGESTION_RULES = [
  {
    id: 'csv-to-pelican',
    evaluate({ mode, attachment }) {
      if (mode === 'pelican') return null
      if (!attachment) return null
      const ext = attachment.name?.split('.').pop()?.toLowerCase()
      if (!['csv', 'tsv'].includes(ext)) return null
      return {
        targetMode: 'pelican',
        message: 'This looks like data work.',
        cta: 'Switch to Pelican for a staging area and charts?',
      }
    },
  },
  // 'highlights-to-kingfisher' disabled — Kingfisher not yet available
  // {
  //   id: 'highlights-to-kingfisher',
  //   evaluate({ mode, highlightCount }) {
  //     if (mode === 'kingfisher') return null
  //     if (highlightCount < 3) return null
  //     return {
  //       targetMode: 'kingfisher',
  //       message: "You're building up annotations.",
  //       cta: 'Kingfisher has a reading pane built for detailed review.',
  //     }
  //   },
  // },
  {
    id: 'stylus-to-secretarybird',
    evaluate({ mode }) {
      if (mode === 'secretarybird') return null
      if (typeof window === 'undefined') return null
      // Heuristic: fine pointer (stylus/mouse) + touch points (tablet) = likely stylus
      const hasFinePointer = window.matchMedia?.('(pointer: fine)').matches
      const hasTouchPoints = navigator.maxTouchPoints > 1
      if (!hasFinePointer || !hasTouchPoints) return null
      return {
        targetMode: 'secretarybird',
        message: 'Looks like you might be using a stylus.',
        cta: 'Secretarybird is optimized for pen input.',
      }
    },
  },
]

/**
 * Evaluate all rules and return the first matching suggestion, or null.
 */
export function evaluateSuggestions(signals) {
  for (const rule of SUGGESTION_RULES) {
    const result = rule.evaluate(signals)
    if (result) return { id: rule.id, ...result }
  }
  return null
}

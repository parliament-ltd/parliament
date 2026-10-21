// The api: ignition (bar reference, "Gold"; C50; stage 5, piece 5): the one
// gold moment. Once per new key, a gold sweep crosses the field, then each
// board glints in turn, top to bottom and left to right. Gold is never at
// rest and never text. With reduced motion it does not play at all.

const SWEEP = 'ignite'
const GLINT = 'glint'
const FIRST_GLINT_MS = 120
const BETWEEN_MS = 60
const LONGEST_MS = 1400 // after this a class is taken off even if no animation ended

function play(el, cls, delay) {
  window.setTimeout(() => {
    el.classList.remove(cls)
    void el.offsetWidth // so the same class plays again
    el.classList.add(cls)
    const off = () => el.classList.remove(cls)
    el.addEventListener('animationend', off, { once: true })
    window.setTimeout(off, LONGEST_MS)
  }, delay)
}

/**
 * Plays the ignition on a document's bar and boards.
 * @param {Document} doc
 */
export function ignite(doc = document) {
  const win = doc.defaultView
  if (win?.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  const field = doc.querySelector('.ch-dock .ch-field')
  if (field) play(field, SWEEP, 0)
  const cards = [...doc.querySelectorAll('.ch-stage.space .ch-card')]
  cards.forEach((card, i) => play(card, GLINT, FIRST_GLINT_MS + i * BETWEEN_MS))
}

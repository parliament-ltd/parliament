// The birds on first load (C279 (e), ruled 29 October): one bird, then two,
// then three, then the welcome page fades in. Only on the very first start
// on this device, the moment the welcome page first shows, and never again.
// About 1.2 seconds in all; a key or a click skips it. With reduced motion
// the three show at once, still, and the page follows.
//
// The timings run from script, as the bar's do (motion.js): Intro.jsx sets
// them on the stylesheet's animations and ends on the same clock.

export const INTRO = Object.freeze({
  bird: 280, // each bird fades in and rises
  between: 200, // from one bird to the next
  hold: 160, // the three together, before the page comes
  fade: 320, // the birds give way to the welcome page
  still: 400, // with reduced motion, the three held at once before the page
})

/**
 * Whether this start brings the birds in: the first on this device, that is
 * no space kept yet, nothing made, so the welcome page is the one starting,
 * and a place to keep the space, so the next start is not a first one.
 * @param {{ kept: boolean, fresh: boolean, canKeep?: boolean }} start
 *   kept: a space is kept on this device; fresh: nothing made yet;
 *   canKeep: the database has the list the space is kept in
 */
export function showIntro({ kept, fresh, canKeep = true }) {
  return !kept && fresh === true && canKeep === true
}

/**
 * When each part happens, in milliseconds from the start.
 * @param {{ reduced?: boolean }} [how] reduced: the person asks for reduced motion
 * @returns {{ birds: number[], bird: number, out: number, fade: number, end: number }}
 *   birds: when each bird starts to come in; bird: how long each takes;
 *   out: when the page starts to come; fade: how long it takes; end: when it is over
 */
export function introTimes({ reduced = false } = {}) {
  if (reduced) return { birds: [0, 0, 0], bird: 0, out: INTRO.still, fade: 0, end: INTRO.still }
  const birds = [0, 1, 2].map((i) => i * INTRO.between)
  const out = birds[2] + INTRO.bird + INTRO.hold
  return { birds, bird: INTRO.bird, out, fade: INTRO.fade, end: out + INTRO.fade }
}

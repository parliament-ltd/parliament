// The command mark in the folded field: a chevron that rolls into a crescent
// moon (bar reference, 9 October; now inside a circle, C108). Both shapes
// are sampled to the same 136 points, outer edge to outer arc, inner edge to
// inner arc, flat ends to horns, so every frame between them is a real shape,
// and a turn of up to 14° rides the middle. Geometry from the mockup, in a
// 24 by 24 box.

const EDGE = 60
const END = 8

const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]

// n points spaced evenly along a polyline.
function sample(poly, n) {
  const seg = []
  let total = 0
  for (let i = 0; i < poly.length - 1; i++) {
    const d = Math.hypot(poly[i + 1][0] - poly[i][0], poly[i + 1][1] - poly[i][1])
    seg.push(d)
    total += d
  }
  const out = []
  for (let k = 0; k < n; k++) {
    let s = (total * k) / n
    let j = 0
    while (j < seg.length - 1 && s > seg[j]) { s -= seg[j]; j++ }
    out.push(lerp(poly[j], poly[j + 1], seg[j] ? s / seg[j] : 0))
  }
  return out
}

// Where line ab meets line cd.
function meet(a, b, c, d) {
  const den = (a[0] - b[0]) * (c[1] - d[1]) - (a[1] - b[1]) * (c[0] - d[0])
  const p = a[0] * b[1] - a[1] * b[0]
  const q = c[0] * d[1] - c[1] * d[0]
  return [(p * (c[0] - d[0]) - (a[0] - b[0]) * q) / den, (p * (c[1] - d[1]) - (a[1] - b[1]) * q) / den]
}

function chevron() {
  const P0 = [7.6, 4.6]
  const P1 = [16.6, 12]
  const P2 = [7.6, 19.4]
  const h = 1.55
  const normal = (a, b) => { const dx = b[0] - a[0]; const dy = b[1] - a[1]; const L = Math.hypot(dx, dy); return [dy / L, -dx / L] }
  const n1 = normal(P0, P1)
  const n2 = normal(P1, P2)
  const off = (p, n, s) => [p[0] + n[0] * h * s, p[1] + n[1] * h * s]
  const Ao = off(P0, n1, 1); const Ai = off(P0, n1, -1); const Bo = off(P2, n2, 1); const Bi = off(P2, n2, -1)
  const To = meet(Ao, off(P1, n1, 1), off(P1, n2, 1), Bo)
  const Ti = meet(Ai, off(P1, n1, -1), off(P1, n2, -1), Bi)
  return [...sample([Ao, To, Bo], EDGE), ...sample([Bo, Bi], END), ...sample([Bi, Ti, Ai], EDGE), ...sample([Ai, Ao], END)]
}

function crescent() {
  const C = [9.8, 12]; const R = 8.8; const c = [5.8, 12]; const r = 8.0
  const x = ((R * R - r * r) - (C[0] * C[0] - c[0] * c[0])) / (2 * (c[0] - C[0]))
  const y = Math.sqrt(R * R - (x - C[0]) * (x - C[0]))
  const top = [x, 12 - y]; const bottom = [x, 12 + y]
  const a0 = Math.atan2(top[1] - 12, top[0] - C[0]); const a1 = Math.atan2(bottom[1] - 12, bottom[0] - C[0])
  const b0 = Math.atan2(bottom[1] - 12, bottom[0] - c[0]); const b1 = Math.atan2(top[1] - 12, top[0] - c[0])
  const out = []
  for (let k = 0; k < EDGE; k++) { const a = a0 + ((a1 - a0) * k) / EDGE; out.push([C[0] + R * Math.cos(a), 12 + R * Math.sin(a)]) }
  for (let k = 0; k < END; k++) out.push([...bottom])
  for (let k = 0; k < EDGE; k++) { const b = b0 + ((b1 - b0) * k) / EDGE; out.push([c[0] + r * Math.cos(b), 12 + r * Math.sin(b)]) }
  for (let k = 0; k < END; k++) out.push([...top])
  return out
}

export const CHEVRON = Object.freeze(chevron())
export const MOON = Object.freeze(crescent())

/** The shape at t, from the chevron (0) to the moon (1), as an SVG path. */
export function shapeAt(t) {
  let d = ''
  for (let i = 0; i < CHEVRON.length; i++) {
    const x = CHEVRON[i][0] + (MOON[i][0] - CHEVRON[i][0]) * t
    const y = CHEVRON[i][1] + (MOON[i][1] - CHEVRON[i][1]) * t
    d += `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`
  }
  return `${d}Z`
}

/** The turn at t, up to 14° in the middle of the roll. */
export const turnAt = (t) => -14 * Math.sin(Math.PI * t)

/** Ease in and out, as the mockup does. */
export const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

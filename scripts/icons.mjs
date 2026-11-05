// The installed app's icons (C293): the three birds of BirdsMark.jsx, in ink,
// on a paper tile with rounded corners and a faint edge, transparent outside
// the corners, so Windows and others show a rounded icon rather than a white
// square. The birds stay ink on paper so the icon shows on light and dark
// taskbars alike. The maskable icon (full bleed, for shapes a system cuts) is
// left as it is.
//   node scripts/icons.mjs      writes public/icon-192.png and public/icon-512.png
// No library: the shapes are straight lines, filled with 4x4 samples a pixel,
// and the PNG is written with node's zlib.

import { readFileSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const INK = [25, 25, 25]
const PAPER = [252, 252, 250]
const EDGE = 0.12 // the tile's edge, ink at this strength
const VIEW = { x: 478, y: 665, w: 752, h: 640 } // BirdsMark's viewBox
const STROKE = 2 // half its stroke, in the mark's units, drawn round
const SS = 4

// The birds, read from the mark itself so the icon never drifts from it.
const source = readFileSync(new URL('../src/chrome/BirdsMark.jsx', import.meta.url), 'utf8')
const birds = [...source.matchAll(/'(M[\d,.LZ ]+Z)'/g)].map((m) => m[1].replace(/[MZ]/g, '').trim().split(/\s*L\s*/).map((p) => p.split(',').map(Number)))
if (birds.length !== 3) throw new Error(`Expected three birds, found ${birds.length}`)

const inside = (poly, x, y) => {
  let c = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c
  }
  return c
}
const nearEdge = (poly, x, y, r) => {
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, ay] = poly[j]
    const [bx, by] = poly[i]
    const dx = bx - ax
    const dy = by - ay
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)))
    const ex = ax + t * dx - x
    const ey = ay + t * dy - y
    if (ex * ex + ey * ey <= r * r) return true
  }
  return false
}
const boxes = birds.map((p) => {
  const xs = p.map((q) => q[0])
  const ys = p.map((q) => q[1])
  return [Math.min(...xs) - STROKE, Math.min(...ys) - STROKE, Math.max(...xs) + STROKE, Math.max(...ys) + STROKE]
})
const bird = (x, y) => birds.some((p, i) => {
  const [x0, y0, x1, y1] = boxes[i]
  return x >= x0 && x <= x1 && y >= y0 && y <= y1 && (inside(p, x, y) || nearEdge(p, x, y, STROKE))
})

// Signed distance to a rounded rectangle: negative inside.
const roundRect = (x, y, x0, y0, x1, y1, r) => {
  const cx = Math.max(x0 + r, Math.min(x1 - r, x))
  const cy = Math.max(y0 + r, Math.min(y1 - r, y))
  return Math.hypot(x - cx, y - cy) - r
}

function draw(size) {
  const k = size / 512
  const inset = 8 * k
  const radius = 112 * k
  const line = Math.max(1, 3 * k)
  const scale = (size * 0.62) / VIEW.w
  const ox = (size - VIEW.w * scale) / 2
  const oy = (size - VIEW.h * scale) / 2
  const out = Buffer.alloc(size * size * 4)
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = px + (sx + 0.5) / SS
          const y = py + (sy + 0.5) / SS
          const d = roundRect(x, y, inset, inset, size - inset, size - inset, radius)
          let c = null
          let alpha = 0
          if (d <= 0) { c = PAPER; alpha = 1 }
          if (Math.abs(d) <= line / 2) {
            // The faint edge, over the paper inside and on its own outside.
            const under = d <= 0 ? PAPER : null
            c = under ? under.map((v, i) => v * (1 - EDGE) + INK[i] * EDGE) : INK
            alpha = under ? 1 : EDGE
          }
          if (d <= 0 && bird((x - ox) / scale + VIEW.x, (y - oy) / scale + VIEW.y)) { c = INK; alpha = 1 }
          if (c) { r += c[0] * alpha; g += c[1] * alpha; b += c[2] * alpha; a += alpha }
        }
      }
      const i = (py * size + px) * 4
      const n = SS * SS
      out[i + 3] = Math.round((a / n) * 255)
      if (a > 0) { out[i] = Math.round(r / a); out[i + 1] = Math.round(g / a); out[i + 2] = Math.round(b / a) }
    }
  }
  return png(size, out)
}

// A PNG: RGBA, eight bits, each row unfiltered.
function png(size, rgba) {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
  })
  const crc = (buf) => {
    let c = 0xffffffff
    for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const sum = Buffer.alloc(4)
    sum.writeUInt32BE(crc(body))
    return Buffer.concat([len, body, sum])
  }
  const head = Buffer.alloc(13)
  head.writeUInt32BE(size, 0)
  head.writeUInt32BE(size, 4)
  head[8] = 8 // bit depth
  head[9] = 6 // RGBA
  const rows = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) rgba.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', head),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const size of [192, 512]) {
  const file = new URL(`../public/icon-${size}.png`, import.meta.url)
  writeFileSync(file, draw(size))
  console.log(`wrote public/icon-${size}.png`)
}

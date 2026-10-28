// PNG text chunks (stage 15, piece 6; C264 (h)): lists or removes the text
// a PNG carries besides its picture (tEXt, zTXt, iTXt: author, software, the
// XMP block), and leaves the picture byte for byte as it was.
//   node scripts/png-text.mjs list  <file>
//   node scripts/png-text.mjs strip <in> <out>
// Also used as a module by the history rewrite.

import { readFileSync, writeFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const TEXT = new Set(['tEXt', 'zTXt', 'iTXt'])

function chunks(buf) {
  if (!buf.subarray(0, 8).equals(SIGNATURE)) throw new Error('not a PNG')
  const out = []
  let at = 8
  while (at < buf.length) {
    const len = buf.readUInt32BE(at)
    const type = buf.toString('latin1', at + 4, at + 8)
    out.push({ type, start: at, end: at + 12 + len, data: buf.subarray(at + 8, at + 8 + len) })
    at += 12 + len
    if (type === 'IEND') break
  }
  return out
}

/** The text a PNG carries: [{ type, key, text }]. */
export function pngText(buf) {
  return chunks(buf).filter((c) => TEXT.has(c.type)).map((c) => {
    const nul = c.data.indexOf(0)
    const key = c.data.toString('latin1', 0, nul)
    let text
    if (c.type === 'tEXt') text = c.data.toString('latin1', nul + 1)
    else if (c.type === 'zTXt') text = inflateSync(c.data.subarray(nul + 2)).toString('latin1')
    else {
      const compressed = c.data[nul + 1] === 1
      let p = nul + 3
      p = c.data.indexOf(0, p) + 1 // language tag
      p = c.data.indexOf(0, p) + 1 // translated keyword
      const body = c.data.subarray(p)
      text = (compressed ? inflateSync(body) : body).toString('utf8')
    }
    return { type: c.type, key, text }
  })
}

/** The same PNG without its text chunks. */
export function stripPngText(buf) {
  const keep = chunks(buf).filter((c) => !TEXT.has(c.type))
  return Buffer.concat([SIGNATURE, ...keep.map((c) => buf.subarray(c.start, c.end))])
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('png-text.mjs')) {
  const [cmd, input, output] = process.argv.slice(2)
  if (cmd === 'list') {
    for (const t of pngText(readFileSync(input))) console.log(`${t.type} ${t.key}: ${t.text.replace(/\s+/g, ' ').slice(0, 300)}`)
  } else if (cmd === 'strip') {
    writeFileSync(output, stripPngText(readFileSync(input)))
  }
}

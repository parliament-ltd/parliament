// SVG file details (stage 15, piece 6; C275 (b)): lists or removes the
// Content Credentials (C2PA) an SVG carries in its <metadata>, and leaves the
// drawing as it was.
//   node scripts/svg-details.mjs list  <file>
//   node scripts/svg-details.mjs strip <in> <out>
// Also used as a module by the history rewrite.

import { readFileSync, writeFileSync } from 'node:fs'

/** The SVG without its Content Credentials: the <metadata> block and its namespace. */
export function stripSvgDetails(text) {
  return text
    .replace(/<metadata>\s*<c2pa:manifest>[\s\S]*?<\/c2pa:manifest>\s*<\/metadata>/g, '')
    .replace(/\s+xmlns:c2pa="[^"]*"/g, '')
}

/** What file details an SVG still carries: any <metadata> block, any C2PA. */
export function svgDetails(text) {
  const out = []
  if (/<metadata[\s>]/i.test(text)) out.push('metadata')
  if (/c2pa/i.test(text)) out.push('c2pa')
  return out
}

if (process.argv[1]?.endsWith('svg-details.mjs')) {
  const [cmd, input, output] = process.argv.slice(2)
  const text = readFileSync(input, 'utf8')
  if (cmd === 'list') console.log(svgDetails(text).join(', ') || 'none')
  else if (cmd === 'strip') writeFileSync(output, stripSvgDetails(text))
}

// The standby site on Cloudflare Pages (stage 15, piece 8; C264 (i); C286 (o)).
//
// Cloudflare Pages reads response headers from a `_headers` file in the built
// folder, where Netlify reads netlify.toml. This writes that file from the
// same netlify.toml, after a build, so the standby serves the site with the
// same security policy. Netlify's own build never runs it: its folder has no
// `_headers`, and nothing it serves changes.
//
// It also writes `assets/404.html`: a missing script under /assets/ answers
// "not found", as netlify.toml's rule makes it there, instead of the page,
// which a browser would refuse to run as a script.
//
//   node scripts/standby.mjs netlify.toml dist
//   node scripts/standby.mjs vault/netlify.toml vault/dist

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

/**
 * The [[headers]] rules of a netlify.toml: each path and its headers, in order.
 * Reads only the plain form netlify.toml uses here: `for = "…"`, then
 * `Name = "value"` lines under [headers.values].
 * @param {string} toml
 * @returns {Array<{ path: string, values: Array<[string, string]> }>}
 */
export function headerRules(toml) {
  const rules = []
  let rule = null
  let inValues = false
  for (const raw of toml.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    if (line === '[[headers]]') { rule = { path: null, values: [] }; rules.push(rule); inValues = false; continue }
    if (line === '[headers.values]') { inValues = Boolean(rule); continue }
    if (line.startsWith('[')) { rule = null; inValues = false; continue }
    if (!rule) continue
    const m = /^([A-Za-z0-9-]+)\s*=\s*"((?:[^"\\]|\\.)*)"$/.exec(line)
    if (!m) continue
    const value = m[2].replace(/\\"/g, '"').replace(/\\\\/g, '\\')
    if (!inValues && m[1] === 'for') rule.path = value
    else if (inValues) rule.values.push([m[1], value])
  }
  return rules.filter((r) => r.path && r.values.length)
}

/** The `_headers` file Cloudflare Pages reads, for these rules. */
export function headersFile(rules) {
  const out = ['# Written by scripts/standby.mjs from netlify.toml. Do not edit by hand.']
  for (const r of rules) {
    out.push(r.path)
    for (const [name, value] of r.values) {
      if (/[\r\n]/.test(value)) throw new Error(`A header value runs over a line: ${name}`)
      out.push(`  ${name}: ${value}`)
    }
  }
  return `${out.join('\n')}\n`
}

const NOT_FOUND = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Not found · Parliament</title></head>
<body><p>Not found. <a href="/">Parliament</a></p></body></html>
`

function main([toml, folder]) {
  if (!toml || !folder) throw new Error('Usage: node scripts/standby.mjs <netlify.toml> <built folder>')
  if (!existsSync(join(folder, 'index.html'))) throw new Error(`${folder} has no index.html: build first`)
  const rules = headerRules(readFileSync(toml, 'utf8'))
  if (!rules.some((r) => r.path === '/*' && r.values.some(([n]) => n === 'Content-Security-Policy'))) {
    throw new Error(`${toml} has no security policy for /*; nothing written`)
  }
  writeFileSync(join(folder, '_headers'), headersFile(rules))
  if (existsSync(join(folder, 'assets'))) {
    mkdirSync(join(folder, 'assets'), { recursive: true })
    writeFileSync(join(folder, 'assets', '404.html'), NOT_FOUND)
  }
  console.log(`Wrote ${join(folder, '_headers')}: ${rules.length} rule(s), ${rules.reduce((n, r) => n + r.values.length, 0)} header(s)`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main(process.argv.slice(2))

// The public copy (stage 15, piece 6; C71; C264 (h) 1; C274). Makes a fresh
// clone of this branch beside the repository, as `main` only, and rewrites
// that clone's history; this repository is not touched and stays the private
// archive. Nothing is pushed.
//
//   node scripts/public-copy.mjs [--dest ../parliament-public]
//
// What the rewrite changes, and nothing else (C274 (c)):
// - the personal author and committer address becomes GitHub's no-reply one;
// - every version of the logos loses its file details (the text a PNG carries
//   beside the picture: an author's name, Canva's ids); the picture stays.
// Then: the commit ids quoted in the documents follow the new history (one
// commit), and every object in the copy is searched for what must not be
// there (C274 (d)). Run with git's own filter-branch: nothing to install.

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'
import { stripPngText, pngText } from './png-text.mjs'

const PERSONAL = '200635734+Solofsson25@users.noreply.github.com'
const NOREPLY = '200635734+Solofsson25@users.noreply.github.com'
const LOGOS = ['public/parliament_logo.png', 'public/flight_logo.png', 'public/logo.png', 'src/deprecated/public/flight_logo.png']
// What must appear nowhere in the copy (C274 (d)).
const FORBIDDEN = [
  ['the personal address', /200635734\+Solofsson25@users\.noreply\.github\.com/i],
  ['the surname outside the handle', /Stefan/],
  ['a Canva id from the logos', /removed|removed|removed|removed/],
  ['an Anthropic key', /sk-ant-api03-[A-Za-z0-9_-]{60,}/],
  ['a Google key', /AIza[0-9A-Za-z_-]{35}/],
  ['a private key', /-----BEGIN (RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/],
]

const argv = process.argv.slice(2)
const dest = resolve(argv.includes('--dest') ? argv[argv.indexOf('--dest') + 1] : '../parliament-public')
const archive = process.cwd()

function run(args, { cwd = archive, input = null, env = null, may = false, binary = false } = {}) {
  const r = spawnSync('git', args, { cwd, input, env: env ? { ...process.env, ...env } : process.env, maxBuffer: 1 << 30, encoding: binary ? 'buffer' : 'utf8' })
  if (r.status !== 0 && !may) throw new Error(`git ${args.join(' ')} failed: ${r.stderr}`)
  return binary ? r.stdout : (r.stdout ?? '').trim()
}
const say = (s) => console.log(s)

// ── 1. The clone ───────────────────────────────────────
if (existsSync(dest)) throw new Error(`${dest} already exists. Move it away first; this script does not delete it.`)
if (run(['status', '--porcelain', '--untracked-files=no'])) throw new Error('Commit your changes in the archive first.')
const branch = run(['rev-parse', '--abbrev-ref', 'HEAD'])
const head = run(['rev-parse', 'HEAD'])
say(`The archive: ${branch} at ${head.slice(0, 7)}. The copy: ${dest}.`)
run(['clone', '--no-local', '--single-branch', '--branch', branch, archive, dest], { cwd: resolve(archive, '..') })
run(['checkout', '-q', '-B', 'main'], { cwd: dest })
run(['branch', '-D', branch], { cwd: dest })
run(['remote', 'remove', 'origin'], { cwd: dest })
for (const t of run(['tag', '-l'], { cwd: dest }).split('\n').filter(Boolean)) run(['tag', '-d', t], { cwd: dest })
run(['config', 'user.name', 'Solofsson25'], { cwd: dest })
run(['config', 'user.email', NOREPLY], { cwd: dest })

// ── 2. Every version of the logos, without its file details ──
const map = new Map()
for (const path of LOGOS) {
  for (const commit of run(['rev-list', 'main', '--', path], { cwd: dest }).split('\n').filter(Boolean)) {
    const blob = run(['rev-parse', `${commit}:${path}`], { cwd: dest, may: true })
    if (!/^[0-9a-f]{40}$/.test(blob) || map.has(blob)) continue
    const before = run(['cat-file', 'blob', blob], { cwd: dest, binary: true })
    const after = stripPngText(before)
    if (after.equals(before)) continue
    map.set(blob, run(['hash-object', '-w', '--stdin'], { cwd: dest, input: after }))
  }
}
say(`Logo versions to clean: ${map.size}.`)
const mapFile = join(dest, '.git', 'logo-map').replace(/\\/g, '/')
writeFileSync(mapFile, [...map].map(([a, b]) => `${a} ${b}`).join('\n') + '\n')
const filterFile = join(dest, '.git', 'index-filter.sh').replace(/\\/g, '/')
writeFileSync(filterFile, [
  '#!/bin/sh',
  `git ls-files -s -- ${LOGOS.map((p) => `'${p}'`).join(' ')} | while read mode sha stage path; do`,
  `  new=$(grep "^$sha " '${mapFile}' | cut -d' ' -f2)`,
  '  if [ -n "$new" ]; then git update-index --cacheinfo "$mode,$new,$path"; fi',
  'done',
  '',
].join('\n'))

// ── 3. The rewrite ─────────────────────────────────────
const envFilter = [
  `if [ "$GIT_AUTHOR_EMAIL" = "${PERSONAL}" ]; then GIT_AUTHOR_EMAIL="${NOREPLY}"; export GIT_AUTHOR_EMAIL; fi`,
  `if [ "$GIT_COMMITTER_EMAIL" = "${PERSONAL}" ]; then GIT_COMMITTER_EMAIL="${NOREPLY}"; export GIT_COMMITTER_EMAIL; fi`,
].join('\n')
say('Rewriting (a few minutes)…')
run(['filter-branch', '-f', '--env-filter', envFilter, '--index-filter', `sh '${filterFile}'`, '--', 'main'], { cwd: dest, env: { FILTER_BRANCH_SQUELCH_WARNING: '1' } })
run(['update-ref', '-d', 'refs/original/refs/heads/main'], { cwd: dest, may: true })
run(['reflog', 'expire', '--expire=now', '--all'], { cwd: dest })
run(['gc', '--prune=now', '--quiet'], { cwd: dest })

// ── 4. The same files as the archive ───────────────────
const sameTree = run(['rev-parse', 'main^{tree}'], { cwd: dest }) === run(['rev-parse', `${head}^{tree}`])
say(`The copy's files are the archive's, exactly: ${sameTree ? 'yes' : 'NO'}.`)
if (!sameTree) throw new Error('The trees differ; stopping before anything else.')

// ── 5. Commit ids quoted in the documents ──────────────
const oldIds = run(['rev-list', '--reverse', head]).split('\n')
const newIds = run(['rev-list', '--reverse', 'main'], { cwd: dest }).split('\n')
if (oldIds.length !== newIds.length) throw new Error('The histories differ in length')
const ids = new Map(oldIds.map((o, i) => [o, newIds[i]]))
const docs = ['CLAUDE.md', 'README.md', 'SECURITY.md', 'CONTRIBUTING.md', 'CHANGELOG.md']
const walk = (dir) => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p] })
for (const f of walk(join(dest, 'docs'))) if (f.endsWith('.md')) docs.push(relative(dest, f))
let changed = 0
for (const rel of docs) {
  const file = join(dest, rel)
  if (!existsSync(file)) continue
  const text = readFileSync(file, 'utf8')
  const next = text.replace(/\b[0-9a-f]{7,40}\b/g, (tok) => {
    const hits = oldIds.filter((o) => o.startsWith(tok))
    if (hits.length !== 1) return tok
    changed++
    return ids.get(hits[0]).slice(0, tok.length)
  })
  if (next !== text) writeFileSync(file, next)
}
if (changed) {
  run(['add', '-A'], { cwd: dest })
  run(['commit', '-q', '-m', 'Commit ids quoted in the documents follow the public history\n\nThe history was rewritten for publishing (C71, C274): the author\naddress and the logos\' file details changed, so every commit id did.'], { cwd: dest })
}
say(`Commit ids updated in the documents: ${changed}.`)

// ── 6. The sweep ───────────────────────────────────────
const found = []
for (const line of run(['log', '--format=%H %ae %ce'], { cwd: dest }).split('\n')) if (line.includes(PERSONAL)) found.push(`commit ${line.slice(0, 7)}: the personal address`)
for (const line of run(['log', '--format=%H %s %b'], { cwd: dest }).split('\n')) for (const [what, re] of FORBIDDEN) if (re.test(line)) found.push(`message ${line.slice(0, 7)}: ${what}`)
const objects = run(['rev-list', '--objects', 'main'], { cwd: dest }).split('\n').map((l) => l.split(' ')).filter((p) => p[1])
const types = run(['cat-file', '--batch-check=%(objectname) %(objecttype) %(objectsize)'], { cwd: dest, input: objects.map((o) => o[0]).join('\n') }).split('\n')
const blobs = types.map((l) => l.split(' ')).filter((t) => t[1] === 'blob')
const pathOf = new Map(objects.map(([sha, path]) => [sha, path]))
for (const [sha] of blobs) {
  const path = pathOf.get(sha) ?? ''
  if (/(^|\/)\.env(\.|$)/.test(path)) found.push(`${path}: an .env file`)
  const body = run(['cat-file', 'blob', sha], { cwd: dest, binary: true })
  const text = path.endsWith('.png') ? pngText(body).map((t) => t.text).join('\n') : body.toString('latin1')
  for (const [what, re] of FORBIDDEN) if (re.test(text)) found.push(`${path} (${sha.slice(0, 7)}): ${what}`)
}
say(`Searched ${newIds.length} commits and ${blobs.length} files in all their versions.`)
if (found.length) { say('FOUND:'); for (const f of [...new Set(found)]) say(`  ${f}`) } else say('Nothing found that must not be there.')
say(`The copy is ready at ${dest}, branch main, no remote. Nothing was pushed.`)

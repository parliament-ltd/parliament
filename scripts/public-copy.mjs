// The public copy (stage 15, piece 6; C71; C264 (h) 1; C274). Makes a fresh
// clone of this branch beside the repository, as `main` only, and rewrites
// that clone's history; this repository is not touched and stays the private
// archive. Nothing is pushed.
//
//   node scripts/public-copy.mjs [--dest ../parliament-public]
//
// This file names nothing it removes. What to remove is read from the
// history itself:
// - personal addresses: every author or committer address that is not one of
//   GitHub's no-reply ones;
// - a full name and design-tool ids: from the file details the old logos
//   carry (their author, and the ids of the documents they were made from).
//
// What the rewrite changes, and nothing else (C274 (c)):
// - a personal address on a commit becomes the owner's GitHub no-reply one;
// - every version of every image loses its file details (the text a PNG
//   carries beside the picture); the picture stays byte for byte;
// - in every version of every text file, a full name or a surname on its own
//   becomes the first name (the first name stays, as ruled), a personal
//   address the no-reply one, and a design tool id the word 'removed'.
// Then the commit ids quoted in the documents follow the new history, and an
// id of a commit that stays private is marked as in the private archive (one
// commit, C274 (e)). Every object in the copy is searched again (C274 (d)).
// Run with git's own filter-branch: nothing to install.

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve, relative } from 'node:path'
import { stripPngText, pngText } from './png-text.mjs'

const NOREPLY_RE = /@users\.noreply\.github\.com$|^noreply@github\.com$/
// A safety stop: only a handful of text files should change. More means a
// rule matched what it should not, and nothing is rewritten.
const TEXT_CHANGES_MAX = 50
const KEYS = [
  ['an Anthropic key', /sk-ant-api03-[A-Za-z0-9_-]{60,}/],
  ['a Google key', /AIza[0-9A-Za-z_-]{35}/],
  ['a private key', /-----BEGIN (RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/],
]

const argv = process.argv.slice(2)
const dest = resolve(argv.includes('--dest') ? argv[argv.indexOf('--dest') + 1] : '../parliament-public')
const archive = process.cwd()

function run(args, { cwd = archive, input = null, env = null, may = false, binary = false } = {}) {
  // Input goes as bytes, so it reads the same whatever the output is.
  const bytes = typeof input === 'string' ? Buffer.from(input, 'utf8') : input
  const r = spawnSync('git', args, { cwd, input: bytes, env: env ? { ...process.env, ...env } : process.env, maxBuffer: 2 ** 31, encoding: binary ? 'buffer' : 'utf8' })
  if (r.status !== 0 && !may) throw new Error(`git ${args.join(' ')} failed: ${r.stderr}`)
  return binary ? r.stdout : (r.stdout ?? '').trim()
}
const say = (s) => console.log(s)

/** Every blob reachable from a ref, with a path it is known by, read in one pass. */
function blobs(cwd, ref) {
  const objects = run(['rev-list', '--objects', ref], { cwd }).split('\n').map((l) => [l.slice(0, 40), l.slice(41)])
  const pathOf = new Map(objects.filter(([, p]) => p))
  const out = run(['cat-file', '--batch'], { cwd, input: objects.map(([s]) => s).join('\n') + '\n', binary: true })
  const found = []
  let at = 0
  while (at < out.length) {
    const nl = out.indexOf(10, at)
    const [sha, type, size] = out.toString('latin1', at, nl).split(' ')
    const start = nl + 1
    const end = start + Number(size)
    if (type === 'blob') found.push({ sha, path: pathOf.get(sha) ?? '', body: out.subarray(start, end) })
    at = end + 1
  }
  return found
}

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

// ── 2. What to remove, read from the history ──────────
const addresses = [...new Set(run(['log', '--format=%ae%n%ce', 'main'], { cwd: dest }).split('\n'))].filter(Boolean)
const personal = addresses.filter((a) => !NOREPLY_RE.test(a))
const noreply = addresses.find((a) => /users\.noreply\.github\.com$/.test(a))
if (!noreply) throw new Error('No no-reply address in the history to rewrite to')
run(['config', 'user.name', run(['log', '-1', '--format=%an', 'main'], { cwd: dest })], { cwd: dest })
run(['config', 'user.email', noreply], { cwd: dest })

const before = blobs(dest, 'main')
const fullNames = new Set()
const toolIds = new Set()
for (const b of before.filter((x) => x.path.endsWith('.png'))) {
  let text = ''
  try { text = pngText(b.body).map((t) => t.text).join('\n') } catch { continue }
  // A full name: two or more words of letters, nothing else.
  for (const m of text.matchAll(/Author>\s*([^<\n]+?)\s*</g)) if (/^\p{L}{2,}(\s+\p{L}{2,})+$/u.test(m[1].trim())) fullNames.add(m[1].trim())
  for (const m of text.matchAll(/\b(?:doc|user|brand)=([A-Za-z0-9_-]{8,})/g)) toolIds.add(m[1])
}
const surnames = [...fullNames].map((n) => n.split(/\s+/).pop())
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const FORBIDDEN = [
  ...personal.map((a) => ['a personal address', new RegExp(esc(a), 'i')]),
  ...surnames.map((s) => ['the surname outside the handle', new RegExp(`(?<![A-Za-z])${esc(s)}`)]),
  ...[...toolIds].map((id) => ['a design tool id from the logos', new RegExp(esc(id))]),
  ...KEYS,
]
say(`From the history: ${personal.length} personal address(es), ${fullNames.size} full name(s), ${toolIds.size} design tool id(s).`)

// ── 3. Every version that changes, written beside it ───
const map = new Map()
const write = (body) => run(['hash-object', '-w', '--stdin'], { cwd: dest, input: body })
const pending = [] // [sha, new body, path], written only after the safety stop
for (const b of before) {
  if (b.path.endsWith('.png')) {
    let after
    try { after = stripPngText(b.body) } catch { continue }
    if (!after.equals(b.body)) pending.push([b.sha, after, b.path])
    continue
  }
  if (b.body.includes(0)) continue // other binary files
  const text = b.body.toString('utf8')
  let next = text
  for (const n of fullNames) next = next.split(n).join(n.split(/\s+/)[0])
  // A surname on its own (never inside the handle) becomes the first name too.
  for (const n of fullNames) next = next.replace(new RegExp(`(?<![A-Za-z])${esc(n.split(/\s+/).pop())}`, 'g'), n.split(/\s+/)[0])
  for (const a of personal) next = next.split(a).join(noreply)
  for (const id of toolIds) next = next.split(id).join('removed')
  if (next !== text) pending.push([b.sha, Buffer.from(next, 'utf8'), b.path])
}
const textChanges = pending.filter(([, , p]) => !p.endsWith('.png'))
say(`File versions to change: ${pending.length} (${textChanges.length} text): ${[...new Set(pending.map(([, , p]) => p))].join(', ')}.`)
if (textChanges.length > TEXT_CHANGES_MAX) throw new Error(`Stopping before any rewrite: ${textChanges.length} text versions would change, more than ${TEXT_CHANGES_MAX}. A rule matched what it should not.`)
// --plan: say what would change, rewrite nothing.
if (argv.includes('--plan')) { say(`Plan only: nothing rewritten. ${dest} holds an untouched clone; move it away before the real run.`); process.exit(0) }
for (const [sha, body] of pending) map.set(sha, write(body))
const mapFile = join(dest, '.git', 'blob-map').replace(/\\/g, '/')
writeFileSync(mapFile, [...map].map(([a, b]) => `${a} ${b}`).join('\n') + '\n')
const filterFile = join(dest, '.git', 'index-filter.sh').replace(/\\/g, '/')
writeFileSync(filterFile, [
  '#!/bin/sh',
  // Each file in the commit whose content is in the map gets its changed version.
  `git ls-files -s | awk 'NR==FNR { m[$1] = $2; next } ($2 in m) { print $1 "," m[$2] "," $4 }' '${mapFile}' - | while IFS= read -r info; do`,
  '  git update-index --cacheinfo "$info"',
  'done',
  '',
].join('\n'))

// ── 4. The rewrite ─────────────────────────────────────
const envFilter = personal.flatMap((a) => [
  `if [ "$GIT_AUTHOR_EMAIL" = "${a}" ]; then GIT_AUTHOR_EMAIL="${noreply}"; export GIT_AUTHOR_EMAIL; fi`,
  `if [ "$GIT_COMMITTER_EMAIL" = "${a}" ]; then GIT_COMMITTER_EMAIL="${noreply}"; export GIT_COMMITTER_EMAIL; fi`,
]).join('\n') || 'true'
say('Rewriting (a few minutes)…')
run(['filter-branch', '-f', '--env-filter', envFilter, '--index-filter', `sh '${filterFile}'`, '--', 'main'], { cwd: dest, env: { FILTER_BRANCH_SQUELCH_WARNING: '1' } })
run(['update-ref', '-d', 'refs/original/refs/heads/main'], { cwd: dest, may: true })
run(['reflog', 'expire', '--expire=now', '--all'], { cwd: dest })
run(['gc', '--prune=now', '--quiet'], { cwd: dest })

// ── 5. The same files as the archive ───────────────────
const sameTree = run(['rev-parse', 'main^{tree}'], { cwd: dest }) === run(['rev-parse', `${head}^{tree}`])
say(`The copy's files are the archive's, exactly: ${sameTree ? 'yes' : 'NO, see the sweep'}.`)

// ── 6. Commit ids quoted in the documents ──────────────
const oldIds = run(['rev-list', '--reverse', head]).split('\n')
const newIds = run(['rev-list', '--reverse', 'main'], { cwd: dest }).split('\n')
if (oldIds.length !== newIds.length) throw new Error('The histories differ in length')
const ids = new Map(oldIds.map((o, i) => [o, newIds[i]]))
// A commit only on a branch that does not go public keeps its id and is
// said to be in the private archive (C274 (e)).
const archiveIds = run(['rev-list', '--all']).split('\n')
const PRIVATE = 'in the private archive'
const docs = ['CLAUDE.md', 'README.md', 'SECURITY.md', 'CONTRIBUTING.md', 'CHANGELOG.md']
const walk = (dir) => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p] })
for (const f of walk(join(dest, 'docs'))) if (f.endsWith('.md')) docs.push(relative(dest, f))
let changed = 0
const marked = []
const leftAsIs = []
for (const rel of docs) {
  const file = join(dest, rel)
  if (!existsSync(file)) continue
  const text = readFileSync(file, 'utf8')
  const next = text.replace(/(`?)\b([0-9a-f]{7,40})\b(`?)( \()?/g, (all, open, tok, close, paren = '', at, whole) => {
    const hits = oldIds.filter((o) => o.startsWith(tok))
    if (hits.length === 1) { changed++; return open + ids.get(hits[0]).slice(0, tok.length) + close + paren }
    if (hits.length) return all
    const elsewhere = archiveIds.filter((o) => o.startsWith(tok))
    if (elsewhere.length !== 1) return all // not a commit
    // The note goes after the id: never inside a longer piece of code.
    const lineStart = whole.lastIndexOf('\n', at) + 1
    const ticksBefore = (whole.slice(lineStart, at).match(/`/g) ?? []).length
    if (ticksBefore % 2 === 1 || open !== close) { leftAsIs.push(`${rel}: ${tok}`); return all }
    marked.push(`${rel}: ${tok}`)
    return paren ? `${open}${tok}${close} (${PRIVATE}; ` : `${open}${tok}${close} (${PRIVATE})`
  })
  if (next !== text) writeFileSync(file, next)
}
if (changed || marked.length) {
  run(['add', '-A'], { cwd: dest })
  run(['commit', '-q', '-m', 'Commit ids quoted in the documents follow the public history\n\nThe history was rewritten for publishing (C71, C274), so every commit\nid changed. A commit on a branch that was not published keeps its id\nand is marked as in the private archive.'], { cwd: dest })
}
say(`Commit ids updated in the documents: ${changed}. Marked as in the private archive: ${marked.length}${marked.length ? ` (${marked.join(', ')})` : ''}.`)
if (leftAsIs.length) say(`Ids in the private archive left as they are, inside a piece of code: ${leftAsIs.join(', ')}.`)

// ── 7. The sweep ───────────────────────────────────────
const found = []
for (const line of run(['log', '--format=%h %ae %ce %an %cn', 'main'], { cwd: dest }).split('\n')) for (const [what, re] of FORBIDDEN) if (re.test(line)) found.push(`commit ${line.slice(0, 7)}: ${what}`)
for (const line of run(['log', '--format=%h %s %b', 'main'], { cwd: dest }).split('\n')) for (const [what, re] of FORBIDDEN) if (re.test(line)) found.push(`message ${line.slice(0, 7)}: ${what}`)
const after = blobs(dest, 'main')
for (const b of after) {
  if (/(^|\/)\.env(\.|$)/.test(b.path)) found.push(`${b.path}: an .env file`)
  let text
  if (b.path.endsWith('.png')) { try { text = pngText(b.body).map((t) => t.text).join('\n') } catch { text = '' } } else text = b.body.toString('latin1')
  for (const [what, re] of FORBIDDEN) if (re.test(text)) found.push(`${b.path} (${b.sha.slice(0, 7)}): ${what}`)
}
say(`Searched ${newIds.length} commits and ${after.length} files in all their versions.`)
if (found.length) { say('FOUND:'); for (const f of [...new Set(found)]) say(`  ${f}`) } else say('Nothing found that must not be there.')
say(`The copy is ready at ${dest}, branch main, no remote. Nothing was pushed.`)

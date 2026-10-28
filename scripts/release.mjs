// A release (stage 15, piece 6; C274 (h); C264 (i)).
//   node scripts/release.mjs --dry    check, build, pack and hash; no tag
//   node scripts/release.mjs          the same, then tag the version here
//   node scripts/release.mjs --push   the same, then push main and the tag
//                                     to GitHub (origin) and Bitbucket
//                                     (bitbucket) together. Only on Stefan's yes.
// It writes release/<version>/: the app and the key vault, each packed, and
// SHA256SUMS with each archive and every file of the vault: the vault's
// published hashes (C170), so anyone can check what keys.parliament.ltd serves.

import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'

const args = new Set(process.argv.slice(2))
const dry = args.has('--dry')
const push = args.has('--push')
const win = process.platform === 'win32'
// Only npm.cmd goes through the command shell, which Windows needs for it.
// git and tar run directly, so an argument with a space (the tag's message)
// stays one argument.
const run = (cmd, a, opts = {}) => {
  const r = spawnSync(cmd, a, { stdio: opts.quiet ? 'pipe' : 'inherit', shell: win && cmd.endsWith('.cmd'), encoding: 'utf8' })
  if (r.status !== 0 && !opts.mayFail) { console.error(`${cmd} ${a.join(' ')} failed`); process.exit(r.status ?? 1) }
  return r
}
const git = (...a) => run('git', a, { quiet: true }).stdout.trim()

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const version = pkg.version
const changelog = readFileSync('CHANGELOG.md', 'utf8')
const heading = (changelog.match(/^## (.+)$/m) ?? [])[1] ?? ''
if (!heading.startsWith(version)) { console.error(`CHANGELOG.md's newest entry is "${heading}", not ${version}`); process.exit(1) }
if (!dry && /not yet released/.test(heading)) { console.error('Give the newest CHANGELOG.md entry its date before releasing'); process.exit(1) }
if (!dry && git('status', '--porcelain', '--untracked-files=no')) { console.error('Commit or put away your changes first'); process.exit(1) }

run(win ? 'npm.cmd' : 'npm', ['run', 'check'])

const out = join('release', version)
mkdirSync(out, { recursive: true })
const app = join(out, `parliament-${version}.tar.gz`)
const vault = join(out, `parliament-keys-${version}.tar.gz`)
run('tar', ['-czf', app, '-C', 'dist', '.'])
run('tar', ['-czf', vault, '-C', join('vault', 'dist'), '.'])

const sha = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')
const walk = (dir) => readdirSync(dir).flatMap((n) => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p] })
const lines = [
  `${sha(app)}  ${relative(out, app)}`,
  `${sha(vault)}  ${relative(out, vault)}`,
  ...walk(join('vault', 'dist')).sort().map((f) => `${sha(f)}  keys.parliament.ltd/${relative(join('vault', 'dist'), f).replace(/\\/g, '/')}`),
]
writeFileSync(join(out, 'SHA256SUMS'), lines.join('\n') + '\n')
console.log(`\nWrote ${out}:\n${lines.join('\n')}`)

if (dry) process.exit(0)

const tag = `v${version}`
if (!git('tag', '--list', tag)) run('git', ['tag', '-a', tag, '-m', `Parliament ${version}`])
console.log(`Tagged ${tag}.`)

if (push) {
  const remotes = git('remote').split(/\s+/)
  for (const r of ['origin', 'bitbucket']) if (!remotes.includes(r)) { console.error(`No remote named ${r}`); process.exit(1) }
  for (const r of ['origin', 'bitbucket']) run('git', ['push', r, 'main', tag])
  console.log('Pushed main and the tag to GitHub and Bitbucket.')
} else if (existsSync('.git')) {
  console.log('Not pushed. node scripts/release.mjs --push, on the yes, pushes main and the tag to both.')
}

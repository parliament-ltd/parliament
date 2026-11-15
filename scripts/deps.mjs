// Adding or updating a package (C299 (b)): only versions published at least
// seven days ago, the window in which most poisoned releases are found and
// pulled. npm has no setting for a rolling age, so this sets its `before` to
// seven days ago for one install.
//   npm run deps -- some-package
//   npm run deps -- some-package@2.4.1
//   npm run deps -- --save-dev some-tool
import { spawnSync } from 'node:child_process'

const DAYS = 7
const args = process.argv.slice(2)
if (!args.length) {
  console.error('Name a package: npm run deps -- <package>[@version]')
  process.exit(1)
}
const before = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString()
console.log(`Installing what was published by ${before.slice(0, 10)}, seven days ago: ${args.join(' ')}`)
// npm.cmd on Windows goes through the command shell; package names have no spaces.
const r = spawnSync('npm', ['install', `--before=${before}`, ...args], { stdio: 'inherit', shell: process.platform === 'win32' })
process.exit(r.status ?? 1)

// npm run reference (stage 15, piece 5; C272 (d), (e)): writes docs/verbs.md
// from the command registry and SECURITY.md's policy block from the headers,
// by running their test with WRITE_REFERENCE=1. Without it, the same test
// fails whenever either document is out of date.
import { spawnSync } from 'node:child_process'

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const r = spawnSync(npx, ['vitest', 'run', 'src/lib/generatedDocs.test.js'], {
  env: { ...process.env, WRITE_REFERENCE: '1' },
  stdio: 'inherit',
  shell: process.platform === 'win32',
})
process.exit(r.status ?? 1)

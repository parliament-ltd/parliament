// The policy trial (stage 15, piece 4; C270 (g)): builds the app and the key
// vault as they will be deployed, each told the other's local address, and
// serves both under their real headers:
//   http://localhost:4173  the app (vite preview)
//   http://localhost:5176  the vault (vite preview --config vite.vault.config.js)
// Run: node scripts/policy-trial.mjs   (Ctrl+C stops both)

import { spawn, spawnSync } from 'node:child_process'

const env = { ...process.env, VITE_VAULT_ORIGIN: 'http://localhost:5176', VITE_PAGE_ORIGINS: 'http://localhost:4173' }
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const run = (args) => {
  const r = spawnSync(npx, args, { env, stdio: 'inherit', shell: process.platform === 'win32' })
  if (r.status !== 0) process.exit(r.status ?? 1)
}

run(['vite', 'build'])
run(['vite', 'build', '--config', 'vite.vault.config.js'])

const serve = (args) => spawn(npx, args, { env, stdio: 'inherit', shell: process.platform === 'win32' })
const app = serve(['vite', 'preview', '--port', '4173', '--strictPort'])
const vault = serve(['vite', 'preview', '--config', 'vite.vault.config.js'])
const stop = () => { app.kill(); vault.kill(); process.exit(0) }
process.on('SIGINT', stop)
process.on('SIGTERM', stop)

// The vault storage trial (stage 15, piece 2; C267 (i)). Serves this folder
// on two local addresses that are the same site but different origins, as
// www.parliament.ltd and keys.parliament.ltd will be:
//   http://localhost:5190  the page, which frames the vault
//   http://localhost:5191  the vault
// Open http://localhost:5190/top.html and follow the steps on it. A third
// address, http://127.0.0.1:5190, is a different site: the control.
// Nothing here is part of the app or its build.

import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = fileURLToPath(new URL('.', import.meta.url))
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8' }

function serve(port, extra = {}) {
  createServer(async (req, res) => {
    const path = normalize(new URL(req.url, 'http://x').pathname).replace(/^([/\\])+/, '')
    if (!/^[a-z-]+\.(html|js)$/.test(path)) { res.writeHead(404).end(); return }
    try {
      const body = await readFile(join(HERE, path))
      res.writeHead(200, { 'Content-Type': TYPES[extname(path)], 'Cache-Control': 'no-store', ...extra }).end(body)
    } catch {
      res.writeHead(404).end()
    }
  }).listen(port, () => console.log(`vault trial on http://localhost:${port}`))
}

// The page: scripts from itself only, one frame allowed, the vault.
serve(5190, { 'Content-Security-Policy': "default-src 'self'; script-src 'self'; frame-src http://localhost:5191; object-src 'none'" })
// The vault: framed only by the page (and the control), its own agent cluster.
serve(5191, {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; frame-ancestors http://localhost:5190 http://127.0.0.1:5190; object-src 'none'",
  'Origin-Agent-Cluster': '?1',
})

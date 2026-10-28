// The vault's own build (stage 15, piece 3; research/vault-design.md §2, §8):
// a small, separate site at keys.parliament.ltd, deployed on its own. In
// development it runs on localhost:5175 beside the app.
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import process from 'node:process'
import { VAULT_HEADERS, VAULT_TRUSTED_TYPES, trustedTypesTag, trialHeaders } from './src/lib/securityHeaders.js'

export default defineConfig({
  root: fileURLToPath(new URL('./vault', import.meta.url)),
  base: './',
  publicDir: false,
  // Trusted Types with no policy at all: the vault turns nothing into HTML or script (C270 (f)).
  plugins: [{ name: 'vault-trusted-types', apply: 'build', transformIndexHtml: { order: 'pre', handler: (html) => html.replace('<head>', `<head>\n${trustedTypesTag(VAULT_TRUSTED_TYPES)}`) } }],
  server: { port: 5175, strictPort: true },
  // Its own headers; a local trial names the page's local address (C270 (g)).
  preview: { port: 5176, strictPort: true, headers: trialHeaders(VAULT_HEADERS, { page: process.env.VITE_PAGE_ORIGINS ?? null }) },
  build: {
    // Inside vault/, so its own Netlify site (base directory vault/) publishes dist.
    outDir: fileURLToPath(new URL('./vault/dist', import.meta.url)),
    emptyOutDir: true,
    // Plain, readable output: the vault is meant to be read and checked.
    minify: false,
  },
})

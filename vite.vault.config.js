// The vault's own build (stage 15, piece 3; research/vault-design.md §2, §8):
// a small, separate site at keys.parliament.ltd, deployed on its own. In
// development it runs on localhost:5175 beside the app.
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  root: fileURLToPath(new URL('./vault', import.meta.url)),
  base: './',
  publicDir: false,
  server: { port: 5175, strictPort: true },
  preview: { port: 5176, strictPort: true },
  build: {
    // Inside vault/, so its own Netlify site (base directory vault/) publishes dist.
    outDir: fileURLToPath(new URL('./vault/dist', import.meta.url)),
    emptyOutDir: true,
    // Plain, readable output: the vault is meant to be read and checked.
    minify: false,
  },
})

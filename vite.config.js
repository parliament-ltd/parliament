import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { SECURITY_HEADERS } from './src/lib/securityHeaders.js'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt' — the new SW waits in the waiting state instead of activating
      // immediately. PWAContext surfaces an update banner; the user clicks
      // "Update now" which calls updateServiceWorker() to activate and reload.
      registerType: 'prompt',

      // Registration is handled by useRegisterSW() in PWAContext.jsx via the
      // virtual:pwa-register/react module — no need to inject a separate script.
      injectRegister: null,

      // We ship our own /public/manifest.webmanifest — don't auto-generate one.
      manifest: false,

      workbox: {
        // Precache core static build outputs (JS, CSS, fonts, icons, HTML).
        // Hashed filenames mean each deploy gets its own versioned cache entry.
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico,webmanifest}'],

        // Lazy-loaded V2 catalog/component/module chunks are excluded from
        // the install-time precache. The runtimeCaching rule below picks
        // them up on first use, so users only pay for what they open.
        globIgnores: ['**/{catalog,component,module}-*.js'],

        // SPA fallback: serve index.html for all navigation requests when offline.
        navigateFallback: '/index.html',

        // Workbox-managed precache rotation. The legacy `parliament-adapters-v1`
        // runtime cache (V1 per-adapter chunks) was a separate concern handled
        // by an explicit caches.delete() in src/main.jsx through PR-11b; the
        // adapter pattern is now gone repo-wide, the project never went public
        // with a V1 build, and the dev's local browsers have rotated past V2
        // boot — so PR-12 dropped that snippet.
        cleanupOutdatedCaches: true,

        runtimeCaching: [
          {
            // ─────────────────────────────────────────────────────────────
            // SECURITY: Anthropic API — NetworkOnly, no exceptions.
            //
            // Streaming responses must travel directly from the browser to
            // api.anthropic.com. The SW must never cache, buffer, or inspect
            // these requests. This rule is explicit even though a different-
            // origin URL would not match precaching anyway — belt-and-braces.
            // ─────────────────────────────────────────────────────────────
            urlPattern: /^https:\/\/api\.anthropic\.com\//,
            handler: 'NetworkOnly',
          },
          {
            // PR-10b: V2 catalog / component / module chunks — CacheFirst.
            //
            // Catalog components (messages-render, branches-render, …) and
            // any other React.lazy() code-split chunks named `catalog-*`,
            // `component-*`, or `module-*` are excluded from the precache
            // and downloaded lazily on first use. The cache name rotated
            // from V1's `parliament-adapters-v1` to `parliament-modules-v2`;
            // see refactor/data-migration.md §"PWA cache rotation".
            urlPattern: ({ url }) =>
              url.origin === self.location.origin &&
              url.pathname.startsWith('/assets/') &&
              /(catalog|component|module)-/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'parliament-modules-v2',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],

  // The deployed policy, applied to `vite preview` so a production build is
  // tried under it before deploy. Not applied to the dev server (see
  // src/lib/securityHeaders.js).
  // Workers are built as ES modules (the spreadsheet reader imports SheetJS).
  worker: {
    format: 'es',
  },

  preview: {
    headers: SECURITY_HEADERS,
  },

  build: {
    rollupOptions: {
      output: {
        // Stable chunk names prevent SW cache churn on every deploy.
        // Without manualChunks, hashed filenames would change whenever
        // any file in the entry graph changes, busting all precache entries.
        manualChunks: {
          // Core framework — very stable across deploys
          'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
          'vendor-motion':   ['framer-motion'],
          'vendor-markdown': ['react-markdown', 'remark-gfm'],
          'vendor-charts':   ['recharts'],
          'vendor-idb':      ['idb'],

          // No per-adapter chunks. The V1 bird-mode adapter pattern
          // (PR-10b deleted albatross/kingfisher/starling, PR-11a deleted
          // pelican, PR-11b deleted secretarybird, PR-12 deleted swift) is
          // fully gone. The `parliament-modules-v2` runtimeCaching rule
          // above matches any future `catalog-*`, `component-*`, or
          // `module-*` lazy chunks created by the catalog/editor surfaces.
        },
      },
    },
  },
})

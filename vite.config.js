import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

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

        // Adapter chunks are intentionally excluded from the install-time
        // precache. They are handled by the runtimeCaching CacheFirst rule
        // below and are downloaded only on first activation of each mode.
        // Users who never open Pelican, Secretarybird, etc. never pay the
        // download cost at install time.
        globIgnores: ['**/adapter-*.js'],

        // SPA fallback: serve index.html for all navigation requests when offline.
        navigateFallback: '/index.html',

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
            // Lazy-loaded adapter chunks — CacheFirst, activated at runtime.
            //
            // Adapters (albatross, swift, pelican, secretarybird, starling,
            // kingfisher) are React.lazy() code-split chunks. They are NOT
            // included in the install-time precache; they download on first
            // mode activation and are then served from cache on subsequent
            // visits. Users who never open Pelican never download its chunks.
            urlPattern: ({ url }) =>
              url.origin === self.location.origin &&
              url.pathname.startsWith('/assets/') &&
              /adapter-/.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'parliament-adapters-v1',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],

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

          // Adapters — one chunk per adapter family.
          // These names are matched by the runtimeCaching adapter rule above.
          'adapter-albatross': [
            './src/adapters/albatross/ChatLayout.jsx',
            './src/adapters/albatross/SelectorLayout.jsx',
            './src/adapters/albatross/SettingsLayout.jsx',
          ],
          'adapter-swift': [
            './src/adapters/swift/ChatLayout.jsx',
            './src/adapters/swift/SelectorLayout.jsx',
            './src/adapters/swift/SettingsLayout.jsx',
          ],
          'adapter-pelican': [
            './src/adapters/pelican/ChatLayout.jsx',
            './src/adapters/pelican/SelectorLayout.jsx',
            './src/adapters/pelican/SettingsLayout.jsx',
          ],
          'adapter-secretarybird': [
            './src/adapters/secretarybird/ChatLayout.jsx',
            './src/adapters/secretarybird/SelectorLayout.jsx',
            './src/adapters/secretarybird/SettingsLayout.jsx',
          ],
          'adapter-starling': [
            './src/adapters/starling/ChatLayout.jsx',
            './src/adapters/starling/SelectorLayout.jsx',
            './src/adapters/starling/SettingsLayout.jsx',
          ],
          'adapter-kingfisher': [
            './src/adapters/kingfisher/ChatLayout.jsx',
            './src/adapters/kingfisher/SelectorLayout.jsx',
            './src/adapters/kingfisher/SettingsLayout.jsx',
          ],
        },
      },
    },
  },
})

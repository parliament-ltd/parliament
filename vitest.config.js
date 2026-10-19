import { defineConfig } from 'vitest/config'

// Tests cover pure logic (parsers, counters, backup migrations) and the
// database code that is kept free of app imports (schema.js, records.js, the
// version 6 upgrade), which runs against fake-indexeddb, an IndexedDB held in
// memory. So they run in Node with no browser, no React and none of the
// app's Vite plugins.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
})

import { defineConfig } from 'vitest/config'

// Tests cover pure logic (parsers, counters, backup migrations) and the
// database code that is kept free of app imports (schema.js, records.js, the
// version 6 upgrade), which runs against fake-indexeddb, an IndexedDB held in
// memory. So they run in Node with no browser and none of the app's Vite
// plugins. JSX is compiled so that a component whose safety is the point,
// such as the one Markdown component (stage 4, T8), can be rendered to a
// string and checked; nothing is drawn in a browser.
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'node',
    // The vault (keys.parliament.ltd, stage 15) has its own tests beside it.
    include: ['src/**/*.test.js', 'vault/**/*.test.js'],
  },
})

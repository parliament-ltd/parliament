import { defineConfig } from 'vitest/config'

// Tests cover pure logic only (parsers, counters, backup migrations), so they
// run in Node with no browser, no React and none of the app's Vite plugins.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
})

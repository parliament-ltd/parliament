// The same tests with the lock on (Lock Parliament): every read and write
// through sealedDb.js. See __fixtures__/sealedHarness.js.
globalThis.__PARLIAMENT_SEALED__ = true
await import('./plans.test.js')

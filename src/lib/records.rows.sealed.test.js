// The same tests with the lock on: every read and write through sealedDb.js
// (Lock Parliament, piece 2). See __fixtures__/sealedHarness.js.
globalThis.__PARLIAMENT_SEALED__ = true
await import('./records.rows.test.js')

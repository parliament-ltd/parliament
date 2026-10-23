import { describe, it, expect } from 'vitest'
import { makePasskey, passkeyBytes, mayOfferPasskeys } from './lockPasskey'
import { LockError } from './lockKeys'

// Passkeys for the lock (stage S4, piece 1; C191), with a passkey maker
// stood in for: a browser's WebAuthn cannot run in tests.

const bytes32 = () => globalThis.crypto.getRandomValues(new Uint8Array(32))
const code = async (p) => { try { await p } catch (e) { return e instanceof LockError ? e.code : `other: ${e.message}` } return 'ok' }

// A stand-in passkey maker: gives PRF bytes for a salt, as `shape` returns them.
function maker({ prf = true, shape = (b) => b.buffer, onlyOnGet = false } = {}) {
  const secret = bytes32()
  const seen = { create: null, get: null }
  const out = async (salt) => {
    const data = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', new Uint8Array([...secret, ...salt])))
    return shape(data)
  }
  return {
    seen,
    async create(options) {
      seen.create = options
      const salt = options.publicKey.extensions.prf.eval.first
      const results = !prf || onlyOnGet ? undefined : { first: await out(salt) }
      return { rawId: new Uint8Array([7, 7, 7]).buffer, getClientExtensionResults: () => ({ prf: { enabled: prf && !onlyOnGet, results } }) }
    },
    async get(options) {
      seen.get = options
      const salts = Object.values(options.publicKey.extensions.prf.evalByCredential)
      const first = prf ? await out(salts[0].first) : null
      return { rawId: new Uint8Array([7, 7, 7]).buffer, getClientExtensionResults: () => ({ prf: prf ? { results: { first } } : {} }) }
    },
  }
}

describe('a passkey for the lock', () => {
  it('is made, then unlocked with at once, and gives the same bytes each time', async () => {
    const m = maker()
    const made = await makePasskey({ name: 'Parliament lock', credentials: m })
    expect(m.seen.create.publicKey.authenticatorSelection.userVerification).toBe('required')
    expect(m.seen.get.publicKey.allowCredentials).toHaveLength(1)
    expect(made.prfBytes).toHaveLength(32)
    const again = await passkeyBytes({ passkeys: [{ credentialId: made.credentialId, prfSalt: made.prfSalt }], credentials: m })
    expect([...again.bytes]).toEqual([...made.prfBytes])
  })

  it('works with makers that give the bytes only on unlock, or as a plain array', async () => {
    expect(await code(makePasskey({ name: 'x', credentials: maker({ onlyOnGet: true }) }))).toBe('ok')
    expect(await code(makePasskey({ name: 'x', credentials: maker({ shape: (b) => [...b] }) }))).toBe('ok')
  })

  it('is refused when its maker cannot give the bytes', async () => {
    expect(await code(makePasskey({ name: 'x', credentials: maker({ prf: false }) }))).toBe('noPrf')
    expect(await code(passkeyBytes({ passkeys: [], credentials: maker() }))).toBe('noPasskey')
  })

  it('is offered unless the browser says it lacks PRF or WebAuthn', async () => {
    const credentials = {}
    expect(await mayOfferPasskeys({ navigator: { credentials } })).toBe(false)
    expect(await mayOfferPasskeys({ navigator: { credentials }, PublicKeyCredential: {} })).toBe(true)
    expect(await mayOfferPasskeys({ navigator: { credentials }, PublicKeyCredential: { getClientCapabilities: async () => ({ 'extension:prf': false }) } })).toBe(false)
    expect(await mayOfferPasskeys({ navigator: { credentials }, PublicKeyCredential: { getClientCapabilities: async () => ({ 'extension:prf': true }) } })).toBe(true)
  })
})

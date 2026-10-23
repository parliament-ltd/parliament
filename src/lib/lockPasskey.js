// Passkeys for Lock Parliament (stage S4, piece 1; C191, ruled 23 October
// 2026; research/lock-parliament-design.md, "Passkeys and PRF").
//
// WebAuthn is used only for the 32 bytes a passkey gives through its PRF
// extension; Web Crypto turns them into a key (lockKeys.js). No server is
// involved: the challenge is random bytes nobody checks, since nothing is
// signed in to and nothing is sent. The passkey belongs to this site's domain.
//
// Whether a passkey can give the bytes depends on its maker, and asking the
// browser cannot tell, so making one always ends by unlocking with it: a
// passkey is kept only when that works. A passkey is an extra way in, never
// the only one.

import { LockError } from './lockKeys'

const random = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n))

// What a passkey's maker returns: an ArrayBuffer, a typed array, or (one
// password manager, reported June 2026) a plain array of numbers.
function asBytes(value) {
  if (!value) return null
  if (value instanceof ArrayBuffer) return new Uint8Array(value)
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
  if (Array.isArray(value) && value.every((n) => Number.isInteger(n) && n >= 0 && n < 256)) return Uint8Array.from(value)
  return null
}

const base64url = (b) => btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

/**
 * Whether to offer a passkey at all: a browser that has WebAuthn and does not
 * say it lacks PRF. Not proof: only unlocking with the passkey is (C191).
 */
export async function mayOfferPasskeys(win = globalThis) {
  const P = win.PublicKeyCredential
  if (!P || !win.navigator?.credentials) return false
  if (typeof P.getClientCapabilities === 'function') {
    try {
      const caps = await P.getClientCapabilities()
      if (caps && caps['extension:prf'] === false) return false
    } catch { /* cannot tell: offer it, and let the test at setup decide */ }
  }
  return true
}

/**
 * The PRF bytes from one of the lock's passkeys, the person choosing which.
 * @param {{ passkeys: Array<{ credentialId: Uint8Array, prfSalt: Uint8Array }>, credentials?: CredentialsContainer }} input
 * @returns {Promise<{ credentialId: Uint8Array, bytes: Uint8Array }>}
 */
export async function passkeyBytes({ passkeys, credentials = globalThis.navigator?.credentials }) {
  if (!passkeys?.length || !credentials) throw new LockError('noPasskey')
  const evalByCredential = {}
  for (const p of passkeys) evalByCredential[base64url(p.credentialId)] = { first: p.prfSalt }
  const assertion = await credentials.get({
    publicKey: {
      challenge: random(32),
      allowCredentials: passkeys.map((p) => ({ type: 'public-key', id: p.credentialId })),
      userVerification: 'required',
      timeout: 120000,
      extensions: { prf: { evalByCredential } },
    },
  })
  if (!assertion) throw new LockError('cancelled')
  const out = asBytes(assertion.getClientExtensionResults?.()?.prf?.results?.first)
  if (!out || out.length !== 32) throw new LockError('noPrf')
  return { credentialId: new Uint8Array(assertion.rawId), bytes: out }
}

/**
 * A new passkey for the lock, tested by unlocking with it at once.
 * @returns {Promise<{ credentialId: Uint8Array, prfSalt: Uint8Array, prfBytes: Uint8Array }>}
 * @throws LockError: cancelled, or noPrf when this passkey cannot unlock Parliament
 */
export async function makePasskey({ name, credentials = globalThis.navigator?.credentials }) {
  if (!credentials) throw new LockError('noPasskey')
  const prfSalt = random(32)
  const created = await credentials.create({
    publicKey: {
      rp: { name: 'Parliament' }, // the site's own domain
      user: { id: random(16), name, displayName: name },
      challenge: random(32),
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
      timeout: 120000,
      extensions: { prf: { eval: { first: prfSalt } } },
    },
  })
  if (!created) throw new LockError('cancelled')
  const credentialId = new Uint8Array(created.rawId)
  // Some makers give the bytes only when unlocking, and some say they cannot
  // when they can: the unlock decides (C191).
  const { bytes } = await passkeyBytes({ passkeys: [{ credentialId, prfSalt }], credentials })
  return { credentialId, prfSalt, prfBytes: bytes }
}

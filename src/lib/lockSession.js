// This tab and the lock (Lock Parliament, stage S4, piece 3; C187 to C192,
// ruled 23 October 2026; research/lock-parliament-design.md).
//
// The lock's state for this tab, and what changes it: unlocking (passphrase,
// recovery code or passkey), setting the lock up, turning it off, and the
// changes that only rewrap the data key. The data key opened here stays in
// this tab: no other tab or window is ever sent it. Each tab, and each
// reload, unlocks for itself (C188).
//
// Order matters where two databases are written: the lock's record is
// written before anything is sealed, and removed only after everything is
// opened again, so a stop at any point leaves data the lock can still open;
// a set-up cut short is finished at the next unlock.

import { withRawDB, setSealKey } from './db'
import { keyDatabase, setSavedKeysLock, sealSavedKeys, openSavedKeys } from './crypto'
import { readLock, writeLock, removeLock } from './keyStore'
import { sealEverything, openEverything } from './sealedDb'
import { tabBus } from './bus'
import * as K from './lockKeys'
import { passkeyBytes, makePasskey } from './lockPasskey'

let key = null
const signal = () => {
  tabBus().post({ type: 'locked' })
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(LOCK_EVENT))
}

// This tab's own word that the lock changed (its idle time, say).
export const LOCK_EVENT = 'parliament-lock'

function holdKey(k) {
  key = k
  setSealKey(k)
  setSavedKeysLock(k)
}

/** The lock's record, or null when there is no lock. */
export async function lockRecord() {
  return readLock(await keyDatabase())
}

/** What Settings and the unlock screen show: never a key or a secret. */
export async function lockStatus() {
  const r = await lockRecord()
  if (!r) return { on: false }
  const passkeys = r.passkeys.map((p) => ({ id: p.credentialId, addedAt: p.addedAt }))
  return { on: true, open: key != null, idle: r.idle, passkeys, createdAt: r.createdAt, finished: r.sealing !== 'started' }
}

/** Whether this tab holds the data key. */
export const unlockedHere = () => key != null

/** Lets go of the data key in this tab; the page then reloads to the unlock screen. */
export function lockHere() {
  holdKey(null)
}

/**
 * Unlock this tab. how: 'passphrase' | 'recovery' | 'passkey'.
 * @throws LockError: wrong, damaged, version, noPasskey, noPrf, cancelled
 */
export async function unlock(how, input, { credentials } = {}) {
  const record = await lockRecord()
  if (!record) return false
  let k
  if (how === 'passphrase') k = await K.unlockWithPassphrase(record, input)
  else if (how === 'recovery') k = await K.unlockWithRecovery(record, input)
  else {
    const got = await passkeyBytes({ passkeys: record.passkeys, credentials })
    k = await K.unlockWithPasskey(record, got.credentialId, got.bytes)
  }
  holdKey(k)
  // A set-up cut short: seal what is still plain, then mark it finished.
  if (record.sealing === 'started') await finishSealing(record, k)
  return true
}

async function finishSealing(record, k) {
  await withRawDB((raw) => sealEverything(raw, k))
  await sealSavedKeys(k)
  await writeLock(await keyDatabase(), { ...record, sealing: 'done' })
}

// ── Setting the lock up ─────────────────────────────────

/**
 * Step one of setup: a lock not yet written, with its recovery code to show.
 * Nothing is stored until turnOn.
 */
export async function prepareLock({ passphrase, idle, iterations }) {
  return K.createLock({ passphrase, idle, iterations })
}

/** Adds a passkey to a prepared lock, tested by unlocking with it (C191). */
export async function addPasskeyToDraft(draft, { name = 'Parliament', credentials } = {}) {
  const open = await K.unlockWithRecovery(draft.record, draft.recoveryCode, { extractable: true })
  const made = await makePasskey({ name, credentials })
  return { ...draft, record: await K.addPasskey(draft.record, open, made) }
}

/**
 * Turns the lock on with a prepared lock: its record first, then everything
 * sealed in one save, the saved keys sealed, and other tabs told to reload.
 */
export async function turnOn(draft) {
  const keyDb = await keyDatabase()
  if (await readLock(keyDb)) throw new K.LockError('version', 'a lock is already on')
  await writeLock(keyDb, { ...draft.record, sealing: 'started' })
  holdKey(draft.key)
  await finishSealing({ ...draft.record, sealing: 'started' }, draft.key)
  signal()
}

/** Whether a passphrase opens the lock (asked before turning it off). Throws LockError('wrong') if not. */
export async function checkPassphrase(passphrase) {
  await K.unlockWithPassphrase(await lockRecord(), passphrase)
  return true
}

/** Turns the lock off: everything opened in one save, then the lock removed. Needs this tab unlocked. */
export async function turnOff() {
  if (!key) throw new K.LockError('wrong', 'locked')
  const k = key
  await withRawDB((raw) => openEverything(raw, k))
  await openSavedKeys(k)
  await removeLock(await keyDatabase())
  holdKey(null)
  signal()
}

// ── Changes that rewrap only the data key ───────────────

async function withOpen(passphrase, change) {
  const keyDb = await keyDatabase()
  const record = await readLock(keyDb)
  if (!record) throw new K.LockError('wrong', 'no lock')
  const open = await K.unlockWithPassphrase(record, passphrase, { extractable: true })
  const out = await change(record, open)
  await writeLock(keyDb, out.record ?? out)
  return out
}

export const changePassphrase = (passphrase, next, opts) => withOpen(passphrase, (r, open) => K.changePassphrase(r, open, next, opts))
export const renewRecoveryCode = (passphrase) => withOpen(passphrase, (r, open) => K.renewRecoveryCode(r, open))
export const addPasskey = (passphrase, { name = 'Parliament', credentials } = {}) =>
  withOpen(passphrase, async (r, open) => K.addPasskey(r, open, await makePasskey({ name, credentials })))

export async function removePasskey(credentialId) {
  const keyDb = await keyDatabase()
  await writeLock(keyDb, K.removePasskey(await readLock(keyDb), credentialId))
}

export async function setIdle(idle) {
  const keyDb = await keyDatabase()
  await writeLock(keyDb, K.setIdle(await readLock(keyDb), idle))
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(LOCK_EVENT))
}

/** How long this tab stays open with nothing done, in milliseconds; null: until the tab closes. */
export function idleMs(idle) {
  return { '15m': 15 * 60e3, '1h': 60 * 60e3, '8h': 8 * 60 * 60e3 }[idle] ?? null
}

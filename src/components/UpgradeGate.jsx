import { useEffect, useState } from 'react'
import { DB_VERSION, DB_STATE_EVENT, initDB, lastUpgradeFailure } from '../lib/db'
import { needsBackupGate, readStoredVersion, buildPreUpgradeBackup } from '../lib/upgradeCheck'
import { downloadBlob } from '../lib/backup'
import { convertFavoritesOnce } from '../lib/favoriteTags'

// Work that runs once per database after it opens, before the app draws:
// old favourites become tagged quotes (C147 (c), ruled 22 October). A
// failure lets the app open as before; it is tried again next time.
const lock = (name, fn) => (navigator.locks?.request ? navigator.locks.request(name, fn) : fn())
async function afterOpen() {
  try {
    const db = await initDB()
    await convertFavoritesOnce(db, { now: new Date().toISOString(), newId: () => crypto.randomUUID(), lock })
  } catch {
    // The heart keeps reading the old favourites until it has run.
  }
}

// Holds the app back before a schema upgrade and offers a backup of the data
// as it is (change plan 0.6). Renders children straight through when no
// upgrade is pending, which is every boot except the first after a release
// that bumps DB_VERSION.
//
// "Update now" runs the upgrade here, and the app opens only once it has
// finished (ruled 19 October). If it fails, the upgrade has rolled itself
// back (schema.js), so the data is still at its old version: this screen
// says so and stays, instead of loading the app on top of a database it
// cannot open. While another tab holds the database open, it says that too.
//
// Styled with the new chrome's values from docs/spec/parliament_almanac_v30.html
// inline, until area 2 lands the shared tokens.
//
// Dev only: add ?upgrade-gate to the URL to see the gate against the current
// database. "Update now" then just continues, since there is nothing to upgrade.

const C = {
  paper: '#FCFCFA', surface: '#FFFFFF', ink: '#191919', ink2: '#787774', ink3: '#9B9A97',
  border: '#E9E9E7',
  sans: '-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif',
  serif: '"Iowan Old Style","Palatino Linotype",Palatino,Georgia,"Times New Roman",serif',
}

const forcePreview = () =>
  import.meta.env.DEV && new URLSearchParams(window.location.search).has('upgrade-gate')

export default function UpgradeGate({ children }) {
  const [state, setState] = useState({ phase: 'checking', stored: 0 })
  const [password, setPassword] = useState('')
  const [saved, setSaved] = useState(null)
  const [error, setError] = useState(null)
  const [working, setWorking] = useState(false)
  const [blocked, setBlocked] = useState(false)

  useEffect(() => {
    const on = (e) => { if (e.detail === 'blocked') setBlocked(true) }
    window.addEventListener(DB_STATE_EVENT, on)
    return () => window.removeEventListener(DB_STATE_EVENT, on)
  }, [])

  useEffect(() => {
    let live = true
    readStoredVersion().then((stored) => {
      if (!live) return
      const pending = needsBackupGate(stored) || (forcePreview() && stored > 0)
      if (pending) { setState({ phase: 'pending', stored }); return }
      afterOpen().then(() => { if (live) setState({ phase: 'clear', stored }) })
    })
    return () => { live = false }
  }, [])

  if (state.phase === 'checking') return null
  if (state.phase === 'clear') return children

  const download = async () => {
    setWorking(true)
    setError(null)
    try {
      const { blob, filename } = await buildPreUpgradeBackup(state.stored, { password: password || null })
      downloadBlob(blob, filename)
      setSaved(filename)
    } catch (e) {
      setError(e?.message || 'The backup could not be made.')
    } finally {
      setWorking(false)
    }
  }

  const proceed = async () => {
    setState((s) => ({ ...s, phase: 'upgrading', failure: null }))
    setBlocked(false)
    try {
      await initDB()
      await afterOpen()
      setState((s) => ({ ...s, phase: 'clear' }))
    } catch (e) {
      // The real reason, where the upgrade recorded one; the open only says it was abandoned.
      const reason = lastUpgradeFailure || e
      setState((s) => ({ ...s, phase: 'failed', failure: reason?.message || String(reason) }))
    }
  }

  const upgrading = state.phase === 'upgrading'
  const failed = state.phase === 'failed'

  const button = (primary) => ({
    font: `500 13px ${C.sans}`, padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
    color: C.ink, background: primary ? C.surface : 'transparent',
    border: `1px solid ${primary ? C.ink3 : C.border}`,
  })

  return (
    <div style={{ minHeight: '100vh', background: C.paper, color: C.ink, font: `400 14px ${C.sans}`, padding: '72px 16px' }}>
      <div style={{ maxWidth: 520, margin: '0 auto', background: C.surface, borderRadius: 16, padding: '28px 28px 24px', boxShadow: '0 1px 2px rgba(40,36,28,.035)' }}>
        <h1 style={{ font: `500 18px ${C.sans}`, margin: 0 }}>
          {failed ? 'The update did not finish' : 'Parliament needs to update how your data is stored'}
        </h1>
        {failed && (
          <p style={{ margin: '12px 0 0', lineHeight: 1.6 }}>
            Nothing was changed: your data is still at version {state.stored}, as it was, and any backup
            you saved is safe. Close other Parliament tabs and try again. What went wrong:{' '}
            <span style={{ font: `italic 400 13px ${C.serif}`, color: C.ink2 }}>{state.failure}</span>
          </p>
        )}
        <p style={{ margin: '12px 0 0', lineHeight: 1.6, color: C.ink2 }}>
          Save a backup of everything as it is now before the update runs. If anything
          goes wrong, the file restores from Settings, under Data and backups.
        </p>

        <label style={{ display: 'block', marginTop: 20, font: `500 12px ${C.sans}`, color: C.ink2 }}>
          Password, optional
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            style={{ display: 'block', width: '100%', marginTop: 6, padding: '8px 10px', font: `400 14px ${C.sans}`, color: C.ink, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, boxSizing: 'border-box' }}
          />
        </label>
        <p style={{ margin: '6px 0 0', font: `italic 400 12px ${C.serif}`, color: C.ink3 }}>
          With a password the file is encrypted. Without one it is plain text, so keep it somewhere private.
        </p>

        <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
          <button type="button" onClick={download} disabled={working} style={button(true)}>
            {working ? 'Saving…' : saved ? 'Save another copy' : 'Save a backup'}
          </button>
          <button type="button" onClick={proceed} disabled={!saved || working || upgrading} style={{ ...button(false), opacity: saved ? 1 : 0.45, cursor: saved ? 'pointer' : 'default' }}>
            {upgrading ? 'Updating…' : failed ? 'Try again' : 'Update now'}
          </button>
        </div>

        <p style={{ margin: '14px 0 0', minHeight: 18, font: `italic 400 12px ${C.serif}`, color: error ? C.ink : C.ink2 }} aria-live="polite">
          {error
            || (upgrading && blocked ? 'Waiting for your other Parliament tabs to close before updating.' : null)
            || (upgrading ? 'Updating your data. This takes a moment.' : null)
            || (saved ? `Saved as ${saved}.` : `Your data is at version ${state.stored}; this release needs version ${DB_VERSION}.`)}
        </p>

        {!saved && !upgrading && (
          <button type="button" onClick={proceed} style={{ marginTop: 8, padding: 0, border: 'none', background: 'none', cursor: 'pointer', font: `italic 400 12px ${C.serif}`, color: C.ink3, textDecoration: 'underline', textUnderlineOffset: 2 }}>
            {failed ? 'Try again without a backup' : 'Update without a backup'}
          </button>
        )}
      </div>
    </div>
  )
}

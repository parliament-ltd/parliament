import { TRIAL_FLAG, TRIAL_DB_NAME, DRAFT_DB_VERSION } from '../lib/db'

// Dev only. Says, on every page, that this tab is running on the trial copy
// of the version 6 upgrade, not on Parliament's own data, and offers the way
// back. Leaving reloads, which closes the copy.

export default function TrialNotice() {
  const leave = () => {
    try {
      sessionStorage.removeItem(TRIAL_FLAG)
    } catch { /* nothing to remove */ }
    window.location.assign('/dev/migration')
  }
  return (
    <div
      role="status"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1001, padding: '6px 16px',
        background: '#191919', color: '#FCFCFA', textAlign: 'center',
        font: 'italic 400 12px "Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif',
      }}
    >
      This tab is running on the trial copy ({TRIAL_DB_NAME}, version {DRAFT_DB_VERSION}), not on your own data.{' '}
      <button
        type="button"
        onClick={leave}
        style={{ font: 'inherit', color: 'inherit', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}
      >
        Leave the copy
      </button>
    </div>
  )
}

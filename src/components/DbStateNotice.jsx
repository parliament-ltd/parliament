import { useEffect, useState } from 'react'
import { useLingui } from '@lingui/react'
import { DB_STATE_EVENT } from '../lib/db'
import { COPY as WORDS } from '../copy'

// Says so when another tab changes the database schema under this one
// (change plan 0.4). Listens for the events initDB() announces.
//
// After Delete everything, here or in another tab (C183), it covers the
// whole page: what is still drawn is gone from the browser, and this tab
// will not open the databases again until it reloads.

const COPY = {
  superseded: 'Parliament was updated in another tab. Reload this tab to keep working.',
  blocked: 'Parliament is waiting for your other Parliament tabs to close before it updates your data.',
}

export default function DbStateNotice() {
  const { i18n } = useLingui()
  const [state, setState] = useState(null)

  useEffect(() => {
    const on = (e) => setState(e.detail)
    window.addEventListener(DB_STATE_EVENT, on)
    return () => window.removeEventListener(DB_STATE_EVENT, on)
  }, [])

  if (state === 'erased' || state === 'erasedHere') {
    return (
      <div
        role="alert"
        style={{
          position: 'fixed', inset: 0, zIndex: 2000, background: '#FCFCFA', color: '#191919',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          font: '400 14px -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif',
        }}
      >
        <div style={{ maxWidth: 440, lineHeight: 1.55 }}>
          <p style={{ margin: '0 0 6px', fontWeight: 600 }}>{i18n._(state === 'erasedHere' ? WORDS.erase.doneHere : WORDS.erase.doneThere)}</p>
          <p style={{ margin: '0 0 14px', color: '#45433F' }}>{i18n._(WORDS.erase.doneNext)}</p>
          <button
            type="button" autoFocus
            onClick={() => window.location.reload()}
            style={{ font: 'inherit', fontWeight: 500, padding: '6px 12px', borderRadius: 8, border: '1px solid #9B9A97', background: '#FFFFFF', color: '#191919', cursor: 'pointer' }}
          >
            {i18n._(WORDS.erase.reload)}
          </button>
        </div>
      </div>
    )
  }
  if (!state || !COPY[state]) return null

  return (
    <div
      role="alert"
      style={{
        position: 'fixed', left: 16, right: 16, bottom: 16, zIndex: 1000,
        maxWidth: 560, margin: '0 auto', padding: '12px 16px', borderRadius: 8,
        background: '#FFFFFF', color: '#191919', border: '1px solid #E9E9E7',
        boxShadow: '0 1px 2px rgba(40,36,28,.035)',
        display: 'flex', alignItems: 'center', gap: 12,
        font: '400 13px -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif',
      }}
    >
      <span style={{ flex: 1 }}>{COPY[state]}</span>
      {state === 'superseded' && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{ font: 'inherit', fontWeight: 500, padding: '6px 12px', borderRadius: 8, border: '1px solid #9B9A97', background: '#FFFFFF', color: '#191919', cursor: 'pointer' }}
        >
          Reload
        </button>
      )}
    </div>
  )
}

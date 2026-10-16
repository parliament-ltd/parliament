// One line of marginalia when a new version of Parliament is waiting.
//
// The service worker holds a new version until the page reloads (registerType
// 'prompt' in vite.config.js). Without this line an open tab could stay on an
// old version indefinitely, security fixes included (plan stage 1, A11).
// Ink, not gold: it is news, not the live action.
import { usePWA } from '../stores/PWAContext'

const MARG = {
  font: 'italic 400 12px "Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif',
  color: 'rgba(25,25,25,.62)',
}

const LINK = {
  font: 'inherit', color: '#191919', background: 'none', border: 'none', padding: 0,
  cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2,
}

export default function UpdateNotice() {
  const { needsUpdate, applyUpdate, dismissUpdate } = usePWA()
  if (!needsUpdate) return null

  return (
    <div
      role="status"
      style={{
        ...MARG,
        position: 'fixed', left: 16, bottom: 12, zIndex: 999,
        display: 'flex', alignItems: 'baseline', gap: 6,
        padding: '4px 10px', borderRadius: 8, background: 'rgba(252,252,250,.92)',
      }}
    >
      <span>A new version of Parliament is ready</span>
      <span aria-hidden="true" style={{ opacity: 0.4 }}>·</span>
      <button type="button" style={LINK} onClick={applyUpdate}>reload</button>
      <span aria-hidden="true" style={{ opacity: 0.4 }}>·</span>
      <button type="button" style={LINK} onClick={dismissUpdate}>later</button>
    </div>
  )
}

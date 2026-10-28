// One line of marginalia when a new version of Parliament is waiting.
//
// The service worker holds a new version until the page reloads (registerType
// 'prompt' in vite.config.js). Without this line an open tab could stay on an
// old version indefinitely, security fixes included (plan stage 1, A11).
// Ink, not gold: it is news, not the live action.
//
// Above it, the first lines of the new version's changelog entry (stage 15,
// piece 5; C272 (g)), fetched from /changelog.json, which the service worker
// does not keep, so it is the waiting version's, not this one's. Shown as text.
import { useEffect, useState } from 'react'
import { usePWA } from '../stores/PWAContext'
import { noticeLines } from '../lib/changelog'
import { waitingVersionNotes } from '../net'

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
  const [news, setNews] = useState(null)
  useEffect(() => {
    if (!needsUpdate) return undefined
    let live = true
    waitingVersionNotes().then((entry) => { if (live) setNews(noticeLines(entry)) }, () => {})
    return () => { live = false }
  }, [needsUpdate])
  if (!needsUpdate) return null

  return (
    <div
      role="status"
      style={{
        ...MARG,
        position: 'fixed', left: 16, bottom: 12, zIndex: 999,
        display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 6, maxWidth: 'min(520px, calc(100vw - 32px))',
        padding: '4px 10px', borderRadius: 8, background: 'rgba(252,252,250,.92)',
      }}
    >
      {news && (
        <ul style={{ flexBasis: '100%', margin: '0 0 4px', paddingInlineStart: 16 }}>
          {news.lines.map((line) => <li key={line}>{line}</li>)}
          {news.more && <li style={{ listStyle: 'none' }}>…</li>}
        </ul>
      )}
      <span>A new version of Parliament is ready</span>
      <span aria-hidden="true" style={{ opacity: 0.4 }}>·</span>
      <button type="button" style={LINK} onClick={applyUpdate}>reload</button>
      <span aria-hidden="true" style={{ opacity: 0.4 }}>·</span>
      <button type="button" style={LINK} onClick={dismissUpdate}>later</button>
    </div>
  )
}

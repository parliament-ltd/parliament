// HomepageView (PR-6) — `/` route.
//
// Loads the user's homepage mode from IndexedDB and renders it via
// <RoomShell>. The seeded `home_default` mode mounts four sections —
// blueprint, chats, library, favorites — into the stacked-sections
// layout's `section-slot`. Above the layout sits HomepageTopBar with
// Edit homepage / + Build a room / Backup & Restore placeholders.
//
// First-run onboarding (no API key, tour not run) still routes the user
// to /settings — preserved from the V1 SelectorView. The legacy V1
// chat selector continues to live at `/chats` for users who prefer the
// table view.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import RoomShell from '../components/RoomShell'
import HomepageTopBar from '../components/HomepageTopBar'
import BackupReminderBanner from '../components/BackupReminderBanner'
import { loadHomepageMode } from '../lib/modes'
import { loadApiKey } from '../lib/crypto'
import { getSetting } from '../lib/db'

export default function HomepageView() {
  const navigate = useNavigate()
  const [mode, setMode] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function init() {
      // Onboarding gate matches the V1 SelectorView behavior: no key +
      // no tour completion → bounce to /settings.
      const [apiKey, tourDone] = await Promise.all([
        loadApiKey('persistent'),
        getSetting('tourCompleted_settings'),
      ])
      if (cancelled) return
      if (!apiKey && !tourDone) {
        navigate('/settings', { replace: true })
        return
      }

      const home = await loadHomepageMode()
      if (cancelled) return
      setMode(home)
      setReady(true)
    }
    init()
    return () => { cancelled = true }
  }, [navigate])

  if (!ready) return null

  return (
    <div className="min-h-screen bg-[var(--p-bg-base)]">
      <HomepageTopBar />
      <div className="max-w-[1100px] mx-auto px-5 pt-6">
        <BackupReminderBanner />
      </div>
      {mode ? (
        <RoomShell mode={mode} />
      ) : (
        <div className="max-w-3xl mx-auto px-6 py-12 text-sm text-[var(--p-text-secondary)]">
          No homepage mode found. The seed should have created one — try
          reloading. If the issue persists, check that IndexedDB is at
          schema v4.
        </div>
      )}
    </div>
  )
}

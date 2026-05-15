// HomepageView (PR-6) — `/` route, framed as **The Study** (PR-19e).
//
// Loads the homepage mode from IndexedDB and renders it via
// <RoomShell>. The seeded `home_default` mode mounts four sections —
// blueprint, chats, library, favorites — into the stacked-sections
// layout's `section-slot`. Above the layout sits HomepageTopBar
// labelled "The Study" with Wrench (Lab) + Wand2 (Wizard) entry icons.
//
// First-run onboarding (PR-13): a user with no API key who has never
// completed the build wizard lands on `/build` instead of the homepage.
// The wizard collects their key in the Ignition step, flips the
// `tourCompleted_wizard` settings flag at completion, and then routes
// them into their first room. Returning users with no key (i.e. they
// cleared it) but a completed wizard fall through to /settings — that's
// the recovery path. Users who completed both — or who have a key —
// see the homepage.

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
      const [apiKey, wizardDone, tourDone] = await Promise.all([
        loadApiKey('persistent'),
        getSetting('tourCompleted_wizard'),
        getSetting('tourCompleted_settings'),
      ])
      if (cancelled) return
      if (!apiKey && !wizardDone) {
        // Brand new visitor — straight to the wizard, which collects
        // the API key in Ignition (step 6) and flips
        // `tourCompleted_wizard` on completion.
        navigate('/build', { replace: true })
        return
      }
      if (!apiKey && !tourDone) {
        // Returning user who cleared their key (or whose key was
        // revoked). Wizard is already done — route to settings so
        // they can paste a fresh key without going through the
        // wizard again.
        navigate('/settings', { replace: true })
        return
      }

      const home = await loadHomepageMode()
      if (cancelled) return
      setMode(home)
      setReady(true)
    }
    init()

    // Listen for in-page mutations of the homepage mode (PR-14: section
    // drag-reorder writes new order back to IndexedDB and emits this
    // event). Re-fetching the mode is enough — RoomShell rebuilds the
    // section list from the new `components` order.
    const onModeChanged = async () => {
      const home = await loadHomepageMode()
      if (!cancelled) setMode(home)
    }
    window.addEventListener('homepage-mode-changed', onModeChanged)

    return () => {
      cancelled = true
      window.removeEventListener('homepage-mode-changed', onModeChanged)
    }
  }, [navigate])

  if (!ready) return null

  return (
    <div className="min-h-screen bg-[var(--p-bg-base)]">
      <HomepageTopBar breadcrumb="The Study" />
      <div className="max-w-[1100px] mx-auto px-5 pt-6">
        <BackupReminderBanner />
      </div>
      {mode ? (
        <RoomShell mode={mode} />
      ) : (
        <div className="max-w-3xl mx-auto px-6 py-12 text-sm text-[var(--p-text-secondary)]">
          No Study mode found. The seed should have created one — try
          reloading. If the issue persists, check that IndexedDB is at
          schema v4.
        </div>
      )}
    </div>
  )
}

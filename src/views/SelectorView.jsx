import { lazy, Suspense, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMode } from '../stores/ModeContext'
import { loadApiKey } from '../lib/crypto'
import { getSetting } from '../lib/db'

/**
 * SelectorView — thin mode-routing shell.
 * Lazy-loads the adapter matching the current mode.
 */
const AlbatrossSelectorLayout     = lazy(() => import('../adapters/albatross/SelectorLayout'))
const SwiftSelectorLayout         = lazy(() => import('../adapters/swift/SelectorLayout'))
const KingfisherSelectorLayout    = lazy(() => import('../adapters/kingfisher/SelectorLayout'))
const SecretarybirdSelectorLayout = lazy(() => import('../adapters/secretarybird/SelectorLayout'))
const StarlingSelectorLayout      = lazy(() => import('../adapters/starling/SelectorLayout'))
const PelicanSelectorLayout       = lazy(() => import('../adapters/pelican/SelectorLayout'))

const LAYOUTS = {
  swift:         SwiftSelectorLayout,
  kingfisher:    KingfisherSelectorLayout,
  secretarybird: SecretarybirdSelectorLayout,
  starling:      StarlingSelectorLayout,
  pelican:       PelicanSelectorLayout,
}

export default function SelectorView() {
  const { mode } = useMode()
  const navigate = useNavigate()
  const [onboardingChecked, setOnboardingChecked] = useState(false)

  // First-time onboarding: if no API key and tour hasn't run, send user to Settings.
  useEffect(() => {
    let cancelled = false
    async function check() {
      const [apiKey, tourDone] = await Promise.all([
        loadApiKey('persistent'),
        getSetting('tourCompleted_settings'),
      ])
      if (cancelled) return
      if (!apiKey && !tourDone) {
        navigate('/settings', { replace: true })
        return
      }
      setOnboardingChecked(true)
    }
    check()
    return () => { cancelled = true }
  }, [navigate])

  if (!onboardingChecked) return null

  const Layout = LAYOUTS[mode] ?? AlbatrossSelectorLayout
  return (
    <Suspense fallback={null}>
      <Layout />
    </Suspense>
  )
}

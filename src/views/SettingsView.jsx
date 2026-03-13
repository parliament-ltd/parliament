import { lazy, Suspense } from 'react'
import { useMode } from '../stores/ModeContext'

/**
 * SettingsView — thin mode-routing shell.
 * Lazy-loads the adapter matching the current mode.
 */
const AlbatrossSettingsLayout     = lazy(() => import('../adapters/albatross/SettingsLayout'))
const SwiftSettingsLayout         = lazy(() => import('../adapters/swift/SettingsLayout'))
const KingfisherSettingsLayout    = lazy(() => import('../adapters/kingfisher/SettingsLayout'))
const SecretarybirdSettingsLayout = lazy(() => import('../adapters/secretarybird/SettingsLayout'))
const StarlingSettingsLayout      = lazy(() => import('../adapters/starling/SettingsLayout'))

const LAYOUTS = {
  swift:         SwiftSettingsLayout,
  kingfisher:    KingfisherSettingsLayout,
  secretarybird: SecretarybirdSettingsLayout,
  starling:      StarlingSettingsLayout,
}

export default function SettingsView() {
  const { mode } = useMode()
  const Layout = LAYOUTS[mode] ?? AlbatrossSettingsLayout
  return (
    <Suspense fallback={null}>
      <Layout />
    </Suspense>
  )
}

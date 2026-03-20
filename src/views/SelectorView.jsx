import { lazy, Suspense } from 'react'
import { useMode } from '../stores/ModeContext'

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
  const Layout = LAYOUTS[mode] ?? AlbatrossSelectorLayout
  return (
    <Suspense fallback={null}>
      <Layout />
    </Suspense>
  )
}

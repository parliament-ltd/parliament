import { lazy, Suspense } from 'react'
import { useMode } from '../stores/ModeContext'

/**
 * ChatView — thin mode-routing shell.
 * Lazy-loads the adapter matching the current mode.
 */
const AlbatrossChatLayout     = lazy(() => import('../adapters/albatross/ChatLayout'))
const SwiftChatLayout         = lazy(() => import('../adapters/swift/ChatLayout'))
const KingfisherChatLayout    = lazy(() => import('../adapters/kingfisher/ChatLayout'))
const SecretarybirdChatLayout = lazy(() => import('../adapters/secretarybird/ChatLayout'))
const StarlingChatLayout      = lazy(() => import('../adapters/starling/ChatLayout'))
const PelicanChatLayout       = lazy(() => import('../adapters/pelican/ChatLayout'))

const LAYOUTS = {
  swift:         SwiftChatLayout,
  kingfisher:    KingfisherChatLayout,
  secretarybird: SecretarybirdChatLayout,
  starling:      StarlingChatLayout,
  pelican:       PelicanChatLayout,
}

export default function ChatView() {
  const { mode } = useMode()
  const Layout = LAYOUTS[mode] ?? AlbatrossChatLayout
  return (
    <Suspense fallback={null}>
      <Layout />
    </Suspense>
  )
}

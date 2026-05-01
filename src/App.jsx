import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { ModeProvider } from './stores/ModeContext'
import { SettingsProvider } from './stores/SettingsContext'
import { ConversationProvider } from './stores/ConversationContext'
import { ChatProvider } from './stores/ChatContext'
import { AnnotationsProvider } from './stores/AnnotationsContext'
import { BranchPanelProvider } from './stores/BranchPanelContext'
import { CollabModeProvider } from './stores/CollabModeContext'
import BranchShortcutHandler from './components/BranchShortcutHandler'
import { PWAProvider } from './stores/PWAContext'
import { BackupProvider } from './stores/BackupContext'
import ChatView from './views/ChatView'
import SelectorView from './views/SelectorView'
import SettingsView from './views/SettingsView'
import HomepageView from './views/HomepageView'
import EditorView from './views/EditorView'
import BuildView from './views/BuildView'
import ErrorBoundary from './components/ErrorBoundary'

// Dev-only catalog inspection surface (PR-2). Lazy-imported and registered
// only when import.meta.env.DEV is true so production builds don't ship the
// chunk or expose the route.
const CatalogDebugView = import.meta.env.DEV
  ? lazy(() => import('./views/CatalogDebugView'))
  : null

export default function App() {
  return (
    <ErrorBoundary>
      {/* MotionConfig with reducedMotion="user" makes Framer Motion respect
          the OS-level prefers-reduced-motion preference for every motion
          component below. Springs and tween transitions collapse to instant
          state changes when the user has Reduce motion enabled. CSS keyframe
          animations are handled separately in index.css. */}
      <MotionConfig reducedMotion="user">
      {/* PWAProvider must sit outside BrowserRouter so the SW registers
          before any route renders, and so the install / update banners
          can be consumed by any view without prop-drilling. */}
      <PWAProvider>
        <ModeProvider>
          <SettingsProvider>
            <ConversationProvider>
              <ChatProvider>
                <AnnotationsProvider>
                <BranchPanelProvider>
                <CollabModeProvider>
                <BrowserRouter>
                  <BackupProvider>
                  <BranchShortcutHandler />
                  <Routes>
                    <Route path="/" element={<ErrorBoundary inline><HomepageView /></ErrorBoundary>} />
                    <Route path="/chats" element={<ErrorBoundary inline><SelectorView /></ErrorBoundary>} />
                    <Route path="/chat/:id" element={<ErrorBoundary inline><ChatView /></ErrorBoundary>} />
                    <Route path="/settings" element={<ErrorBoundary inline><SettingsView /></ErrorBoundary>} />
                    <Route path="/edit/:roomId" element={<ErrorBoundary inline><EditorView scope="room" /></ErrorBoundary>} />
                    <Route path="/edit-home" element={<ErrorBoundary inline><EditorView scope="homepage" /></ErrorBoundary>} />
                    <Route path="/build" element={<ErrorBoundary inline><BuildView /></ErrorBoundary>} />
                    {CatalogDebugView && (
                      <Route
                        path="/catalog"
                        element={
                          <ErrorBoundary inline>
                            <Suspense fallback={null}>
                              <CatalogDebugView />
                            </Suspense>
                          </ErrorBoundary>
                        }
                      />
                    )}
                  </Routes>
                  </BackupProvider>
                </BrowserRouter>
                </CollabModeProvider>
                </BranchPanelProvider>
                </AnnotationsProvider>
              </ChatProvider>
            </ConversationProvider>
          </SettingsProvider>
        </ModeProvider>
      </PWAProvider>
      </MotionConfig>
    </ErrorBoundary>
  )
}

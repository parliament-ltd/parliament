import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ModeProvider } from './stores/ModeContext'
import { SettingsProvider } from './stores/SettingsContext'
import { ConversationProvider } from './stores/ConversationContext'
import { ChatProvider } from './stores/ChatContext'
import { PWAProvider } from './stores/PWAContext'
import ChatView from './views/ChatView'
import SelectorView from './views/SelectorView'
import SettingsView from './views/SettingsView'
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
      {/* PWAProvider must sit outside BrowserRouter so the SW registers
          before any route renders, and so the install / update banners
          can be consumed by any view without prop-drilling. */}
      <PWAProvider>
        <ModeProvider>
          <SettingsProvider>
            <ConversationProvider>
              <ChatProvider>
                <BrowserRouter>
                  <Routes>
                    <Route path="/" element={<ErrorBoundary inline><SelectorView /></ErrorBoundary>} />
                    <Route path="/chat/:id" element={<ErrorBoundary inline><ChatView /></ErrorBoundary>} />
                    <Route path="/settings" element={<ErrorBoundary inline><SettingsView /></ErrorBoundary>} />
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
                </BrowserRouter>
              </ChatProvider>
            </ConversationProvider>
          </SettingsProvider>
        </ModeProvider>
      </PWAProvider>
    </ErrorBoundary>
  )
}

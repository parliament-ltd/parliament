import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { SettingsProvider } from './stores/SettingsContext'
import { ConversationProvider } from './stores/ConversationContext'
import { ChatProvider } from './stores/ChatContext'
import { AnnotationsProvider } from './stores/AnnotationsContext'
import { BranchPanelProvider } from './stores/BranchPanelContext'
import { CollabModeProvider } from './stores/CollabModeContext'
import { FileShelfProvider } from './stores/FileShelfContext'
import { DocumentProvider } from './stores/DocumentContext'
import BranchShortcutHandler from './components/BranchShortcutHandler'
import BlueprintOverlay from './components/BlueprintOverlay'
import { PWAProvider } from './stores/PWAContext'
import { BackupProvider } from './stores/BackupContext'
import ChatView from './views/ChatView'
import SelectorView from './views/SelectorView'
import SettingsView from './views/SettingsView'
import HomepageView from './views/HomepageView'
import EditorView from './views/EditorView'
import BuildView from './views/BuildView'
import ErrorBoundary from './components/ErrorBoundary'
import DbStateNotice from './components/DbStateNotice'
import UpdateNotice from './components/UpdateNotice'
import { isTrialDb } from './lib/db'

// Dev-only catalog inspection surface (PR-2). Lazy-imported and registered
// only when import.meta.env.DEV is true so production builds don't ship the
// chunk or expose the route.
// Dev-only migration dry run (change-plan.md 1.6). Reads, never writes.
const MigrationPreview = import.meta.env.DEV
  ? lazy(() => import('./views/MigrationPreview'))
  : null

const CatalogDebugView = import.meta.env.DEV
  ? lazy(() => import('./views/CatalogDebugView'))
  : null

// Throwaway stage 3 prototype: popping the bar into its own window. In
// development, or in a production build made with VITE_PROTOTYPES=1 so it
// can be tried under the real headers. Never in an ordinary build.
const PopoutPrototype = import.meta.env.DEV || import.meta.env.VITE_PROTOTYPES === '1'
  ? lazy(() => import('./views/PopoutPrototype'))
  : null

// The new shell (stage 3), beside today's screens until they are replaced:
// in development, or in a build made with VITE_PROTOTYPES=1.
const Shell = import.meta.env.DEV || import.meta.env.VITE_PROTOTYPES === '1'
  ? lazy(() => import('./chrome/Shell'))
  : null

// Dev only: the token sheet, drawn for approval (stage 3, C51).
const TokenSheet = import.meta.env.DEV
  ? lazy(() => import('./views/TokenSheet'))
  : null

// Dev only: the line saying this tab runs on the version 6 trial copy.
const TrialNotice = import.meta.env.DEV && isTrialDb()
  ? lazy(() => import('./components/TrialNotice'))
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
        <SettingsProvider>
          <ConversationProvider>
            <ChatProvider>
              <AnnotationsProvider>
              <BranchPanelProvider>
              <CollabModeProvider>
              <FileShelfProvider>
              <DocumentProvider>
              <BrowserRouter>
                <BackupProvider>
                <BranchShortcutHandler />
                <BlueprintOverlay />
                <DbStateNotice />
                <UpdateNotice />
                {TrialNotice && <Suspense fallback={null}><TrialNotice /></Suspense>}
                <Routes>
                  <Route path="/" element={<ErrorBoundary inline><HomepageView /></ErrorBoundary>} />
                  <Route path="/chats" element={<ErrorBoundary inline><SelectorView /></ErrorBoundary>} />
                  <Route path="/chat/:id" element={<ErrorBoundary inline><ChatView /></ErrorBoundary>} />
                  <Route path="/settings" element={<ErrorBoundary inline><SettingsView /></ErrorBoundary>} />
                  <Route path="/edit" element={<ErrorBoundary inline><EditorView scope="room" blank /></ErrorBoundary>} />
                  <Route path="/edit/:roomId" element={<ErrorBoundary inline><EditorView scope="room" /></ErrorBoundary>} />
                  <Route path="/edit-home" element={<ErrorBoundary inline><EditorView scope="homepage" /></ErrorBoundary>} />
                  <Route path="/build" element={<ErrorBoundary inline><BuildView /></ErrorBoundary>} />
                  {MigrationPreview && (
                    <Route
                      path="/dev/migration"
                      element={
                        <ErrorBoundary inline>
                          <Suspense fallback={null}>
                            <MigrationPreview />
                          </Suspense>
                        </ErrorBoundary>
                      }
                    />
                  )}
                  {Shell && (
                    <Route
                      path="/shell"
                      element={
                        <ErrorBoundary inline>
                          <Suspense fallback={null}>
                            <Shell />
                          </Suspense>
                        </ErrorBoundary>
                      }
                    />
                  )}
                  {TokenSheet && (
                    <Route
                      path="/dev/tokens"
                      element={
                        <ErrorBoundary inline>
                          <Suspense fallback={null}>
                            <TokenSheet />
                          </Suspense>
                        </ErrorBoundary>
                      }
                    />
                  )}
                  {PopoutPrototype && (
                    <Route
                      path="/dev/popout"
                      element={
                        <ErrorBoundary inline>
                          <Suspense fallback={null}>
                            <PopoutPrototype />
                          </Suspense>
                        </ErrorBoundary>
                      }
                    />
                  )}
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
              </DocumentProvider>
              </FileShelfProvider>
              </CollabModeProvider>
              </BranchPanelProvider>
              </AnnotationsProvider>
            </ChatProvider>
          </ConversationProvider>
        </SettingsProvider>
      </PWAProvider>
      </MotionConfig>
    </ErrorBoundary>
  )
}

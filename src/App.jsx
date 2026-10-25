import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
import { PWAProvider } from './stores/PWAContext'
import { BackupProvider } from './stores/BackupContext'
import ChatView from './views/ChatView'
import EditorView from './views/EditorView'
import BuildView from './views/BuildView'
import ErrorBoundary from './components/ErrorBoundary'
import DbStateNotice from './components/DbStateNotice'
import InterfaceLanguage from './components/InterfaceLanguage'
import UpdateNotice from './components/UpdateNotice'
import ReplyStoppedNotice from './components/ReplyStoppedNotice'
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

// Throwaway stage 11 spike: editing in place on ProseMirror (C205). The same
// gate: development, or a build made with VITE_PROTOTYPES=1. Never in an
// ordinary build, so ProseMirror is not in the app until it is chosen.
const EditingSpike = import.meta.env.DEV || import.meta.env.VITE_PROTOTYPES === '1'
  ? lazy(() => import('./views/EditingSpike'))
  : null

// The new shell is the app at / (stage 6 checkpoint, 22 October): the welcome
// page for someone new, Records and the Collection for someone with work
// (C118, C125). The old homepage, /chats and /edit-home are retired (R3, R4,
// R11) and lead here.
const Shell = lazy(() => import('./chrome/Shell'))

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
                <DbStateNotice />
                <InterfaceLanguage />
                <UpdateNotice />
                <ReplyStoppedNotice />
                {TrialNotice && <Suspense fallback={null}><TrialNotice /></Suspense>}
                <Routes>
                  <Route
                    path="/"
                    element={
                      <ErrorBoundary inline>
                        <Suspense fallback={null}>
                          <Shell />
                        </Suspense>
                      </ErrorBoundary>
                    }
                  />
                  <Route path="/chats" element={<Navigate to="/" replace />} />
                  <Route path="/shell" element={<Navigate to="/" replace />} />
                  <Route path="/chat/:id" element={<ErrorBoundary inline><ChatView /></ErrorBoundary>} />
                  {/* The old Settings page is retired (R37): its address opens the Settings board. */}
                  <Route path="/settings" element={<Navigate to="/" replace state={{ open: 'settings' }} />} />
                  <Route path="/edit" element={<ErrorBoundary inline><EditorView scope="room" blank /></ErrorBoundary>} />
                  <Route path="/edit/:roomId" element={<ErrorBoundary inline><EditorView scope="room" /></ErrorBoundary>} />
                  <Route path="/edit-home" element={<Navigate to="/" replace />} />
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
                  {EditingSpike && (
                    <Route
                      path="/dev/editing"
                      element={
                        <ErrorBoundary inline>
                          <Suspense fallback={null}>
                            <EditingSpike />
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

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ModeProvider } from './stores/ModeContext'
import { SettingsProvider } from './stores/SettingsContext'
import { ConversationProvider } from './stores/ConversationContext'
import { ChatProvider } from './stores/ChatContext'
import ChatView from './views/ChatView'
import SelectorView from './views/SelectorView'
import SettingsView from './views/SettingsView'
import ErrorBoundary from './components/ErrorBoundary'

export default function App() {
  return (
    <ErrorBoundary>
      <ModeProvider>
        <SettingsProvider>
          <ConversationProvider>
            <ChatProvider>
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<ErrorBoundary inline><SelectorView /></ErrorBoundary>} />
                  <Route path="/chat/:id" element={<ErrorBoundary inline><ChatView /></ErrorBoundary>} />
                  <Route path="/settings" element={<ErrorBoundary inline><SettingsView /></ErrorBoundary>} />
                </Routes>
              </BrowserRouter>
            </ChatProvider>
          </ConversationProvider>
        </SettingsProvider>
      </ModeProvider>
    </ErrorBoundary>
  )
}

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ModeProvider } from './stores/ModeContext'
import { SettingsProvider } from './stores/SettingsContext'
import { ConversationProvider } from './stores/ConversationContext'
import { ChatProvider } from './stores/ChatContext'
import ChatView from './views/ChatView'
import SelectorView from './views/SelectorView'
import SettingsView from './views/SettingsView'

export default function App() {
  return (
    <ModeProvider>
      <SettingsProvider>
        <ConversationProvider>
          <ChatProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<SelectorView />} />
                <Route path="/chat/:id" element={<ChatView />} />
                <Route path="/settings" element={<SettingsView />} />
              </Routes>
            </BrowserRouter>
          </ChatProvider>
        </ConversationProvider>
      </SettingsProvider>
    </ModeProvider>
  )
}
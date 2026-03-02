import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ChatView from './views/ChatView'
import SelectorView from './views/SelectorView'
import SettingsView from './views/SettingsView'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SelectorView />} />
        <Route path="/chat/:id" element={<ChatView />} />
        <Route path="/settings" element={<SettingsView />} />
      </Routes>
    </BrowserRouter>
  )
}
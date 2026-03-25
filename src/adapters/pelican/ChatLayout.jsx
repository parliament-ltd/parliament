import { useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Database } from 'lucide-react'
import { PelicanProvider, usePelican } from '../../stores/PelicanContext'
import { useChat } from '../../stores/ChatContext'
import { useConversations } from '../../stores/ConversationContext'
import { useSettings } from '../../stores/SettingsContext'
import { getProvider } from '../../providers'
import { loadApiKey } from '../../lib/crypto'
import { SPRING_SMOOTH } from '../../lib/constants'
import FileShelf from './components/FileShelf'
import DataCanvas from './components/DataCanvas'
import InspectorPanel from './components/InspectorPanel'

/**
 * Pelican ChatLayout — three-panel data analysis workspace.
 *
 * Layout:
 *   Left  (260px)     — FileShelf: staged files, filters, quick actions
 *   Center (flex)     — DataCanvas: chart / table / summary with toolbar
 *   Right  (380px, collapsible) — InspectorPanel: schema + compact chat
 *
 * State ownership:
 *   PelicanContext — file staging, canvas view, inspector, table sort
 *   ChatContext    — messages, streaming, sendMessage (shared with Albatross)
 */
export default function PelicanChatLayout() {
  return (
    <PelicanProvider>
      <PelicanChatInner />
    </PelicanProvider>
  )
}

function PelicanChatInner() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { loadFiles } = usePelican()
  const { loadMessages } = useChat()
  const { conversations } = useConversations()
  const { settings } = useSettings()

  // Load files + messages when conversation changes
  useEffect(() => {
    if (!id) return
    loadFiles(id)
    loadMessages(id)
  }, [id, loadFiles, loadMessages])

  // Derive context health from ChatContext token usage
  const { tokenUsage } = useChat()
  const provider = getProvider('anthropic')
  const models = provider.getModels()
  const modelInfo = models.find(m => m.id === settings.defaultModel) || models[0]
  const contextUsage = modelInfo.contextWindow > 0
    ? Math.min(Math.round(((tokenUsage.input + tokenUsage.output) / modelInfo.contextWindow) * 100), 100)
    : 0
  const contextThreshold = settings.contextThreshold || 80

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={SPRING_SMOOTH}
      className="flex h-screen text-[#191919] overflow-hidden bg-white"
    >
      {/* Left: File Shelf */}
      <FileShelf conversationId={id} onNavigateBack={() => navigate('/')} />

      {/* Center: Data Canvas */}
      <DataCanvas
        conversationId={id}
        contextUsage={contextUsage}
        contextThreshold={contextThreshold}
      />

      {/* Right: Inspector + Chat */}
      <InspectorPanel
        conversationId={id}
        contextUsage={contextUsage}
        contextThreshold={contextThreshold}
      />
    </motion.div>
  )
}

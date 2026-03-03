import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Settings, Plus, MessageSquare } from 'lucide-react'
import { useConversations } from '../stores/ConversationContext'
import { useSettings } from '../stores/SettingsContext'
import { Button, IconButton } from '../components'

const SPRING_SMOOTH = { type: 'spring', stiffness: 300, damping: 28 }

export default function SelectorView() {
  const navigate = useNavigate()
  const { conversations, loaded, createNewConversation } = useConversations()
  const { settings, storageUsage } = useSettings()

  const storagePercent = storageUsage.quota > 0
    ? Math.round((storageUsage.usage / storageUsage.quota) * 100)
    : 0
  const storageWarning = storagePercent >= 80

  const handleNewChat = async () => {
    const conv = await createNewConversation({ model: settings.defaultModel })
    navigate(`/chat/${conv.id}`)
  }

  if (!loaded) {
    return (
      <div className="h-screen flex items-center justify-center font-sans text-[#6B7C93]">
        <p className="text-sm">Loading...</p>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col font-sans text-[#1E2532]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0F0F0]">
        <h1 className="text-lg font-semibold">Chats</h1>
        <div className="flex items-center gap-2">
          <Button icon={Plus} size="sm" onClick={handleNewChat}>
            New Chat
          </Button>
          <IconButton icon={Settings} onClick={() => navigate('/settings')} title="Settings" />
        </div>
      </div>

      {/* Storage Warning */}
      {storageWarning && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className={`px-6 py-2.5 text-xs font-semibold ${
            storagePercent >= 95
              ? 'bg-[#EF4444]/10 text-[#EF4444]'
              : 'bg-[#E5A620]/10 text-[#E5A620]'
          }`}
        >
          {storagePercent >= 95
            ? 'Storage is nearly full. Export and delete old conversations to free space.'
            : 'Storage is getting full. Consider exporting old conversations.'}
        </motion.div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <MessageSquare className="w-8 h-8 text-[#D5D5D5] mb-3" />
            <p className="text-sm text-[#6B7C93] mb-1">No conversations yet</p>
            <p className="text-xs text-[#D5D5D5]">Start a new chat to begin</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F0F0F0]">
            {conversations.map((conv) => (
              <motion.button
                key={conv.id}
                whileHover={{ backgroundColor: '#FAFAFA' }}
                transition={SPRING_SMOOTH}
                onClick={() => navigate(`/chat/${conv.id}`)}
                className="w-full text-left px-6 py-4 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#1E2532] truncate">{conv.title}</h3>
                  <span className="text-[10px] text-[#D5D5D5] flex-shrink-0 ml-4">
                    {new Date(conv.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                {conv.parentId && (
                  <span className="text-[10px] text-[#6B7C93] mt-0.5 inline-block">Branch</span>
                )}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
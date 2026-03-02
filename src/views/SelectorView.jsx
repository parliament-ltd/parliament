import { useNavigate } from 'react-router-dom'
import { Settings } from 'lucide-react'

export default function SelectorView() {
  const navigate = useNavigate()

  return (
    <div className="h-screen flex flex-col items-center justify-center font-sans text-[#1E2532]">
      <h1 className="text-lg font-semibold mb-2">Chats</h1>
      <p className="text-sm text-[#6B7C93] mb-6">No conversations yet.</p>
      <div className="flex gap-3">
        <button
          onClick={() => navigate('/chat/demo')}
          className="px-4 py-2.5 rounded-lg text-xs font-semibold border border-[#EBEBEB] bg-white hover:border-[#4A7AE5] transition-colors"
        >
          New Chat
        </button>
        <button
          onClick={() => navigate('/settings')}
          className="p-2.5 rounded-lg border border-[#EBEBEB] bg-white hover:border-[#4A7AE5] transition-colors"
        >
          <Settings className="w-4 h-4 text-[#6B7C93]" />
        </button>
      </div>
    </div>
  )
}
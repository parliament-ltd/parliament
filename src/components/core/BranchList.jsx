import { motion } from 'framer-motion'
import { GitBranch } from 'lucide-react'

/**
 * Renders the branch navigation list for the current conversation.
 * Shows parent link (if applicable), current branch, and child branches.
 */
export default function BranchList({
  branches = [],
  currentConversation,
  messageCount = 0,
  onNavigate,
}) {
  return (
    <div className="space-y-2">
      {currentConversation?.parentId && (
        <BranchItem
          label="← Parent conversation"
          messages={0}
          onClick={() => onNavigate(currentConversation.parentId)}
        />
      )}
      <BranchItem
        label={
          currentConversation?.parentId
            ? (currentConversation.title || 'This branch')
            : 'Main Thread'
        }
        messages={messageCount}
        active
      />
      {branches.map((branch) => (
        <BranchItem
          key={branch.id}
          label={branch.title || 'Untitled branch'}
          messages={0}
          onClick={() => onNavigate(branch.id)}
        />
      ))}
    </div>
  )
}

/* ── Internal sub-component ─────────────────────────────── */

function BranchItem({ label, messages, active = false, onClick }) {
  return (
    <motion.button
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
        active
          ? 'bg-white border border-[#B8A070] shadow-sm'
          : 'bg-white border border-[#F1F1EF] hover:border-[#9B9A97]'
      }`}
    >
      <div className="flex items-center gap-2">
        <GitBranch className={`w-3.5 h-3.5 ${active ? 'text-[#B8A070]' : 'text-[#787774]'}`} />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-[#191919] truncate">{label}</div>
          {messages > 0 && (
            <div className="text-xs text-[#787774]">{messages} messages</div>
          )}
        </div>
      </div>
    </motion.button>
  )
}

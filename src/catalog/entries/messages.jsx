// messages@1.0 — scrollable conversation transcript.
//
// Wraps src/components/core/MessageList.jsx + MessageCard.jsx without moving
// or modifying them.
//
// PR-10a.5: render is a self-binding component (MessagesRender) that reads
// useChat() / useConversations() / useSettings() directly per
// refactor/v2-phase1-audit.md §2.8a "Component data plumbing". The catalog
// debug surface uses a separate previewRender that takes sample data — the
// /catalog route doesn't mount inside an active conversation.
//
// Per refactor/v2-phase1-audit.md §2.3, this component's per-message action
// menu is composed from active components' `contributions.messageActions`
// in the room (NQ-5.8) — RoomShell aggregates them and stamps them on
// hostAPI.getMessageActions(). Phase 1 contributors land in subsequent
// PR-10a.5 slices (branches@1.0 → "Branch from here", etc.).

import MessageList from '../../components/core/MessageList'
import MessageCard from '../../components/core/MessageCard'
import MessagesRender from './messages-render'

const SAMPLE_MESSAGES = [
  { id: 'preview-u1', type: 'user',      content: 'How do warm-tinted neutrals differ from cool greys in UI palettes?', number: 1 },
  { id: 'preview-a1', type: 'assistant', content: 'Warm neutrals lean toward beige and cream undertones, which pair naturally with gold accents and feel more inviting than cool greys with blue undertones.', number: 1 },
  { id: 'preview-u2', type: 'user',      content: 'Show me an example pairing.', number: 2 },
]

export default {
  name: 'messages',
  version: '1.0',
  displayName: 'Messages',
  author: 'parliament',
  description: 'Scrollable transcript of conversation messages with per-message action menu.',
  icon: 'MessagesSquare',
  surfaces: ['room'],
  tier: 'reader',
  slotTargets: [
    { slot: 'msg-area',   primary: true },
    { slot: 'chat-panel', fallbackOk: true },
  ],
  capabilityRequirements: ['storage:read'],
  configSchema: {
  },
  // The per-message action menu is composed from OTHER components'
  // contributions in the same room. messages@1.0 itself contributes nothing
  // (it owns the menu surface but not its items).
  contributions: { messageActions: [] },

  // Production render — self-binds to ChatContext (PR-10a.5). RoomShell
  // calls this with { config, hostAPI, componentId } and the component
  // reaches into the active conversation's state via hooks.
  render: MessagesRender,

  previewRender: () => (
    <div className="h-[420px] flex flex-col border border-[var(--p-border)] rounded-xl overflow-hidden bg-white">
      <MessageList
        messages={SAMPLE_MESSAGES}
        renderCard={(msg) => (
          <MessageCard
            key={msg.id}
            id={msg.id}
            type={msg.type}
            content={msg.content}
            number={msg.number}
          />
        )}
      />
    </div>
  ),
}

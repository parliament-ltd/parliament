// messages@1.0 — scrollable conversation transcript.
//
// Wraps src/components/core/MessageList.jsx + MessageCard.jsx without moving
// or modifying them. The render function is a thin shim that will be invoked
// by <RoomShell> in PR-3 with conversation data plumbed via hostAPI; until
// then, only previewRender is exercised (from the dev /catalog route).
//
// Per refactor/v2-phase1-audit.md §2.3, this component's per-message action
// menu is composed from active components' `contributions.messageActions`
// in the room (NQ-5.8) — that wiring lands with PR-3 hostAPI.

import MessageList from '../../components/core/MessageList'
import MessageCard from '../../components/core/MessageCard'

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
  tier: 'reader',
  slotTargets: [
    { slot: 'msg-area',   primary: true },
    { slot: 'chat-panel', fallbackOk: true },
  ],
  capabilityRequirements: ['storage:read'],
  configSchema: {
    showTimestamps: {
      type: 'boolean',
      default: true,
      label: 'Show message timestamps',
    },
    density: {
      type: 'enum',
      options: ['comfortable', 'compact'],
      default: 'comfortable',
      label: 'Card density',
    },
  },
  // The per-message action menu is composed from OTHER components'
  // contributions in the same room. messages@1.0 itself contributes nothing
  // (it owns the menu surface but not its items).
  contributions: { messageActions: [] },

  render: ({ messages = [], renderCard, hiddenCount = 0, onShowHidden, isStreaming = false, containerRef, bottomRef, onContainerMouseDown }) => (
    <MessageList
      messages={messages}
      renderCard={renderCard}
      hiddenCount={hiddenCount}
      onShowHidden={onShowHidden}
      isStreaming={isStreaming}
      containerRef={containerRef}
      bottomRef={bottomRef}
      onContainerMouseDown={onContainerMouseDown}
    />
  ),

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

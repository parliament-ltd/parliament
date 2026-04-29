// branches@1.0 — branch navigation list + Branch creation panel.
//
// Wraps src/components/core/BranchList.jsx without moving or modifying it.
// Composer tier per refactor/tier-classification.md — the compressed-summary
// branch path makes a model call, but the call fires in DIRECT response to
// the user clicking "Create Branch" (with Compressed Summary selected), so
// it stays Composer (no consent prompt).
//
// Per audit decision NQ-5.8, this component OWNS the BranchCreationPanel
// modal that the V1 Albatross adapter still renders inline. The modal is
// not yet extracted into its own file — that lift happens during PR-10a
// when /chat/:id moves through RoomShell. For now the manifest reserves
// the contribution and the render shim renders just the BranchList; the
// modal-opening flow is wired through the message-action handler at the
// consuming surface.

import BranchList from '../../components/core/BranchList'

const SAMPLE_CONVERSATION = {
  id: 'demo-conv',
  title: 'Warm-tinted neutrals',
  parentId: null,
}

const SAMPLE_BRANCHES = [
  { id: 'b1', title: 'Variant: cooler accents' },
  { id: 'b2', title: 'Variant: brighter surfaces' },
]

export default {
  name: 'branches',
  version: '1.0',
  displayName: 'Branches',
  author: 'parliament',
  description: 'Branch navigation list with parent/child links; owns the Branch creation panel.',
  tier: 'composer',
  slotTargets: [
    { slot: 'left-rail',        primary: true },
    { slot: 'right-rail',       fallbackOk: true },
    { slot: 'right-rail-extra', fallbackOk: true },
    { slot: 'margin',           fallbackOk: true },
    { slot: 'sheet',            fallbackOk: true },
  ],
  capabilityRequirements: ['storage:read', 'storage:write', 'model:complete'],
  configSchema: {
    showParentLink: {
      type: 'boolean',
      default: true,
      label: 'Show parent conversation link when on a branch',
    },
    defaultBranchMode: {
      type: 'enum',
      options: ['full-history', 'compressed-summary'],
      default: 'full-history',
      label: 'Default mode in the Branch creation panel',
    },
  },
  contributions: {
    messageActions: [
      {
        id: 'branch-from-here',
        label: 'Branch from here',
      },
    ],
  },

  render: ({ branches = [], currentConversation, messageCount = 0, onNavigate }) => (
    <BranchList
      branches={branches}
      currentConversation={currentConversation}
      messageCount={messageCount}
      onNavigate={onNavigate}
    />
  ),

  previewRender: () => (
    <div className="border border-[var(--p-border)] rounded-xl bg-white p-3 max-w-sm">
      <BranchList
        branches={SAMPLE_BRANCHES}
        currentConversation={SAMPLE_CONVERSATION}
        messageCount={12}
        onNavigate={() => {}}
      />
    </div>
  ),
}

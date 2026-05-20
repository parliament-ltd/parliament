// branches@1.0 — branch navigation list + Branch creation panel.
//
// Wraps src/components/core/BranchList.jsx without moving or modifying it.
// Composer tier per refactor/tier-classification.md — the compressed-summary
// branch path makes a model call, but the call fires in DIRECT response to
// the user clicking "Create Branch" (with Compressed Summary selected), so
// it stays Composer (no consent prompt).
//
// Per audit decision NQ-5.8, this component OWNS the BranchCreationPanel
// modal. PR-10a.7 wired the live render: see ./branches-render.jsx for
// the production component (self-binds to ChatContext + ConversationContext
// + BranchPanelContext). The previewRender below stays preview-shaped for
// the dev /catalog route — sample branches keep the visual record without
// requiring an active conversation.

import BranchList from '../../components/core/BranchList'
import BranchesRender from './branches-render'

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
  description: 'A list of conversation branches with links to the parent and any child branches. Includes a panel for creating new branches.',
  icon: 'GitBranch',
  surfaces: ['room'],
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
    showCompressButton: {
      type: 'boolean',
      default: true,
      label: 'Show "Compress Context" action below the list',
    },
    contextThreshold: {
      type: 'number',
      default: 75,
      label: 'Auto-compress when context usage reaches this % (audit §3.6)',
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

  // Production render — self-binds to ChatContext + ConversationContext +
  // BranchPanelContext. Owns the BranchCreationPanel modal (PR-10a.7).
  render: BranchesRender,

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

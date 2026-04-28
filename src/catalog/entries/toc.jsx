// toc@1.0 — table of contents derived from user messages.
//
// Wraps src/components/core/TOC.jsx without moving or modifying it. Reader
// tier — no model calls, just reads conversation messages and emits
// scroll-jump intents back to whatever owns the message container.

import TOC from '../../components/core/TOC'

const SAMPLE_ITEMS = [
  { id: 'sample-1', label: 'How do warm-tinted neutrals differ from cool greys in UI palettes?' },
  { id: 'sample-2', label: 'Show me an example pairing.' },
  { id: 'sample-3', label: 'What about contrast on dark backgrounds?' },
]

export default {
  name: 'toc',
  version: '1.0',
  displayName: 'Table of contents',
  author: 'parliament',
  description: 'Scrollable list of user-message labels that scroll-jump to their target on click.',
  tier: 'reader',
  slotTargets: [
    { slot: 'left-rail',        primary: true },
    { slot: 'right-rail',       fallbackOk: true },
    { slot: 'right-rail-extra', fallbackOk: true },
    { slot: 'sheet',            fallbackOk: true },
    { slot: 'margin',           fallbackOk: true },
  ],
  capabilityRequirements: ['storage:read'],
  configSchema: {
    maxItems: {
      type: 'number',
      default: 50,
      label: 'Maximum items shown',
    },
    truncateAt: {
      type: 'number',
      default: 60,
      label: 'Character cutoff for label truncation',
    },
  },

  render: ({ items = [], onNavigate }) => (
    <TOC items={items} onNavigate={onNavigate} />
  ),

  previewRender: () => (
    <div className="border border-[var(--p-border)] rounded-xl bg-white p-2 max-w-sm">
      <TOC items={SAMPLE_ITEMS} onNavigate={() => {}} />
    </div>
  ),
}

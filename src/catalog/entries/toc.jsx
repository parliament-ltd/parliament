// toc@1.0 — table of contents.
//
// Wraps src/components/core/TOC.jsx. Reader tier — no model calls, just
// reads conversation messages and emits scroll-jump intents back to
// whatever owns the message container.
//
// Two modes (PR-13 added the second):
//   - 'user-prompts'      → list of user-message labels (V1 Albatross
//                           behavior, PR-10a.8 default).
//   - 'response-headings' → list of markdown headings inside assistant
//                           messages, hierarchical by H1/H2/H3/H4 level.
//                           This is what the build wizard's "Table of
//                           Contents" feature ships — the spec text reads
//                           "tracks the structure of long pieces."
//
// Existing rooms with no `mode` config default to 'user-prompts' for
// backwards compat; the wizard explicitly sets `mode: 'response-headings'`
// on rooms it creates.

import TOC from '../../components/core/TOC'
import TocRender from './toc-render'

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
    mode: {
      type: 'enum',
      options: ['user-prompts', 'response-headings'],
      default: 'user-prompts',
      label: 'Items shown',
    },
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

  // Production render — self-binds to ChatContext (PR-10a.8).
  render: TocRender,

  previewRender: () => (
    <div className="border border-[var(--p-border)] rounded-xl bg-white p-2 max-w-sm">
      <TOC items={SAMPLE_ITEMS} onNavigate={() => {}} />
    </div>
  ),
}

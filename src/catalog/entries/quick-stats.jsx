// quick-stats@1.0 — small homepage tile showing aggregate counts.
//
// Reader tier — reads conversation/message/highlight/note counts from
// IndexedDB. Not mounted in the seeded homepage by default; users can
// add it via the homepage editor when PR-8 lands. Catalog-registered so
// it shows in the library Components tab.

import QuickStatsRender from './quick-stats-render'

export default {
  name: 'quick-stats',
  version: '1.0',
  displayName: 'Quick stats',
  author: 'parliament',
  description: 'At-a-glance totals: conversations, messages, highlights, notes.',
  icon: 'Hash',
  surfaces: ['homepage'],
  tier: 'reader',
  slotTargets: [
    { slot: 'section-slot', primary: true },
  ],
  capabilityRequirements: ['storage:read'],
  configSchema: {},

  render: QuickStatsRender,
  previewRender: QuickStatsRender,
}

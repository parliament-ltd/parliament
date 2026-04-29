// review@1.0 — conversation review modal (synthesis + reflection prompts).
//
// Wraps src/components/ReviewModal.jsx without moving or modifying it.
// Composer tier — clicking "Generate synthesis" makes a model call, but
// the call is in DIRECT response to that user click (per
// refactor/tier-classification.md). No autonomous calls, no consent prompt.
//
// `summaryDepth` was a global SettingsContext value in V1 (per audit §3.6);
// it lives here as component config in V2 so a room can declare its
// preferred depth without affecting other rooms. Migration at PR-10a bakes
// the existing app setting into each migrated room's review@1.0 instance.

import ReviewPreview from './review-preview'

export default {
  name: 'review',
  version: '1.0',
  displayName: 'Review',
  author: 'parliament',
  description: 'Synthesizes the active conversation; category toggles for highlights, notes, favorites, pins.',
  tier: 'composer',
  slotTargets: [
    { slot: 'right-rail', primary: true },
    { slot: 'sheet',      fallbackOk: true },
  ],
  capabilityRequirements: ['storage:read', 'model:complete'],
  configSchema: {
    triggerLabel: {
      type: 'string',
      default: 'Review',
      label: 'Button label',
    },
    summaryDepth: {
      type: 'enum',
      options: ['brief', 'standard', 'deep'],
      default: 'brief',
      label: 'Default summary depth',
    },
    includeHighlights: {
      type: 'boolean',
      default: true,
      label: 'Include highlights by default',
    },
    includeNotes: {
      type: 'boolean',
      default: true,
      label: 'Include notes by default',
    },
    includeFavorites: {
      type: 'boolean',
      default: true,
      label: 'Include favorites by default',
    },
    includePins: {
      type: 'boolean',
      default: true,
      label: 'Include pinned references by default',
    },
  },

  render: ReviewPreview,
  previewRender: ReviewPreview,
}

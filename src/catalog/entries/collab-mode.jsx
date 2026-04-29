// collab-mode@1.0 — system-prompt builder modal (presets + Parrot Personas).
//
// Wraps src/components/CollabModal.jsx without moving or modifying it.
// Composer tier — modifies the system prompt that ships with the user's next
// send, but the model call still fires only when the user clicks Send. No
// autonomous calls, no consent prompt required (per
// refactor/tier-classification.md).
//
// Parrot Personas storage moves from app-level into this component's
// scoped state (per audit §2.3 row for collab-mode). The current V1
// implementation reads/writes the `parrotPersonas` setting via getSetting/
// setSetting; that key migrates with the component when /chat/:id moves
// through RoomShell at PR-10a.

import CollabModePreview from './collab-mode-preview'

export default {
  name: 'collab-mode',
  version: '1.0',
  displayName: 'Collaboration mode',
  author: 'parliament',
  description: 'System-prompt presets and saved Parrot Personas applied to the next user send.',
  tier: 'composer',
  slotTargets: [
    { slot: 'right-rail',       primary: true },
    { slot: 'right-rail-extra', fallbackOk: true },
    { slot: 'left-rail',        fallbackOk: true },
    { slot: 'input-dock',       fallbackOk: true },
    { slot: 'sheet',            fallbackOk: true },
  ],
  capabilityRequirements: ['storage:read', 'storage:write'],
  configSchema: {
    triggerLabel: {
      type: 'string',
      default: 'Collaboration mode',
      label: 'Button label',
    },
    showBadge: {
      type: 'boolean',
      default: true,
      label: 'Show active-preset count badge',
    },
  },

  // Same self-contained wrapper for both — the wrapper opens the V1 modal
  // against empty defaults until ChatContext plumbing arrives in PR-10a.
  render: CollabModePreview,
  previewRender: CollabModePreview,
}

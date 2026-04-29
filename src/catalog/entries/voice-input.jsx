// voice-input@1.0 — mic button publishing voice transcripts on the room bus.
//
// New component (no V1 source — V1's voice was an in-line button on
// InputArea's cardLayout only). Composer tier per
// refactor/tier-classification.md: the user clicks the mic, transcripts
// flow into input@1.0 which uses them on the user's NEXT click of Send.
// Browser handles mic permission, so Parliament's consent flow doesn't
// apply.
//
// Publishes `voice-transcript` events with `{ text, isFinal }` payloads.
// input@1.0 subscribes (when its `subscribeToVoice` config is true) and
// appends finalized transcripts to its value. The InputArea's built-in
// mic button stays in V1 cardLayout for now — removed at PR-10b.

import VoiceInputPreview from './voice-input-preview'

export default {
  name: 'voice-input',
  version: '1.0',
  displayName: 'Voice input',
  author: 'parliament',
  description: 'Mic button that publishes Web Speech API transcripts on the room bus.',
  tier: 'composer',
  // Almost any small slot works — its surface is a single mic button.
  slotTargets: [
    { slot: 'input-dock',       primary: true },
    { slot: 'right-rail',       fallbackOk: true },
    { slot: 'right-rail-extra', fallbackOk: true },
    { slot: 'left-rail',        fallbackOk: true },
    { slot: 'sheet',            fallbackOk: true },
  ],
  capabilityRequirements: ['microphone'],
  configSchema: {
    lang: {
      type: 'string',
      default: 'en-US',
      label: 'Recognition language (BCP-47 tag)',
    },
    buttonLabel: {
      type: 'string',
      default: 'Speak',
      label: 'Idle button label',
    },
  },

  render: VoiceInputPreview,
  previewRender: VoiceInputPreview,
}

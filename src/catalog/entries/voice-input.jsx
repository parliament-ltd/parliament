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
//
// PR-10a.8: split production render (tight mic-only button, lives at
// ./voice-input-render.jsx) from preview render (verbose explanatory
// card for the dev /catalog route, ./voice-input-preview.jsx). Both
// publish on the bus identically; only the surface UI differs.

import VoiceInputRender from './voice-input-render'
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

  // PR-18b: contribute a right-primary input action so input@1.0 can
  // render the mic icon inside its mobile card layout (matching the
  // Swift V1 pattern). When the user taps it, input@1.0 publishes
  // `input-action:voice-toggle` and this component's render subscribes
  // and starts SpeechRecognition. Without this contribution, input@1.0
  // shows a plain Send button at rest instead of the mic.
  contributions: {
    inputActions: [
      {
        id: 'voice-toggle',
        label: 'Voice input',
        iconName: 'Mic',
        primary: 'right',
      },
    ],
  },

  // Production render — tight mic button (PR-10a.8). Self-binds to
  // useVoiceInput + publishes on the room hostAPI bus. input@1.0
  // already subscribes and appends final transcripts to its value.
  render: VoiceInputRender,
  // Preview render — verbose explanatory card for the dev /catalog route.
  previewRender: VoiceInputPreview,
}

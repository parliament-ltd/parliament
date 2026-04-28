// input@1.0 — message composer textarea + send/stop + '+' menu.
//
// Wraps src/components/core/InputArea.jsx without moving or modifying it.
// Composer tier per the user-action-vs-autonomous rule (the model call fires
// when the user clicks Send — direct user action — see refactor/tier-classification.md).
//
// `subscribeToVoice` config field is declared here so it round-trips through
// mode files from PR-2 onward, but the bus subscription that consumes
// voice-transcript events is wired in PR-5 alongside voice-input@1.0. The
// built-in mic button on the underlying InputArea (cardLayout-only) stays
// for V1 fallback and is removed at PR-10b.

import InputArea from '../../components/core/InputArea'
import InputPreview from './input-preview'

export default {
  name: 'input',
  version: '1.0',
  displayName: 'Input',
  author: 'parliament',
  description: 'Message composer with send / stop, attachment, and tool-toggle menu.',
  tier: 'composer',
  slotTargets: [
    { slot: 'input-dock', primary: true },
    { slot: 'msg-area',   fallbackOk: true },
    { slot: 'sheet',      fallbackOk: true },
  ],
  capabilityRequirements: ['storage:read', 'storage:write', 'model:complete'],
  configSchema: {
    placeholder: {
      type: 'string',
      default: 'Ask a question...',
      label: 'Placeholder text',
    },
    subscribeToVoice: {
      type: 'boolean',
      default: true,
      label: 'Append transcripts from voice-input@1.0',
    },
    cardLayout: {
      type: 'boolean',
      default: false,
      label: 'Use unified card layout (mobile)',
    },
  },

  render: (props) => <InputArea {...props} />,

  previewRender: () => <InputPreview />,
}

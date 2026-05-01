// voice-input@1.0 — production render for the V2 RoomShell chat path.
//
// PR-10a.8. Wraps the existing useVoiceInput hook and publishes
// `voice-transcript` events on the room's hostAPI bus. input@1.0
// already subscribes (when its `subscribeToVoice` config is true,
// default true) and appends finalized transcripts to its value —
// see src/catalog/entries/input-render.jsx.
//
// Why a separate file from voice-input-preview.jsx:
//   - The preview lives in left-rail / right-rail-extra on the dev
//     /catalog route as a wide explanatory card ("Last transcript:
//     …", "Publishes voice-transcript events on the room bus.").
//     That copy makes sense when no input component is around to
//     receive the transcripts.
//   - Production rooms (Pocket Chat seeds it into `input-dock` next
//     to the input field) want the tight mic-only button. Compact
//     pill that doesn't shout when idle, turns red while listening.
//
// Browser handles the mic permission prompt — Parliament does not
// gate this behind its consent flow (per refactor/tier-classification.md
// voice-transcription note).
//
// NQ-6 (audit §5.1) calls for an empty state when no input subscriber
// is mounted. Detection requires the bus to expose subscriber counts;
// hostAPI doesn't surface that today, so this component silently
// publishes regardless. Concrete edge cases (mic in a Quiet Room
// with no input) surface in PR-10a.9 / PR-10b cleanup, not here.

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mic, MicOff } from 'lucide-react'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import { PHASE_1_EVENTS } from '../../lib/hostAPI'
import { SPRING_SNAPPY } from '../../lib/constants'

export default function VoiceInputRender({ config = {}, hostAPI } = {}) {
  const lang = config.lang ?? 'en-US'

  const [lastError, setLastError] = useState(null)

  const { isListening, isSupported, error, start, stop } = useVoiceInput({
    lang,
    onTranscript: (text, isFinal) => {
      if (!text) return
      hostAPI?.publish?.(PHASE_1_EVENTS.VOICE_TRANSCRIPT, { text, isFinal })
    },
  })

  // Surface mic-permission / network errors briefly. The hook clears
  // its internal error on the next start(); we mirror that locally so
  // the button itself stays the source of truth for active state.
  if (error && error !== lastError) setLastError(error)

  const toggle = () => (isListening ? stop() : start())

  if (!isSupported) {
    // Don't take up dock real estate on browsers without the API —
    // shrink to a tight disabled badge so the layout doesn't feel
    // broken when a user opens Pocket Chat in Firefox-without-flag.
    return (
      <div
        className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-[var(--p-border)] text-[var(--p-text-muted)] bg-white"
        title="Voice input not supported in this browser"
        aria-disabled="true"
      >
        <MicOff className="w-4 h-4" />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center px-2 py-2">
      <motion.button
        type="button"
        onClick={toggle}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={SPRING_SNAPPY}
        className={`inline-flex items-center justify-center w-9 h-9 rounded-full border transition-colors ${
          isListening
            ? 'border-[var(--p-error,#E03E3E)] text-[var(--p-error,#E03E3E)] bg-[rgba(224,62,62,0.06)]'
            : 'border-[var(--p-border)] text-[var(--p-text-secondary)] bg-white hover:border-[var(--p-accent-gold,#B8A070)] hover:text-[var(--p-text-primary)]'
        }`}
        title={
          lastError
            ? `Mic error: ${lastError}`
            : isListening
              ? 'Stop listening'
              : 'Start voice input'
        }
        aria-pressed={isListening}
        aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
      >
        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </motion.button>
    </div>
  )
}

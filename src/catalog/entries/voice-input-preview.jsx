// Self-contained render wrapper for voice-input@1.0.
//
// Renders a mic button that toggles the Web Speech API session via
// useVoiceInput. Each transcript event is published on the room's hostAPI
// bus as `voice-transcript` for input@1.0 (and any other subscriber) to
// consume. Browser handles the mic permission prompt — Parliament does
// not gate this behind its consent flow (per
// refactor/tier-classification.md voice-transcription note).
//
// Lives in its own file so voice-input.jsx's manifest entry stays a clean
// default-export (react-refresh's "only-export-components" rule).

import { useState } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import { PHASE_1_EVENTS } from '../../lib/hostAPI'

export default function VoiceInputPreview({ config = {}, hostAPI } = {}) {
  const lang = config.lang ?? 'en-US'
  const buttonLabel = config.buttonLabel ?? 'Speak'

  const [lastFinal, setLastFinal] = useState('')

  const { isListening, isSupported, error, start, stop } = useVoiceInput({
    lang,
    onTranscript: (text, isFinal) => {
      // Publish every interim + final transcript onto the room's bus.
      // input@1.0's subscription decides how to merge them into its value.
      hostAPI?.publish?.(PHASE_1_EVENTS.VOICE_TRANSCRIPT, { text, isFinal })
      if (isFinal) setLastFinal(text)
    },
  })

  const toggle = () => (isListening ? stop() : start())

  if (!isSupported) {
    return (
      <div className="border border-[var(--p-border)] rounded-xl bg-white p-4">
        <div className="text-sm text-[var(--p-text-secondary)]">
          Voice input not supported in this browser.
        </div>
      </div>
    )
  }

  return (
    <div className="border border-[var(--p-border)] rounded-xl bg-white p-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          className={`shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full border transition-colors ${
            isListening
              ? 'border-[var(--p-error,#E03E3E)] text-[var(--p-error,#E03E3E)] bg-[rgba(224,62,62,0.06)]'
              : 'border-[var(--p-border)] text-[var(--p-text-primary)] bg-white hover:border-[var(--p-accent-gold,#B8A070)]'
          }`}
          title={isListening ? 'Stop' : 'Start'}
          aria-pressed={isListening}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="text-sm text-[var(--p-text-primary)]">
            {isListening ? 'Listening…' : buttonLabel}
          </div>
          <div className="text-xs text-[var(--p-text-muted)] mt-0.5 truncate">
            {error
              ? `Error: ${error}`
              : lastFinal
                ? `Last transcript: "${lastFinal}"`
                : 'Publishes voice-transcript events on the room bus.'}
          </div>
        </div>
      </div>
    </div>
  )
}

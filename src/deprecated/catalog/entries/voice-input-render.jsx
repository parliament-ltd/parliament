// Retired with R24, carried out on 27 October 2026 with today's chat page (C251 (e)).
// Was src/catalog/entries/voice-input-render.jsx. Nothing imports it and it is not built.
// To restore: move it back, with today's chat page and its route and providers in App.jsx.
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
// On the device only (ruling C70, refactor plan stage 1): useVoiceInput asks
// the browser to transcribe locally and reports 'unavailable' where it can
// only do so by sending audio away. The button says which, in its title.
//
// NQ-6 (audit §5.1) calls for an empty state when no input subscriber
// is mounted. Detection requires the bus to expose subscriber counts;
// hostAPI doesn't surface that today, so this component silently
// publishes regardless. Concrete edge cases (mic in a Quiet Room
// with no input) surface in PR-10a.9 / PR-10b cleanup, not here.

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Mic, MicOff } from 'lucide-react'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import { PHASE_1_EVENTS } from '../../lib/hostAPI'
import { SPRING_SNAPPY } from '../../lib/constants'
import { useIsNarrow } from '../../lib/useViewportWidth'

const VOICE_OFF_NOTE = 'Voice is off in this browser. Here it would mean sending your audio to the browser\'s maker.'

export default function VoiceInputRender({ config = {}, hostAPI } = {}) {
  const lang = config.lang ?? 'en-US'

  const [lastError, setLastError] = useState(null)

  const { status, isListening, isSupported, error, start, stop } = useVoiceInput({
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

  // PR-18b: subscribe to `input-action:voice-toggle` published by
  // input@1.0 when the user taps its right-primary mic button on the
  // mobile card layout. Mirrors the toggle behavior of the local
  // button. Re-binds on isListening/start/stop changes so the handler
  // always sees the current listening state.
  useEffect(() => {
    if (!hostAPI?.subscribe || !isSupported) return
    const unsubscribe = hostAPI.subscribe('input-action:voice-toggle', toggle)
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostAPI, isSupported, isListening, status])

  // PR-18b: on narrow viewports (<768px) input@1.0 renders the mic
  // button itself inside its card layout (driven by this component's
  // `inputActions` contribution). Rendering our own button too would
  // duplicate the affordance, so we go visually invisible while
  // keeping the subscription above wired. Above 768px we render
  // normally — desktop layouts that mount voice-input in a discrete
  // slot still get the standalone button.
  const isNarrow = useIsNarrow(768)
  if (isNarrow) return null

  if (!isSupported) {
    // Don't take up dock real estate on browsers without the API —
    // shrink to a tight disabled badge so the layout doesn't feel
    // broken when a user opens Pocket Chat in Firefox-without-flag.
    return (
      <div
        className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-[var(--p-border)] text-[var(--p-text-muted)] bg-white"
        title={status === 'checking' ? 'Checking voice input' : VOICE_OFF_NOTE}
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
          lastError === 'install-failed'
            ? 'Could not set up voice input. Try again later.'
            : lastError
              ? `Mic error: ${lastError}`
              : isListening
                ? 'Stop listening'
                : status === 'downloadable'
                  ? 'Set up voice input: your browser downloads a language pack once, then speech stays on this device'
                  : status === 'downloading'
                    ? 'Downloading the language pack for voice input'
                    : 'Start voice input. Transcribed on this device; no audio leaves it.'
        }
        aria-pressed={isListening}
        aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
      >
        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </motion.button>
    </div>
  )
}

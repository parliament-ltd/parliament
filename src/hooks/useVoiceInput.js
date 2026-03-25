import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * Wraps the Web Speech API (SpeechRecognition) for voice-to-text input.
 *
 * Usage:
 *   const { isListening, isSupported, start, stop, error } = useVoiceInput({
 *     onTranscript: (text, isFinal) => { ... },
 *     lang: 'en-US',
 *   })
 *
 * - `onTranscript` is called with interim results as the user speaks,
 *   then once more with isFinal=true when the utterance ends.
 * - Call `stop()` manually to end early; recognition also stops after
 *   a natural pause in speech.
 * - `isSupported` is false on browsers without the API (Firefox without flag).
 */
export function useVoiceInput({ onTranscript, lang = 'en-US' } = {}) {
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState(null)
  const recognitionRef = useRef(null)
  const onTranscriptRef = useRef(onTranscript)
  onTranscriptRef.current = onTranscript

  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  // Clean up on unmount
  useEffect(() => {
    return () => recognitionRef.current?.abort()
  }, [])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const start = useCallback(() => {
    if (!isSupported) return
    setError(null)

    // Abort any in-flight session first
    recognitionRef.current?.abort()

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.continuous = false   // stop after one utterance / natural pause
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognition.lang = lang

    recognition.onstart = () => setIsListening(true)

    recognition.onend = () => setIsListening(false)

    recognition.onerror = (e) => {
      // 'no-speech' and 'aborted' are non-critical — don't surface to user
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        setError(e.error)
      }
      setIsListening(false)
    }

    recognition.onresult = (e) => {
      let interim = ''
      let final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) {
          final += t
        } else {
          interim += t
        }
      }
      // Always emit; isFinal=true signals the utterance is complete
      onTranscriptRef.current?.(final || interim, !!final)
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [isSupported, lang])

  return { isListening, isSupported, error, start, stop }
}

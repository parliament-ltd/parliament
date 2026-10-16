import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * Voice-to-text with the browser's speech recognition, on the device only.
 *
 * Parliament asks the browser to transcribe locally (`processLocally`). A
 * browser that can only transcribe by sending audio to its maker's servers is
 * reported as `unavailable`, so no audio ever leaves the device (ruling C70,
 * refactor plan stage 1).
 *
 * Usage:
 *   const { status, isListening, isSupported, start, stop, error } = useVoiceInput({
 *     onTranscript: (text, isFinal) => { ... },
 *     lang: 'en-US',
 *   })
 *
 * status:
 *   'checking'      still asking the browser
 *   'available'     ready; speech stays on this device
 *   'downloadable'  possible on this device after a one-time language pack
 *                   download from the browser's maker; start() asks for it
 *   'downloading'   that download is under way
 *   'unavailable'   no on-device recognition here, so voice is off
 *
 * - `onTranscript` is called with interim results as the user speaks, then
 *   once more with isFinal=true when the utterance ends.
 * - Call `stop()` to end early; recognition also stops after a natural pause.
 */

/** @type {Map<string, Promise<string>>} lang -> on-device status */
const statusCache = new Map()

function recognitionClass() {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

/**
 * Whether this browser can transcribe `lang` on the device.
 * @param {string} [lang]
 * @returns {Promise<'available'|'downloadable'|'downloading'|'unavailable'>}
 */
export function checkOnDeviceVoice(lang = 'en-US') {
  if (statusCache.has(lang)) return statusCache.get(lang)
  const Recognition = recognitionClass()
  const check = Recognition && typeof Recognition.available === 'function'
    ? Promise.resolve()
        .then(() => Recognition.available({ langs: [lang], processLocally: true }))
        .catch(() => 'unavailable')
    : Promise.resolve('unavailable')
  statusCache.set(lang, check)
  return check
}

export function useVoiceInput({ onTranscript, lang = 'en-US' } = {}) {
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState('checking')
  const recognitionRef = useRef(null)
  const onTranscriptRef = useRef(onTranscript)

  useEffect(() => {
    onTranscriptRef.current = onTranscript
  })

  useEffect(() => {
    let cancelled = false
    checkOnDeviceVoice(lang).then(s => { if (!cancelled) setStatus(s) })
    return () => { cancelled = true }
  }, [lang])

  // Clean up on unmount
  useEffect(() => {
    return () => recognitionRef.current?.abort()
  }, [])

  const isSupported = status === 'available' || status === 'downloadable' || status === 'downloading'

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const start = useCallback(async () => {
    const Recognition = recognitionClass()
    if (!Recognition) return
    setError(null)

    if (status === 'downloadable' || status === 'downloading') {
      // install() needs the click that called start(), so it is the first
      // thing awaited.
      setStatus('downloading')
      let installed = false
      try {
        installed = await Recognition.install({ langs: [lang], processLocally: true })
      } catch {
        installed = false
      }
      statusCache.delete(lang)
      const next = await checkOnDeviceVoice(lang)
      setStatus(next)
      if (!installed || next !== 'available') setError('install-failed')
      return
    }
    if (status !== 'available') return

    // Abort any in-flight session first
    recognitionRef.current?.abort()

    const recognition = new Recognition()
    recognition.processLocally = true  // never fall back to a remote service
    recognition.continuous = false     // stop after one utterance / natural pause
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
  }, [status, lang])

  return { status, isListening, isSupported, error, start, stop }
}

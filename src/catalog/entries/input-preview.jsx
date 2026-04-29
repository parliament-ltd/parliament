// Self-contained render wrapper for input@1.0. Used both by the catalog
// debug card (via previewRender) and by RoomShell (via render) until the
// ChatContext plumbing arrives in a later PR. Manages its own value state
// when no controlled value/onChange are passed in.
//
// PR-5 wires the bus subscription declared on input@1.0's manifest:
// when `config.subscribeToVoice !== false` (default true), this wrapper
// subscribes to `voice-transcript` events on the room's hostAPI and
// appends final transcripts to its value (interim transcripts are
// ignored — they'd cause runaway concatenation as the recognizer revises
// its guess). voice-input@1.0 is the publisher.
//
// Lives in its own file so input.jsx's manifest entry stays a clean
// default-export (react-refresh's "only-export-components" rule).

import { useEffect, useState } from 'react'
import InputArea from '../../components/core/InputArea'
import { PHASE_1_EVENTS } from '../../lib/hostAPI'

export default function InputPreview({ config = {}, hostAPI } = {}) {
  const [value, setValue] = useState('')
  const subscribeToVoice = config.subscribeToVoice !== false  // default true

  useEffect(() => {
    if (!subscribeToVoice || !hostAPI?.subscribe) return
    return hostAPI.subscribe(PHASE_1_EVENTS.VOICE_TRANSCRIPT, (payload) => {
      if (!payload || !payload.isFinal) return
      const t = typeof payload.text === 'string' ? payload.text.trim() : ''
      if (!t) return
      setValue(prev => (prev ? `${prev} ${t}` : t))
    })
  }, [subscribeToVoice, hostAPI])

  return (
    <div className="border border-[var(--p-border)] rounded-xl bg-white p-4">
      <InputArea
        value={value}
        onChange={setValue}
        onSend={() => setValue('')}
        onStop={() => {}}
        isStreaming={false}
        placeholder={config.placeholder ?? 'Ask a question...'}
        availableTools={[]}
        activeTools={new Set()}
        onToggleTool={() => {}}
        cardLayout={!!config.cardLayout}
      />
      <p className="text-xs text-[var(--p-text-muted)] mt-3">
        Preview only. Send is a no-op in the catalog debug view.
        {subscribeToVoice && ' Subscribed to voice-transcript on the room bus.'}
      </p>
    </div>
  )
}

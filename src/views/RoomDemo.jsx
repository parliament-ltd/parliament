// Dev-only Room demo + Bus inspector (PR-3).
//
// Mounts a <RoomShell> against the hand-built three-panel demo mode, and
// renders a sibling Bus inspector that subscribes to the same hostAPI.
// Clicking "Publish voice-transcript" fires an event on the shared bus;
// the inspector logs it. This is the visible demonstration for PR-3's
// "bus publish/subscribe works between two components in the same room"
// exit criterion: publisher (button) and subscriber (inspector) share
// one room-scoped hostAPI instance.

import { useEffect, useMemo, useRef, useState } from 'react'
import RoomShell from '../components/RoomShell'
import { createHostAPI, PHASE_1_EVENTS } from '../lib/hostAPI'
import { THREE_PANEL_DEMO_MODE } from '../catalog/dev-modes'

const HEADER_LABEL_CLS = 'text-xs font-medium text-[var(--p-text-secondary)] uppercase tracking-wider'

export default function RoomDemo() {
  // Stable bus across re-renders. Re-creates when mode id changes (it doesn't here).
  const hostAPI = useMemo(() => createHostAPI(), [])

  return (
    <section className="px-5 py-4 rounded-xl border border-[var(--p-border)] bg-white">
      <header className="mb-4">
        <p className={HEADER_LABEL_CLS}>Room demo</p>
        <h2 className="text-base font-medium text-[var(--p-text-primary)] mt-1">
          three-panel@1.0: hand-built room
        </h2>
        <p className="text-xs text-[var(--p-text-secondary)] mt-1">
          Resolved by <code>RoomShell</code>: messages → <code>msg-area</code>,
          input → <code>input-dock</code>, toc → <code>left-rail</code>.
        </p>
      </header>

      <div className="border border-[var(--p-border)] rounded-lg overflow-hidden">
        <RoomShell mode={THREE_PANEL_DEMO_MODE} hostAPI={hostAPI} />
      </div>

      <BusInspector hostAPI={hostAPI} />
    </section>
  )
}

function BusInspector({ hostAPI }) {
  const [events, setEvents] = useState([])
  const counter = useRef(0)

  useEffect(() => {
    const handlers = Object.values(PHASE_1_EVENTS).map(name =>
      hostAPI.subscribe(name, (payload) => {
        counter.current += 1
        const seq = counter.current
        setEvents(prev => [
          { seq, name, payload, at: new Date().toLocaleTimeString() },
          ...prev,
        ].slice(0, 8))
      })
    )
    return () => handlers.forEach(unsub => unsub())
  }, [hostAPI])

  const publishVoice = () => {
    hostAPI.publish('voice-transcript', { text: 'Hello from the bus demo.', isFinal: true })
  }
  const publishHover = () => {
    hostAPI.publish('row-hover', { conversationId: 'demo-conv-123' })
  }
  const publishFile = () => {
    hostAPI.publish('file-context-changed', { fileIds: ['demo-file-1'], conversationId: 'demo-conv-123' })
  }
  const clear = () => { setEvents([]); counter.current = 0 }

  return (
    <div className="mt-5 pt-5 border-t border-[var(--p-border-subtle)]">
      <div className="flex items-baseline justify-between mb-3">
        <p className={HEADER_LABEL_CLS}>Bus inspector</p>
        <span className="text-xs text-[var(--p-text-muted)]">
          subscribed to {Object.values(PHASE_1_EVENTS).length} Phase 1 events
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <DemoButton onClick={publishVoice}>Publish voice-transcript</DemoButton>
        <DemoButton onClick={publishHover}>Publish row-hover</DemoButton>
        <DemoButton onClick={publishFile}>Publish file-context-changed</DemoButton>
        <DemoButton onClick={clear} subtle>Clear log</DemoButton>
      </div>

      <ul className="space-y-1 text-xs font-mono bg-[var(--p-code-bg,#F7F6F3)] rounded p-3 min-h-[80px]">
        {events.length === 0 && (
          <li className="text-[var(--p-text-muted)]">No events yet. Click a button to publish.</li>
        )}
        {events.map((e) => (
          <li key={e.seq} className="text-[var(--p-text-primary)]">
            <span className="text-[var(--p-text-muted)]">[{e.at}]</span>{' '}
            <span className="text-[var(--p-accent-gold,#B8A070)]">{e.name}</span>{' '}
            <span>{JSON.stringify(e.payload)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function DemoButton({ children, onClick, subtle }) {
  const base = 'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors'
  const styles = subtle
    ? 'border-[var(--p-border)] bg-white text-[var(--p-text-secondary)] hover:text-[var(--p-text-primary)]'
    : 'border-[var(--p-border)] bg-white text-[var(--p-text-primary)] hover:border-[var(--p-accent-gold,#B8A070)]'
  return (
    <button type="button" onClick={onClick} className={`${base} ${styles}`}>
      {children}
    </button>
  )
}

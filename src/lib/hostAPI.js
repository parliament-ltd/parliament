// Inter-component event bus for V2 rooms (PR-3).
//
// Each <RoomShell> instantiates one bus via createHostAPI() and passes it to
// every mounted component as `hostAPI`. The bus is room-scoped: events do
// NOT cross room boundaries. A subscriber for 'voice-transcript' in room A
// will not receive events published by room B.
//
// Phase 1 events (canonical list — extending requires a separate decision):
//   - voice-transcript     : { text: string, isFinal: boolean }
//   - row-hover            : { conversationId: string | null }
//   - file-context-changed : { fileIds: string[], conversationId: string }
//
// Subscribing to an unknown event is allowed (forward-compatible) but
// publishing one logs a dev-mode warning so typos surface early.
//
// Handlers run synchronously in subscription order. A throwing handler does
// not abort the dispatch — its error is caught and logged so one
// misbehaving component cannot starve the others.

export const PHASE_1_EVENTS = Object.freeze({
  VOICE_TRANSCRIPT:     'voice-transcript',
  ROW_HOVER:            'row-hover',
  FILE_CONTEXT_CHANGED: 'file-context-changed',
})

const KNOWN_EVENTS = new Set(Object.values(PHASE_1_EVENTS))

/**
 * Create a fresh hostAPI instance. Each room gets its own.
 *
 * @returns {{
 *   publish:   (event: string, payload?: any) => void,
 *   subscribe: (event: string, handler: (payload?: any) => void) => () => void,
 *   _eventCount?: () => number,  // dev-only inspection helper
 * }}
 */
export function createHostAPI() {
  /** @type {Map<string, Set<Function>>} */
  const handlers = new Map()

  function subscribe(event, handler) {
    if (typeof event !== 'string' || event.length === 0) {
      throw new Error('hostAPI.subscribe: event must be a non-empty string')
    }
    if (typeof handler !== 'function') {
      throw new Error('hostAPI.subscribe: handler must be a function')
    }
    let set = handlers.get(event)
    if (!set) {
      set = new Set()
      handlers.set(event, set)
    }
    set.add(handler)
    return function unsubscribe() {
      set.delete(handler)
      if (set.size === 0) handlers.delete(event)
    }
  }

  function publish(event, payload) {
    if (typeof event !== 'string' || event.length === 0) {
      throw new Error('hostAPI.publish: event must be a non-empty string')
    }
    if (import.meta.env.DEV && !KNOWN_EVENTS.has(event)) {
      console.warn(
        `[hostAPI] publishing unknown event '${event}'. ` +
        `Phase 1 events: ${[...KNOWN_EVENTS].join(', ')}.`
      )
    }
    const set = handlers.get(event)
    if (!set || set.size === 0) return
    // Snapshot the handler list so a handler that subscribes/unsubscribes
    // mid-dispatch does not affect this dispatch.
    for (const handler of [...set]) {
      try {
        handler(payload)
      } catch (err) {
        console.error(`[hostAPI] handler for '${event}' threw:`, err)
      }
    }
  }

  return {
    publish,
    subscribe,
    _eventCount: () => handlers.size,
  }
}

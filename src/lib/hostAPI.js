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
// Payload shapes above are documentation only — the bus does NOT validate
// payload structure. Bad payloads surface as runtime errors inside
// subscriber handlers (caught and logged, see below). Shape validation is
// deferred to Phase 2 alongside the consent flow / capability framework
// where typed contracts become load-bearing.
//
// Subscribing to an unknown event is allowed (forward-compatible) but
// publishing one logs a dev-mode warning so typos surface early.
//
// Handlers run synchronously in subscription order. A slow handler will
// block the publish() call for the duration of the dispatch; for the
// three small Phase 1 events this is fine, but anything emitting at
// high frequency (e.g. mouse-move) needs throttling at the publisher.
//
// A throwing handler does not abort the dispatch — its error is caught
// and logged so one misbehaving component cannot starve the others.

export const PHASE_1_EVENTS = Object.freeze({
  VOICE_TRANSCRIPT:     'voice-transcript',
  ROW_HOVER:            'row-hover',
  FILE_CONTEXT_CHANGED: 'file-context-changed',
})

const KNOWN_EVENTS = new Set(Object.values(PHASE_1_EVENTS))

// PR-18b: `input-action:${id}` events are published by input@1.0 when
// the user invokes a contributed action. The id portion is dynamic
// (one per inputAction contribution), so we recognize the namespace
// rather than enumerating every concrete event name.
const KNOWN_EVENT_PREFIXES = ['input-action:']
function isKnownEvent(event) {
  if (KNOWN_EVENTS.has(event)) return true
  return KNOWN_EVENT_PREFIXES.some(p => event.startsWith(p))
}

/**
 * Create a fresh hostAPI instance. Each room gets its own.
 *
 * In addition to the pub/sub bus, the hostAPI carries the merged
 * per-message action contributions for the room. RoomShell calls
 * `_setMessageActions(list)` once it has resolved every component;
 * subscribers (e.g. messages@1.0) call `getMessageActions()` to render
 * the per-message menu. The setter is prefixed with `_` to signal that
 * only RoomShell should call it — components must read, not write.
 *
 * @returns {{
 *   publish:           (event: string, payload?: any) => void,
 *   subscribe:         (event: string, handler: (payload?: any) => void) => () => void,
 *   getMessageActions: () => Array<{ id, label, componentId?, contributedBy?, [string]: any }>,
 *   _setMessageActions:(list: Array<object>) => void,
 *   getInputActions:   () => Array<{ id, label, primary?: 'right', iconName?, componentId?, contributedBy?, [string]: any }>,
 *   _setInputActions:  (list: Array<object>) => void,
 *   _eventCount?:      () => number,
 * }}
 */
export function createHostAPI() {
  /** @type {Map<string, Set<Function>>} */
  const handlers = new Map()
  /** @type {Array<object>} */
  let messageActions = []
  /** @type {Array<object>} */
  let inputActions = []

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
    if (import.meta.env.DEV && !isKnownEvent(event)) {
      console.warn(
        `[hostAPI] publishing unknown event '${event}'. ` +
        `Phase 1 events: ${[...KNOWN_EVENTS].join(', ')}; ` +
        `or prefixes: ${KNOWN_EVENT_PREFIXES.join(', ')}.`
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

  function getMessageActions() {
    // Return a defensive copy so callers can't mutate the shared list.
    return messageActions.slice()
  }

  function _setMessageActions(list) {
    messageActions = Array.isArray(list) ? list : []
  }

  // PR-18b: parallel readers/writers for inputActions. input@1.0 reads
  // the merged list at render time and splits by `primary` flag —
  // `primary: 'right'` becomes the right-side button (mic→send swap);
  // entries without a `primary` flag fill the `+` overflow menu.
  function getInputActions() {
    return inputActions.slice()
  }

  function _setInputActions(list) {
    inputActions = Array.isArray(list) ? list : []
  }

  return {
    publish,
    subscribe,
    getMessageActions,
    _setMessageActions,
    getInputActions,
    _setInputActions,
    _eventCount: () => handlers.size,
  }
}

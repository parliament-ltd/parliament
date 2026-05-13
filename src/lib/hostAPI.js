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
//
// PR-18d adds two more events:
//   - `tool-armed-changed`: emitted whenever a component calls
//     `_armTool` / `_disarmTool`. Carries `{ componentId, armed }`
//     so the arming component can update its own visual state and
//     the input's chip strip can refresh.
//   - `message-sent`: emitted by input@1.0 after a successful send.
//     Arming components (e.g. web-search@1.0) subscribe to this so
//     they can auto-reset their armed state — the contract for
//     per-message tool toggles (W1).
const KNOWN_EVENT_PREFIXES = ['input-action:']
const KNOWN_EVENTS_PR18D = new Set(['tool-armed-changed', 'message-sent'])
function isKnownEvent(event) {
  if (KNOWN_EVENTS.has(event)) return true
  if (KNOWN_EVENTS_PR18D.has(event)) return true
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
 * PR-18d adds a third aggregation pair — `armedTools` — for the
 * "this component wants its tool def included in the next API call"
 * contract. Unlike `messageActions` / `inputActions` (static manifest
 * declarations aggregated by RoomShell), `armedTools` is runtime state
 * written by components themselves as the user toggles them on/off.
 * input@1.0 reads via `getArmedTools()` at send time and passes the
 * `definition` field of each entry into `provider.sendMessage(..., tools)`.
 *
 * @returns {{
 *   publish:           (event: string, payload?: any) => void,
 *   subscribe:         (event: string, handler: (payload?: any) => void) => () => void,
 *   getMessageActions: () => Array<{ id, label, componentId?, contributedBy?, [string]: any }>,
 *   _setMessageActions:(list: Array<object>) => void,
 *   getInputActions:   () => Array<{ id, label, primary?: 'right', iconName?, componentId?, contributedBy?, [string]: any }>,
 *   _setInputActions:  (list: Array<object>) => void,
 *   getArmedTools:     () => Array<{ componentId, id, label?, iconName?, definition, serverSide? }>,
 *   _armTool:          (componentId: string, info: object) => void,
 *   _disarmTool:       (componentId: string) => void,
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
  /** @type {Map<string, object>} componentId → tool registration */
  const armedTools = new Map()

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

  // PR-18d: per-message tool arming. Components arm a tool def for
  // the next outgoing message by calling `_armTool(componentId, info)`.
  // input@1.0 reads `getArmedTools()` at send time and passes the
  // `definition` field of each entry into `provider.sendMessage`. After
  // a successful send, input@1.0 publishes `message-sent`, which arming
  // components subscribe to in order to clear themselves (the W1
  // per-message-toggle contract).
  function getArmedTools() {
    return Array.from(armedTools.values()).map(t => ({ ...t }))
  }
  function _armTool(componentId, info) {
    if (!componentId || !info) return
    armedTools.set(componentId, { ...info, componentId })
    publish('tool-armed-changed', { componentId, armed: true })
  }
  function _disarmTool(componentId) {
    if (!componentId) return
    if (!armedTools.has(componentId)) return
    armedTools.delete(componentId)
    publish('tool-armed-changed', { componentId, armed: false })
  }

  return {
    publish,
    subscribe,
    getMessageActions,
    _setMessageActions,
    getInputActions,
    _setInputActions,
    getArmedTools,
    _armTool,
    _disarmTool,
    _eventCount: () => handlers.size,
  }
}

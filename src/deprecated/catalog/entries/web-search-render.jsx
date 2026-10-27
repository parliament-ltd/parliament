// Retired with R24, carried out on 27 October 2026 with today's chat page (C251 (e)).
// Was src/catalog/entries/web-search-render.jsx. Nothing imports it and it is not built.
// To restore: move it back, with today's chat page and its route and providers in App.jsx.
// web-search@1.0 — production render (PR-18d).
//
// No slot UI of its own (returns null). The visible affordance lives
// inside input@1.0:
//   - The `+` overflow menu item (this manifest's `inputAction`
//     contribution, rendered by InputArea).
//   - The armed-tools chip strip above the input textarea
//     (rendered by InputArea reading hostAPI.getArmedTools()).
//
// What this component owns:
//   - The armed React state.
//   - The subscription to `input-action:web-search` (toggle).
//   - The subscription to `tool-armed-changed` (reflect external
//     disarm — e.g. the chip strip's × calling _disarmTool).
//   - The subscription to `message-sent` (auto-reset after send).
//   - The arm/disarm calls into hostAPI's armed-tools registry.
//   - The provider-agnostic web_search tool def lookup.
//
// Provider neutrality: the tool def comes from the active provider's
// `getAvailableTools()`. Today only Anthropic ships one; Phase 2
// providers (OpenAI, Mistral) will expose their own native shapes
// through the same hook. If the active provider has no `web_search`
// tool, the component renders null and silently no-ops on
// `input-action:web-search` — input@1.0's chip strip never gets a
// chip because nothing armed.

import { useEffect, useMemo, useRef, useState } from 'react'
import { availableTools, DEFAULT_MODEL_PROVIDER as PROVIDER } from '../../net'

export default function WebSearchRender({ hostAPI, componentId } = {}) {
  // The tool registration for the active provider. Looked up once per
  // mount (the provider doesn't change inside a room's lifetime in
  // Phase 1; revisit if a provider-picker lands in a room).
  const toolReg = useMemo(() => {
    try {
      const tools = availableTools(PROVIDER)
      return tools.find(t => t.id === 'web_search') || null
    } catch {
      return null
    }
  }, [])

  const [armed, setArmed] = useState(false)
  // Mirror the latest armed value in a ref so bus handlers (which
  // close over the initial render) can read the current state without
  // having to re-bind on every change.
  const armedRef = useRef(false)
  useEffect(() => { armedRef.current = armed }, [armed])

  // Single source of truth: when local armed flips, sync the hostAPI
  // armed-tools registry. Effect runs on every change including the
  // initial false→true and any external disarm that flipped armed
  // back to false (via the tool-armed-changed subscription below).
  useEffect(() => {
    if (!hostAPI || !componentId || !toolReg) return
    if (armed) {
      hostAPI._armTool?.(componentId, {
        id: toolReg.id,
        label: toolReg.label,
        iconName: 'Globe',
        definition: toolReg.definition,
        serverSide: !!toolReg.serverSide,
      })
    } else {
      hostAPI._disarmTool?.(componentId)
    }
  }, [armed, hostAPI, componentId, toolReg])

  // Toggle when the user taps the `+` menu item.
  useEffect(() => {
    if (!hostAPI?.subscribe || !toolReg) return
    return hostAPI.subscribe('input-action:web-search', () => {
      setArmed(prev => !prev)
    })
  }, [hostAPI, toolReg])

  // Reflect external disarm — e.g. the chip strip's × clicks
  // hostAPI._disarmTool(componentId) directly. We listen so the local
  // armed flag stays in sync (and a subsequent + tap re-arms instead
  // of toggling off a stale "armed" state).
  useEffect(() => {
    if (!hostAPI?.subscribe) return
    return hostAPI.subscribe('tool-armed-changed', (payload) => {
      if (!payload) return
      if (payload.componentId !== componentId) return
      // Only respond to disarms — we already drove the arm side in the
      // local effect above. Skipping the arm echo prevents a tap-bus-
      // echo loop where the publish from _armTool re-enters this
      // handler and flips back to false.
      if (payload.armed === false && armedRef.current) {
        setArmed(false)
      }
    })
  }, [hostAPI, componentId])

  // Auto-reset after a successful send.
  useEffect(() => {
    if (!hostAPI?.subscribe) return
    return hostAPI.subscribe('message-sent', () => {
      if (armedRef.current) setArmed(false)
    })
  }, [hostAPI])

  // Contribution-only component: no rendered surface in any slot.
  // The visible state lives in input@1.0's `+` menu (manifest) and
  // chip strip (hostAPI.getArmedTools() reader).
  return null
}

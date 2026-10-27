// Retired with R22, carried out on 27 October 2026 with today's chat page (C251 (e)).
// Was src/stores/CollabModeContext.jsx. Nothing imports it and it is not built.
// To restore: move it back, with today's chat page and its route and providers in App.jsx.
// CollabModeContext — shared per-conversation collab-mode state (PR-10a.9).
//
// `collab-mode@1.0` owns the modal that lets the user pick presets / save
// Parrot Personas / write a custom instruction. `input@1.0` and the
// ghost-text Continue handler in `messages@1.0` need the resulting system
// prompt to thread it into `sendMessage` / `continueMessage`. They don't
// share a parent that owns the active state, so this small context fills
// the gap — same precedent as `AnnotationsContext` (PR-10a.6) and
// `BranchPanelContext` (PR-10a.7).
//
// V1 Albatross kept `activePresets` + `customInstruction` as local state
// on the ChatLayout component, which meant they reset every time you
// navigated away and back. V2 matches that lifetime: state resets when
// `useChat().activeConversationId` changes. Per-conversation persistence
// across navigation is a Phase 2 question (probably belongs on the room's
// `permissionGrants` story; not this slice).
//
// The hostAPI bus stays capped at three Phase 1 events per audit NQ-4 —
// this is another deliberate exception via shared context.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useChat } from './ChatContext'

// Built-in presets — single source of truth lives in CollabModal.jsx but
// inlining the prompts here keeps `buildSystemPrompt` callable from
// outside the modal (input@1.0, messages@1.0 ghost-continue) without
// pulling the modal component into their dependency graphs.
//
// If COLLAB_PRESETS in CollabModal.jsx changes, mirror it here. Tested
// at runtime via the modal's own selection state (which uses the modal's
// definition); a divergence would surface as a preset that toggles in
// the UI but contributes no text to the system prompt.
const PRESET_PROMPTS = Object.freeze({
  challenge:    'Before presenting any artifact or substantial output, critically evaluate it first. Identify assumptions, potential gaps, and weaknesses. Present your self-critique alongside the output.',
  reasoning:    'Walk me through your reasoning before giving me the answer. Show your thought process step by step.',
  pushback:     "Push back if my assumptions are wrong. Don't just agree with me — tell me when you think I'm heading in the wrong direction.",
  alternatives: "When answering, provide alternative approaches or perspectives. Don't just give one answer — show me the landscape of options.",
  uncertainty: "Tell me what you're uncertain about. Distinguish between what you're confident in and where you're making educated guesses.",
})

const CollabModeContext = createContext(null)

const EMPTY_SET = new Set()

export function CollabModeProvider({ children }) {
  const { activeConversationId } = useChat()

  // Active built-in preset IDs. Saved Parrot Personas also live in this
  // set — their ids start with `persona_` and CollabModal merges their
  // instruction text into customInstruction when applied. Storing all
  // active ids here (preset + persona) lets the modal seed its local
  // state from the same source.
  const [activePresets, setActivePresets] = useState(EMPTY_SET)
  // The custom instruction text + any active personas' instructions
  // joined together (joined by the modal's `onApply`). We store the
  // already-joined string here so input@1.0 doesn't need to know about
  // personas.
  const [customInstruction, setCustomInstruction] = useState('')

  // Reset on conversation change — matches V1 Albatross's per-mount
  // lifetime. Only reset when transitioning between two distinct
  // non-null ids; transient nulls (e.g. ChatView's brief
  // clearMessages() during route navigation back to the SAME
  // conversation) must not wipe the active state.
  const lastConvRef = useRef(activeConversationId)
  useEffect(() => {
    if (activeConversationId == null) return
    const prev = lastConvRef.current
    lastConvRef.current = activeConversationId
    if (prev != null && prev !== activeConversationId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Collaboration mode retires in stage 7 (R22)
      setActivePresets(EMPTY_SET)
      setCustomInstruction('')
    }
  }, [activeConversationId])

  const apply = useCallback((presets, instruction) => {
    setActivePresets(presets instanceof Set ? new Set(presets) : new Set())
    setCustomInstruction(instruction || '')
  }, [])

  const clear = useCallback(() => {
    setActivePresets(EMPTY_SET)
    setCustomInstruction('')
  }, [])

  // Build the combined prompt. Built-in presets contribute their canned
  // prompt text; the customInstruction string captures both the user's
  // free-form addition AND any active personas (the modal joins those
  // before calling apply, so by the time we see customInstruction it's
  // already complete). Returns '' when nothing is active so callers can
  // pass it directly to sendMessage(...) which interprets falsy as "no
  // system prompt".
  const buildSystemPrompt = useCallback(() => {
    const parts = []
    for (const id of activePresets) {
      const prompt = PRESET_PROMPTS[id]
      if (prompt) parts.push(prompt)
    }
    if (customInstruction.trim()) parts.push(customInstruction.trim())
    return parts.join('\n\n')
  }, [activePresets, customInstruction])

  const value = useMemo(() => ({
    activePresets,
    customInstruction,
    apply,
    clear,
    buildSystemPrompt,
    // Convenience derived count for the trigger badge — preset ids that
    // map to a real prompt + a non-empty customInstruction.
    activeCount:
      [...activePresets].filter(id => PRESET_PROMPTS[id] != null).length +
      (customInstruction.trim() ? 1 : 0),
  }), [activePresets, customInstruction, apply, clear, buildSystemPrompt])

  return (
    <CollabModeContext.Provider value={value}>{children}</CollabModeContext.Provider>
  )
}

export function useCollabMode() {
  const ctx = useContext(CollabModeContext)
  if (!ctx) throw new Error('useCollabMode must be used within CollabModeProvider')
  return ctx
}

# Tier Classification — Phase 1 Rule

**Status:** Active for Parliament V2 Phase 1.
**Audience:** Anyone classifying a Parliament catalog component, especially when deciding whether it triggers the Phase 2 consent flow.
**Don't change this rule** without going back to the team that decided it. The rule looks small but has real UX consequences — see "Why this rule exists" below.

---

## The rule

> **Components that make model calls in direct response to a user action are Composer (or below) and don't require consent.**
>
> **Components that make autonomous model calls are Agent and require explicit consent at first use.**

The dividing line is **who initiated the call**, not whether the component touches the model API.

---

## Why this rule exists

The architecture spec (`mode-workshop-architecture.md` §2) defines the Agent tier as components that "make model calls on user's behalf." Read literally, every component that calls a model is Agent. Read literally, the V1 Review modal is Agent and would need a consent prompt before every use.

That's wrong for V1 behavior preservation. When a user clicks "Generate synthesis" in the Review modal, they have **already authorized that specific call** — by clicking the button. Adding a consent prompt on top would be condescending UX ("Are you sure you want to do the thing you just clicked to do?").

The Agent tier exists to gate **autonomous** behavior — components that fire model calls without an explicit user action that says "do this thing right now." Pipeline-driven Summarizer (Phase 2) is the canonical Agent component: data arrives at the input port, Summarizer fires a model call, the user didn't click anything. That genuinely needs consent.

This rule preserves V1 UX through Phase 1 while honoring the spec's intent for autonomous-future components.

---

## Phase 1 classifications

| Component | Trigger | Tier | Consent? |
|---|---|---|---|
| `input@1.0` | User clicks Send | Composer | No |
| `messages@1.0` | Reads messages, no model calls | Reader | No |
| `toc@1.0` | Reads messages, no model calls | Reader | No |
| `highlights@1.0` | User selects text + clicks color | Reader | No |
| `notes@1.0` | User clicks "Add note" | Reader | No |
| `branches@1.0` (full history) | User clicks Branch | Composer | No |
| `branches@1.0` (compressed summary) | User clicks Branch + chooses Compressed | Composer | No |
| `context@1.0` | Reads token counts, no model calls | Reader | No |
| `collab-mode@1.0` | Modifies system prompt at user-send time | Composer | No |
| `review@1.0` | User clicks Generate synthesis | Composer | No |
| `voice-input@1.0` | User clicks mic | Composer | No (browser handles mic permission) |
| Auto title/summary/tags | Tied to first user→assistant exchange | Composer | No (rides on the send action) |
| `file-shelf@1.0` | User uploads file, no model calls | Composer | No |
| `chart-canvas@1.0` | Renders parsed data, no model calls | Reader | No |
| `table-canvas@1.0` | Same | Reader | No |
| `summary-dashboard@1.0` | Same | Reader | No |
| `column-inspector@1.0` | Reads column stats, no model calls | Reader | No |
| `document-canvas@1.0` (Secretarybird) | User-edited document | Composer | No |
| `claude-comments@1.0` | User clicks comment to generate Claude reply | Composer | No |
| `ripple-analysis@1.0` | User clicks Submit & Branch | Composer | No |

**No Agent-tier components ship in Phase 1.** Phase 2 introduces `summarizer@1.0` (pipeline-driven, autonomous) as the first Agent-tier component, alongside the consent flow infrastructure.

---

## Edge cases and gray areas

### Auto title/summary/tags

V1 fires three lightweight Haiku calls automatically after the first user→assistant exchange to populate the conversation's title, AI summary, and tags. The user didn't click anything to ask for this — does it count as autonomous?

**Phase 1 ruling: Composer.** The model calls are *tied* to the user's send action. The user sending their first message is the action that authorizes the metadata side effects. Without that send, no calls happen. The relationship is direct and proximate enough to count as user-initiated.

If we were strict, we'd call this Agent and add consent. We chose not to because (a) it's Phase 1 V1-behavior preservation, (b) the calls are cheap (Haiku, ~30 tokens output each), and (c) the user can already see the resulting title/summary/tags in the chat selector — they're not invisible.

If a future feature fires *additional* autonomous Haiku calls (e.g., re-summarize on every message), that's autonomous and should be Agent.

### Compressed-summary branch

When a user creates a "Compressed" branch, the system fires a Haiku call to summarize the conversation, then creates the branch with the summary as its first message. The user clicked Branch and chose Compressed — that's the action that authorized the summary call. **Composer.**

If at some future point Parliament adds an "auto-compress at 90% context" mode that fires the summary call without a user clicking, that variant would be Agent.

### Stream continuation (ghost text)

When a streaming response is interrupted and the user clicks Continue, a model call fires to resume the stream. **Composer** — user clicked Continue.

### Voice transcription

`voice-input@1.0` uses the browser's Web Speech API, which has its own browser-level mic permission prompt. Parliament's consent flow doesn't apply (browser handles it). The component is Composer because the user clicked the mic button.

If Parliament eventually supports server-side speech-to-text via a model call (Whisper, etc.), the new component is Composer (user clicked mic) but **also incurs network/cost** for each transcription, which makes the model-picker / cost surfacing more important.

### A component that *could* fire autonomously but currently doesn't

A component that has the *capability* to make autonomous model calls but currently only fires on user actions is **Composer in Phase 1**, not Agent. Tier is determined by current behavior, not potential. If the component later adds an autonomous trigger, its tier upgrades to Agent at that release.

---

## When to revisit

Re-evaluate a component's tier when:

- The component adds an autonomous trigger (a pipeline input, a timer, a lifecycle event that fires model calls without a user action).
- The cost profile changes meaningfully (e.g., a Composer that used to fire one Haiku call per user action now fires twenty Opus calls).
- A user reports surprise about a model call they didn't expect — that's a signal the component crossed the line into Agent territory and should be reclassified.

---

## When NOT to revisit

Do **not** "fix" a Composer component to be Agent because:

- "It calls a model, so it should be Agent" — that's the literal reading the rule explicitly rejects.
- "Adding a consent prompt would be safer" — safer for whom? Adding consent to user-initiated actions trains users to dismiss consent prompts, which makes the real Agent prompts (Phase 2) less effective.
- "The architecture spec says Agent is for components that call models" — the spec text predates this Phase 1 rule. The rule clarifies the spec for components that ride on direct user actions.

---

## Phase 2 onward

When the consent flow ships in Phase 2 (per `consent-flow-ui-spec.md`):

- `summarizer@1.0` (pipeline-driven) is the first Agent component. Consent prompt fires on first pipeline-driven invocation.
- The model-picker field type lets users override per-component model choice for any component making model calls.
- Components currently classified Composer that gain autonomous triggers in Phase 2+ migrate to Agent at the release that adds the trigger.

The Composer-vs-Agent distinction stays binary: tied to a direct user action OR not. There's no middle ground. If a component sometimes fires on user action and sometimes autonomously, treat it as Agent — consent is required for the autonomous path, and the user-action path becomes a no-op against an existing grant.

---

## Quick reference for new components

When a contributor adds a new component to the catalog, classify it by answering:

1. **Does the component make model calls?**
   - No → Reader (or Utility for pure rendering).
   - Yes → continue.
2. **What triggers the model call?**
   - A direct user action (button click, send, etc.) → Composer.
   - A pipeline input arriving, a timer, a lifecycle event, anything else → Agent.
3. **Does the component access network beyond the model API?**
   - Yes → Integrator (separate from Composer/Agent; can stack with either).
   - No → stop.

Most Phase 1 components are Reader or Composer. The first Agent ships in Phase 2.

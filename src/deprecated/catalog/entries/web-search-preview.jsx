// Retired with R24, carried out on 27 October 2026 with today's chat page (C251 (e)).
// Was src/catalog/entries/web-search-preview.jsx. Nothing imports it and it is not built.
// To restore: move it back, with today's chat page and its route and providers in App.jsx.
// web-search@1.0 — preview render for the dev /catalog debug route.
//
// Verbose explanatory card. The production render is null (contribution-
// only), so the debug route would otherwise show nothing in the slot.
// This preview surfaces the component's wiring story so anyone browsing
// the catalog can see what it does at a glance.

import { Globe } from 'lucide-react'

export default function WebSearchPreview() {
  return (
    <div className="rounded-md border border-[var(--p-border)] p-3 bg-white">
      <div className="flex items-center gap-2 mb-2">
        <Globe className="w-4 h-4 text-[#4A7AE5]" />
        <h3 className="text-sm font-medium text-[var(--p-text-primary)]">Web search</h3>
        <span className="ml-auto text-[10px] uppercase tracking-wide text-[var(--p-text-muted)]">Composer</span>
      </div>
      <p className="text-xs text-[var(--p-text-secondary)] leading-relaxed mb-2">
        Contributes a “Web search” item to input@1.0’s <code className="px-1 rounded bg-[var(--p-bg-subtle)]">+</code> overflow menu. When the user taps it, this component arms the active provider’s <code className="px-1 rounded bg-[var(--p-bg-subtle)]">web_search</code> tool for the next outgoing message.
      </p>
      <p className="text-[11px] text-[var(--p-text-muted)] leading-relaxed">
        Per-message toggle: the armed flag auto-resets after a successful send. Cost transparency is rendered as a chip strip above the input. Uses API credits.
      </p>
    </div>
  )
}

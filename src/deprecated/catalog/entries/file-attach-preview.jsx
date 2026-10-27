// Retired with R24, carried out on 27 October 2026 with today's chat page (C251 (e)).
// Was src/catalog/entries/file-attach-preview.jsx. Nothing imports it and it is not built.
// To restore: move it back, with today's chat page and its route and providers in App.jsx.
// file-attach@1.0 — preview render for the dev /catalog debug route.
//
// Verbose explanatory card. The production render is null (contribution-
// only), so the debug route would otherwise show nothing in the slot.
// This preview surfaces the wiring story so anyone browsing the catalog
// can see what file-attach does at a glance.

import { Paperclip } from 'lucide-react'

export default function FileAttachPreview() {
  return (
    <div className="rounded-md border border-[var(--p-border)] p-3 bg-white">
      <div className="flex items-center gap-2 mb-2">
        <Paperclip className="w-4 h-4 text-[#4A7AE5]" />
        <h3 className="text-sm font-medium text-[var(--p-text-primary)]">File attach</h3>
        <span className="ml-auto text-[10px] uppercase tracking-wide text-[var(--p-text-muted)]">Composer</span>
      </div>
      <p className="text-xs text-[var(--p-text-secondary)] leading-relaxed mb-2">
        Contributes “Attach files” to input@1.0’s <code className="px-1 rounded bg-[var(--p-bg-subtle)]">+</code> overflow menu. Tapping opens a multi-select picker; chosen files stage as chips above the input.
      </p>
      <p className="text-[11px] text-[var(--p-text-muted)] leading-relaxed">
        Images and PDFs flow as Anthropic content blocks; text/code files are wrapped with <code className="px-1 rounded bg-[var(--p-bg-subtle)]">&lt;attached_file&gt;</code> tags and inlined into the prompt. 10 MB per binary file, 200 KB per text file, up to 10 files per message. Auto-clears after each successful send.
      </p>
    </div>
  )
}

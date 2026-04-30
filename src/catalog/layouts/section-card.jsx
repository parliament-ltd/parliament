// SectionCard — collapsible card used by stacked-sections@1.0 to wrap
// each child component. Lives in its own file so stacked-sections.jsx's
// manifest entry stays a clean default-export.

import { useState } from 'react'

export default function SectionCard({ title, meta, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="rounded-xl border border-[var(--p-border)] bg-white overflow-hidden">
      <header
        className="flex items-baseline gap-3 px-5 py-4 border-b border-[var(--p-border-subtle)] cursor-pointer select-none"
        onClick={() => setOpen(o => !o)}
      >
        <h2 className="text-base font-medium text-[var(--p-text-primary)]">{title}</h2>
        {meta && (
          <p className="text-xs text-[var(--p-text-secondary)]">{meta}</p>
        )}
        <span className="ml-auto text-xs text-[var(--p-text-muted)]">
          {open ? '▾' : '▸'}
        </span>
      </header>
      {open && <div className="p-5">{children}</div>}
    </section>
  )
}

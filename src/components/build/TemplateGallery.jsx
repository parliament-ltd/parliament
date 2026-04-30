// TemplateGallery — five available + two coming-soon template cards
// arranged in a 3-column grid (PR-9). Coming-soon cards are visually
// muted and route to a read-only preview overlay; available cards
// instantiate a mode and route to /edit/:newId.
//
// The icon prop on each template is a Lucide icon name string; the
// gallery resolves it locally so this component doesn't drag the whole
// Lucide tree. Unrecognized icons fall back to BookmarkPlus.

import {
  PenTool,
  BarChart3,
  FileText,
  Smartphone,
  MessageSquare,
  BookOpen,
  Columns,
  BookmarkPlus,
  Sparkles,
} from 'lucide-react'
import { motion } from 'framer-motion'

const ICON_MAP = {
  'pen-tool':       PenTool,
  'bar-chart-3':    BarChart3,
  'file-text':      FileText,
  'smartphone':     Smartphone,
  'message-square': MessageSquare,
  'book-open':      BookOpen,
  'columns':        Columns,
}

export default function TemplateGallery({ templates, onPick, busy }) {
  if (!templates || templates.length === 0) {
    return (
      <div className="text-center text-sm text-[var(--p-text-secondary)] px-6 py-8">
        Loading templates…
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((t) => (
        <TemplateCard key={t.id} template={t} onPick={onPick} busy={busy} />
      ))}
    </div>
  )
}

function TemplateCard({ template, onPick, busy }) {
  const isComingSoon = template.status === 'coming-soon'
  const Icon = ICON_MAP[template.icon] || BookmarkPlus

  return (
    <motion.button
      whileHover={!busy ? { y: -2, borderColor: 'var(--p-gold-light)' } : undefined}
      whileTap={!busy ? { scale: 0.98 } : undefined}
      onClick={() => onPick(template)}
      disabled={busy}
      className={`text-left flex flex-col gap-3 px-5 py-4 rounded-xl border bg-white transition-colors ${
        isComingSoon
          ? 'border-[var(--p-border-subtle)] opacity-80 hover:opacity-100'
          : 'border-[var(--p-border)]'
      } ${busy ? 'cursor-wait' : 'cursor-pointer'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="w-9 h-9 rounded-lg bg-[var(--p-bg-subtle)] border border-[var(--p-border-subtle)] flex items-center justify-center text-[var(--p-gold-muted)]">
          <Icon className="w-4 h-4" />
        </div>
        {isComingSoon && (
          <span className="text-[9px] uppercase tracking-wider font-medium text-[var(--p-gold-muted)] bg-[var(--p-bg-subtle)] px-1.5 py-0.5 rounded">
            Coming soon
          </span>
        )}
        {!isComingSoon && template.id === 'quiet-room@1.0' && (
          <Sparkles className="w-3.5 h-3.5 text-[var(--p-gold-light)]" aria-hidden="true" />
        )}
      </div>

      <div>
        <div className="text-sm font-medium text-[var(--p-text-primary)] mb-1">
          {template.displayName}
        </div>
        <div className="text-xs text-[var(--p-text-secondary)] leading-relaxed">
          {template.description}
        </div>
      </div>

      <div className="text-[10.5px] uppercase tracking-wider font-medium text-[var(--p-text-muted)] mt-auto">
        {layoutPretty(template.layout?.ref)}
      </div>
    </motion.button>
  )
}

function layoutPretty(ref) {
  if (!ref) return ''
  const name = ref.split('@')[0]
  return name.replace(/-/g, ' ')
}

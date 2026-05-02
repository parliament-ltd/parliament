// WizardEntry — Welcome + path picker (Screen 0, PR-13).
//
// Per parliament_wizard_v5.html lines 958–1019. Three paths:
//   - 'guided'  → continues into the 6-step wizard (default selection)
//   - 'template' → swaps to the inline template gallery view
//   - 'custom'   → opens a fresh blank room directly in the editor
//
// The selection state is local; the parent (BuildView) only learns the
// choice when the user clicks "Let's go".

import { useState } from 'react'
import { motion } from 'framer-motion'

const PARLIAMENT_MARK = (
  <svg width="26" height="24" viewBox="0 0 26 24" fill="none" aria-hidden="true">
    <rect x="0"     y="20" width="26"  height="2.5" rx=".8" fill="currentColor" />
    <rect x="2"     y="16" width="22"  height="2"   rx=".6" fill="currentColor" />
    <rect x="4"     y="4"  width="18"  height="2"   rx=".6" fill="currentColor" />
    <rect x="10"    y="1"  width="6"   height="3"   rx=".6" fill="currentColor" />
    <rect x="4"     y="6"  width="2.5" height="10"  rx=".6" fill="currentColor" />
    <rect x="8.75"  y="6"  width="2.5" height="10"  rx=".6" fill="currentColor" />
    <rect x="13.5"  y="6"  width="2.5" height="10"  rx=".6" fill="currentColor" />
    <rect x="18.25" y="6"  width="2.5" height="10"  rx=".6" fill="currentColor" />
  </svg>
)

const PATHS = [
  {
    id: 'guided',
    label: 'Guide me through it',
    description: "Answer a few questions and we'll design your first room",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.1" />
        <polygon points="8,3 9.5,8 8,7 6.5,8" fill="currentColor" opacity=".9" />
        <polygon points="8,13 6.5,8 8,9 9.5,8" fill="currentColor" opacity=".4" />
      </svg>
    ),
  },
  {
    id: 'template',
    label: 'Start from a template',
    description: 'Pick a pre-designed room and make it yours',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 2h4.5v2.2c0 .7.6 1.3 1.3 1.3s1.3-.6 1.3-1.3V2H14v4.5h-2.2c-.7 0-1.3.6-1.3 1.3s.6 1.3 1.3 1.3H14V14H9.5v-2.2c0-.7-.6-1.3-1.3-1.3s-1.3.6-1.3 1.3V14H2V9.5h2.2c.7 0 1.3-.6 1.3-1.3S4.9 6.9 4.2 6.9H2V2z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" fill="none" />
      </svg>
    ),
  },
  {
    id: 'custom',
    label: 'Build it myself',
    description: 'Open the full editor and design from scratch',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M10.5 2C8.57 2 7 3.57 7 5.5c0 .28.04.55.1.81L2.5 10.9a1.5 1.5 0 002.12 2.12l4.59-4.6c.26.06.53.1.81.1C11.43 8.52 13 6.95 13 5.02c0-.52-.12-1-.33-1.43l-1.85 1.85-1.18-1.18 1.85-1.85A3.52 3.52 0 0010.5 2z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" fill="none" />
      </svg>
    ),
  },
]

export default function WizardEntry({ onPick, busy }) {
  const [selected, setSelected] = useState('guided')

  return (
    <div className="text-center pt-6 pb-2 px-4">
      <div
        className="mx-auto mb-5 w-[54px] h-[54px] rounded-full flex items-center justify-center"
        style={{
          background: 'var(--p-bg-subtle)',
          border: '0.5px solid var(--p-border)',
          color: 'var(--p-text-secondary)',
        }}
      >
        {PARLIAMENT_MARK}
      </div>

      <div className="text-[21px] font-medium leading-tight mb-2" style={{ color: 'var(--p-text-primary)' }}>
        Welcome to Parliament
      </div>
      <p
        className="text-[13px] leading-[1.65] mx-auto mb-7"
        style={{ color: 'var(--p-text-secondary)', maxWidth: '390px' }}
      >
        Your open source home to build your AI as you'd like. Parliament is made of rooms. Each room is a place you've designed for a particular kind of work.
      </p>

      <div className="text-sm font-medium mb-4" style={{ color: 'var(--p-text-primary)' }}>
        To get started, how would you like to build?
      </div>

      <div className="flex flex-col gap-[7px] mx-auto mb-7" style={{ maxWidth: '380px' }}>
        {PATHS.map((p) => {
          const isSel = selected === p.id
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p.id)}
              className="flex items-center gap-3 px-3.5 py-[11px] rounded-[10px] text-left transition-colors cursor-pointer"
              style={{
                border: isSel ? '1.5px solid var(--p-gold-light)' : '0.5px solid var(--p-border)',
                background: isSel ? 'var(--p-gold-tint)' : 'var(--p-bg-surface)',
              }}
            >
              <div
                className="w-[34px] h-[34px] rounded-md flex items-center justify-center shrink-0"
                style={{
                  background: isSel ? 'var(--p-gold-tint-2)' : 'var(--p-bg-subtle)',
                  color: isSel ? 'var(--p-gold-deep)' : 'var(--p-text-secondary)',
                }}
              >
                {p.icon}
              </div>
              <div>
                <div className="text-[13px] font-medium" style={{ color: 'var(--p-text-primary)' }}>
                  {p.label}
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--p-text-secondary)' }}>
                  {p.description}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        disabled={busy}
        onClick={() => onPick(selected)}
        className="px-8 py-2.5 rounded-md text-sm font-medium text-white transition-colors disabled:opacity-50"
        style={{ background: 'var(--p-gold-light)' }}
      >
        Let's go
      </motion.button>
    </div>
  )
}

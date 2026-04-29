// Dev-only scheme picker for the /catalog debug surface (PR-4b).
//
// Toggles `data-scheme="<id>"` on <html> and `.dark` class for the dark
// variant; flags HC mode by injecting a tiny synthetic stylesheet (since
// we can't change the OS pref from page JS). Lets a developer cycle
// through all 6 schemes × 4 variants without touching system settings or
// shipping a user-facing scheme switcher (the real one ships with PR-8's
// editor).
//
// State is local to the dev page — does NOT persist anywhere. Reload
// resets to Parliament Default light. This is intentional: the dev
// picker shouldn't bleed into normal app state.

import { useEffect, useState } from 'react'
import { SCHEMES, schemeName } from '../lib/schemes'

const HEADER_LABEL_CLS = 'text-xs font-medium text-[var(--p-text-secondary)] uppercase tracking-wider'
const HC_STYLE_ID = 'dev-scheme-picker-hc-override'

function applyScheme(name, isDark, isHC) {
  const html = document.documentElement
  if (name === 'parliament') {
    html.removeAttribute('data-scheme')
  } else {
    html.setAttribute('data-scheme', name)
  }
  html.classList.toggle('dark', isDark)
  // HC override: inject a synthetic stylesheet that mirrors the
  // @media (prefers-contrast: more) block when toggled on. Removed when off.
  document.getElementById(HC_STYLE_ID)?.remove()
  if (isHC) {
    const style = document.createElement('style')
    style.id = HC_STYLE_ID
    // The CSS below relies on the actual @media block already present in
    // index.css — we just hoist the same selector at higher specificity.
    style.textContent = `@media all { ${buildHCRules()} }`
    document.head.appendChild(style)
  }
}

function buildHCRules() {
  // Minimal copy of the per-variant HC overrides. Mirrors the
  // @media (prefers-contrast: more) block in index.css — kept brief
  // because this is dev-only inspection, not a runtime feature.
  let css = ''
  for (const scheme of SCHEMES) {
    const hc = scheme.variants['light-hc']
    const hcDark = scheme.variants['dark-hc']
    const sel = scheme.id === 'parliament@1.0' ? ':root' : `[data-scheme="${schemeName(scheme.id)}"]`
    const selDark = scheme.id === 'parliament@1.0' ? '.dark' : `[data-scheme="${schemeName(scheme.id)}"].dark`
    css += `${sel}{${tokensToCss(hc)}}${selDark}{${tokensToCss(hcDark)}}`
  }
  return css
}

function tokensToCss(tokens) {
  if (!tokens) return ''
  return Object.entries(tokens)
    .map(([key, value]) => {
      const cssKey = key.startsWith('bp-') || key.startsWith('data-series-')
        ? (key.startsWith('data-series-') ? `--token-${key}` : `--${key}`)
        : `--p-${key}`
      return `${cssKey}:${value}`
    })
    .join(';')
}

export default function SchemePicker() {
  const [activeId, setActiveId] = useState('parliament@1.0')
  const [isDark, setIsDark] = useState(false)
  const [isHC, setIsHC] = useState(false)

  useEffect(() => {
    applyScheme(schemeName(activeId), isDark, isHC)
    return () => {
      // Reset to Parliament light on unmount so leaving /catalog doesn't
      // leave the rest of the app in a foreign scheme.
      applyScheme('parliament', false, false)
    }
  }, [activeId, isDark, isHC])

  const variant = `${isDark ? 'dark' : 'light'}${isHC ? '-hc' : ''}`

  return (
    <section className="px-5 py-4 rounded-xl border border-[var(--p-border)] bg-[var(--p-bg-surface)]">
      <header className="mb-4">
        <p className={HEADER_LABEL_CLS}>Scheme picker (dev only)</p>
        <h2 className="text-base font-medium text-[var(--p-text-primary)] mt-1">
          Active: {SCHEMES.find(s => s.id === activeId)?.displayName} / {variant}
        </h2>
        <p className="text-xs text-[var(--p-text-secondary)] mt-1">
          Cycle the active <code>data-scheme</code> attribute on <code>&lt;html&gt;</code> and toggle dark / HC overlays. State resets when you leave this page.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 mb-4">
        {SCHEMES.map(scheme => (
          <SchemeButton
            key={scheme.id}
            scheme={scheme}
            isActive={activeId === scheme.id}
            onClick={() => setActiveId(scheme.id)}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <ToggleButton on={isDark} onClick={() => setIsDark(v => !v)}>
          {isDark ? 'Dark' : 'Light'}
        </ToggleButton>
        <ToggleButton on={isHC} onClick={() => setIsHC(v => !v)}>
          {isHC ? 'High contrast on' : 'High contrast off'}
        </ToggleButton>
      </div>

      <SwatchPreview scheme={SCHEMES.find(s => s.id === activeId)} variant={variant} />
    </section>
  )
}

function SchemeButton({ scheme, isActive, onClick }) {
  const swatch = scheme.variants.light?.gold || scheme.variants.dark?.gold || '#999999'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
        isActive
          ? 'border-[var(--p-gold-light)] bg-[var(--p-bg-subtle)] text-[var(--p-text-primary)]'
          : 'border-[var(--p-border)] bg-[var(--p-bg-surface)] text-[var(--p-text-secondary)] hover:text-[var(--p-text-primary)]'
      }`}
    >
      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: swatch }} />
      {scheme.displayName}
    </button>
  )
}

function ToggleButton({ on, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
        on
          ? 'border-[var(--p-gold-light)] bg-[var(--p-bg-subtle)] text-[var(--p-text-primary)]'
          : 'border-[var(--p-border)] bg-[var(--p-bg-surface)] text-[var(--p-text-secondary)] hover:text-[var(--p-text-primary)]'
      }`}
    >
      {children}
    </button>
  )
}

function SwatchPreview({ scheme, variant }) {
  if (!scheme) return null
  const tokens = scheme.variants[variant]
  if (!tokens) return null
  const swatches = [
    { label: 'Surface', key: 'bg-surface', value: tokens['bg-surface'] },
    { label: 'Subtle', key: 'bg-subtle', value: tokens['bg-subtle'] },
    { label: 'Text', key: 'text-primary', value: tokens['text-primary'] },
    { label: 'Border', key: 'border', value: tokens['border'] },
    { label: 'Accent', key: 'gold', value: tokens['gold'] },
    { label: 'BP wall', key: 'bp-wall', value: tokens['bp-wall'] },
    { label: 'Series 1', key: 'data-series-1', value: tokens['data-series-1'] },
    { label: 'Series 3', key: 'data-series-3', value: tokens['data-series-3'] },
  ]
  return (
    <div className="mt-5 pt-5 border-t border-[var(--p-border-subtle)]">
      <p className={HEADER_LABEL_CLS}>Token snapshot</p>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {swatches.map(s => (
          <div key={s.key} className="flex items-center gap-2">
            <span
              className="w-6 h-6 rounded border border-[var(--p-border)] shrink-0"
              style={{ backgroundColor: s.value }}
            />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-[var(--p-text-muted)]">{s.label}</p>
              <p className="text-xs font-mono text-[var(--p-text-primary)] truncate">{s.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

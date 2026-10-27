// Retired with R14, approved by Stefan on 27 October 2026 (C250 (b)).
// Was src/components/build/wizard/TileGrid.jsx. Nothing imports it and it is not built.
// To restore: move it back with the rest of the old editor and wizard, and put back their routes in App.jsx.
// TileGrid — multi-select tile grid used by Purpose + Device steps (PR-13).
//
// Per parliament_wizard_v5.html lines 227–269 (.tiles2 / .tile). 2-column
// grid; selected tiles get a 1.5px gold border + gold-tint background;
// the icon swatch flips to gold-tint-2.
//
// SVG icons live in TILE_ICONS keyed by tile id.

const TILE_ICONS = {
  // Purposes
  writing: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M11 2l3 3-9 9H2v-3l9-9z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" fill="none" />
    </svg>
  ),
  research: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.1" fill="none" />
      <line x1="10.2" y1="10.2" x2="13.5" y2="13.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  ),
  coding: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <polyline points="5,4 1,8 5,12" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <polyline points="11,4 15,8 11,12" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  ),
  thinking: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 1.5a4.5 4.5 0 00-2.5 8.3v1.7h5V9.8A4.5 4.5 0 008 1.5z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" fill="none" />
      <line x1="6" y1="13" x2="10" y2="13" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      <line x1="6.5" y1="14.5" x2="9.5" y2="14.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  ),
  // Devices
  desktop: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="2.5" width="13" height="9" rx="1" stroke="currentColor" strokeWidth="1.1" />
      <line x1="5" y1="14" x2="11" y2="14" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      <line x1="6.5" y1="11.5" x2="6.5" y2="14" stroke="currentColor" strokeWidth="0.8" />
      <line x1="9.5" y1="11.5" x2="9.5" y2="14" stroke="currentColor" strokeWidth="0.8" />
    </svg>
  ),
  mobile: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="4.5" y="1.5" width="7" height="13" rx="1.2" stroke="currentColor" strokeWidth="1.1" />
      <line x1="7" y1="12.5" x2="9" y2="12.5" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  ),
}

export default function TileGrid({ items, selected, onToggle, cols = 2 }) {
  return (
    <div
      className="grid gap-2 mb-3"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {items.map((it) => {
        const isSel = selected.has(it.id)
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onToggle(it.id)}
            className="rounded-[10px] p-4 text-left transition-colors cursor-pointer"
            style={{
              border: isSel ? '1.5px solid var(--p-gold-light)' : '0.5px solid var(--p-border)',
              background: isSel ? 'var(--p-gold-tint)' : 'var(--p-bg-surface)',
            }}
          >
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center mb-2"
              style={{
                background: isSel ? 'var(--p-gold-tint-2)' : 'var(--p-bg-subtle)',
                color: isSel ? 'var(--p-gold-deep)' : 'var(--p-text-secondary)',
              }}
            >
              {TILE_ICONS[it.id]}
            </div>
            <div className="text-sm font-medium mb-0.5" style={{ color: 'var(--p-text-primary)' }}>
              {it.label}
            </div>
            <div className="text-[11px] leading-[1.4]" style={{ color: 'var(--p-text-secondary)' }}>
              {it.description}
            </div>
          </button>
        )
      })}
    </div>
  )
}

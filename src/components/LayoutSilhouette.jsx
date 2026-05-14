// LayoutSilhouette — per-layout abstract thumbnail (PR-19c).
//
// Replaces the generic "4 equal rectangles" thumbnail used in the editor's
// left-rail Layouts tab before PR-19c. Each layout gets a distinct geometry
// PLUS identifying detail (chat bubbles + input bar for chat layouts,
// scrollbar line on rails, text lines + placement dots for document-centric)
// so users can recognize the layout at a glance without reading the label.
//
// Spec source: parliament_editor_v2 (1).html's `.drag-wire` blocks for the
// base column geometry, extended per PR-19c review (user 2026-05-14) with
// the identifying details inside each rail.

export default function LayoutSilhouette({ layoutId }) {
  // Strip @version if a full ref was passed.
  const id = String(layoutId || '').split('@')[0]

  if (id === 'three-panel')              return <ThreePanel />
  if (id === 'canvas-centric')           return <CanvasCentric />
  if (id === 'document-centric')         return <DocumentCentric />
  if (id === 'single-column-with-sheet') return <SingleColumnWithSheet />
  if (id === 'single-column')            return <SingleColumnWithSheet />
  if (id === 'stacked-sections')         return <StackedSections />

  // Fallback: 3 generic rails (matches the legacy display).
  return (
    <div className="lib-preview layout-silhouette">
      <div className="wr" style={{ flex: 1 }} />
      <div className="wr" style={{ flex: 1 }} />
      <div className="wr dashed" style={{ width: '25%' }} />
    </div>
  )
}

// ─── Three-panel ─────────────────────────────────────────
// [ left rail | center (msg-area + input bar) | right rail w/ scrollbar ]
function ThreePanel() {
  return (
    <div className="lib-preview layout-silhouette">
      {/* left rail */}
      <div className="ls-rail" style={{ width: '18%' }}>
        <span className="ls-line" style={{ width: '70%' }} />
        <span className="ls-line" style={{ width: '50%' }} />
        <span className="ls-line" style={{ width: '60%' }} />
      </div>
      {/* center: bubbles + input bar */}
      <div className="ls-rail ls-center" style={{ flex: 1 }}>
        <span className="ls-bubble assistant" />
        <span className="ls-bubble user" />
        <span className="ls-bubble assistant" />
        <span className="ls-input" />
      </div>
      {/* right rail with scrollbar */}
      <div className="ls-rail dashed" style={{ width: '22%', position: 'relative' }}>
        <span className="ls-line" style={{ width: '60%' }} />
        <span className="ls-line" style={{ width: '40%' }} />
        <span className="ls-scrollbar" />
      </div>
    </div>
  )
}

// ─── Canvas-centric ──────────────────────────────────────
// [ left rail | hatched canvas | right rail with bubbles+input+scrollbar ]
function CanvasCentric() {
  return (
    <div className="lib-preview layout-silhouette">
      <div className="ls-rail" style={{ width: '22%' }}>
        <span className="ls-line" style={{ width: '60%' }} />
        <span className="ls-line" style={{ width: '50%' }} />
      </div>
      <div className="ls-rail ls-canvas" style={{ flex: 1 }}>
        <span className="ls-canvas-hatch" />
      </div>
      <div className="ls-rail" style={{ width: '28%', position: 'relative' }}>
        <span className="ls-bubble assistant small" />
        <span className="ls-bubble user small" />
        <span className="ls-input" />
        <span className="ls-scrollbar" />
      </div>
    </div>
  )
}

// ─── Document-centric ────────────────────────────────────
// [ main (text lines) | side (placement dots) + scrollbar ]
function DocumentCentric() {
  return (
    <div className="lib-preview layout-silhouette">
      <div className="ls-rail ls-doc" style={{ flex: 1 }}>
        <span className="ls-textline" style={{ width: '90%' }} />
        <span className="ls-textline" style={{ width: '85%' }} />
        <span className="ls-textline" style={{ width: '70%' }} />
        <span className="ls-textline" style={{ width: '80%' }} />
        <span className="ls-textline" style={{ width: '60%' }} />
      </div>
      <div className="ls-rail" style={{ width: '30%', position: 'relative' }}>
        <span className="ls-dot" />
        <span className="ls-line" style={{ width: '70%' }} />
        <span className="ls-dot" />
        <span className="ls-line" style={{ width: '50%' }} />
        <span className="ls-scrollbar" />
      </div>
    </div>
  )
}

// ─── Single-column-with-sheet (Pocket Chat) ─────────────
// [ single column: bubbles + input bar at bottom ]
function SingleColumnWithSheet() {
  return (
    <div className="lib-preview layout-silhouette">
      <div className="ls-rail ls-center" style={{ flex: 1 }}>
        <span className="ls-bubble assistant" />
        <span className="ls-bubble user" />
        <span className="ls-bubble assistant" />
        <span className="ls-bubble user" />
        <span className="ls-input" />
      </div>
    </div>
  )
}

// ─── Stacked-sections (homepage) ────────────────────────
// Stacked rows representing homepage sections.
function StackedSections() {
  return (
    <div className="lib-preview layout-silhouette" style={{ flexDirection: 'column' }}>
      <div className="ls-section" />
      <div className="ls-section" />
      <div className="ls-section" />
    </div>
  )
}

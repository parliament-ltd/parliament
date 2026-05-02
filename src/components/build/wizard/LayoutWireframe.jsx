// LayoutWireframe — small / large wireframe previews for the layout
// cards + the preview overlay (PR-13).
//
// Per parliament_wizard_v5.html lines 384–461 (.lcard-wire) and lines
// 901–945 (.lp-preview). Same visual primitives at two sizes; the
// `small` prop swaps in the card-sized version (64px tall).

const SMALL_CONTAINER = {
  width: '100%',
  height: 64,
  borderRadius: 4,
  background: 'var(--p-bg-subtle)',
  border: '0.5px solid var(--p-border-subtle)',
  padding: 6,
  display: 'flex',
  gap: 4,
  position: 'relative',
}

const LARGE_CONTAINER = {
  width: '100%',
  height: 200,
  borderRadius: 6,
  border: '0.5px solid var(--p-border)',
  background: 'var(--p-bg-subtle)',
  padding: 12,
  display: 'flex',
  gap: 8,
}

export default function LayoutWireframe({ id, small = false }) {
  const container = small ? SMALL_CONTAINER : LARGE_CONTAINER
  return <div style={container}>{renderInner(id, small)}</div>
}

function renderInner(id, small) {
  switch (id) {
    case 'three-panel@^1.0':
      return <ThreePanel small={small} />
    case 'canvas-centric@^1.0':
      return <CanvasCentric small={small} />
    case 'document-centric@^1.0':
      return <DocumentCentric small={small} />
    case 'single-column-with-sheet@^1.0':
    default:
      return <SingleColumn small={small} />
  }
}

const wireBorder = { border: '0.5px solid var(--p-text-light)', borderRadius: 2, position: 'relative', overflow: 'hidden' }
const dashedBorder = { ...wireBorder, borderStyle: 'dashed' }

function Dot() {
  return <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--p-text-light)', display: 'inline-block', margin: 1.5 }} />
}
function Line({ width = '70%' }) {
  return <div style={{ height: 1.5, background: 'var(--p-text-light)', borderRadius: 1, margin: '3px 3px 0', width }} />
}
function Bar() {
  return (
    <div style={{
      position: 'absolute', bottom: 3, left: 3, right: 3, height: 4,
      background: 'var(--p-gold-muted)', borderRadius: 1.5, opacity: 0.55,
    }} />
  )
}
function MenuDot() {
  return (
    <div style={{
      position: 'absolute', top: 5, right: 7,
      width: 2, height: 2, borderRadius: '50%',
      background: 'var(--p-text-light)',
      boxShadow: '0 4px 0 var(--p-text-light), 0 8px 0 var(--p-text-light)',
    }} />
  )
}
function CanvasCross() {
  return (
    <div style={{
      position: 'absolute', inset: 3,
      background: `
        linear-gradient(135deg, transparent 49%, var(--p-text-light) 49%, var(--p-text-light) 51%, transparent 51%),
        linear-gradient(45deg, transparent 49%, var(--p-text-light) 49%, var(--p-text-light) 51%, transparent 51%)
      `,
      opacity: 0.4,
    }} />
  )
}

function SingleColumn() {
  return (
    <div style={{ ...wireBorder, flex: 1, paddingBottom: 14 }}>
      <Dot /><Dot /><Dot /><br /><Dot /><Dot />
      <Bar />
      <MenuDot />
    </div>
  )
}

function ThreePanel() {
  return (
    <>
      <div style={{ ...wireBorder, width: '18%' }}>
        <Line width="100%" />
        <Line width="60%" />
        <Line width="80%" />
        <Line width="55%" />
      </div>
      <div style={{ ...wireBorder, flex: 1, paddingBottom: 18 }}>
        <Dot /><Dot /><Dot /><Dot /><Dot />
        <Bar />
      </div>
      <div style={{ ...dashedBorder, width: '22%' }}>
        <Line width="70%" />
        <Line width="50%" />
        <Line width="60%" />
      </div>
    </>
  )
}

function CanvasCentric() {
  return (
    <>
      <div style={{ ...wireBorder, width: '22%' }}>
        <Line width="80%" />
        <Line width="60%" />
        <Line width="70%" />
      </div>
      <div style={{ ...wireBorder, flex: 1 }}>
        <CanvasCross />
      </div>
      <div style={{ ...wireBorder, width: '28%' }}>
        <Line width="75%" />
        <Line width="55%" />
        <Line width="65%" />
        <Line width="50%" />
      </div>
    </>
  )
}

function DocumentCentric() {
  return (
    <>
      <div style={{ ...wireBorder, flex: 1, background: 'var(--p-bg-surface)' }}>
        <div style={{ width: '50%', height: 3, background: 'var(--p-text-secondary)', borderRadius: 1, margin: '6px 3px 0' }} />
        <Line width="100%" />
        <Line width="90%" />
        <Line width="75%" />
        <Line width="85%" />
      </div>
      <div style={{ ...wireBorder, width: '30%' }}>
        <div style={{ padding: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ height: 8, borderRadius: 2, background: 'rgba(196,169,77,0.25)' }} />
          <div style={{ height: 8, borderRadius: 2, background: 'rgba(196,169,77,0.25)', width: '80%' }} />
        </div>
      </div>
    </>
  )
}

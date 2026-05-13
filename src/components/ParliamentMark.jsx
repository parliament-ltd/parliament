// ParliamentMark — the bird-glyph SVG used as the brand anchor.
//
// PR-18f extracted this from the inline copy in HomepageTopBar so it can
// be shared with NarrowChrome (mobile chat topbar) and Pocket Chat
// (single-column-with-sheet). All consumers render at the same intrinsic
// 26×24 viewBox; size is controlled by the width/height props (default
// 18×16 matches the prior HomepageTopBar inline). Uses currentColor so
// the parent's text color drives the fill.

export default function ParliamentMark({ width = 18, height = 16, className }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 26 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect x="0"     y="20" width="26"  height="2.5" rx=".8" fill="currentColor"/>
      <rect x="2"     y="16" width="22"  height="2"   rx=".6" fill="currentColor"/>
      <rect x="4"     y="4"  width="18"  height="2"   rx=".6" fill="currentColor"/>
      <rect x="10"    y="1"  width="6"   height="3"   rx=".6" fill="currentColor"/>
      <rect x="4"     y="6"  width="2.5" height="10"  rx=".6" fill="currentColor"/>
      <rect x="8.75"  y="6"  width="2.5" height="10"  rx=".6" fill="currentColor"/>
      <rect x="13.5"  y="6"  width="2.5" height="10"  rx=".6" fill="currentColor"/>
      <rect x="18.25" y="6"  width="2.5" height="10"  rx=".6" fill="currentColor"/>
    </svg>
  )
}

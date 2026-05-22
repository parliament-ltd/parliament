// blueprint@1.0 — homepage SVG floor-plan renderer (PR-14).
//
// Renders every user-built room as an irregular path on a single SVG
// canvas, with hatched outer wall, faux floor grid, and the system-room
// cards (The Study / The Lab). Replaces the v1 grid of rounded boxes
// that blueprint-preview.jsx shipped at PR-6.
//
// Layout signatures and packing live in src/lib/blueprintShapes.js as
// pure functions; this file is the React adapter that mounts them and
// wires up the hostAPI cross-section hover bus.
//
// PR-19g changes the interaction model: clicking a user room no longer
// navigates straight into it. Instead, it opens RoomDetailsOverlay with
// the room's details and three actions (Copy / Delete / Enter Room).
// Clicking the highlighted room a second time also enters. Room cards
// strip to title-only — pills, layout/scheme/last-spoken, and the
// floating gold pawn all disappear from the in-blueprint view; the
// active room shows a faded grey walking-human icon below the title in
// place of the pawn marker.

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Copy, Trash2, ArrowRight } from 'lucide-react'
import { useConversations } from '../../stores/ConversationContext'
import { listModes, deleteMode, saveMode, createCopyOfMode } from '../../lib/modes'
import { createConversation } from '../../lib/db'
import { PHASE_1_EVENTS } from '../../lib/hostAPI'
import { useIsNarrow } from '../../lib/useViewportWidth'
import { modelLabel } from '../../lib/modelLabels'
import { buildIncludes } from '../../lib/roomIncludes'
import LayoutWireframe from '../../components/build/wizard/LayoutWireframe'
import RoomDetailsOverlay from '../../components/RoomDetailsOverlay'
import {
  packRooms,
  buildRoomPath,
  studyShape,
  labShape,
  SYSTEM_KIND,
  SYSTEM_ROOM_IDS,
} from '../../lib/blueprintShapes'

// ─── Visual constants ────────────────────────────────────────

const WALL_STROKE = '#3A3530'
const WALL_FILL   = '#F5F0E8'
const HATCH_FILL  = 'url(#bp-hatch)'
const FLOOR_GRID  = 'url(#bp-floorgrid)'

// Mini-map redesign: rooms are pure white cards on the dot-textured
// page surface (was cream #F5F0E8 to match the old beige floor).
const ROOM_FILL_DEFAULT = '#FFFFFF'
// PR-23: active-room highlight is the "you are here" signal in
// blueprint-in-chat (and on the homepage when on `/`). Alpha bumped
// 0.10 → 0.22 so the active room reads as visibly highlighted; hover
// and chat-row-highlight bumped proportionally so the visual hierarchy
// is preserved (active < hover < highlit-from-chat).
const ROOM_FILL_ACTIVE  = 'rgba(196, 169, 77, 0.22)'
const ROOM_FILL_HOVER   = 'rgba(196, 169, 77, 0.30)'
const ROOM_FILL_HIGHLIT = 'rgba(196, 169, 77, 0.36)'
// PR-19k followup: selected room fill is now near-opaque. The prior
// 0.22 alpha let the hatched floor pattern bleed through the expanded
// card, making the content panel feel transparent. Solid surface bg
// matches what the wireframe abstract uses inside InlineRoomDetails.
const ROOM_FILL_SELECTED = '#FBF7EE'
const ROOM_BORDER_DEFAULT = '#C8C2B8'
const ROOM_BORDER_ACTIVE  = '#B8A070'

// PR-19g: faded-grey palette for the small in-room icons (walking
// human / compass / wrench). Mirrors PR-19f's system-room icon tint so
// the cards read as the same species.
const IN_ROOM_ICON_COLOR = '#9A9490'

// PR-19j: furniture glyphs rendered along the bottom interior of each
// user room. One glyph per unique component ref. Lucide-style paths
// inlined so we don't add a per-glyph React component import. Each
// returns a fragment of <path>/<rect>/<circle> elements drawn inside a
// 14×14 viewBox; the host <g> wrapper handles translate + opacity.
const GLYPHS = {
  'file-shelf': (
    <>
      <rect x="2" y="3"  width="10" height="2.5" fill="none" />
      <rect x="2" y="6"  width="10" height="2.5" fill="none" />
      <rect x="2" y="9"  width="10" height="2.5" fill="none" />
    </>
  ),
  branches: (
    <>
      <circle cx="3"  cy="3"  r="1.4" fill="none" />
      <circle cx="11" cy="3"  r="1.4" fill="none" />
      <circle cx="7"  cy="11" r="1.4" fill="none" />
      <path d="M3 4.4v3l4 2.2M11 4.4v3l-4 2.2" fill="none" />
    </>
  ),
  highlights: (
    <>
      <path d="M3 9.5l5-5 2 2-5 5H3v-2z" fill="none" />
      <path d="M9 5l1.5-1.5 1.5 1.5L10.5 6.5z" fill="none" />
    </>
  ),
  toc: (
    <>
      <line x1="2" y1="3"  x2="12" y2="3"  />
      <line x1="4" y1="7"  x2="12" y2="7"  />
      <line x1="2" y1="11" x2="10" y2="11" />
    </>
  ),
  notes: (
    <>
      <path d="M2 2h8l2 2v8H2z" fill="none" />
      <path d="M10 2v2h2" fill="none" />
    </>
  ),
  context: (
    <>
      <circle cx="7" cy="7" r="5" fill="none" />
      <path d="M7 4v3l2 1.5" fill="none" />
    </>
  ),
  review: (
    <>
      <line x1="2" y1="3"  x2="9"  y2="3"  />
      <line x1="2" y1="7"  x2="9"  y2="7"  />
      <line x1="2" y1="11" x2="9"  y2="11" />
      <path d="M10.5 9.5l1 1 1.5-2" fill="none" />
    </>
  ),
  'document-canvas': (
    <>
      <path d="M3 1.5h6L11 4v8.5H3z" fill="none" />
      <line x1="5" y1="6"  x2="9" y2="6"  />
      <line x1="5" y1="8.5" x2="9" y2="8.5" />
      <line x1="5" y1="11"  x2="8" y2="11"  />
    </>
  ),
  'chart-canvas': (
    <>
      <line x1="3"  y1="12" x2="3"  y2="8" />
      <line x1="7"  y1="12" x2="7"  y2="5" />
      <line x1="11" y1="12" x2="11" y2="2" />
    </>
  ),
  'table-canvas': (
    <>
      <rect x="2" y="2" width="10" height="10" fill="none" />
      <line x1="2"  y1="5.3" x2="12" y2="5.3" />
      <line x1="2"  y1="8.6" x2="12" y2="8.6" />
      <line x1="5.3" y1="2" x2="5.3" y2="12" />
      <line x1="8.6" y1="2" x2="8.6" y2="12" />
    </>
  ),
  'claude-comments': (
    <>
      <path d="M2 3h10v6H7l-3 3V9H2z" fill="none" />
      <line x1="4" y1="5"  x2="10" y2="5" />
      <line x1="4" y1="7"  x2="8"  y2="7" />
    </>
  ),
  'ripple-analysis': (
    <>
      <path d="M2 5q2.5-2 5 0t5 0" fill="none" />
      <path d="M2 8q2.5-2 5 0t5 0" fill="none" />
      <path d="M2 11q2.5-2 5 0t5 0" fill="none" />
    </>
  ),
  'collab-mode': (
    <>
      <circle cx="4.5"  cy="5.5" r="1.6" fill="none" />
      <circle cx="9.5"  cy="5.5" r="1.6" fill="none" />
      <path d="M2 12c0-2 1.5-3 2.5-3s2.5 1 2.5 3M7 12c0-2 1.5-3 2.5-3S12 10 12 12" fill="none" />
    </>
  ),
  'voice-input': (
    <>
      <rect x="5.5" y="2" width="3" height="6" rx="1.5" fill="none" />
      <path d="M3 7c0 2.5 1.8 4 4 4s4-1.5 4-4" fill="none" />
      <line x1="7" y1="11" x2="7" y2="13" />
    </>
  ),
  'web-search': (
    <>
      <circle cx="7" cy="7" r="5" fill="none" />
      <line x1="2" y1="7" x2="12" y2="7" />
      <path d="M7 2c-2 2-2 8 0 10M7 2c2 2 2 8 0 10" fill="none" />
    </>
  ),
  'file-attach': (
    <>
      <path d="M9.5 3l-5 5a2.5 2.5 0 0 0 3.5 3.5l5-5a4 4 0 0 0-5.5-5.5l-5 5" fill="none" />
    </>
  ),
}

// ─── Component ───────────────────────────────────────────────

export default function BlueprintRender({ hostAPI } = {}) {
  const { conversations } = useConversations()
  const navigate = useNavigate()
  const location = useLocation()
  const [rooms, setRooms] = useState([])
  const [hoveredFromChat, setHoveredFromChat] = useState(null)
  const [hoveredFromBlueprint, setHoveredFromBlueprint] = useState(null)
  // PR-19g: selectedRoomId drives the details overlay + hatch
  // animation over other rooms + scale-up of the selected one.
  // PR-19j (desktop): also drives the per-room inline transform that
  //   expands the selected room to ~65% of canvas while shrinking
  //   the rest to 0.55x. Mobile keeps the bottom-sheet behavior.
  const [selectedRoomId, setSelectedRoomId] = useState(null)
  // PR-29: two-step Copy flow. `copyTarget` holds the source mode while
  // the BlueprintCopyModal is open; `copyToast` is the brief inline
  // confirmation that fades in/out after a successful "Copy as Is."
  const [copyTarget, setCopyTarget] = useState(null)
  const [copyToast, setCopyToast] = useState('')
  // PR-19j: gate the foreignObject details opacity fade-in so it
  // appears AFTER the transform settles. Toggled by an effect that
  // runs a 280ms setTimeout when selectedRoomId becomes truthy.
  const [detailsReady, setDetailsReady] = useState(false)
  // PR-19j: phone-width fallback — expand-in-place doesn't fit a
  //   <768px viewport. Mobile keeps PR-19g's bottom-sheet overlay.
  const isNarrow = useIsNarrow(768)
  const svgRef = useRef(null)
  // PR-32: ref on the bp-wrap div so a document-level mousedown
  // listener can tell whether a click landed OUTSIDE the blueprint
  // entirely (close the selection) vs inside it (let the SVG /
  // sidebar / action card handlers decide).
  const wrapRef = useRef(null)

  // Subscribe to chats@1.0's row-hover bus. Payload = { conversationId | null }.
  useEffect(() => {
    if (!hostAPI?.subscribe) return
    return hostAPI.subscribe(PHASE_1_EVENTS.ROW_HOVER, (payload) => {
      setHoveredFromChat(payload?.conversationId ?? null)
    })
  }, [hostAPI])

  // Load every room mode. Refetches on `homepage-mode-changed` (and on
  // PR-19g's local `room-deleted` event the delete action emits).
  useEffect(() => {
    let cancelled = false
    async function loadAll() {
      try {
        const modes = await listModes({ scope: 'room' })
        if (!cancelled) setRooms(modes || [])
      } catch {
        if (!cancelled) setRooms([])
      }
    }
    loadAll()
    const onChange = () => { loadAll() }
    window.addEventListener('homepage-mode-changed', onChange)
    window.addEventListener('blueprint-rooms-changed', onChange)
    return () => {
      cancelled = true
      window.removeEventListener('homepage-mode-changed', onChange)
      window.removeEventListener('blueprint-rooms-changed', onChange)
    }
  }, [])

  // PR-19j: gate the foreignObject details fade-in. setTimeout cleared
  // synchronously when selectedRoomId changes or clears so a rapid
  // click → deselect → reselect never races. The reset on selection
  // change runs in the cleanup callback so the effect body itself
  // never calls setState synchronously (react-hooks/set-state-in-effect).
  useEffect(() => {
    if (isNarrow || !selectedRoomId) return undefined
    const t = setTimeout(() => setDetailsReady(true), 280)
    return () => {
      clearTimeout(t)
      setDetailsReady(false)
    }
  }, [selectedRoomId, isNarrow])

  // PR-19k: the walking-human marker follows the user's CURRENT
  // location, not the most-recently-updated conversation's room. Derive
  // it from the URL so:
  //   /              → STUDY    (you're on the homepage)
  //   /edit, /edit/* → LAB      (you're in the editor)
  //   /chat/:id      → that conversation's room (user room)
  //   anything else  → null     (no marker)
  // Pre-PR-19k this used the most-recent conversation's room, which
  // meant the marker drifted away from where the user actually was
  // standing (e.g. they'd be on the Study homepage with the figure
  // floating in a stale user room).
  const activeRoomId = useMemo(() => {
    const path = location.pathname
    if (path === '/') return SYSTEM_ROOM_IDS.STUDY
    if (path === '/edit' || path.startsWith('/edit/') || path === '/edit-home') {
      return SYSTEM_ROOM_IDS.LAB
    }
    const chatMatch = path.match(/^\/chat\/([^/]+)/)
    if (chatMatch) {
      const conv = conversations.find(c => c.id === chatMatch[1])
      return conv?.room || null
    }
    return null
  }, [location.pathname, conversations])

  // The room id implied by the chat row currently being hovered.
  const highlightedRoomId = useMemo(() => {
    if (!hoveredFromChat) return null
    const c = conversations.find(c => c.id === hoveredFromChat)
    return c?.room || null
  }, [hoveredFromChat, conversations])

  // Pack into rows + compute viewBox. PR-19f: system rooms pack after
  // user rooms; PR-14 placeholder is gone.
  const layout = useMemo(() => {
    const items = rooms.map(r => ({ id: r.id, layoutRef: r.layout?.ref || '' }))
    return packRooms(items, { includeSystem: true })
  }, [rooms])

  // Quick lookup of room mode by id for label rendering.
  const modesById = useMemo(() => {
    const m = new Map()
    for (const r of rooms) m.set(r.id, r)
    return m
  }, [rooms])

  // Latest conversation per room — fuels Last-used / Last-spoken-to in
  // the details overlay.
  const lastConvByRoomId = useMemo(() => {
    const m = new Map()
    for (const c of conversations) {
      if (!c.room) continue
      const prev = m.get(c.room)
      if (!prev || new Date(c.updatedAt) > new Date(prev.updatedAt)) {
        m.set(c.room, c)
      }
    }
    return m
  }, [conversations])

  // Enter the room: route to the most-recent conversation, or create a
  // fresh one in this room if it has none yet. Same fallback ladder as
  // PR-19c (was the direct-click handler before PR-19g).
  const enterRoom = useCallback(async (roomId) => {
    let last = null
    for (const c of conversations) {
      if (c.room !== roomId) continue
      if (!last || new Date(c.updatedAt) > new Date(last.updatedAt)) last = c
    }
    if (last) {
      navigate(`/chat/${last.id}`)
      return
    }
    try {
      const room = modesById.get(roomId)
      const title = room?.meta?.name || 'New conversation'
      const newConv = await createConversation({ title, room: roomId })
      navigate(`/chat/${newConv.id}`)
    } catch {
      navigate('/build')
    }
  }, [conversations, modesById, navigate])

  // PR-19g: first click opens details. Second click on the already-
  // selected room enters. System rooms keep their direct-navigation
  // behavior (Study → '/', Lab → '/edit').
  const handleRoomClick = useCallback((roomId) => {
    if (selectedRoomId === roomId) {
      setSelectedRoomId(null)
      enterRoom(roomId)
      return
    }
    setSelectedRoomId(roomId)
  }, [selectedRoomId, enterRoom])

  const onOverlayClose = useCallback(() => setSelectedRoomId(null), [])

  const onOverlayEnter = useCallback(() => {
    if (!selectedRoomId) return
    const id = selectedRoomId
    setSelectedRoomId(null)
    enterRoom(id)
  }, [selectedRoomId, enterRoom])

  // PR-29: Copy is now a two-step flow. The Copy button opens
  // BlueprintCopyModal, which offers "Copy Room as Is" (saves +
  // toast, user stays on blueprint) or "Edit new room in The Lab"
  // (saves + navigates to the editor). Previously the Copy button
  // jumped straight to the editor, which felt unexplained.
  const onOverlayCopy = useCallback(() => {
    if (!selectedRoomId) return
    const source = modesById.get(selectedRoomId)
    if (!source) return
    setCopyTarget({ sourceMode: source })
  }, [selectedRoomId, modesById])

  const performCopy = useCallback(async (toLab) => {
    if (!copyTarget) return
    const sourceName = copyTarget.sourceMode?.meta?.name?.trim() || 'this room'
    try {
      const draft = createCopyOfMode(copyTarget.sourceMode)
      const saved = await saveMode(draft)
      setCopyTarget(null)
      setSelectedRoomId(null)
      window.dispatchEvent(new Event('blueprint-rooms-changed'))
      if (toLab) {
        navigate(`/edit/${saved.id}`)
        return
      }
      setCopyToast(`Copied "${sourceName}" to your blueprint`)
      window.setTimeout(() => setCopyToast(''), 2500)
    } catch (err) {
      console.error('Copy Room failed:', err)
      setCopyTarget(null)
    }
  }, [copyTarget, navigate])

  const onOverlayDelete = useCallback(async () => {
    if (!selectedRoomId) return
    const source = modesById.get(selectedRoomId)
    const label = source?.meta?.name || 'this room'
    const ok = window.confirm(`Delete ${label}? Conversations in it will lose their room link.`)
    if (!ok) return
    try {
      await deleteMode(selectedRoomId)
    } catch (err) {
      console.error('Delete Room failed:', err)
    }
    setSelectedRoomId(null)
    window.dispatchEvent(new Event('blueprint-rooms-changed'))
  }, [selectedRoomId, modesById])

  // PR-19j: Esc closes the desktop expand-in-place. Mobile relies on
  // RoomDetailsOverlay's own Esc handler.
  useEffect(() => {
    if (isNarrow || !selectedRoomId) return undefined
    const onKey = (e) => { if (e.key === 'Escape') setSelectedRoomId(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedRoomId, isNarrow])

  // PR-19j: per-room transform style. The selected room scales up to
  // a target percentage of the floorBox and translates to the canvas
  // center; every other room scales down to 0.55x in place. Returns an
  // inline style object suitable for the `<g style>` prop.
  //
  // PR-19k: target shrunk from 65% → 55% of canvas (the freed area lets
  // the action buttons live inside the room instead of below the
  // canvas). The computed scale is also exposed via `selectedRoomScale`
  // so the Room component can counter-scale its interior content to
  // keep title/dates/buttons at native card-pixel sizes.
  // Mini-map redesign: NO in-place enlargement on click. The selected
  // room stays at its mini-map size. Visual feedback comes from
  // (a) the gel container appearing around the room + the action
  // card + Includes sidebar, and (b) all OTHER rooms shrinking to
  // 0.55 + fading to 0.35 opacity (the existing transformFor logic).
  // This avoids clipping for bottom-row rooms in multi-row layouts
  // (a 3x enlargement of a bottom-row room would extend past
  // bp-wrap's bottom edge).
  const selectedRoomScale = useMemo(() => 1, [])

  const transformFor = useCallback((placed) => {
    if (!selectedRoomId || isNarrow) return null
    if (placed.id === selectedRoomId) {
      // PR-29: enlarge in place. Previously the selected room was
      // translated to canvas center on top of the scale, which felt
      // jarring on smaller viewports — the enlarged room could land
      // below the fold and force the user to scroll. Now the room
      // just scales up where it already sits; transform-origin: center
      // + transform-box: fill-box ensures the scale grows symmetrically
      // around the room's own center, so it never feels like it
      // "jumps" sideways.
      return {
        transform: `scale(${selectedRoomScale})`,
        transformOrigin: 'center',
        transformBox: 'fill-box',
        transition: 'transform 280ms ease, opacity 280ms ease',
      }
    }
    return {
      transform: 'scale(0.55)',
      transformOrigin: 'center',
      transformBox: 'fill-box',
      transition: 'transform 280ms ease, opacity 280ms ease',
      opacity: 0.35,
    }
  }, [selectedRoomId, isNarrow, selectedRoomScale])

  // PR-19l: ensure the selected room renders LAST in SVG document
  // order so it sits on top of every other room. (CSS z-index on
  // SVG <g> siblings is unreliable; document order is authoritative.)
  const orderedRooms = useMemo(() => {
    if (!selectedRoomId) return layout.placedRooms
    const others = layout.placedRooms.filter(p => p.id !== selectedRoomId)
    const sel = layout.placedRooms.find(p => p.id === selectedRoomId)
    return sel ? [...others, sel] : layout.placedRooms
  }, [layout.placedRooms, selectedRoomId])

  // Pixel-fractions for positioning the external action card directly
  // below the expanded room. Width matches the expanded room's
  // apparent width; left/bottom track the room's actual scaled box.
  // PR-29: the room no longer translates to viewBox center, so the
  // card position is computed from the room's original center +
  // half-the-scaled-height instead of assuming canvas-center.
  const expandedRoomBox = useMemo(() => {
    if (!selectedRoomId || isNarrow) return null
    const placed = layout.placedRooms.find(p => p.id === selectedRoomId)
    if (!placed) return null
    const w = placed.box.width  * selectedRoomScale
    const h = placed.box.height * selectedRoomScale
    const cx = placed.box.x + placed.box.width  / 2
    const cy = placed.box.y + placed.box.height / 2
    const topY    = cy - h / 2
    const bottomY = cy + h / 2
    const leftX   = cx - w / 2
    const rightX  = cx + w / 2
    return {
      widthPercent:  (w / layout.viewBox.width)  * 100,
      leftPercent:   (cx / layout.viewBox.width)  * 100,
      // PR-30: vertical tracking for the Includes sidebar.
      // PR-31: switched from centerYPercent to topPercent + rightPercent
      // so the sidebar TOP aligns with the room TOP (rather than the
      // sidebar's center sitting on the room's center, which let the
      // bullet list clip when sidebar content was tall). rightPercent
      // lets the sidebar sit 20px to the right of the room's edge
      // instead of pinning to the canvas's right edge.
      topPercent:    (topY    / layout.viewBox.height) * 100,
      bottomPercent: (bottomY / layout.viewBox.height) * 100,
      // PR-33: room center as a percent of canvas height — used by
      // the sidebar's vertical flip-side logic (bottom-half rooms
      // get bottom-aligned with the room so the panel grows upward
      // and never clips past bp-wrap's bottom edge).
      centerYPercent: (cy / layout.viewBox.height) * 100,
      // PR-32: leftEdgePercent + rightPercent let the sidebar pick
      // a side. When the room sits in the right half of the canvas,
      // a 240px sidebar 20px past the room's right edge would
      // overflow the bp-wrap — we flip it to the LEFT instead.
      leftEdgePercent: (leftX  / layout.viewBox.width) * 100,
      rightPercent:    (rightX / layout.viewBox.width) * 100,
    }
  }, [selectedRoomId, isNarrow, layout, selectedRoomScale])

  // PR-19j: identity transition style applied to non-selected state so
  // rooms ease back to their natural position when the user deselects.
  // Without this the `style.transform` jumps from a value to undefined,
  // which CSS treats as "no transition".
  const idleTransformStyle = useMemo(() => ({
    transform: 'translate(0px, 0px) scale(1)',
    transformOrigin: 'center',
    transformBox: 'fill-box',
    transition: 'transform 280ms ease, opacity 280ms ease',
  }), [])

  const onCanvasClick = useCallback(() => {
    // PR-32: any click that bubbles to the SVG (i.e. not on a room,
    // since rooms stopPropagation) closes the selection. Previously
    // this required `e.target === e.currentTarget`, which missed
    // clicks on inner SVG elements like the floor <rect>, the wall
    // border, or the hatch pattern — those felt like "empty space"
    // to the user but didn't actually close the expansion.
    if (selectedRoomId) {
      setSelectedRoomId(null)
    }
  }, [selectedRoomId])

  // PR-32: close the expanded room when the user clicks anywhere
  // outside bp-wrap (e.g. the homepage's surrounding chrome, the
  // favorites section). Clicks inside bp-wrap on rooms / the SVG /
  // the sidebar / the action card / the Copy modal are all DOM
  // descendants of wrapRef, so .contains() catches them and we
  // don't close. mousedown rather than click so we fire ahead of
  // any bubbling click handler the surrounding page might have.
  useEffect(() => {
    if (!selectedRoomId || isNarrow) return undefined
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setSelectedRoomId(null)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [selectedRoomId, isNarrow])

  // PR-19j: precompute the selected mode + its last conversation +
  // includes — the sidebar and the foreignObject details share this
  // data. PR-19k: pills are dropped from the expanded room (sidebar's
  // Includes carries the same info more legibly).
  const selectedMode = selectedRoomId ? modesById.get(selectedRoomId) : null
  const selectedLastConv = selectedRoomId ? lastConvByRoomId.get(selectedRoomId) || null : null
  const selectedIncludes = useMemo(() => buildIncludes(selectedMode), [selectedMode])

  // Mini-map redesign: gel container — a translucent backdrop that
  // appears when a room is selected, hugging the union of the
  // enlarged room + action card + Includes sidebar. Implemented as
  // three absolute-positioned rounded divs inside a group with
  // opacity 0.30 — the group opacity composites the union as a
  // single shape, avoiding alpha buildup at internal joints. Each
  // gel cell is inflated 10px around the underlying card so it forms
  // a halo; the 20px gap between cards exactly matches twice the
  // halo radius, so adjacent cells touch seamlessly. The resulting
  // outline is non-rectangular (L or T shaped depending on which
  // half of the canvas the room sits in) and visually grows around
  // the three card components.
  //
  // Heights for the action card (44px) and sidebar (~200px) are
  // estimates; a ref-based measurement pass is the obvious next
  // step if the eyeballed sizes drift from reality.
  const gelOnLeft   = expandedRoomBox ? expandedRoomBox.leftPercent  >= 50 : false
  const gelOnBottom = expandedRoomBox ? expandedRoomBox.centerYPercent >= 50 : false

  return (
    <div
      ref={wrapRef}
      className={`bp-wrap${selectedRoomId && !isNarrow ? ' bp-wrap-selected' : ''}`}
    >
      {/* Gel container — rendered BEFORE the SVG so it sits behind
          the rooms (SVG has explicit z-index 2; gel has z-index 1).
          Opacity fades in/out with the selection. Halo padding is
          14px on each side; with the 20px gap between cards, the
          halos slightly overlap (4px) to form a connected blob. */}
      {!isNarrow && expandedRoomBox && (
        <div
          className={`bp-gel-frame${detailsReady && selectedRoomId ? ' show' : ''}`}
          aria-hidden="true"
        >
          {/* Room halo */}
          <div
            className="bp-gel-cell"
            style={{
              left: `calc(${expandedRoomBox.leftEdgePercent}% - 14px)`,
              top: `calc(${expandedRoomBox.topPercent}% - 14px)`,
              width: `calc(${expandedRoomBox.widthPercent}% + 28px)`,
              height: `calc(${expandedRoomBox.bottomPercent - expandedRoomBox.topPercent}% + 28px)`,
            }}
          />
          {/* Action card halo (below the room, same width, centered) */}
          <div
            className="bp-gel-cell"
            style={{
              left: `calc(${expandedRoomBox.leftEdgePercent}% - 14px)`,
              top: `calc(${expandedRoomBox.bottomPercent}% + 6px)`,
              width: `calc(${expandedRoomBox.widthPercent}% + 28px)`,
              height: '72px',
            }}
          />
          {/* Sidebar halo (left/right + top/bottom flip per PR-32/33) */}
          <div
            className="bp-gel-cell"
            style={{
              ...(gelOnLeft
                ? { right: `calc(${100 - expandedRoomBox.leftEdgePercent}% + 6px)`, left: 'auto' }
                : { left:  `calc(${expandedRoomBox.rightPercent}% + 6px)`,           right: 'auto' }
              ),
              ...(gelOnBottom
                ? { bottom: `calc(${100 - expandedRoomBox.bottomPercent}% - 14px)`, top: 'auto' }
                : { top:    `calc(${expandedRoomBox.topPercent}% - 14px)`,          bottom: 'auto' }
              ),
              width: '268px',
              height: '220px',
            }}
          />
        </div>
      )}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${layout.viewBox.width} ${layout.viewBox.height}`}
        xmlns="http://www.w3.org/2000/svg"
        className="block w-full h-auto bp-svg"
        role="img"
        aria-label="Blueprint floor plan of your rooms"
        onClick={onCanvasClick}
      >
        <defs>
          {/* Hatch-light is still used by .bp-room-hatch-overlay when
              a non-selected room is dimmed during expand-in-place.
              The heavy hatched outer wall + floor grid + dark wall
              stroke from PR-14/16a were dropped in the mini-map
              redesign — bp-wrap now carries the dot-textured
              chat-page-bg backdrop, so the rooms read as little
              cards on the same page surface as the chat/editor. */}
          <pattern id="bp-hatch-light" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="4" stroke="#DDD8D0" strokeWidth="0.8" />
          </pattern>
        </defs>

        {/* Rooms + system cards. PR-19l: orderedRooms puts the selected
            room last so it draws on top of every other room. */}
        {orderedRooms.map(placed => {
          const transformStyle = transformFor(placed) || idleTransformStyle
          if (placed.kind === SYSTEM_KIND) {
            const isStudy = placed.id === SYSTEM_ROOM_IDS.STUDY
            return (
              <SystemRoom
                key={placed.id}
                placed={placed}
                isStudy={isStudy}
                isHovered={placed.id === hoveredFromBlueprint}
                isDimmed={Boolean(selectedRoomId)}
                isCurrent={placed.id === activeRoomId}
                transformStyle={transformStyle}
                onEnter={() => setHoveredFromBlueprint(placed.id)}
                onLeave={() => setHoveredFromBlueprint(null)}
                onClick={(e) => {
                  if (selectedRoomId) {
                    e.stopPropagation()
                    setSelectedRoomId(null)
                    return
                  }
                  navigate(isStudy ? '/' : '/edit')
                }}
              />
            )
          }
          const isSelected = placed.id === selectedRoomId
          const isDimmed = Boolean(selectedRoomId) && !isSelected
          return (
            <Room
              key={placed.id}
              placed={placed}
              mode={modesById.get(placed.id)}
              isActive={placed.id === activeRoomId}
              isHighlitFromChat={placed.id === highlightedRoomId}
              isHovered={placed.id === hoveredFromBlueprint}
              isSelected={isSelected}
              isDimmed={isDimmed}
              transformStyle={transformStyle}
              onEnter={() => setHoveredFromBlueprint(placed.id)}
              onLeave={() => setHoveredFromBlueprint(null)}
              onClick={(e) => {
                e.stopPropagation()
                handleRoomClick(placed.id)
              }}
            />
          )
        })}

        {/* PR-14's DimensionTicks (first-room top tick + right-edge
            floor tick) are dropped from the mini-map redesign — at
            half-size the small annotation text reads as noise rather
            than informative. The component still exists below for
            potential later reintroduction. */}
      </svg>

      {/* PR-19j: desktop renders the details inline (inside the
          expanded room <foreignObject> + a sidebar to the right +
          an action strip below). Mobile still uses the bottom-sheet
          overlay.
          PR-30:
            - Sidebar tracks the selected room's vertical center
              via expandedRoomBox.centerYPercent (was canvas-50%).
            - Dates row + Desktop/Mobile pill moved out of the
              enlarged room into the sidebar header so the room
              itself stays quiet (just its name + wireframe).
       */}
      {!isNarrow && selectedRoomId && (() => {
        // PR-32: horizontal flip — room in right half puts sidebar
        //        on its LEFT instead of overflowing bp-wrap.
        // PR-33: vertical flip — room in bottom half bottom-aligns
        //        the sidebar with the room bottom (extends upward),
        //        so the panel never clips past bp-wrap's bottom edge.
        const onLeft = expandedRoomBox && expandedRoomBox.leftPercent  >= 50
        const onBottom = expandedRoomBox && expandedRoomBox.centerYPercent >= 50
        const sidebarStyle = !expandedRoomBox ? undefined : {
          ...(onLeft
            ? { right: `calc(${100 - expandedRoomBox.leftEdgePercent}% + 20px)`, left: 'auto' }
            : { left:  `calc(${expandedRoomBox.rightPercent}% + 20px)`,           right: 'auto' }
          ),
          ...(onBottom
            ? { bottom: `calc(${100 - expandedRoomBox.bottomPercent}%)`, top: 'auto' }
            : { top:    `${expandedRoomBox.topPercent}%`,                 bottom: 'auto' }
          ),
        }
        return (
        <aside
          className={`bp-includes-sidebar${detailsReady ? ' show' : ''}`}
          data-side={onLeft ? 'left' : 'right'}
          data-vside={onBottom ? 'bottom' : 'top'}
          aria-label={`Includes for ${selectedMode?.meta?.name || 'this room'}`}
          style={sidebarStyle}
        >
          {(() => {
            const created   = fmtShortDate(selectedMode?.meta?.created)
            const lastUsed  = selectedLastConv ? fmtShortDate(selectedLastConv.updatedAt) : null
            const lastModel = selectedLastConv ? modelLabel(selectedLastConv.model)        : null
            const deviceLabel = selectedMode?.deviceClass === 'visual-touch-phone'
              ? 'Mobile' : 'Desktop'
            const hasDates = created || lastUsed || lastModel
            return (
              <>
                {hasDates && (
                  <dl className="ov-dates">
                    {created   && <><dt>Created</dt><dd>{created}</dd></>}
                    {lastUsed  && <><dt>Last used</dt><dd>{lastUsed}</dd></>}
                    {lastModel && <><dt>Last spoken to</dt><dd>{lastModel}</dd></>}
                  </dl>
                )}
                <div className="ov-device-pill">{deviceLabel}</div>
              </>
            )
          })()}

          <div className="ov-section-label">Includes</div>
          {selectedIncludes.length > 0 ? (
            <ul className="ov-includes">
              {selectedIncludes.map((it, i) => (
                <li key={`${it.kind}-${it.name}-${i}`}>
                  <span className="ov-inc-name">{it.name}</span>
                  {it.desc && <span className="ov-inc-desc">{it.desc}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <div className="ov-desc" style={{ opacity: 0.7 }}>
              Nothing in this room yet.
            </div>
          )}
        </aside>
        )
      })()}

      {/* PR-19l: action card positioned directly below the expanded
          room — same width as the room, center-aligned. Width + top
          come from `expandedRoomBox` so the card tracks the room as it
          scales. (Was briefly inside the room in PR-19k, but the
          buttons read more clearly outside the room frame.) */}
      {!isNarrow && selectedRoomId && expandedRoomBox && (
        <div
          className={`bp-action-card${detailsReady ? ' show' : ''}`}
          style={{
            width: `${expandedRoomBox.widthPercent}%`,
            left: `${expandedRoomBox.leftPercent}%`,
            top: `calc(${expandedRoomBox.bottomPercent}% + 20px)`,
          }}
        >
          <button type="button" className="tb-btn" onClick={onOverlayCopy}>
            <Copy className="inline-block w-3 h-3 mr-1 -mt-px" />
            Copy
          </button>
          <button
            type="button"
            className="tb-btn"
            onClick={onOverlayDelete}
            style={{ color: '#C5342A', borderColor: '#E0A8A8' }}
          >
            <Trash2 className="inline-block w-3 h-3 mr-1 -mt-px" />
            Delete
          </button>
          <button type="button" className="tb-btn primary" onClick={onOverlayEnter}>
            Enter
            <ArrowRight className="inline-block w-3 h-3 ml-1 -mt-px" />
          </button>
        </div>
      )}

      {/* Mobile-only bottom-sheet overlay. PR-19g shape preserved. */}
      {isNarrow && (
        <RoomDetailsOverlay
          room={selectedMode}
          lastConv={selectedLastConv}
          onClose={onOverlayClose}
          onEnter={onOverlayEnter}
          onCopy={onOverlayCopy}
          onDelete={onOverlayDelete}
        />
      )}

      {/* PR-29: copy-flow modal. Opens when the user picks Copy
          from either the desktop action card or the mobile overlay. */}
      {copyTarget && (
        <BlueprintCopyModal
          sourceName={copyTarget.sourceMode?.meta?.name?.trim() || 'this room'}
          onClose={() => setCopyTarget(null)}
          onCopyAsIs={() => performCopy(false)}
          onCopyToLab={() => performCopy(true)}
        />
      )}

      {/* PR-29: brief inline confirmation when "Copy as Is" succeeds. */}
      {copyToast && <div className="bp-copy-toast">{copyToast}</div>}
    </div>
  )
}

// PR-29: confirmation modal for the Copy button on a blueprint room.
// Two actions: "Copy Room as Is" stays on the blueprint with a toast;
// "Edit new room in The Lab" navigates to the editor with the fresh
// copy loaded. Naming the room happens in the Lab (or never — the
// copy ships with a sensible default name).
function BlueprintCopyModal({ sourceName, onClose, onCopyAsIs, onCopyToLab }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[160] flex items-center justify-center p-5"
      style={{ backgroundColor: 'rgba(25, 25, 25, 0.32)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-[440px] max-w-[94vw] bg-[var(--p-bg-surface)] border border-[var(--p-border)] rounded-xl shadow-2xl shadow-black/20 p-5 flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-base font-medium text-[var(--p-text-primary)]">
          Copy &ldquo;{sourceName}&rdquo;?
        </div>
        <div className="text-[12.5px] text-[var(--p-text-secondary)] leading-[1.55]">
          Make a fresh copy of this room. You can use it right away, or
          customize it in The Lab first — your choice.
        </div>
        <div className="flex items-center justify-end gap-2 pt-2 flex-wrap">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--p-border)] bg-transparent text-[var(--p-text-secondary)] hover:border-[var(--p-gold-light)] hover:text-[var(--p-gold-light)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onCopyAsIs}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--p-border)] bg-transparent text-[var(--p-text-primary)] hover:border-[var(--p-gold-light)] hover:bg-[rgba(196,169,77,0.06)] transition-colors"
          >
            Copy Room as Is
          </button>
          <button
            onClick={onCopyToLab}
            className="px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--p-gold-light)] bg-[var(--p-gold-light)] text-white hover:bg-[var(--p-gold-muted)] hover:border-[var(--p-gold-muted)] transition-colors"
          >
            Edit new room in The Lab
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Walking-human icon (PR-19g; bob + glow added in PR-19j) ─────
// Replaces the gold pawn marker. Renders inside the active room below
// the title; faded grey by default, gold-deep on hover. Triggers the
// "You are here" tooltip via the parent's onHereTipShow callback.
//
// PR-19j: paired with a soft gold glow circle behind it; both gently
// pulse via CSS keyframes gated on `prefers-reduced-motion: no-preference`.
function WalkingHuman({ x, y, color = IN_ROOM_ICON_COLOR, onShow, onHide }) {
  const scale = 0.7
  // 24×24 lucide-style PersonStanding silhouette: head, torso, legs.
  return (
    <g
      style={{ cursor: 'help' }}
      onMouseEnter={(e) => onShow?.({ x: e.clientX, y: e.clientY })}
      onMouseMove={(e) => onShow?.({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => onHide?.()}
    >
      {/* Glow circle behind the figure — pulses in sync with the bob */}
      <circle
        cx={x}
        cy={y + 1}
        r="11"
        fill="#D4A843"
        className="bp-walking-human-glow"
      />
      {/* PR-19k: the bob animation lives on an INNER <g> so the outer
          <g> keeps its inline SVG transform attribute. (CSS `transform`
          on an SVG element replaces — not composes with — the SVG
          `transform` attribute, so animating both on the same element
          drops the positioning and the figure renders at viewBox 0,0.) */}
      <g transform={`translate(${x - 8.4} ${y - 8.4}) scale(${scale})`}>
        <g className="bp-walking-human-bob">
          {/* Head */}
          <circle cx="12" cy="4" r="2.2" fill="none" stroke={color} strokeWidth="1.4" />
          {/* Body + arms */}
          <path
            d="M9 12 12 7l3 5"
            fill="none"
            stroke={color}
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Stepping leg + standing leg */}
          <path
            d="M12 12l-2.5 8M12 12l3 4 0 4"
            fill="none"
            stroke={color}
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>
    </g>
  )
}

// PR-19j: small furniture glyph rendered along the bottom interior of
// each user room. One per unique component ref. Translated into place
// by `furniturePositions`; the GLYPHS map provides the path body.
function FurnitureGlyph({ x, y, refName }) {
  const body = GLYPHS[refName]
  if (!body) return null
  return (
    <g
      transform={`translate(${x} ${y})`}
      className="bp-furniture-glyph"
      aria-hidden="true"
    >
      {body}
    </g>
  )
}

// ─── Subcomponents ───────────────────────────────────────────

// Mini-map redesign: room subcomponent is just SHAPE + TITLE. The
// activity dots, dashed wall hints, walking-human icon, furniture
// glyphs, and foreignObject inline details from PR-19g/19j are all
// gone. When the room is selected, the entire SVG <g> scales up via
// transformStyle and the title scales with it — no counter-scale
// machinery needed.
function Room({
  placed,
  mode,
  isActive,
  isHighlitFromChat,
  isHovered,
  isSelected,
  isDimmed,
  transformStyle,
  onEnter,
  onLeave,
  onClick,
}) {
  const { box, layoutRef, id } = placed
  const { path, interior } = buildRoomPath({ box, layoutRef, roomId: id })
  const cx = interior.x + interior.width / 2
  const cy = interior.y + interior.height / 2

  let fill = ROOM_FILL_DEFAULT
  if (isActive) fill = ROOM_FILL_ACTIVE
  if (isHovered) fill = ROOM_FILL_HOVER
  if (isHighlitFromChat) fill = ROOM_FILL_HIGHLIT
  if (isSelected) fill = ROOM_FILL_SELECTED

  const stroke = (isActive || isHovered || isHighlitFromChat || isSelected)
    ? ROOM_BORDER_ACTIVE
    : ROOM_BORDER_DEFAULT
  const strokeWidth = isActive || isSelected ? 1.5 : 0.5

  const name = (mode?.meta?.name || mode?.id || 'Room').toUpperCase()

  // Title placement: centered. THE prefix sits 7px above NAME so the
  // two-line block reads as one anchored unit, sized for the smaller
  // mini-map fonts (3.5 / 4.5).
  const nameY = cy + 3
  const theY = nameY - 6

  return (
    <g
      className={isSelected ? 'bp-room-selected' : undefined}
      style={{ cursor: 'pointer', ...(transformStyle || {}) }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      {/* Fill */}
      <path d={path} fill={fill} className="bp-room-fill" />

      {/* Border. vectorEffect:non-scaling-stroke keeps the stroke
          width constant even when the parent <g> is scaled (for
          the expand-in-place selection). */}
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
      />

      {/* Title block — THE / NAME, centered. Mini-map redesign
          dropped everything else from inside the room (activity
          dots, dashed wall hints, walking-human, furniture glyphs,
          foreignObject inline details). The room is now JUST its
          shape + title; when selected and enlarged, the SVG text
          scales up with the <g>, so the title becomes readable
          without any foreignObject / counter-scale machinery. */}
      <text x={cx} y={theY} textAnchor="middle" fontSize="3.5" fill="#9A9490" letterSpacing="0.08em" fontWeight="500">
        THE
      </text>
      <text x={cx} y={nameY} textAnchor="middle" fontSize="4.5" fill={isActive ? '#8B6A10' : '#5A5550'} letterSpacing="0.06em" fontWeight="600">
        {name}
      </text>

      {/* Hatch overlay for non-selected rooms when a selection is
          active. Same path, hatched fill, faded in via CSS. */}
      <path
        d={path}
        fill="url(#bp-hatch-light)"
        className={`bp-room-hatch-overlay${isDimmed ? ' show' : ''}`}
      />
    </g>
  )
}

// PR-19j: HTML content rendered inside the expanded room's
// `<foreignObject>`. Kept simple (no shadows, no scroll) for
// foreignObject paint reliability on Safari ≤16.
//
// PR-19k: restructured to a single vertical stack — name → wireframe
// → dates. Pills are dropped (the sidebar's Includes list already
// enumerates the same components in more readable form). The
// wireframe gets an opaque background + thin border so it reads
// clearly against the room's scheme tint. All content here renders
// at native card-pixel sizes thanks to the parent div's counter-
// scale transform.
//
// PR-19l: action buttons (Copy / Delete / Enter) moved BACK out into
// an external `.bp-action-card` positioned below the room — they read
// more clearly outside the room frame.
// PR-30: trimmed to title + abstract wireframe only. The dates row
// and the device-class pill moved to the Includes sidebar so the
// enlarged room can stay quiet (just its name and a hint of its
// shape) and all the metadata clusters together in one place.
function InlineRoomDetails({ mode, isActive }) {
  if (!mode) return null
  const layoutRef = mode.layout?.ref
  const name = (mode?.meta?.name || mode?.id || 'Room').toUpperCase()
  return (
    <div className="bp-inline-details">
      <div className="bp-inline-title">
        <span className="bp-inline-the">THE</span>
        <span
          className="bp-inline-name"
          style={{ color: isActive ? '#8B6A10' : '#5A5550' }}
        >
          {name}
        </span>
      </div>
      {layoutRef && (
        <div className="bp-inline-layout">
          <div className="bp-inline-layout-img">
            <LayoutWireframe id={layoutRef} small />
          </div>
        </div>
      )}
    </div>
  )
}

function fmtShortDate(iso) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch { return null }
}

// Mini-map redesign: SystemRoom is just SHAPE + TITLE — same as Room.
// PR-19g's compass/wrench identity icon and PR-19k's walking-human
// "you are here" indicator are both gone. Study/Lab are differentiated
// from user rooms by their signature shape (Study's bottom-left
// chamfer, Lab's top-right notch) and by their THE STUDY / THE LAB
// titles.
function SystemRoom({ placed, isStudy, isHovered, isDimmed, isCurrent, transformStyle, onEnter, onLeave, onClick }) {
  const { box } = placed
  const { path, interior } = isStudy ? studyShape(box) : labShape(box)
  const cx = interior.x + interior.width / 2
  const cy = interior.y + interior.height / 2
  const name = isStudy ? 'STUDY' : 'LAB'

  // Mini-map system-room palette. isCurrent (user is on / for Study
  // or /edit for Lab) bumps the tint up to match the active user-room
  // ACTIVE fill alpha so "you are here" stays signalled even without
  // the walking-human icon.
  const baseAlpha = isCurrent ? 0.22 : 0.035
  const hoverAlpha = 0.30
  const fill = isHovered ? `rgba(196,169,77,${hoverAlpha})` : `rgba(196,169,77,${baseAlpha})`
  const stroke = (isHovered || isCurrent) ? '#B8A070' : '#C8C2B8'
  const labelColor = (isHovered || isCurrent) ? '#8B6A10' : '#5A5550'

  const nameY = cy + 3
  const theY = nameY - 6

  return (
    <g
      style={{ cursor: 'pointer', ...(transformStyle || {}) }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      {/* Opaque white base so the dot-textured bp-wrap doesn't show
          through the room's translucent gold tint. */}
      <path d={path} fill={ROOM_FILL_DEFAULT} />
      <path d={path} fill={fill} className="bp-room-fill" />
      <path d={path} fill="none" stroke={stroke} strokeWidth={isCurrent ? 1.5 : 0.8} vectorEffect="non-scaling-stroke" />

      <text x={cx} y={theY} textAnchor="middle" fontSize="3.5" fill="#9A9490" letterSpacing="0.08em" fontWeight="500">
        THE
      </text>
      <text x={cx} y={nameY} textAnchor="middle" fontSize="4.5" fill={labelColor} letterSpacing="0.06em" fontWeight="600">
        {name}
      </text>

      {/* Hatch overlay when a user room is selected so the system
          cards also dim in sympathy with the rest of the floor. */}
      <path
        d={path}
        fill="url(#bp-hatch-light)"
        className={`bp-room-hatch-overlay${isDimmed ? ' show' : ''}`}
      />
    </g>
  )
}

function DimensionTicks({ layout, modesById }) {
  // Tick the first user room across the top edge with its name; tick
  // the right edge of the floor.
  const realRooms = layout.placedRooms.filter(r => r.kind === 'room')
  if (realRooms.length === 0) return null
  const first = realRooms[0]
  const firstName = modesById.get(first.id)?.meta?.name || 'Room'
  const tickTop = layout.floorBox.y - 12
  const tickRight = layout.floorBox.x + layout.floorBox.width + 22
  const colHeight = layout.floorBox.height
  return (
    <g>
      <line x1={first.box.x} y1={tickTop} x2={first.box.x + first.box.width} y2={tickTop} stroke="#C8C2B8" strokeWidth="0.5" />
      <line x1={first.box.x} y1={tickTop - 3} x2={first.box.x} y2={tickTop + 3} stroke="#C8C2B8" strokeWidth="0.5" />
      <line x1={first.box.x + first.box.width} y1={tickTop - 3} x2={first.box.x + first.box.width} y2={tickTop + 3} stroke="#C8C2B8" strokeWidth="0.5" />
      <text x={first.box.x + first.box.width / 2} y={tickTop - 4} textAnchor="middle" fontSize="8" fill="#B8B2A8">
        {firstName} · {first.box.width}px
      </text>
      <line x1={tickRight} y1={layout.floorBox.y} x2={tickRight} y2={layout.floorBox.y + colHeight} stroke="#C8C2B8" strokeWidth="0.5" />
      <line x1={tickRight - 3} y1={layout.floorBox.y} x2={tickRight + 3} y2={layout.floorBox.y} stroke="#C8C2B8" strokeWidth="0.5" />
      <line x1={tickRight - 3} y1={layout.floorBox.y + colHeight} x2={tickRight + 3} y2={layout.floorBox.y + colHeight} stroke="#C8C2B8" strokeWidth="0.5" />
    </g>
  )
}

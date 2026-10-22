// Retired with R1, approved by Stefan on 22 October 2026: The homepage's Blueprint section, drawn.
// Was src/catalog/entries/blueprint-render.jsx. Nothing imports it and it is not built. To restore:
// Move it back with blueprint.jsx.

// blueprint@1.0 — homepage SVG floor-plan renderer.
//
// Renders every user-built room as an irregular path on a single SVG
// canvas + system rooms (The Study / The Lab). Layout signatures and
// packing live in src/lib/blueprintShapes.js; this file is the React
// adapter that mounts them, wires the hostAPI cross-section hover bus,
// and opens the room modal on selection.
//
// PR-40 redesign:
// - Outer chrome adopts the architectural-blueprint look from the
//   mockup at refactor/blueprint_with_room_modal.html: a dark
//   3.5px CSS border on `.bp-wrap` + a concentric 4px SVG wall stroke
//   around the cream `floorBox`. The strip between the two carries
//   the warm-cream `#EDE6D8` + dot texture and reads as the "outside
//   the building" zone.
// - Selection no longer expands in place. Clicking a room opens
//   `BlueprintRoomModal` — a centered 2-pane card with title +
//   wireframe + actions on the left and Created / device chip /
//   Includes list on the right. Replaces the PR-19g
//   RoomDetailsOverlay (mobile) AND the PR-39 in-place expand
//   apparatus (HTML overlay, sidebar, action card, gel).
// - The active room gets a small gold map-pin marker with pulsing
//   ring — same "you are here" affordance the old WalkingHuman
//   icon carried, drawn as a pin glyph to fit the architectural
//   theme.
// - Dimension ticks return over the top-row user rooms — a small
//   horizontal line + width label that reads as architect's
//   annotations.

import { useEffect, useMemo, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import { Copy, Trash2, ArrowRight } from 'lucide-react'
import { useConversations } from '../../stores/ConversationContext'
import { listModes, deleteMode, saveMode, createCopyOfMode } from '../../lib/modes'
import { createConversation } from '../../lib/db'
import { PHASE_1_EVENTS } from '../../lib/hostAPI'
import { modelLabel } from '../../lib/modelLabels'
import { buildIncludes } from '../../lib/roomIncludes'
import LayoutSilhouette from '../../components/LayoutSilhouette'
import {
  packRooms,
  buildRoomPath,
  studyShape,
  labShape,
  SYSTEM_KIND,
  SYSTEM_ROOM_IDS,
  ROOM_CONTAINER_PAD,
  ROOM_CONTAINER_ENTRY_GAP,
} from '../../lib/blueprintShapes'

// ─── Visual constants ────────────────────────────────────────
// PR-40 palette — matches the mockup at
// refactor/blueprint_with_room_modal.html.

const WALL_STROKE       = '#3A3530'   // dark outer wall
const ROOM_FILL_DEFAULT = '#F8F4EC'
const ROOM_FILL_HOVER   = 'rgba(196, 169, 77, 0.08)'
const ROOM_FILL_ACTIVE  = 'rgba(196, 169, 77, 0.22)'
const ROOM_FILL_HIGHLIT = 'rgba(196, 169, 77, 0.30)'
const ROOM_BORDER_DEFAULT = '#A8A298'
const ROOM_BORDER_ACTIVE  = '#B8A070'
const ROOM_NAME_COLOR_DEFAULT = '#8B8578'
const ROOM_NAME_COLOR_ACTIVE  = '#8B6A10'

// ─── Component ───────────────────────────────────────────────

export default function BlueprintRender({ hostAPI } = {}) {
  const { conversations } = useConversations()
  const navigate = useNavigate()
  const location = useLocation()
  const [rooms, setRooms] = useState([])
  const [hoveredFromChat, setHoveredFromChat] = useState(null)
  const [hoveredFromBlueprint, setHoveredFromBlueprint] = useState(null)
  // PR-40: clicking a room opens a centered modal (BlueprintRoomModal).
  // Replaces the PR-19g selection apparatus + PR-39 in-place expand.
  const [modalRoomId, setModalRoomId] = useState(null)
  // PR-29: two-step Copy flow. `copyTarget` holds the source mode while
  // the BlueprintCopyModal is open; `copyToast` is the brief inline
  // confirmation that fades in/out after a successful "Copy as Is."
  const [copyTarget, setCopyTarget] = useState(null)
  const [copyToast, setCopyToast] = useState('')

  // Subscribe to chats@1.0's row-hover bus. Payload = { conversationId | null }.
  useEffect(() => {
    if (!hostAPI?.subscribe) return
    return hostAPI.subscribe(PHASE_1_EVENTS.ROW_HOVER, (payload) => {
      setHoveredFromChat(payload?.conversationId ?? null)
    })
  }, [hostAPI])

  // Load every room mode. Refetches on `homepage-mode-changed` and on
  // the local `blueprint-rooms-changed` event delete + copy emit.
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

  // PR-19k: the map-pin marker follows the user's CURRENT location,
  // not the most-recently-updated conversation's room. Derive it from
  // the URL so:
  //   /              → STUDY
  //   /edit, /edit/* → LAB
  //   /chat/:id      → that conversation's room
  //   anything else  → null (no marker)
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

  // Pack into rows + compute viewBox. System rooms pack after user
  // rooms so the user's own work anchors row 1.
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
  // the room modal.
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
  // fresh one in this room if it has none yet.
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

  // PR-40: click opens modal. System rooms keep direct-navigation
  // (Study → '/', Lab → '/edit') because they don't carry the same
  // Copy/Delete/Enter affordance.
  const handleRoomClick = useCallback((roomId) => {
    setModalRoomId(roomId)
  }, [])

  const onModalClose = useCallback(() => setModalRoomId(null), [])

  const onModalEnter = useCallback(() => {
    if (!modalRoomId) return
    const id = modalRoomId
    setModalRoomId(null)
    enterRoom(id)
  }, [modalRoomId, enterRoom])

  const onModalCopy = useCallback(() => {
    if (!modalRoomId) return
    const source = modesById.get(modalRoomId)
    if (!source) return
    setCopyTarget({ sourceMode: source })
  }, [modalRoomId, modesById])

  const performCopy = useCallback(async (toLab) => {
    if (!copyTarget) return
    const sourceName = copyTarget.sourceMode?.meta?.name?.trim() || 'this room'
    try {
      const draft = createCopyOfMode(copyTarget.sourceMode)
      const saved = await saveMode(draft)
      setCopyTarget(null)
      setModalRoomId(null)
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

  const onModalDelete = useCallback(async () => {
    if (!modalRoomId) return
    const source = modesById.get(modalRoomId)
    const label = source?.meta?.name || 'this room'
    const ok = window.confirm(`Delete ${label}? Conversations in it will lose their room link.`)
    if (!ok) return
    try {
      await deleteMode(modalRoomId)
    } catch (err) {
      console.error('Delete Room failed:', err)
    }
    setModalRoomId(null)
    window.dispatchEvent(new Event('blueprint-rooms-changed'))
  }, [modalRoomId, modesById])

  const selectedMode = modalRoomId ? modesById.get(modalRoomId) : null
  const selectedLastConv = modalRoomId ? lastConvByRoomId.get(modalRoomId) || null : null
  const selectedIncludes = useMemo(() => buildIncludes(selectedMode), [selectedMode])

  // Position the map-pin glyph inside the active room. Pin tip sits
  // ~26 SVG units up from the bottom interior so the pin's 21-unit
  // body lives just below the centered THE / NAME title.
  const mapPinPosition = useMemo(() => {
    if (!activeRoomId) return null
    const placed = layout.placedRooms.find(p => p.id === activeRoomId)
    if (!placed) return null
    return {
      x: placed.box.x + placed.box.width / 2,
      y: placed.box.y + placed.box.height - 26,
    }
  }, [activeRoomId, layout])

  return (
    <div
      className="bp-wrap"
      style={{ '--bp-natural-width': `${layout.viewBox.width}px` }}
    >
      <svg
        viewBox={`0 0 ${layout.viewBox.width} ${layout.viewBox.height}`}
        xmlns="http://www.w3.org/2000/svg"
        className="block bp-svg"
        role="img"
        aria-label="Blueprint floor plan of your rooms"
      >
        <defs>
          {/* Dot texture lives in the strip between the bp-wrap
              CSS border and the SVG dark wall — i.e., the "outside
              the building" zone. */}
          <pattern id="bp-dots" patternUnits="userSpaceOnUse" width="14" height="14">
            <circle cx="7" cy="7" r="0.5" fill="#C8C0B0"/>
          </pattern>
          {/* 45° hatching used to mark hallway zones. */}
          <pattern id="bp-hhatch" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="4" stroke="#C8C0B2" strokeWidth="0.5"/>
          </pattern>
        </defs>

        {/* bp-wrap surface fill (cream + dots) — extends across the
            entire SVG, including the area inside the dark wall. PR-40
            polish: dropped the separate cream-floor rect so the floor
            doesn't read as a card sitting inside the wall. The dotted
            bg shows through; hallway hatching + rooms render on top. */}
        <rect x="0" y="0" width={layout.viewBox.width} height={layout.viewBox.height} fill="#EDE6D8"/>
        <rect x="0" y="0" width={layout.viewBox.width} height={layout.viewBox.height} fill="url(#bp-dots)"/>

        {/* Dark outer wall stroke around the floor. */}
        <rect
          x={layout.wallBox.x}
          y={layout.wallBox.y}
          width={layout.wallBox.width}
          height={layout.wallBox.height}
          fill="none"
          stroke={WALL_STROKE}
          strokeWidth="4"
          rx="1"
        />

        {/* Hallway zones — vertical corridors between rooms in a row +
            horizontal corridors between rows. Rendered BEFORE rooms
            so room outward bumps overlap (visually paint over) the
            hallway hatching. Doorways (gaps in room walls where they
            touch a hallway) come in a follow-up. */}
        {layout.hallways && layout.hallways.map((h, i) => (
          <Hallway key={`hall-${i}`} hallway={h} />
        ))}

        {/* Dimension ticks above row-1 rooms. */}
        <DimensionTicks layout={layout} modesById={modesById} />

        {/* Rooms + system cards. */}
        {layout.placedRooms.map(placed => {
          if (placed.kind === SYSTEM_KIND) {
            const isStudy = placed.id === SYSTEM_ROOM_IDS.STUDY
            return (
              <SystemRoom
                key={placed.id}
                placed={placed}
                isStudy={isStudy}
                isHovered={placed.id === hoveredFromBlueprint}
                isCurrent={placed.id === activeRoomId}
                onEnter={() => setHoveredFromBlueprint(placed.id)}
                onLeave={() => setHoveredFromBlueprint(null)}
                onClick={() => {
                  navigate(isStudy ? '/' : '/edit')
                }}
              />
            )
          }
          return (
            <Room
              key={placed.id}
              placed={placed}
              mode={modesById.get(placed.id)}
              isActive={placed.id === activeRoomId}
              isHighlitFromChat={placed.id === highlightedRoomId}
              isHovered={placed.id === hoveredFromBlueprint}
              onEnter={() => setHoveredFromBlueprint(placed.id)}
              onLeave={() => setHoveredFromBlueprint(null)}
              onClick={() => handleRoomClick(placed.id)}
            />
          )
        })}

        {/* "You are here" map pin inside the active room. */}
        {mapPinPosition && <MapPin x={mapPinPosition.x} y={mapPinPosition.y} />}
      </svg>

      {/* PR-40: centered room modal (desktop + mobile). Replaces the
          PR-19g RoomDetailsOverlay bottom sheet and PR-39's in-place
          expand apparatus. */}
      {modalRoomId && selectedMode && (
        <BlueprintRoomModal
          mode={selectedMode}
          lastConv={selectedLastConv}
          includes={selectedIncludes}
          onClose={onModalClose}
          onEnter={onModalEnter}
          onCopy={onModalCopy}
          onDelete={onModalDelete}
        />
      )}

      {/* PR-29: copy-flow modal. Opens when the user picks Copy from
          the room modal. */}
      {copyTarget && (
        <BlueprintCopyModal
          sourceName={copyTarget.sourceMode?.meta?.name?.trim() || 'this room'}
          onClose={() => setCopyTarget(null)}
          onCopyAsIs={() => performCopy(false)}
          onCopyToLab={() => performCopy(true)}
        />
      )}

      {/* PR-29: brief inline confirmation when "Copy as Is" succeeds.
          PR-42: portaled to body so the section ancestor's dnd-kit
          transform doesn't trap its position:fixed inside the section. */}
      {copyToast && createPortal(
        <div className="bp-copy-toast">{copyToast}</div>,
        document.body,
      )}
    </div>
  )
}

// ─── Subcomponents ───────────────────────────────────────────

// PR-40 polish: wrap room titles to a second line when they'd overflow
// the room's interior width. Greedy at the word boundary — the first
// line packs as many words as fit; the rest spills to line 2. Single
// long words (no space) are rendered as-is and may visually overflow.
function wrapTitle(name, maxWidth, fontSize = 9.5) {
  if (!name) return ['Room']
  // Approx glyph width including letter-spacing 0.03em.
  const charWidth = fontSize * 0.58
  const maxChars = Math.max(4, Math.floor((maxWidth - 10) / charWidth))
  if (name.length <= maxChars) return [name]
  const words = name.split(/\s+/)
  if (words.length < 2) return [name]
  let line1 = words[0]
  let i = 1
  while (i < words.length) {
    const tryLine = line1 + ' ' + words[i]
    if (tryLine.length > maxChars) break
    line1 = tryLine
    i++
  }
  if (i === words.length) return [name]
  return [line1, words.slice(i).join(' ')]
}

// PR-40 polish: render the THE label + NAME (possibly 2 lines)
// vertically centered around (cx, cy). Title is NOT bold — the mockup
// uses font-weight 500 for both labels for a softer architect-style
// feel.
function RoomTitle({ cx, cy, name, width, color }) {
  const lines = wrapTitle(name, width)
  const numLines = lines.length
  // Total title block height ≈ THE (7) + gap (4) + lines × 11. Center
  // the block on cy with a slight downward bias so it visually rests
  // toward the room center (the THE label is small and reads as a
  // header sitting above the NAME).
  const titleBlockTop = cy - (numLines === 2 ? 13 : 8)
  return (
    <>
      <text x={cx} y={titleBlockTop} textAnchor="middle" fontSize="7" fill="#B8B0A4" letterSpacing="0.08em" fontWeight="500">
        THE
      </text>
      {lines.map((line, i) => (
        <text
          key={i}
          x={cx}
          y={titleBlockTop + 11 + i * 11}
          textAnchor="middle"
          fontSize="9.5"
          fill={color}
          letterSpacing="0.03em"
          fontWeight="500"
          className="bp-room-name"
        >
          {line}
        </text>
      ))}
    </>
  )
}

function Room({
  placed,
  mode,
  isActive,
  isHighlitFromChat,
  isHovered,
  onEnter,
  onLeave,
  onClick,
}) {
  const { box, layoutRef, id, sides } = placed
  const { path, interior } = buildRoomPath({ box, layoutRef, roomId: id })
  const cx = interior.x + interior.width / 2
  const cy = interior.y + interior.height / 2

  let fill = ROOM_FILL_DEFAULT
  if (isActive) fill = ROOM_FILL_ACTIVE
  if (isHovered) fill = ROOM_FILL_HOVER
  if (isHighlitFromChat) fill = ROOM_FILL_HIGHLIT

  const stroke = (isActive || isHovered || isHighlitFromChat)
    ? ROOM_BORDER_ACTIVE
    : ROOM_BORDER_DEFAULT
  const strokeWidth = isActive ? 1.2 : 0.75
  const nameColor = (isActive || isHovered) ? ROOM_NAME_COLOR_ACTIVE : ROOM_NAME_COLOR_DEFAULT
  const name = (mode?.meta?.name || mode?.id || 'Room')

  return (
    <g
      className="bp-room-zone"
      style={{ cursor: 'pointer' }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      <RoomContainer box={box} sides={sides} />
      <path d={path} fill={fill} className="bp-room-fill" />
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      <RoomTitle cx={cx} cy={cy} name={name} width={box.width} color={nameColor} />
    </g>
  )
}

function SystemRoom({ placed, isStudy, isHovered, isCurrent, onEnter, onLeave, onClick }) {
  const { box, sides } = placed
  const { path, interior } = isStudy ? studyShape(box) : labShape(box)
  const cx = interior.x + interior.width / 2
  const cy = interior.y + interior.height / 2
  const name = isStudy ? 'STUDY' : 'LAB'

  const baseAlpha = isCurrent ? 0.22 : 0.04
  const hoverAlpha = 0.08
  const fill = isHovered ? `rgba(196,169,77,${hoverAlpha})` : `rgba(196,169,77,${baseAlpha})`
  const stroke = (isHovered || isCurrent) ? ROOM_BORDER_ACTIVE : ROOM_BORDER_DEFAULT
  const labelColor = (isHovered || isCurrent) ? ROOM_NAME_COLOR_ACTIVE : ROOM_NAME_COLOR_DEFAULT

  return (
    <g
      className="bp-room-zone"
      style={{ cursor: 'pointer' }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      <RoomContainer box={box} sides={sides} />
      <path d={path} fill={ROOM_FILL_DEFAULT} />
      <path d={path} fill={fill} className="bp-room-fill" />
      <path d={path} fill="none" stroke={stroke} strokeWidth={isCurrent ? 1.2 : 0.75} vectorEffect="non-scaling-stroke" />
      <RoomTitle cx={cx} cy={cy} name={name} width={box.width} color={labelColor} />
    </g>
  )
}

// PR-40 polish: outer container rectangle around each room. Sits
// ROOM_CONTAINER_PAD units outside the room shape on every side,
// rendered as 4 edges, each broken in the middle when that side
// faces a hallway. The container reads as a frame holding the
// room; the gaps signal entryways into the corridor system.
function RoomContainer({ box, sides }) {
  const pad = ROOM_CONTAINER_PAD
  const bx = box.x - pad
  const by = box.y - pad
  const bw = box.width  + 2 * pad
  const bh = box.height + 2 * pad
  const gap = ROOM_CONTAINER_ENTRY_GAP
  const stroke = '#A8A298'
  const strokeWidth = 0.75

  const segs = []
  // Top
  if (sides?.top) {
    const m = bx + bw / 2
    segs.push([bx, by,           m - gap / 2, by])
    segs.push([m + gap / 2, by,  bx + bw, by])
  } else {
    segs.push([bx, by, bx + bw, by])
  }
  // Right
  if (sides?.right) {
    const m = by + bh / 2
    segs.push([bx + bw, by,            bx + bw, m - gap / 2])
    segs.push([bx + bw, m + gap / 2,   bx + bw, by + bh])
  } else {
    segs.push([bx + bw, by, bx + bw, by + bh])
  }
  // Bottom
  if (sides?.bottom) {
    const m = bx + bw / 2
    segs.push([bx, by + bh,           m - gap / 2, by + bh])
    segs.push([m + gap / 2, by + bh,  bx + bw, by + bh])
  } else {
    segs.push([bx, by + bh, bx + bw, by + bh])
  }
  // Left
  if (sides?.left) {
    const m = by + bh / 2
    segs.push([bx, by,           bx, m - gap / 2])
    segs.push([bx, m + gap / 2,  bx, by + bh])
  } else {
    segs.push([bx, by, bx, by + bh])
  }

  return (
    <g aria-hidden="true">
      {segs.map(([x1, y1, x2, y2], i) => (
        <line
          key={i}
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={stroke}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  )
}

// PR-40 polish: hatched hallway zone. Cream fill + 45° hatch overlay —
// no outline lines, so adjacent hallways (vertical + horizontal at an
// intersection) read as one continuous corridor system rather than
// individually-bordered tiles.
function Hallway({ hallway }) {
  const { x, y, width, height } = hallway
  return (
    <g aria-hidden="true">
      <rect x={x} y={y} width={width} height={height} fill="#EBE4D6" />
      <rect x={x} y={y} width={width} height={height} fill="url(#bp-hhatch)" opacity="0.25" />
    </g>
  )
}

// PR-40: architectural map-pin glyph with pulsing ring. Replaces the
// old WalkingHuman icon as the "you are here" affordance. Dimensions
// match refactor/blueprint_with_room_modal.html: ~14×21 SVG units,
// pulse ring r=7→11.
function MapPin({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`} opacity="0.7" aria-hidden="true">
      <path
        d="M 0 0 C -5 -4 -7 -10 -7 -13 C -7 -17 -4 -21 0 -21 C 4 -21 7 -17 7 -13 C 7 -10 5 -4 0 0 Z"
        fill="#C4A94D"
        stroke="#8B6A10"
        strokeWidth="0.75"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx="0" cy="-13" r="3" fill="#F5EFE4" />
      <circle cx="0" cy="-13" r="7" fill="none" stroke="#C4A94D" strokeWidth="0.8" opacity="0.4">
        <animate attributeName="r" values="7;11;7" dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.4;0;0.4" dur="2.5s" repeatCount="indefinite" />
      </circle>
    </g>
  )
}

// Dimension ticks above each row-1 user room — a small bracket-style
// annotation with the room's name and width. Restored from the
// PR-14 prototype as part of PR-40's blueprint-feel refresh.
function DimensionTicks({ layout, modesById }) {
  const tickY = (layout.floorBox.y - 12)
  const ends = 6
  // Only annotate the rooms in row 1 (the topmost row).
  const firstRowY = layout.placedRooms[0]?.box?.y
  const row1 = layout.placedRooms.filter(p => p.box.y === firstRowY && p.kind !== SYSTEM_KIND)
  if (row1.length === 0) return null
  return (
    <g aria-hidden="true">
      {row1.map(placed => {
        const name = modesById.get(placed.id)?.meta?.name || 'Room'
        const x1 = placed.box.x
        const x2 = placed.box.x + placed.box.width
        const mid = (x1 + x2) / 2
        return (
          <g key={`tick-${placed.id}`}>
            <line x1={x1} y1={tickY} x2={x2} y2={tickY} stroke="#D0C8BA" strokeWidth="0.4" />
            <line x1={x1} y1={tickY - ends / 2} x2={x1} y2={tickY + ends / 2} stroke="#D0C8BA" strokeWidth="0.4" />
            <line x1={x2} y1={tickY - ends / 2} x2={x2} y2={tickY + ends / 2} stroke="#D0C8BA" strokeWidth="0.4" />
            <text x={mid} y={tickY - 2} textAnchor="middle" fontSize="6.5" fill="#C8C0B2" letterSpacing="0.02em">
              {name} · {placed.box.width}px
            </text>
          </g>
        )
      })}
    </g>
  )
}

// PR-42: ref-counted body scroll lock. The Room modal can open the
// Copy modal on top of itself, so both are mounted at once. A naive
// useEffect that sets/clears body overflow would let the inner modal's
// unmount restore scrolling while the outer modal is still up — hence
// the counter.
let _bpScrollLockCount = 0
let _bpPrevOverflow = ''
function lockBodyScroll() {
  if (_bpScrollLockCount === 0) {
    _bpPrevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  _bpScrollLockCount++
  return () => {
    _bpScrollLockCount = Math.max(0, _bpScrollLockCount - 1)
    if (_bpScrollLockCount === 0) {
      document.body.style.overflow = _bpPrevOverflow
    }
  }
}

// PR-40 polish: centered selection modal. Two side-by-side cards
// each wrapped in a `.bp-trim-wrap` (translucent padded frame).
// Left card has THE / Name + abstract room preview + circular
// icon actions (Copy / Delete / Enter). Right card has the
// metadata rows (Created / Last used / Last spoken to) + device
// pill + bulleted Includes list. Layout matches the mockup at
// refactor/blueprint_matched_feature_list.html.
//
// PR-42: rendered via React Portal to document.body. Without the
// portal, the homepage <section> wrapping the blueprint applies a
// dnd-kit transform (translate3d 0,0,0) for drag-reorder, and that
// transform creates a containing block for position:fixed children —
// so the "fixed" overlay would be trapped inside the section's
// bounding box and scroll partly off-screen with it.
function BlueprintRoomModal({ mode, lastConv, includes, onClose, onEnter, onCopy, onDelete }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  useEffect(() => lockBodyScroll(), [])

  const name = mode?.meta?.name || mode?.id || 'Room'
  const created = fmtShortDate(mode?.meta?.created)
  const lastModel = lastConv ? modelLabel(lastConv.model) : null
  const lastUsed = lastConv ? fmtShortDate(lastConv.updatedAt) : null
  const deviceLabel = mode?.deviceClass === 'visual-touch-phone' ? 'MOBILE' : 'DESKTOP'
  const layoutRef = mode?.layout?.ref

  return createPortal(
    <div
      className="bp-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${name} details`}
    >
      <div className="bp-modal-assembly" onClick={(e) => e.stopPropagation()}>
        <div className="bp-trim-wrap">
          <div className="bp-card-room">
            <div className="bp-card-room-title">
              <span className="bp-card-room-label">THE</span>
              <div className="bp-card-room-name">{name}</div>
            </div>
            <div className="bp-card-room-wireframe">
              {layoutRef && <LayoutSilhouette layoutId={layoutRef} />}
            </div>
            <div className="bp-card-actions">
              <button type="button" className="bp-action-btn" onClick={onCopy} aria-label="Copy room">
                <Copy size={16} />
                <span className="bp-action-tooltip">Copy</span>
              </button>
              <button type="button" className="bp-action-btn bp-action-btn-delete" onClick={onDelete} aria-label="Delete room">
                <Trash2 size={16} />
                <span className="bp-action-tooltip">Delete</span>
              </button>
              <button type="button" className="bp-action-btn bp-action-btn-enter" onClick={onEnter} aria-label="Enter room">
                <ArrowRight size={18} />
                <span className="bp-action-tooltip">Enter</span>
              </button>
            </div>
          </div>
        </div>
        {/* Right: features card. Outer card carries the rounded
            corners + clipping; inner div is the scroll viewport so
            the webkit scrollbar doesn't poke past the rounded
            corner at the top. */}
        <div className="bp-trim-wrap">
          <div className="bp-card-features">
            <div className="bp-card-features-scroll">
              {created && (
                <div className="bp-meta-row">
                  <span className="bp-meta-label">Created</span>
                  <span className="bp-meta-value">{created}</span>
                </div>
              )}
              {lastUsed && (
                <div className="bp-meta-row">
                  <span className="bp-meta-label">Last used</span>
                  <span className="bp-meta-value">{lastUsed}</span>
                </div>
              )}
              {lastModel && (
                <div className="bp-meta-row">
                  <span className="bp-meta-label">Last spoken to</span>
                  <span className="bp-meta-value">{lastModel}</span>
                </div>
              )}
              <div style={{ margin: '10px 0 4px' }}>
                <span className="bp-device-chip">{deviceLabel}</span>
              </div>
              <div className="bp-section-label">Includes</div>
              {includes && includes.length > 0 ? (
                <ul className="bp-feat-list">
                  {includes.map((it, i) => (
                    <li key={`${it.kind}-${it.name}-${i}`} className="bp-feat-item">
                      <div className="bp-feat-dot" />
                      <div className="bp-feat-content">
                        <span className="bp-feat-name">{it.name}</span>
                        {it.desc && <span className="bp-feat-desc">{it.desc}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="bp-modal-empty">Nothing in this room yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// PR-29: confirmation modal for the Copy button on a blueprint room.
// PR-42: portaled to document.body for the same reason as BlueprintRoomModal
// (escape the dnd-kit transform on the section ancestor).
function BlueprintCopyModal({ sourceName, onClose, onCopyAsIs, onCopyToLab }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  useEffect(() => lockBodyScroll(), [])

  return createPortal(
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
    </div>,
    document.body,
  )
}

function fmtShortDate(iso) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch { return null }
}

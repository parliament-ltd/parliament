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

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConversations } from '../../stores/ConversationContext'
import { listModes, deleteMode, saveMode, createCopyOfMode } from '../../lib/modes'
import { createConversation } from '../../lib/db'
import { PHASE_1_EVENTS } from '../../lib/hostAPI'
import RoomDetailsOverlay from '../../components/RoomDetailsOverlay'
import {
  packRooms,
  buildRoomPath,
  interiorHints,
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

const ROOM_FILL_DEFAULT = '#F5F0E8'
const ROOM_FILL_ACTIVE  = 'rgba(196, 169, 77, 0.10)'
const ROOM_FILL_HOVER   = 'rgba(196, 169, 77, 0.16)'
const ROOM_FILL_HIGHLIT = 'rgba(196, 169, 77, 0.22)'
const ROOM_FILL_SELECTED = 'rgba(196, 169, 77, 0.22)'
const ROOM_BORDER_DEFAULT = '#C8C2B8'
const ROOM_BORDER_ACTIVE  = '#B8A070'

// PR-19g: faded-grey palette for the small in-room icons (walking
// human / compass / wrench). Mirrors PR-19f's system-room icon tint so
// the cards read as the same species.
const IN_ROOM_ICON_COLOR = '#9A9490'

// ─── Component ───────────────────────────────────────────────

export default function BlueprintRender({ hostAPI } = {}) {
  const { conversations } = useConversations()
  const navigate = useNavigate()
  const [rooms, setRooms] = useState([])
  const [hoveredFromChat, setHoveredFromChat] = useState(null)
  const [hoveredFromBlueprint, setHoveredFromBlueprint] = useState(null)
  // PR-19g: selectedRoomId drives the details overlay + hatch
  // animation over other rooms + scale-up of the selected one.
  const [selectedRoomId, setSelectedRoomId] = useState(null)
  // PR-19g: "You are here" tooltip moves onto the in-room walking-
  // human icon (was: floating gold pawn).
  const [hereTip, setHereTip] = useState(null) // { x, y } or null

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

  // Most-recently-active room: the room of the conversation with the
  // highest updatedAt. Falls back to null when no conversation has a
  // room set yet.
  const activeRoomId = useMemo(() => {
    let best = null
    let bestT = 0
    for (const c of conversations) {
      if (!c.room) continue
      const t = new Date(c.updatedAt).getTime()
      if (t > bestT) { bestT = t; best = c.room }
    }
    return best
  }, [conversations])

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

  const onOverlayCopy = useCallback(async () => {
    if (!selectedRoomId) return
    const source = modesById.get(selectedRoomId)
    if (!source) return
    try {
      const draft = createCopyOfMode(source)
      const saved = await saveMode(draft)
      setSelectedRoomId(null)
      window.dispatchEvent(new Event('blueprint-rooms-changed'))
      navigate(`/edit/${saved.id}`)
    } catch (err) {
      // Fall back silently — the overlay closes, user can retry from
      // the editor. A toast surface would require a wider plumbing.
      console.error('Copy Room failed:', err)
      setSelectedRoomId(null)
    }
  }, [selectedRoomId, modesById, navigate])

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

  return (
    <div className="bp-wrap">
      <svg
        viewBox={`0 0 ${layout.viewBox.width} ${layout.viewBox.height}`}
        xmlns="http://www.w3.org/2000/svg"
        className="block w-full h-auto bp-svg"
        role="img"
        aria-label="Blueprint floor plan of your rooms"
      >
        <defs>
          <pattern id="bp-hatch" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="5" stroke="#B8B2A8" strokeWidth="1.2" />
          </pattern>
          <pattern id="bp-floorgrid" patternUnits="userSpaceOnUse" width="20" height="20">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#DDD8D0" strokeWidth="0.4" />
          </pattern>
          <pattern id="bp-hatch-light" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="4" stroke="#DDD8D0" strokeWidth="0.8" />
          </pattern>
        </defs>

        {/* Outer wall: floor color + grid + hatched border */}
        <rect x={layout.floorBox.x} y={layout.floorBox.y} width={layout.floorBox.width} height={layout.floorBox.height} fill={WALL_FILL} />
        <rect x={layout.floorBox.x} y={layout.floorBox.y} width={layout.floorBox.width} height={layout.floorBox.height} fill={FLOOR_GRID} />
        <rect x={layout.wallBox.x} y={layout.wallBox.y} width={layout.wallBox.width} height={layout.wallBox.height} fill="none" stroke={WALL_STROKE} strokeWidth="6" rx="2" />
        <rect x={layout.wallBox.x} y={layout.wallBox.y} width={layout.wallBox.width} height={layout.wallBox.height} fill={HATCH_FILL} fillOpacity="0.22" stroke="none" rx="2" />

        {/* Rooms + system cards */}
        {layout.placedRooms.map(placed => {
          if (placed.kind === SYSTEM_KIND) {
            const isStudy = placed.id === SYSTEM_ROOM_IDS.STUDY
            return (
              <SystemRoom
                key={placed.id}
                placed={placed}
                isStudy={isStudy}
                isHovered={placed.id === hoveredFromBlueprint}
                isDimmed={Boolean(selectedRoomId)}
                onEnter={() => setHoveredFromBlueprint(placed.id)}
                onLeave={() => setHoveredFromBlueprint(null)}
                onClick={() => navigate(isStudy ? '/' : '/edit')}
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
              onEnter={() => setHoveredFromBlueprint(placed.id)}
              onLeave={() => setHoveredFromBlueprint(null)}
              onClick={() => handleRoomClick(placed.id)}
              onHereTipShow={(p) => setHereTip(p)}
              onHereTipHide={() => setHereTip(null)}
            />
          )
        })}

        {/* Dimension ticks: top edge for first room, right edge for last */}
        <DimensionTicks layout={layout} modesById={modesById} />
      </svg>

      {hereTip && (
        <div
          className="bp-pawn-tip"
          style={{ left: hereTip.x + 10, top: hereTip.y - 28, position: 'fixed' }}
        >
          You are here
        </div>
      )}

      <RoomDetailsOverlay
        room={selectedRoomId ? modesById.get(selectedRoomId) : null}
        lastConv={selectedRoomId ? lastConvByRoomId.get(selectedRoomId) || null : null}
        onClose={onOverlayClose}
        onEnter={onOverlayEnter}
        onCopy={onOverlayCopy}
        onDelete={onOverlayDelete}
      />
    </div>
  )
}

// ─── Walking-human icon (PR-19g) ─────────────────────────────
// Replaces the gold pawn marker. Renders inside the active room below
// the title; faded grey by default, gold-deep on hover. Triggers the
// "You are here" tooltip via the parent's onHereTipShow callback.
function WalkingHuman({ x, y, color = IN_ROOM_ICON_COLOR, onShow, onHide }) {
  const scale = 0.7
  // 24×24 lucide-style PersonStanding silhouette: head, torso, legs.
  return (
    <g
      transform={`translate(${x - 8.4} ${y - 8.4}) scale(${scale})`}
      style={{ cursor: 'help' }}
      onMouseEnter={(e) => onShow?.({ x: e.clientX, y: e.clientY })}
      onMouseMove={(e) => onShow?.({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => onHide?.()}
    >
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
  )
}

// ─── Subcomponents ───────────────────────────────────────────

// PR-19g: simplified room card. Centered title (THE / NAME) + optional
// walking-human icon below for the active room. No layout/scheme/last-
// spoken/feature pills — those moved into the details overlay.
function Room({
  placed,
  mode,
  isActive,
  isHighlitFromChat,
  isHovered,
  isSelected,
  isDimmed,
  onEnter,
  onLeave,
  onClick,
  onHereTipShow,
  onHereTipHide,
}) {
  const { box, layoutRef, id } = placed
  const { path, interior } = buildRoomPath({ box, layoutRef, roomId: id })
  const cx = interior.x + interior.width / 2
  const cy = interior.y + interior.height / 2
  const hints = interiorHints({ box, layoutRef, roomId: id })

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

  // Title placement: centered. THE prefix sits 10px above the name so
  // the two-line block reads as one anchored unit.
  const nameY = cy + 4
  const theY = nameY - 16
  const iconY = nameY + 18

  return (
    <g
      className={isSelected ? 'bp-room-selected' : undefined}
      style={{ cursor: 'pointer' }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      {/* Fill */}
      <path d={path} fill={fill} className="bp-room-fill" />

      {/* Interior wall hints — kept from PR-16a; faint dashed lines
          suggest the layout's slot structure without drawing components. */}
      {hints.map((h, i) => h.type === 'line' ? (
        <line
          key={`h${i}`}
          x1={h.x1} y1={h.y1} x2={h.x2} y2={h.y2}
          stroke="#C8C2B8"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      ) : (
        <rect
          key={`h${i}`}
          x={h.x} y={h.y} width={h.width} height={h.height}
          fill={h.hatched ? 'url(#bp-hatch-light)' : 'none'}
          stroke="#C8C2B8"
          strokeWidth="0.5"
          strokeDasharray="3 3"
        />
      ))}

      {/* Border (drawn over hints so it stays crisp) */}
      <path d={path} fill="none" stroke={stroke} strokeWidth={strokeWidth} />

      {/* Centered title block */}
      <text x={cx} y={theY} textAnchor="middle" fontSize="10" fill="#9A9490" letterSpacing="0.08em" fontWeight="500">
        THE
      </text>
      <text x={cx} y={nameY} textAnchor="middle" fontSize="13" fill={isActive ? '#8B6A10' : '#5A5550'} letterSpacing="0.06em" fontWeight="600">
        {name}
      </text>

      {/* Active room: walking-human icon below the title (replaces the
          floating gold pawn from PR-14). */}
      {isActive && (
        <WalkingHuman
          x={cx}
          y={iconY}
          color={isHovered ? '#8B6A10' : IN_ROOM_ICON_COLOR}
          onShow={onHereTipShow}
          onHide={onHereTipHide}
        />
      )}

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

// PR-19g: simplified system room — Study (compass) or Lab (wrench).
// Title centered, icon below. PR-19f's feature pills and corner-icon
// placement are dropped to match the strict title-only treatment for
// every room on the blueprint. Click routes directly (Study → '/',
// Lab → '/edit') — no details overlay for system rooms.
function SystemRoom({ placed, isStudy, isHovered, isDimmed, onEnter, onLeave, onClick }) {
  const { box } = placed
  const { path, interior } = isStudy ? studyShape(box) : labShape(box)
  const cx = interior.x + interior.width / 2
  const cy = interior.y + interior.height / 2
  const name = isStudy ? 'STUDY' : 'LAB'

  const fill = isHovered ? 'rgba(196,169,77,0.10)' : 'rgba(196,169,77,0.035)'
  const stroke = isHovered ? '#B8A070' : '#C8C2B8'
  const labelColor = isHovered ? '#8B6A10' : '#5A5550'
  const iconColor = isHovered ? '#8B6A10' : IN_ROOM_ICON_COLOR

  const nameY = cy + 4
  const theY = nameY - 16
  const iconY = nameY + 22

  return (
    <g
      style={{ cursor: 'pointer' }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      <path d={path} fill={fill} className="bp-room-fill" />
      <path d={path} fill="none" stroke={stroke} strokeWidth="0.8" />

      <text x={cx} y={theY} textAnchor="middle" fontSize="10" fill="#9A9490" letterSpacing="0.08em" fontWeight="500">
        THE
      </text>
      <text x={cx} y={nameY} textAnchor="middle" fontSize="13" fill={labelColor} letterSpacing="0.06em" fontWeight="600">
        {name}
      </text>

      {/* Icon below title — compass (Study) or wrench (Lab). Lucide
          24×24 path scaled to ~17px and translated so its center sits
          on (cx, iconY). */}
      <g
        transform={`translate(${cx - 8.5} ${iconY - 8.5}) scale(0.71)`}
        stroke={iconColor}
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {isStudy ? (
          <>
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
          </>
        ) : (
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        )}
      </g>

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

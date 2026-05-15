// blueprint@1.0 — homepage SVG floor-plan renderer (PR-14).
//
// Renders every user-built room as an irregular path on a single SVG
// canvas, with hatched outer wall, faux floor grid, gold pawn marker,
// dimension ticks, and per-room feature pills. Replaces the v1 grid
// of rounded boxes that blueprint-preview.jsx shipped at PR-6.
//
// Layout signatures and packing live in src/lib/blueprintShapes.js as
// pure functions; this file is the React adapter that mounts them and
// wires up the hostAPI cross-section hover bus.
//
// Spec reference: refactor/parliament_homepage_v2 (2).html (the section
// labelled "BLUEPRINT") plus parliament_v2_design_decisions.md §2.5
// (room shape signatures) and §5 (homepage blueprint details).
//
// Visual notes specific to PR-14:
//   - Pawn position deviates from spec/design-doc: when the user has no
//     rooms, the pawn lives next to the "+ Build a room" placeholder
//     (drawing the eye toward the first build). Once any room exists,
//     the pawn moves into the room owning the most-recent conversation.
//   - Cross-section hover: chats@1.0 publishes PHASE_1_EVENTS.ROW_HOVER
//     and we light up the path matching the conversation's `room` field.

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useConversations } from '../../stores/ConversationContext'
import { listModes } from '../../lib/modes'
import { createConversation } from '../../lib/db'
import { PHASE_1_EVENTS } from '../../lib/hostAPI'
import {
  packRooms,
  buildRoomPath,
  buildPlaceholderPath,
  placePawn,
  interiorHints,
  PLACEHOLDER_KIND,
  SYSTEM_KIND,
  SYSTEM_ROOM_IDS,
} from '../../lib/blueprintShapes'

// ─── Visual constants ────────────────────────────────────────

const WALL_STROKE = '#3A3530'
const WALL_FILL   = '#F5F0E8'
const HATCH_FILL  = 'url(#bp-hatch)'
const FLOOR_GRID  = 'url(#bp-floorgrid)'
const HATCH_LIGHT = 'url(#bp-hatch-light)'

const ROOM_FILL_DEFAULT = '#F5F0E8'
const ROOM_FILL_ACTIVE  = 'rgba(196, 169, 77, 0.10)'
const ROOM_FILL_HOVER   = 'rgba(196, 169, 77, 0.16)'
const ROOM_FILL_HIGHLIT = 'rgba(196, 169, 77, 0.22)'
const ROOM_BORDER_DEFAULT = '#C8C2B8'
const ROOM_BORDER_ACTIVE  = '#B8A070'

// Mapping from component ref name → feature pill label. Limited to the
// features the wizard actually surfaces (src/lib/buildWizard.js FEATURES)
// plus a couple of obvious extras. Ordered by perceived importance —
// only the top 3 fit comfortably on a room floor.
const FEATURE_LABELS = {
  toc:         'TOC',
  branches:    'BRANCHES',
  highlights:  'HIGHLIGHTS',
  'file-shelf':'FILE SHELF',
  context:     'CONTEXT HEALTH',
  notes:       'NOTES',
  review:      'REVIEW',
}

const SCHEME_DISPLAY = {
  parliament:    'Parliament Default',
  'cool-bright': 'Cool Bright',
  'deep-calm':   'Deep Calm',
  'soft-violet': 'Soft Violet',
  'fresh-teal':  'Fresh Teal',
  'amber-glow':  'Amber Glow',
}

const LAYOUT_DISPLAY = {
  'three-panel':              'Three-panel',
  'canvas-centric':           'Canvas-centric',
  'document-centric':         'Document-centric',
  'single-column-with-sheet': 'Single column',
}

// PR-16a: friendly model names for the "Last spoken to" line. Maps the
// raw conversation.model values to display strings. Unknown ids fall
// through to a humanized fallback (kebab → Title Case).
const MODEL_DISPLAY = {
  'claude-sonnet':         'Claude Sonnet',
  'claude-sonnet-4-6':     'Claude Sonnet 4.6',
  'claude-sonnet-4-7':     'Claude Sonnet 4.7',
  'claude-opus':           'Claude Opus',
  'claude-opus-4-7':       'Claude Opus 4.7',
  'claude-haiku':          'Claude Haiku',
  'claude-haiku-4-5':      'Claude Haiku 4.5',
  'claude-haiku-4-5-20251001': 'Claude Haiku 4.5',
}

function modelLabel(raw) {
  if (!raw) return ''
  const mapped = MODEL_DISPLAY[raw]
  if (mapped) return mapped
  // Humanize: turn 'some-model-name' into 'Some Model Name'.
  return raw
    .split('-')
    .map(s => s.length > 0 ? s[0].toUpperCase() + s.slice(1) : '')
    .join(' ')
}

const refName = (ref) => (ref || '').split('@')[0]

// PR-19a: rough text-width estimator for SVG layout decisions where we
// can't measure DOM nodes (text might not be mounted yet, or the
// measurement is needed during render). Multiplier is empirical:
// proportional sentence-case at our weights typically averages
// ~0.55 × fontSize per character; italic runs slightly wider so we
// nudge to 0.58. Letter-spacing on uppercase rooms is handled by the
// text element directly — this only feeds the wrap decision.
function estimateTextWidth(text, fontSize, isItalic = false) {
  if (!text) return 0
  const charW = fontSize * (isItalic ? 0.58 : 0.55)
  return text.length * charW
}

// Pull up to 3 feature pills off a room's components array.
function featuresFor(room) {
  const seen = new Set()
  const out = []
  for (const c of room?.components || []) {
    const label = FEATURE_LABELS[refName(c.ref)]
    if (label && !seen.has(label)) {
      seen.add(label)
      out.push(label)
      if (out.length === 3) break
    }
  }
  return out
}

// ─── Component ───────────────────────────────────────────────

export default function BlueprintRender({ hostAPI } = {}) {
  const { conversations } = useConversations()
  const navigate = useNavigate()
  const [rooms, setRooms] = useState([])
  const [hoveredFromChat, setHoveredFromChat] = useState(null)
  const [hoveredFromBlueprint, setHoveredFromBlueprint] = useState(null)
  const [pawnTip, setPawnTip] = useState(null) // { x, y } or null

  // Subscribe to chats@1.0's row-hover bus. Payload = { conversationId | null }.
  useEffect(() => {
    if (!hostAPI?.subscribe) return
    return hostAPI.subscribe(PHASE_1_EVENTS.ROW_HOVER, (payload) => {
      setHoveredFromChat(payload?.conversationId ?? null)
    })
  }, [hostAPI])

  // Load every room mode once. Future PR-15+ may push these through a
  // useModes() hook that listens for `homepage-mode-changed` so wizard-
  // built rooms appear without a reload — out of scope here.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const modes = await listModes({ scope: 'room' })
        if (!cancelled) setRooms(modes || [])
      } catch {
        if (!cancelled) setRooms([])
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Most-recently-active room: the room of the conversation with the
  // highest updatedAt. Falls back to null when no conversation has a
  // room set yet (e.g. legacy V1 conversations).
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

  // Pack into rows + compute viewBox. Memoized on rooms array identity.
  // PR-19e: includeSystem injects The Study + The Lab as compact rooms at
  // the head of the packing list so they anchor the floor plan.
  const layout = useMemo(() => {
    const items = rooms.map(r => ({ id: r.id, layoutRef: r.layout?.ref || '' }))
    return packRooms(items, { includePlaceholder: true, includeSystem: true })
  }, [rooms])

  const pawn = useMemo(
    () => placePawn({ placedRooms: layout.placedRooms, activeRoomId }),
    [layout.placedRooms, activeRoomId]
  )

  // Quick lookup of room mode by id for label rendering.
  const modesById = useMemo(() => {
    const m = new Map()
    for (const r of rooms) m.set(r.id, r)
    return m
  }, [rooms])

  // Build label text for a room. Last-spoken comes from the latest
  // conversation in this room; "No conversations yet" if none.
  const lastModelByRoomId = useMemo(() => {
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

  const onEnterRoom = async (roomId) => {
    // Find the most-recent conversation in this room and navigate to it.
    let last = null
    for (const c of conversations) {
      if (c.room !== roomId) continue
      if (!last || new Date(c.updatedAt) > new Date(last.updatedAt)) last = c
    }
    if (last) {
      navigate(`/chat/${last.id}`)
      return
    }
    // PR-19c: empty room → start a fresh conversation IN the room
    // (was: navigate to /build, which kicked the user back into the
    // wizard from a room they had already built). Failure falls
    // through to the build wizard as a last resort.
    try {
      const room = modesById.get(roomId)
      const title = room?.meta?.name || 'New conversation'
      const newConv = await createConversation({ title, room: roomId })
      navigate(`/chat/${newConv.id}`)
    } catch {
      navigate('/build')
    }
  }

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

        {/* Rooms + system cards + placeholder */}
        {layout.placedRooms.map(placed => {
          if (placed.kind === PLACEHOLDER_KIND) {
            return (
              <PlaceholderRoom
                key="__placeholder__"
                box={placed.box}
                onClick={() => navigate('/build')}
              />
            )
          }
          if (placed.kind === SYSTEM_KIND) {
            const isStudy = placed.id === SYSTEM_ROOM_IDS.STUDY
            return (
              <SystemRoom
                key={placed.id}
                placed={placed}
                isStudy={isStudy}
                isHovered={placed.id === hoveredFromBlueprint}
                onEnter={() => setHoveredFromBlueprint(placed.id)}
                onLeave={() => setHoveredFromBlueprint(null)}
                onClick={() => navigate(isStudy ? '/' : '/edit')}
              />
            )
          }
          return (
            <Room
              key={placed.id}
              placed={placed}
              mode={modesById.get(placed.id)}
              lastConv={lastModelByRoomId.get(placed.id)}
              isActive={placed.id === activeRoomId}
              isHighlitFromChat={placed.id === highlightedRoomId}
              isHovered={placed.id === hoveredFromBlueprint}
              onEnter={() => setHoveredFromBlueprint(placed.id)}
              onLeave={() => setHoveredFromBlueprint(null)}
              onClick={() => onEnterRoom(placed.id)}
            />
          )
        })}

        {/* Dimension ticks: top edge for first room, right edge for last */}
        <DimensionTicks layout={layout} modesById={modesById} />

        {/* Pawn marker */}
        {pawn && (
          <g
            transform={`translate(${pawn.x - 10}, ${pawn.y - 8})`}
            className="bp-pawn"
            style={{ cursor: 'pointer' }}
            onMouseEnter={(e) => setPawnTip({ x: e.clientX, y: e.clientY })}
            onMouseMove={(e) => setPawnTip({ x: e.clientX, y: e.clientY })}
            onMouseLeave={() => setPawnTip(null)}
          >
            <circle cx="10" cy="6" r="5" fill="#D4A843" stroke="#8B6A10" strokeWidth="1" />
            <rect x="5" y="10" width="10" height="3" rx="1" fill="#D4A843" stroke="#8B6A10" strokeWidth="1" />
            <rect x="3" y="13" width="14" height="2.5" rx="1" fill="#D4A843" stroke="#8B6A10" strokeWidth="1" />
            {/* Breathing ring; CSS keyframes handle the animation so reduced-motion users get the still ring */}
            <circle cx="10" cy="6" r="5" fill="none" stroke="#D4A843" strokeWidth="1.5" opacity="0.5" className="bp-pawn-ring" />
          </g>
        )}
      </svg>

      {pawnTip && (
        <div
          className="bp-pawn-tip"
          style={{ left: pawnTip.x + 10, top: pawnTip.y - 28, position: 'fixed' }}
        >
          You are here
        </div>
      )}
    </div>
  )
}

// ─── Subcomponents ───────────────────────────────────────────

function Room({ placed, mode, lastConv, isActive, isHighlitFromChat, isHovered, onEnter, onLeave, onClick }) {
  const { box, layoutRef, id } = placed
  const { path, interior } = buildRoomPath({ box, layoutRef, roomId: id })
  const cx = interior.x + interior.width / 2
  const features = featuresFor(mode)
  const hints = interiorHints({ box, layoutRef, roomId: id })

  let fill = ROOM_FILL_DEFAULT
  if (isActive) fill = ROOM_FILL_ACTIVE
  if (isHovered) fill = ROOM_FILL_HOVER
  if (isHighlitFromChat) fill = ROOM_FILL_HIGHLIT

  const stroke = isActive || isHovered || isHighlitFromChat ? ROOM_BORDER_ACTIVE : ROOM_BORDER_DEFAULT
  const strokeWidth = isActive ? 1.5 : 0.5

  const name = (mode?.meta?.name || mode?.id || 'Room').toUpperCase()
  const layoutLabel = LAYOUT_DISPLAY[refName(layoutRef)] || refName(layoutRef) || 'Layout'
  const schemeLabel = SCHEME_DISPLAY[refName(mode?.scheme?.ref)] || ''
  const lastModel = modelLabel(lastConv?.model)

  return (
    <g
      style={{ cursor: 'pointer' }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      {/* Fill */}
      <path d={path} fill={fill} className="bp-room-fill" />

      {/* Interior wall hints — dashed lines/rects suggesting the layout's
          slot structure (rails, canvas, page bands, mobile column).
          PR-16a per spec lines 1043-1108. Drawn before the border so the
          border edge stays crisp on top of any overlapping hint. */}
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

      {/* Border (drawn over the hints so it stays clean) */}
      <path d={path} fill="none" stroke={stroke} strokeWidth={strokeWidth} />

      {/* PR-19a: +1px global text bump for legibility, plus conditional
          stacking of the layoutLabel · schemeLabel line and the
          "Last spoken to" italic line so they wrap to two lines instead
          of overflowing the room border on long combinations. The text
          y values shift downward to accommodate the larger font sizes
          and any extra wrapped row. */}
      {(() => {
        const safeWidth = interior.width - 8
        const joined = `${layoutLabel}${schemeLabel ? ` · ${schemeLabel}` : ''}`
        const stackLayoutScheme = Boolean(schemeLabel) && estimateTextWidth(joined, 9) > safeWidth
        const lastModelTail = lastModel || ''
        const lastModelFull = lastModel ? `Last spoken to ${lastModel}` : ''
        const stackLastModel = Boolean(lastModel) && estimateTextWidth(lastModelFull, 9, true) > safeWidth

        // Vertical layout — accumulate baselines so wrapped lines push
        // subsequent rows down instead of overlapping.
        let cy = interior.y + 24
        const theY = cy; cy += 20
        const nameY = cy; cy += 18
        const layoutY = cy; cy += stackLayoutScheme ? 12 : 0
        const schemeY = stackLayoutScheme ? cy : null
        cy += 16
        const modelTopY = cy
        const modelBotY = stackLastModel ? cy + 12 : null

        return (
          <>
            <text x={cx} y={theY} textAnchor="middle" fontSize="10" fill="#9A9490" letterSpacing="0.08em" fontWeight="500">
              THE
            </text>
            <text x={cx} y={nameY} textAnchor="middle" fontSize="13" fill={isActive ? '#8B6A10' : '#5A5550'} letterSpacing="0.06em" fontWeight="600">
              {name}
            </text>
            <text x={cx} y={layoutY} textAnchor="middle" fontSize="9" fill="#9A9490">
              {stackLayoutScheme ? layoutLabel : joined}
            </text>
            {stackLayoutScheme && (
              <text x={cx} y={schemeY} textAnchor="middle" fontSize="9" fill="#9A9490">
                {schemeLabel}
              </text>
            )}
            {lastModel && !stackLastModel && (
              <text x={cx} y={modelTopY} textAnchor="middle" fontSize="9" fill="#9A9490" fontStyle="italic">
                {lastModelFull}
              </text>
            )}
            {lastModel && stackLastModel && (
              <>
                <text x={cx} y={modelTopY} textAnchor="middle" fontSize="9" fill="#9A9490" fontStyle="italic">
                  Last spoken to
                </text>
                <text x={cx} y={modelBotY} textAnchor="middle" fontSize="9" fill="#9A9490" fontStyle="italic">
                  {lastModelTail}
                </text>
              </>
            )}
          </>
        )
      })()}

      {/* Feature pills — render on every room, with per-spec gold/gray
          palette swap controlled by isActive (PR-16a; was active-only). */}
      {features.length > 0 && (
        <FeaturePills features={features} interior={interior} isActive={isActive} />
      )}
    </g>
  )
}

// PR-16a: pills render on every room. Active room gets the gold palette
// (current PR-14 treatment); other rooms get a gray palette (per spec
// lines 1087-1092 — `fill="#F1F1EF" stroke="#C8C2B8"` text fill `#787774`,
// slightly thinner pills). Same pill geometry; only the colors differ.
//
// PR-19a: bumped pill geometry up a notch for legibility
// (active 14→16 / 7→8.5; inactive 12→14 / 6.5→7.5). Pill widths in
// FeaturePills derive from font size, so they auto-grow.
const PILL_PALETTE = {
  active: {
    fill: 'rgba(196,169,77,0.15)',
    stroke: 'rgba(196,169,77,0.4)',
    text: '#8B6A10',
    height: 16,
    fontSize: 8.5,
  },
  inactive: {
    fill: '#F1F1EF',
    stroke: '#C8C2B8',
    text: '#787774',
    height: 14,
    fontSize: 7.5,
  },
}

function FeaturePills({ features, interior, isActive }) {
  const palette = isActive ? PILL_PALETTE.active : PILL_PALETTE.inactive
  const pillH = palette.height
  const pillGap = 6
  const padX = 6
  // PR-19a: pill widths and text baseline derive from the palette's
  // fontSize so the bumped sizes (active 8.5 / inactive 7.5) get
  // proportional padding instead of clamping at the old 5.5x heuristic.
  // ~0.7 of fontSize is a reasonable per-character upper bound for the
  // weights/letter-spacing we use on these short uppercase labels.
  const charW = palette.fontSize * 0.7
  const widths = features.map(f => Math.max(40, f.length * charW + padX * 2))
  const total = widths.reduce((s, w) => s + w, 0) + (features.length - 1) * pillGap
  let cursorX = interior.x + (interior.width - total) / 2
  const y = interior.y + interior.height - (pillH + 12)
  return (
    <>
      {features.map((label, i) => {
        const w = widths[i]
        const node = (
          <g key={label}>
            <rect
              x={cursorX} y={y}
              width={w} height={pillH}
              rx={pillH / 2}
              fill={palette.fill}
              stroke={palette.stroke}
              strokeWidth="0.5"
            />
            <text
              x={cursorX + w / 2}
              y={y + pillH / 2 + palette.fontSize * 0.36}
              textAnchor="middle"
              fontSize={palette.fontSize}
              fill={palette.text}
              fontWeight="500"
            >
              {label}
            </text>
          </g>
        )
        cursorX += w + pillGap
        return node
      })}
    </>
  )
}

// PR-19e: compact system room — The Study (Compass) or The Lab
// (Wrench). Rectangular rounded card, icon-led, distinct from
// irregularly-shaped user rooms so it reads as a system surface.
function SystemRoom({ placed, isStudy, isHovered, onEnter, onLeave, onClick }) {
  const { box } = placed
  const label = isStudy ? 'THE STUDY' : 'THE LAB'
  const subtitle = isStudy ? 'Home' : 'Build a room'
  const cx = box.x + box.width / 2
  // Icon sits in the upper third; label + subtitle stack below.
  const iconCenterY = box.y + box.height * 0.36
  const labelY = box.y + box.height * 0.62
  const subY = box.y + box.height * 0.74

  // Slight gold-tint fill on hover; thin grey border at rest.
  const fill = isHovered ? 'rgba(196,169,77,0.10)' : 'rgba(196,169,77,0.035)'
  const stroke = isHovered ? '#B8A070' : '#C8C2B8'
  const iconColor = isHovered ? '#8B6A10' : '#5A5550'

  // Each lucide icon is normalized to a 24×24 viewBox. Render at 1.4×
  // scale → 33.6px effective width; translate so the icon sits centered
  // on (cx, iconCenterY).
  const iconScale = 1.4
  const iconHalf = 12 * iconScale

  return (
    <g
      style={{ cursor: 'pointer' }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      <rect
        x={box.x}
        y={box.y}
        width={box.width}
        height={box.height}
        rx="6"
        fill={fill}
        stroke={stroke}
        strokeWidth="0.8"
      />
      <g
        transform={`translate(${cx - iconHalf} ${iconCenterY - iconHalf}) scale(${iconScale})`}
        stroke={iconColor}
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {isStudy ? (
          <>
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill={iconColor} fillOpacity="0.18" />
          </>
        ) : (
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        )}
      </g>
      <text
        x={cx}
        y={labelY}
        textAnchor="middle"
        fontSize="11"
        fill={iconColor}
        letterSpacing="0.08em"
        fontWeight="600"
      >
        {label}
      </text>
      <text
        x={cx}
        y={subY}
        textAnchor="middle"
        fontSize="9"
        fill="#9A9490"
        fontStyle="italic"
      >
        {subtitle}
      </text>
    </g>
  )
}

function PlaceholderRoom({ box, onClick }) {
  const path = buildPlaceholderPath(box)
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  return (
    <g className="bp-placeholder" style={{ cursor: 'pointer' }} onClick={onClick}>
      <path d={path} fill="transparent" className="bp-placeholder-fill" />
      <path d={path} fill="none" stroke="#C8C2B8" strokeWidth="1" strokeDasharray="5 4" className="bp-placeholder-dash" />
      {/* PR-19a: +1px font bump for legibility (was 9 / 7.5). */}
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="10" fill="#B8B2A8" letterSpacing="0.08em" className="bp-placeholder-title">
        + BUILD A ROOM
      </text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="8.5" fill="#C8C2B8" className="bp-placeholder-sub">
        Expand your Parliament
      </text>
    </g>
  )
}

function DimensionTicks({ layout, modesById }) {
  // Tick the first user room across the top edge with its name; tick
  // the tallest user room down the right edge. System rooms and the
  // placeholder are skipped — the ticks describe the user's own work.
  const realRooms = layout.placedRooms.filter(r => r.kind === 'room')
  if (realRooms.length === 0) return null
  const first = realRooms[0]
  const firstName = modesById.get(first.id)?.meta?.name || 'Room'
  const tickTop = layout.floorBox.y - 12
  const tickRight = layout.floorBox.x + layout.floorBox.width + 22
  const colHeight = layout.floorBox.height
  return (
    <g>
      {/* Top tick */}
      <line x1={first.box.x} y1={tickTop} x2={first.box.x + first.box.width} y2={tickTop} stroke="#C8C2B8" strokeWidth="0.5" />
      <line x1={first.box.x} y1={tickTop - 3} x2={first.box.x} y2={tickTop + 3} stroke="#C8C2B8" strokeWidth="0.5" />
      <line x1={first.box.x + first.box.width} y1={tickTop - 3} x2={first.box.x + first.box.width} y2={tickTop + 3} stroke="#C8C2B8" strokeWidth="0.5" />
      <text x={first.box.x + first.box.width / 2} y={tickTop - 4} textAnchor="middle" fontSize="8" fill="#B8B2A8">
        {firstName} · {first.box.width}px
      </text>
      {/* Right tick (down full floor height) */}
      <line x1={tickRight} y1={layout.floorBox.y} x2={tickRight} y2={layout.floorBox.y + colHeight} stroke="#C8C2B8" strokeWidth="0.5" />
      <line x1={tickRight - 3} y1={layout.floorBox.y} x2={tickRight + 3} y2={layout.floorBox.y} stroke="#C8C2B8" strokeWidth="0.5" />
      <line x1={tickRight - 3} y1={layout.floorBox.y + colHeight} x2={tickRight + 3} y2={layout.floorBox.y + colHeight} stroke="#C8C2B8" strokeWidth="0.5" />
    </g>
  )
}

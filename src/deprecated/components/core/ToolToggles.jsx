// Retired with R30, approved by Stefan on 27 October 2026: Toggle buttons for a room's tools, used by nothing.
// Was src/components/core/ToolToggles.jsx. Nothing imports it and it is not built. To restore:
// Move it back; nothing needs changing.

import { motion } from 'framer-motion'
import { Globe, Calculator, BarChart2 } from 'lucide-react'
import { SPRING_SNAPPY } from '../../lib/constants'

const TOOL_META = {
  web_search:   { label: 'Search', Icon: Globe,       color: '#4A7AE5' },
  calculate:    { label: 'Calc',   Icon: Calculator,   color: '#22C55E' },
  create_chart: { label: 'Chart',  Icon: BarChart2,    color: '#7C6CD4' },
}

/**
 * Row of pill-buttons to toggle tools on/off before sending.
 *
 * Props:
 *   availableTools {object[]} — from provider.getAvailableTools()
 *   activeTools    {Set<string>} — set of active tool IDs
 *   onToggle       {(toolId) => void}
 */
export default function ToolToggles({ availableTools = [], activeTools = new Set(), onToggle }) {
  if (availableTools.length === 0) return null

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {availableTools.map((tool) => {
        const meta = TOOL_META[tool.id] ?? {}
        const Icon = meta.Icon ?? Globe
        const isActive = activeTools.has(tool.id)
        const color = meta.color ?? '#4A7AE5'

        return (
          <motion.button
            key={tool.id}
            whileTap={{ scale: 0.93 }}
            onClick={() => onToggle(tool.id)}
            title={tool.description}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors select-none"
            style={{
              borderColor: isActive ? color : '#EBEBEB',
              backgroundColor: isActive ? `${color}14` : 'transparent',
              color: isActive ? color : '#9CA3AF',
            }}
            animate={{ opacity: 1 }}
            initial={{ opacity: 0 }}
            transition={SPRING_SNAPPY}
          >
            <Icon className="w-3 h-3" />
            {meta.label ?? tool.label}
          </motion.button>
        )
      })}
    </div>
  )
}

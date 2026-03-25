import { motion } from 'framer-motion'
import { Upload, BarChart3, Table2, Layers, Sparkles } from 'lucide-react'
import { SPRING_GENTLE, SPRING_SNAPPY } from '../../../lib/constants'

export default function EmptyCanvas({ onBrowse }) {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={SPRING_GENTLE}
          className="w-20 h-20 rounded-2xl bg-[#B8A070]/5 border-2 border-dashed border-[#B8A070]/20 flex items-center justify-center mx-auto mb-5"
        >
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Upload className="w-8 h-8 text-[#B8A070]/40" />
          </motion.div>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING_GENTLE, delay: 0.1 }}
          className="text-lg font-semibold text-[#191919] mb-2"
        >
          Drop a file to get started
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING_GENTLE, delay: 0.15 }}
          className="text-sm text-[#787774] leading-relaxed mb-6"
        >
          Pelican supports CSV, XLSX, TSV, and JSON files. Drop one anywhere in the left shelf, or browse to upload.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING_GENTLE, delay: 0.2 }}
          className="flex items-center justify-center gap-3"
        >
          <motion.button
            whileHover={{ scale: 1.03, borderColor: '#B8A070' }}
            whileTap={{ scale: 0.97 }}
            onClick={onBrowse}
            className="px-4 py-2.5 rounded-xl text-xs font-medium border border-[#E9E9E7] bg-white text-[#191919] flex items-center gap-2 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Browse Files
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03, opacity: 0.9 }}
            whileTap={{ scale: 0.97 }}
            className="px-4 py-2.5 rounded-xl text-xs font-medium bg-[#B8A070] text-white flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Try Sample Data
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING_GENTLE, delay: 0.28 }}
          className="mt-8 grid grid-cols-3 gap-3"
        >
          {[
            { icon: BarChart3, label: 'Visualize', desc: 'Charts & graphs' },
            { icon: Table2, label: 'Explore', desc: 'Sort, filter, query' },
            { icon: Layers, label: 'Summarize', desc: 'AI-powered insights' },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.label}
                className="px-3 py-3 rounded-xl bg-[#FAFAFA] border border-[#F1F1EF]"
              >
                <Icon className="w-4 h-4 text-[#B8A070] mb-1.5" />
                <div className="text-[11px] font-semibold text-[#191919]">{item.label}</div>
                <div className="text-[10px] text-[#787774]">{item.desc}</div>
              </div>
            )
          })}
        </motion.div>
      </div>
    </div>
  )
}

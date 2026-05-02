// DoneStep — step 7: success screen (PR-13).
//
// Per parliament_wizard_v5.html lines 1329–1344. Checkmark inside a gold
// circle, "Your room is ready" headline, two buttons. If buildAnother
// was checked back in step 1, surface a hint nudging the user to start
// the next room.

import { motion } from 'framer-motion'

export default function DoneStep({ roomName, buildAnother, onBuildAnother, onGoToParliament }) {
  const title = `${(roomName || '').trim() || 'Your room'} is ready`
  return (
    <div className="text-center py-10 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="mx-auto mb-5 w-[60px] h-[60px] rounded-full flex items-center justify-center"
        style={{ background: 'var(--p-gold-tint)', border: '1.5px solid var(--p-gold-light)' }}
      >
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <polyline
            points="5,13 10,18 21,8"
            stroke="var(--p-gold-light)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </motion.div>
      <div className="text-[20px] font-medium mb-2" style={{ color: 'var(--p-text-primary)' }}>
        {title}
      </div>
      <p
        className="text-[13px] leading-[1.65] mx-auto mb-8"
        style={{ color: 'var(--p-text-secondary)', maxWidth: '340px' }}
      >
        {buildAnother
          ? 'Your first room is built. You said you wanted another — start the wizard again, or jump into your Parliament now.'
          : 'Your first room is built and the lights are on. You can always come back to edit it, or build another room from your Parliament.'}
      </p>
      <div className="flex gap-2 justify-center flex-wrap">
        <button
          type="button"
          onClick={onBuildAnother}
          className="px-4 py-2 text-[13px] rounded-md transition-colors"
          style={{
            border: '0.5px solid var(--p-border)',
            background: 'transparent',
            color: 'var(--p-text-secondary)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--p-gold-light)'; e.currentTarget.style.color = 'var(--p-gold-light)' }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--p-border)'; e.currentTarget.style.color = 'var(--p-text-secondary)' }}
        >
          Build another room
        </button>
        <button
          type="button"
          onClick={onGoToParliament}
          className="px-4 py-2 text-[13px] font-medium rounded-md text-white"
          style={{ background: 'var(--p-gold-light)' }}
        >
          Go to your Parliament
        </button>
      </div>
    </div>
  )
}

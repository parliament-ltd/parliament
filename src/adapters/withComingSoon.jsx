import { useState } from 'react'
import { X } from 'lucide-react'

/**
 * withComingSoon — wraps any Layout with a dismissible amber banner
 * indicating that the mode is not yet fully implemented and is
 * falling back to the Albatross layout.
 */
export default function withComingSoon(Layout, modeName) {
  function ComingSoonWrapper() {
    const [dismissed, setDismissed] = useState(false)
    return (
      <>
        {!dismissed && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 9999,
              backgroundColor: '#E5A620',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '6px 12px',
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: '#FFFFFF', letterSpacing: '0.01em' }}>
              {modeName} mode is coming soon — showing Albatross in the meantime
            </span>
            <button
              onClick={() => setDismissed(true)}
              style={{
                position: 'absolute',
                right: 12,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X style={{ width: 14, height: 14, color: '#FFFFFF' }} />
            </button>
          </div>
        )}
        <Layout />
      </>
    )
  }
  ComingSoonWrapper.displayName = `${modeName}ComingSoonWrapper`
  return ComingSoonWrapper
}

// SelectorView — `/chats` route shell.
//
// PR-10b deletes adapter directories; with no `mode` driving routing
// anymore, /chats just renders the V1-derived selector layout
// extracted into ./SelectorLayout. The onboarding redirect (no API key
// AND no completed tour → bounce to /settings) lives here so it runs
// once on route entry instead of inside the selector itself.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SelectorLayout from './SelectorLayout'
import { loadApiKey } from '../lib/crypto'
import { getSetting } from '../lib/db'

export default function SelectorView() {
  const navigate = useNavigate()
  const [onboardingChecked, setOnboardingChecked] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function check() {
      const [apiKey, tourDone] = await Promise.all([
        loadApiKey('persistent'),
        getSetting('tourCompleted_settings'),
      ])
      if (cancelled) return
      if (!apiKey && !tourDone) {
        navigate('/settings', { replace: true })
        return
      }
      setOnboardingChecked(true)
    }
    check()
    return () => { cancelled = true }
  }, [navigate])

  if (!onboardingChecked) return null
  return <SelectorLayout />
}

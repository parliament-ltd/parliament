import { createContext, useContext, useState, useEffect } from 'react'
import { getSetting, setSetting as dbSetSetting } from '../lib/db'

const SettingsContext = createContext(null)

const DEFAULT_SETTINGS = {
  storageMode: 'persistent',
  defaultModel: 'claude-sonnet',
  theme: 'light',
  fontSize: 'default',
  contextThreshold: 80,
  autoCompress: 'prompt',
  summaryDepth: 'brief',
  budgetAlert: 20,
  budgetEnabled: true,
  backupReminder: 'weekly',
  lastBackup: null,
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  // Load all settings from IndexedDB on mount
  useEffect(() => {
    async function loadSettings() {
      // TODO: implement — load each key from IndexedDB
      // Fall back to DEFAULT_SETTINGS for any missing keys
      setLoaded(true)
    }
    loadSettings()
  }, [])

  // Update a single setting in state and persist to IndexedDB
  async function updateSetting(key, value) {
    setSettings(prev => ({ ...prev, [key]: value }))
    // TODO: persist to IndexedDB via dbSetSetting(key, value)
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, loaded }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) throw new Error('useSettings must be used within SettingsProvider')
  return context
}
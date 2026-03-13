import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getSetting, setSetting as dbSetSetting, getStorageEstimate } from '../lib/db'

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
  spendingLimitDismissed: false,
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)
  const [storageUsage, setStorageUsage] = useState({ usage: 0, quota: 0 })

  // Load all settings from IndexedDB on mount
  useEffect(() => {
    async function loadSettings() {
      const loaded = {}
      for (const key of Object.keys(DEFAULT_SETTINGS)) {
        const value = await getSetting(key)
        if (value !== null) {
          loaded[key] = value
        }
      }
      // Migrate legacy 'session' storage mode — removed for security reasons
      if (loaded.storageMode === 'session') {
        loaded.storageMode = 'persistent'
        await dbSetSetting('storageMode', 'persistent')
      }
      setSettings(prev => ({ ...prev, ...loaded }))
      setLoaded(true)
    }
    loadSettings()
  }, [])

  // Check storage estimate on mount
  useEffect(() => {
    async function checkStorage() {
      const estimate = await getStorageEstimate()
      setStorageUsage(estimate)
    }
    checkStorage()
  }, [])

  // Refresh storage estimate (call after IndexedDB writes)
  const refreshStorageEstimate = useCallback(async () => {
    const estimate = await getStorageEstimate()
    setStorageUsage(estimate)
  }, [])

  // Update a single setting in state and persist to IndexedDB
  async function updateSetting(key, value) {
    setSettings(prev => ({ ...prev, [key]: value }))
    await dbSetSetting(key, value)
  }

  return (
    <SettingsContext.Provider value={{
      settings,
      updateSetting,
      loaded,
      storageUsage,
      refreshStorageEstimate,
    }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) throw new Error('useSettings must be used within SettingsProvider')
  return context
}
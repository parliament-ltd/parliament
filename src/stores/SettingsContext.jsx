import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getSetting, setSetting as dbSetSetting, getStorageEstimate } from '../lib/db'

const SettingsContext = createContext(null)

const DEFAULT_SETTINGS = {
  storageMode: 'persistent',
  // The model for whoever has not chosen one (C155, ruled 22 October).
  // Settings are stored only when changed, so a chosen model stays.
  defaultModel: 'claude-sonnet-5-5',
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
  // PR-19e: pointer to a room mode the user wants to use as their
  // landing surface. When set, `/` opens a fresh conversation in that
  // room instead of rendering The Study. null = fall back to The Study.
  chosenHomeRoomId: null,
  // C109: when a chat is left while its reply is being written, finish the
  // reply in the background instead of stopping it. Off unless chosen.
  finishRepliesOnLeave: false,
  // C62: after a chat's first answer, one request for its title, summary
  // and tags, named on the Enter line. Off: titled from the first words.
  describeNewChats: true,
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

  // Apply theme class to <html> whenever it changes (or on first load)
  useEffect(() => {
    if (!loaded) return
    const html = document.documentElement
    if (settings.theme === 'dark') {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }, [settings.theme, loaded])

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
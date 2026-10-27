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
  // How often to remind about backups (set:reminder; C182). Monthly is the
  // rule the reminder always had.
  backupReminder: 'monthly',
  // Warn before a costly run (set:warn; C203): an amount in dollars, or null for off.
  runWarn: null,
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
  // Where Mistral processes prompts: 'global', or 'eu' or 'us' at 1.1 times
  // the price (stage 7, piece 3; C159).
  mistralRegion: 'global',
  // Whether models that can think do so before answering, shown as they go
  // (C165). Off unless turned on with thinking:on (Stefan, 22 October:
  // thinking off answers many times faster on a computer).
  thinking: false,
  // Replies marked up (struck words, the person's in blue, editable) or
  // clean, the result only (stage 11, piece 1; markup:on, markup:off).
  markup: 'on',
  // calm: and calm:off (stage 14, piece 2; C255): off for someone new
  // (C253 (c)), kept on this device and not in backups (C253 (d)).
  calm: false,
  // Whether a second screen was already noticed (stage 14, piece 4; C259 (g)):
  // on this device, not in backups, false again once back to one screen.
  screensNoticed: false,
  // The Collection's cards, marked up or clean, apart from the chat's (piece 5; C220 (g)).
  collectionMarkup: 'on',
  // The reply language (a tag, or 'off'; none follows the interface), the
  // helper (a model's id; none takes the usual), and whether questions to
  // sources that read only English go translated (stage 7, piece 6; C166).
  replyLanguage: null,
  // The page's language, chosen with language: or the globe (C184); null
  // follows the browser's languages.
  interfaceLanguage: null,
  helper: null,
  translateQueries: false,
  // The privacy filter for fixed formats: 'off' or 'patterns' (stage 7, piece 7; C167).
  privacyFilter: 'off',
  // The room a new chat starts in, a library template's id; none is the
  // Writing Studio (set:room; stage 9; C181).
  newChatRoom: null,
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
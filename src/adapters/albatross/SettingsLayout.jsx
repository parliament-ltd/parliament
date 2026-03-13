import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Key, Cpu, DollarSign, Sliders, Database, Sun, Shield,
  ArrowLeft, MessageSquare, Github, ExternalLink, Info,
  Download, Upload, Trash2, AlertTriangle, Moon, HardDrive,
  Clock, Bell, BellOff, CheckCircle, AlertCircle, Lock
} from 'lucide-react'
import { useSettings } from '../../stores/SettingsContext'
import { useConversations } from '../../stores/ConversationContext'
import { useMode } from '../../stores/ModeContext'
import { Button, Card, Input, Modal, Toggle, RadioGroup, SegmentedControl, SectionLabel, IconButton } from '../../components'
import { getProvider } from '../../providers'
import { saveApiKey, deleteApiKey, encryptExport, decryptImport } from '../../lib/crypto'
import { exportAllData, importData, clearAllData, getSetting, setSetting } from '../../lib/db'
import TourTooltip from '../../components/TourTooltip'

const SPRING_SMOOTH = { type: 'spring', stiffness: 300, damping: 28 }
const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.08 } }
}
const staggerItem = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: SPRING_SMOOTH }
}

const NAV_ITEMS = [
  { id: 'api', label: 'API Configuration', icon: Key, tourTarget: 'settings-api' },
  { id: 'model', label: 'Model Preferences', icon: Cpu },
  { id: 'usage', label: 'Usage & Spending', icon: DollarSign },
  { id: 'context', label: 'Context & Defaults', icon: Sliders, tourTarget: 'settings-context' },
  { id: 'data', label: 'Data & Backups', icon: Database, tourTarget: 'settings-data' },
  { id: 'appearance', label: 'Appearance', icon: Sun },
  { id: 'about', label: 'About & Security', icon: Shield },
]

const SETTINGS_TOUR_STEPS = [
  {
    title: 'Welcome to Settings',
    desc: 'Here you can configure your API key, model preferences, context settings, and more.',
    placement: 'center',
  },
  {
    title: 'API Configuration',
    desc: 'Add your Anthropic API key here to start chatting. Your key is encrypted and stored only in your browser.',
    target: '[data-tour="settings-api"]',
    placement: 'right',
  },
  {
    title: 'Context & Defaults',
    desc: 'Set your context threshold and compression preferences to keep conversations flowing smoothly.',
    target: '[data-tour="settings-context"]',
    placement: 'right',
  },
  {
    title: 'Data & Backups',
    desc: 'Export encrypted backups of all your conversations or import a previous backup to restore your history.',
    target: '[data-tour="settings-data"]',
    placement: 'right',
  },
]

const MODELS = [
  { id: 'claude-haiku', name: 'Claude Haiku', description: 'Fast & affordable', inputCost: '$0.25', outputCost: '$1.25', speed: 'Fastest', badge: 'Budget-friendly' },
  { id: 'claude-sonnet', name: 'Claude Sonnet', description: 'Balanced performance', inputCost: '$3.00', outputCost: '$15.00', speed: 'Fast', badge: 'Recommended' },
  { id: 'claude-opus', name: 'Claude Opus', description: 'Maximum capability', inputCost: '$15.00', outputCost: '$75.00', speed: 'Moderate', badge: 'Most powerful' },
]

const STORAGE_MODES = [
  { id: 'persistent', label: 'Remember my key', description: 'Saved in this browser until you delete it', icon: HardDrive },
  { id: 'session', label: 'Session only', description: 'Cleared when you close the browser', icon: Clock },
  { id: 'memory', label: "Don't save", description: 'Re-enter every time — maximum security', icon: Shield },
]

export default function SettingsView() {
  const navigate = useNavigate()
  const { settings, updateSetting, storageUsage } = useSettings()
  const { conversations } = useConversations()
  const { mode: currentMode, storedMode, setMode } = useMode()
  const [activeSection, setActiveSection] = useState('api')

  // Onboarding tour
  const [showTour, setShowTour] = useState(false)
  useEffect(() => {
    getSetting('tourCompleted_settings').then(done => {
      if (!done) setShowTour(true)
    })
  }, [])
  const handleTourDone = useCallback(async () => {
    setShowTour(false)
    await setSetting('tourCompleted_settings', true)
  }, [])

  // Local state for API key (not persisted until validated)
  const [apiKey, setApiKey] = useState('')
  const [keyStatus, setKeyStatus] = useState(null) // null | 'validating' | 'valid' | 'invalid' | 'billing_error'
  const [keyError, setKeyError] = useState('')

  // Modal state
  const [showExportModal, setShowExportModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [exportPassphrase, setExportPassphrase] = useState('')
  const [exportConfirmPassphrase, setExportConfirmPassphrase] = useState('')
  const [importPassphrase, setImportPassphrase] = useState('')

  const validateKey = async () => {
    setKeyStatus('validating')
    setKeyError('')
    try {
      const provider = getProvider('anthropic')
      const result = await provider.validateKey(apiKey)
      setKeyStatus(result.status)
      if (!result.valid) {
        setKeyError(result.error)
      } else {
        // Key is valid — save it with the chosen storage mode
        await saveApiKey(apiKey, settings.storageMode)
      }
    } catch {
      setKeyStatus('invalid')
      setKeyError('Could not reach the Anthropic API. Please check your connection.')
    }
  }

  return (
    <div className="flex h-screen font-sans overflow-hidden bg-white text-[#1E2532]">
      {/* Left Navigation */}
      <motion.div
        initial={{ x: -260 }}
        animate={{ x: 0 }}
        transition={SPRING_SMOOTH}
        className="w-64 flex flex-col flex-shrink-0 border-r border-[#F0F0F0]"
      >
        <div className="p-4">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING_SMOOTH, delay: 0.2 }}
            className="flex items-center gap-2"
          >
            <IconButton icon={ArrowLeft} onClick={() => navigate('/')} title="Back to Chats" />
            <h1 className="text-lg font-semibold text-[#1E2532]">Settings</h1>
          </motion.div>
        </div>

        <motion.nav
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="flex-1 px-3 space-y-0.5"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = activeSection === item.id
            return (
              <motion.button
                key={item.id}
                variants={staggerItem}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveSection(item.id)}
                {...(item.tourTarget ? { 'data-tour': item.tourTarget } : {})}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2.5 ${
                  active
                    ? 'text-[#1E2532] font-semibold bg-[#F5F5F5]'
                    : 'text-[#6B7C93] hover:text-[#1E2532] hover:bg-[#FAFAFA]'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-[#4A7AE5]' : 'text-[#6B7C93]'}`} />
                {item.label}
              </motion.button>
            )
          })}
        </motion.nav>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-10 py-8">
        <AnimatePresence mode="wait">
          {activeSection === 'api' && <ApiSection key="api" apiKey={apiKey} setApiKey={setApiKey} keyStatus={keyStatus} keyError={keyError} validateKey={validateKey} storageMode={settings.storageMode} setStorageMode={(v) => updateSetting('storageMode', v)} />}
          {activeSection === 'model' && <ModelSection key="model" selectedModel={settings.defaultModel} setSelectedModel={(v) => updateSetting('defaultModel', v)} />}
          {activeSection === 'usage' && <UsageSection key="usage" budgetAlert={settings.budgetAlert} setBudgetAlert={(v) => updateSetting('budgetAlert', v)} budgetEnabled={settings.budgetEnabled} setBudgetEnabled={(v) => updateSetting('budgetEnabled', v)} spendingLimitDismissed={settings.spendingLimitDismissed} setSpendingLimitDismissed={(v) => updateSetting('spendingLimitDismissed', v)} />}
          {activeSection === 'context' && <ContextSection key="context" summaryDepth={settings.summaryDepth} setSummaryDepth={(v) => updateSetting('summaryDepth', v)} contextThreshold={settings.contextThreshold} setContextThreshold={(v) => updateSetting('contextThreshold', v)} autoCompress={settings.autoCompress} setAutoCompress={(v) => updateSetting('autoCompress', v)} />}
          {activeSection === 'data' && <DataSection key="data" backupReminder={settings.backupReminder} setBackupReminder={(v) => updateSetting('backupReminder', v)} showExportModal={showExportModal} setShowExportModal={setShowExportModal} showImportModal={showImportModal} setShowImportModal={setShowImportModal} showDeleteConfirm={showDeleteConfirm} setShowDeleteConfirm={setShowDeleteConfirm} exportPassphrase={exportPassphrase} setExportPassphrase={setExportPassphrase} exportConfirmPassphrase={exportConfirmPassphrase} setExportConfirmPassphrase={setExportConfirmPassphrase} importPassphrase={importPassphrase} setImportPassphrase={setImportPassphrase} storageUsage={storageUsage} conversations={conversations} />}
          {activeSection === 'appearance' && <AppearanceSection key="appearance" theme={settings.theme} setTheme={(v) => updateSetting('theme', v)} fontSize={settings.fontSize} setFontSize={(v) => updateSetting('fontSize', v)} storedMode={storedMode} setMode={setMode} />}
          {activeSection === 'about' && <AboutSection key="about" />}
        </AnimatePresence>
      </div>

      {/* Onboarding Tour */}
      {showTour && <TourTooltip steps={SETTINGS_TOUR_STEPS} onDone={handleTourDone} />}
    </div>
  )
}

// ─── Section Wrapper ─────────────────────────────────────

function SettingsSection({ title, subtitle, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={SPRING_SMOOTH}
    >
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="mb-6">
        <h2 className="text-lg font-semibold text-[#1E2532]">{title}</h2>
        <p className="text-sm text-[#6B7C93] mt-0.5">{subtitle}</p>
      </motion.div>
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-4">
        {children}
      </motion.div>
    </motion.div>
  )
}

function StaggerItem({ children }) {
  return <motion.div variants={staggerItem}>{children}</motion.div>
}

// ─── API Configuration ───────────────────────────────────

function ApiSection({ apiKey, setApiKey, keyStatus, keyError, validateKey, storageMode, setStorageMode }) {
  return (
    <SettingsSection title="API Configuration" subtitle="Connect your Anthropic API key to start chatting">
      <StaggerItem>
        <Card>
          <div className="flex items-end gap-3">
            <Input
              label="Anthropic API Key"
              value={apiKey}
              onChange={setApiKey}
              placeholder="sk-ant-..."
              secret
              className="flex-1"
              error={keyStatus === 'invalid' || keyStatus === 'billing_error' ? keyError : undefined}
            />
            <Button
              onClick={validateKey}
              disabled={!apiKey || keyStatus === 'validating'}
            >
              {keyStatus === 'validating' ? 'Checking...' : keyStatus === 'valid' ? 'Valid' : 'Validate'}
            </Button>
          </div>

          {keyStatus === 'valid' && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mt-3 text-[#22C55E]"
            >
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs font-semibold">API key is valid</span>
            </motion.div>
          )}
        </Card>
      </StaggerItem>

      <StaggerItem>
        <Card>
          <RadioGroup
            label="Key Storage"
            options={STORAGE_MODES}
            value={storageMode}
            onChange={setStorageMode}
          />
        </Card>
      </StaggerItem>

      <StaggerItem>
        <Card>
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-[#4A7AE5] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-[#6B7C93] leading-relaxed">
                Your API key is encrypted using the Web Crypto API (AES-GCM) before being stored. It never leaves your browser.
              </p>
              <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-[#4A7AE5] mt-2 hover:underline">
                Get an API key <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </Card>
      </StaggerItem>
    </SettingsSection>
  )
}

// ─── Model Preferences ───────────────────────────────────

function ModelSection({ selectedModel, setSelectedModel }) {
  return (
    <SettingsSection title="Model Preferences" subtitle="Choose your default model for new conversations">
      {MODELS.map((model) => {
        const active = selectedModel === model.id
        return (
          <StaggerItem key={model.id}>
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setSelectedModel(model.id)}
              className={`px-5 py-4 rounded-xl border cursor-pointer transition-colors ${
                active ? 'border-[#4A7AE5] bg-[#4A7AE5]/5' : 'border-[#EBEBEB] hover:border-[#D5D5D5]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className={`text-sm font-semibold ${active ? 'text-[#1E2532]' : 'text-[#6B7C93]'}`}>{model.name}</h3>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    active ? 'bg-[#4A7AE5]/10 text-[#4A7AE5]' : 'bg-[#F5F5F5] text-[#6B7C93]'
                  }`}>
                    {model.badge}
                  </span>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  active ? 'border-[#4A7AE5]' : 'border-[#D5D5D5]'
                }`}>
                  <motion.div
                    initial={false}
                    animate={{ scale: active ? 1 : 0 }}
                    className="w-2 h-2 rounded-full bg-[#4A7AE5]"
                  />
                </div>
              </div>
              <p className="text-xs text-[#6B7C93] mb-3">{model.description}</p>
              <div className="flex gap-4 text-xs text-[#6B7C93]">
                <span>Input: <span className="font-semibold text-[#1E2532]">{model.inputCost}</span>/1M tokens</span>
                <span>Output: <span className="font-semibold text-[#1E2532]">{model.outputCost}</span>/1M tokens</span>
                <span>Speed: <span className="font-semibold text-[#1E2532]">{model.speed}</span></span>
              </div>
            </motion.div>
          </StaggerItem>
        )
      })}
    </SettingsSection>
  )
}

// ─── Usage & Spending ────────────────────────────────────

function UsageSection({ budgetAlert, setBudgetAlert, budgetEnabled, setBudgetEnabled, spendingLimitDismissed, setSpendingLimitDismissed }) {
  return (
    <SettingsSection title="Usage & Spending" subtitle="Monitor costs and set budget alerts">
      <StaggerItem>
        <Card>
          <SectionLabel>Current Session</SectionLabel>
          <div className="grid grid-cols-3 gap-4 mt-3">
            {[
              { label: 'Messages', value: '0' },
              { label: 'Tokens used', value: '0' },
              { label: 'Estimated cost', value: '$0.00' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-lg font-semibold text-[#1E2532]">{stat.value}</p>
                <p className="text-xs text-[#6B7C93]">{stat.label}</p>
              </div>
            ))}
          </div>
        </Card>
      </StaggerItem>

      <StaggerItem>
        <Card>
          <div className="flex items-center justify-between mb-4">
            <SectionLabel>Budget Alert</SectionLabel>
            <Toggle enabled={budgetEnabled} onChange={setBudgetEnabled} />
          </div>
          {budgetEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={budgetAlert}
                  onChange={(e) => setBudgetAlert(Number(e.target.value))}
                  className="flex-1 accent-[#4A7AE5]"
                />
                <span className="text-sm font-semibold text-[#1E2532] w-16 text-right">${budgetAlert}</span>
              </div>
              <p className="text-xs text-[#6B7C93] mt-2">You'll see a warning when your estimated spending reaches this amount.</p>
            </motion.div>
          )}
        </Card>
      </StaggerItem>

      {!spendingLimitDismissed && (
        <StaggerItem>
          <Card>
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-[#E5A620] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-xs font-semibold text-[#1E2532] mb-1">Set a spending limit on Anthropic</h4>
                <p className="text-xs text-[#6B7C93] leading-relaxed mb-3">
                  Budget alerts in this app are informational only. For a hard spending cap, set a monthly limit in your Anthropic dashboard.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    icon={ExternalLink}
                    onClick={() => window.open('https://console.anthropic.com/settings/limits', '_blank')}
                  >
                    Set limit on Anthropic
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSpendingLimitDismissed(true)}>
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </StaggerItem>
      )}
    </SettingsSection>
  )
}

// ─── Context & Defaults ──────────────────────────────────

function ContextSection({ summaryDepth, setSummaryDepth, contextThreshold, setContextThreshold, autoCompress, setAutoCompress }) {
  return (
    <SettingsSection title="Context & Defaults" subtitle="Control how conversations are managed">
      <StaggerItem>
        <Card>
          <SectionLabel>Summary Depth</SectionLabel>
          <p className="text-xs text-[#6B7C93] mt-1 mb-3">Controls how detailed the review summary is.</p>
          <SegmentedControl
            options={[
              { id: 'brief', label: 'Brief' },
              { id: 'detailed', label: 'Detailed' },
            ]}
            value={summaryDepth}
            onChange={setSummaryDepth}
          />
        </Card>
      </StaggerItem>

      <StaggerItem>
        <Card>
          <div className="flex items-center justify-between mb-1">
            <SectionLabel>Context Warning Threshold</SectionLabel>
            <span className="text-sm font-semibold text-[#1E2532]">{contextThreshold}%</span>
          </div>
          <p className="text-xs text-[#6B7C93] mt-1 mb-3">When context usage exceeds this level, you'll be prompted to compress via branching.</p>
          <input
            type="range"
            min={10}
            max={95}
            step={5}
            value={contextThreshold}
            onChange={(e) => setContextThreshold(Number(e.target.value))}
            className="w-full accent-[#4A7AE5]"
          />
          <div className="flex justify-between text-[10px] text-[#6B7C93] mt-1">
            <span>10%</span>
            <span>95%</span>
          </div>
        </Card>
      </StaggerItem>

      <StaggerItem>
        <Card>
          <RadioGroup
            label="Auto-Compress Behavior"
            options={[
              { id: 'prompt', label: 'Ask me first', description: 'Show a prompt when the threshold is reached' },
              { id: 'automatic', label: 'Automatic', description: 'Create a compressed branch automatically' },
              { id: 'disabled', label: 'Disabled', description: "Never compress — I'll manage context manually" },
            ]}
            value={autoCompress}
            onChange={setAutoCompress}
          />
        </Card>
      </StaggerItem>
    </SettingsSection>
  )
}

// ─── Helpers ─────────────────────────────────────────────

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

// ─── Data & Backups ──────────────────────────────────────

function DataSection({ backupReminder, setBackupReminder, showExportModal, setShowExportModal, showImportModal, setShowImportModal, showDeleteConfirm, setShowDeleteConfirm, exportPassphrase, setExportPassphrase, exportConfirmPassphrase, setExportConfirmPassphrase, importPassphrase, setImportPassphrase, storageUsage, conversations }) {
  const fileInputRef = useRef(null)
  const [importFile, setImportFile] = useState(null)
  const [importFileIsEncrypted, setImportFileIsEncrypted] = useState(false)
  const [importError, setImportError] = useState('')
  const [exportError, setExportError] = useState('')
  const [importLoading, setImportLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [importSuccess, setImportSuccess] = useState(false)

  const resetImportModal = () => {
    if (importLoading || importSuccess) return
    setShowImportModal(false)
    setImportPassphrase('')
    setImportFile(null)
    setImportError('')
    setImportFileIsEncrypted(false)
    setImportSuccess(false)
  }

  const storagePercent = storageUsage.quota > 0
    ? Math.round((storageUsage.usage / storageUsage.quota) * 100)
    : 0
  const storageWarning = storagePercent >= 80
  const storageCritical = storagePercent >= 95

  const handleExportEncrypted = async () => {
    try {
      setExportError('')
      setExportLoading(true)
      const data = await exportAllData()
      const jsonString = JSON.stringify(data)
      const encrypted = await encryptExport(jsonString, exportPassphrase)
      const blob = new Blob([JSON.stringify(encrypted)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `apollo-backup-${new Date().toISOString().slice(0, 10)}.apb`
      a.click()
      URL.revokeObjectURL(url)
      setShowExportModal(false)
      setExportPassphrase('')
      setExportConfirmPassphrase('')
    } catch {
      setExportError('Export failed. Please try again.')
    } finally {
      setExportLoading(false)
    }
  }

  const handleExportJSON = async () => {
    try {
      setExportLoading(true)
      const data = await exportAllData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `apollo-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // Surface error via a brief alert — no modal for plain export
      alert('Export failed. Please try again.')
    } finally {
      setExportLoading(false)
    }
  }

  const handleImport = async () => {
    if (!importFile) return
    try {
      setImportError('')
      setImportLoading(true)
      const text = await importFile.text()

      let parsed
      try {
        parsed = JSON.parse(text)
      } catch {
        throw new Error('The file could not be read. Make sure it is a valid Apollo backup file.')
      }

      let data
      if (parsed.salt && parsed.iv && parsed.ciphertext) {
        // Encrypted .apb file
        try {
          data = await decryptImport(parsed, importPassphrase)
        } catch {
          throw new Error('Incorrect passphrase. Please check your passphrase and try again.')
        }
      } else {
        // Plain .json file
        data = parsed
      }

      if (!data || typeof data !== 'object' || !data.conversations) {
        throw new Error('The file does not appear to be a valid Apollo backup.')
      }

      await importData(data)
      setImportSuccess(true)
    } catch (error) {
      setImportError(error.message || 'Import failed. Check the file and passphrase.')
    } finally {
      setImportLoading(false)
    }
  }

  const handleDeleteAll = async () => {
    await clearAllData()
    await deleteApiKey()
    setShowDeleteConfirm(false)
    window.location.reload()
  }

  return (
    <SettingsSection title="Data & Backups" subtitle="Export, import, and manage your data">
      {/* Storage Monitoring */}
      <StaggerItem>
        <Card>
          <SectionLabel>Storage</SectionLabel>
          <div className="mt-3 mb-2">
            <div className="w-full h-2 rounded-full bg-[#EBEBEB] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${storagePercent}%` }}
                transition={SPRING_SMOOTH}
                className={`h-full rounded-full ${
                  storageCritical ? 'bg-[#EF4444]' : storageWarning ? 'bg-[#E5A620]' : 'bg-[#4A7AE5]'
                }`}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className={`text-xs font-semibold ${storageCritical ? 'text-[#EF4444]' : storageWarning ? 'text-[#E5A620]' : 'text-[#6B7C93]'}`}>
                {formatBytes(storageUsage.usage)} used
              </span>
              <span className="text-xs text-[#6B7C93]">
                {formatBytes(storageUsage.quota)} available
              </span>
            </div>
          </div>
          <div className="flex gap-6 mt-3 text-xs text-[#6B7C93]">
            <span>{conversations.length} conversations</span>
          </div>
          {storageWarning && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`text-xs mt-2 ${storageCritical ? 'text-[#EF4444]' : 'text-[#E5A620]'}`}
            >
              {storageCritical
                ? 'Storage is nearly full. Export and delete old conversations to free space.'
                : 'Storage is getting full. Consider exporting and cleaning up old conversations.'}
            </motion.p>
          )}
        </Card>
      </StaggerItem>

      <StaggerItem>
        <Card>
          <SectionLabel>Backup Reminder</SectionLabel>
          <p className="text-xs text-[#6B7C93] mt-1 mb-3">How often should we remind you to back up your data?</p>
          <SegmentedControl
            options={[
              { id: 'daily', label: 'Daily' },
              { id: 'weekly', label: 'Weekly' },
              { id: 'monthly', label: 'Monthly' },
              { id: 'never', label: 'Never' },
            ]}
            value={backupReminder}
            onChange={setBackupReminder}
          />
        </Card>
      </StaggerItem>

      <StaggerItem>
        <Card>
          <SectionLabel>Export</SectionLabel>
          <p className="text-xs text-[#6B7C93] mt-1 mb-3">Download all your conversations, highlights, notes, and settings.</p>
          <div className="flex gap-2">
            <Button icon={Lock} onClick={() => setShowExportModal(true)}>
              Export Encrypted (.apb)
            </Button>
            <Button icon={Download} variant="ghost" onClick={handleExportJSON}>
              Export JSON
            </Button>
          </div>
        </Card>
      </StaggerItem>

      <StaggerItem>
        <Card>
          <SectionLabel>Import</SectionLabel>
          <p className="text-xs text-[#6B7C93] mt-1 mb-3">Restore from a previous backup file.</p>
          <Button icon={Upload} onClick={() => setShowImportModal(true)}>
            Import Backup
          </Button>
        </Card>
      </StaggerItem>

      <StaggerItem>
        <Card danger>
          <SectionLabel>Danger Zone</SectionLabel>
          <p className="text-xs text-[#6B7C93] mt-1 mb-3">Permanently delete all data from this browser. This cannot be undone.</p>
          <Button variant="danger" icon={Trash2} onClick={() => setShowDeleteConfirm(true)}>
            Delete Everything
          </Button>
        </Card>
      </StaggerItem>

      {/* Export Modal */}
      <Modal
        open={showExportModal}
        onClose={() => { setShowExportModal(false); setExportPassphrase(''); setExportConfirmPassphrase(''); setExportError('') }}
        title="Export Encrypted Backup"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setShowExportModal(false); setExportPassphrase(''); setExportConfirmPassphrase(''); setExportError('') }}>
              Cancel
            </Button>
            <Button
              disabled={!exportPassphrase || exportPassphrase !== exportConfirmPassphrase || exportLoading}
              onClick={handleExportEncrypted}
            >
              {exportLoading ? 'Exporting…' : 'Export'}
            </Button>
          </>
        }
      >
        <p className="text-xs text-[#6B7C93] mb-4">Choose a passphrase to encrypt your backup. You'll need this to import it later.</p>
        <div className="space-y-3">
          <Input label="Passphrase" value={exportPassphrase} onChange={setExportPassphrase} secret placeholder="Enter a passphrase" />
          <Input
            label="Confirm Passphrase"
            value={exportConfirmPassphrase}
            onChange={setExportConfirmPassphrase}
            secret
            placeholder="Confirm your passphrase"
            error={exportConfirmPassphrase && exportPassphrase !== exportConfirmPassphrase ? 'Passphrases do not match' : undefined}
          />
          {exportError && <p className="text-xs text-[#EF4444]">{exportError}</p>}
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal
        open={showImportModal}
        onClose={resetImportModal}
        title="Import Backup"
        footer={
          importSuccess ? (
            <Button onClick={() => window.location.reload()}>
              Reload to see your conversations
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={resetImportModal} disabled={importLoading}>
                Cancel
              </Button>
              <Button disabled={!importFile || importLoading} onClick={handleImport}>
                {importLoading ? 'Importing…' : 'Import'}
              </Button>
            </>
          )
        }
      >
        <p className="text-xs text-[#6B7C93] mb-4">Select a backup file (.apb or .json) and enter the passphrase if encrypted.</p>
        <div className="space-y-3">
          <div>
            <SectionLabel>Backup File</SectionLabel>
            <input
              ref={fileInputRef}
              type="file"
              accept=".apb,.json"
              onChange={(e) => {
                const file = e.target.files?.[0] || null
                setImportFile(file)
                setImportError('')
                setImportFileIsEncrypted(file?.name.endsWith('.apb') ?? false)
              }}
              className="mt-2 text-xs text-[#6B7C93] file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border file:border-[#EBEBEB] file:bg-white file:text-xs file:font-semibold file:text-[#1E2532] hover:file:border-[#4A7AE5] file:transition-colors file:cursor-pointer"
            />
          </div>
          {importFileIsEncrypted && (
            <Input label="Passphrase" value={importPassphrase} onChange={setImportPassphrase} secret placeholder="Enter backup passphrase" />
          )}
          {importError && <p className="text-xs text-[#EF4444]">{importError}</p>}
          {importSuccess && (
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#22C55E] shrink-0" />
              <p className="text-xs text-[#22C55E] font-medium">Backup imported successfully.</p>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete All Data"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" icon={Trash2} onClick={handleDeleteAll}>
              Delete Everything
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[#EF4444] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[#1E2532] mb-1">This action cannot be undone.</p>
            <p className="text-xs text-[#6B7C93] leading-relaxed">
              All conversations, messages, highlights, notes, favorites, pinned references, and settings will be permanently deleted from this browser. Your Anthropic API key will also be removed.
            </p>
          </div>
        </div>
      </Modal>
    </SettingsSection>
  )
}

// ─── Appearance ──────────────────────────────────────────

const MODE_OPTIONS = [
  { id: 'auto', label: 'Auto', description: 'Detect from your device — desktop uses Albatross, mobile uses Swift' },
  { id: 'albatross', label: 'Albatross', description: 'Desktop layout with dual sidebars and full keyboard support' },
  { id: 'swift', label: 'Swift', description: 'Mobile-optimized, touch-first layout' },
  { id: 'kingfisher', label: 'Kingfisher', description: 'Deep reading layout with annotation panel', soon: true },
  { id: 'secretarybird', label: 'Secretarybird', description: 'iPad + stylus canvas layout', soon: true },
  { id: 'starling', label: 'Starling', description: 'Collaborative split-view layout', soon: true },
]

function AppearanceSection({ theme, setTheme, fontSize, setFontSize, storedMode, setMode }) {
  return (
    <SettingsSection title="Appearance" subtitle="Customize how the interface looks">
      <StaggerItem>
        <Card>
          <SectionLabel>Interface Mode</SectionLabel>
          <p className="text-xs text-[#6B7C93] mt-1 mb-3">
            Choose how the interface adapts to your device and workflow.
          </p>
          <div className="space-y-2">
            {MODE_OPTIONS.map((opt) => {
              const active = storedMode === opt.id || (!storedMode && opt.id === 'auto')
              return (
                <motion.button
                  key={opt.id}
                  whileHover={{ scale: 1.005 }}
                  whileTap={{ scale: 0.995 }}
                  onClick={() => setMode(opt.id)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3 rounded-lg border transition-colors ${
                    active ? 'border-[#4A7AE5] bg-[#4A7AE5]/5' : 'border-[#EBEBEB] hover:border-[#D5D5D5]'
                  }`}
                >
                  <div className={`w-4 h-4 mt-0.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                    active ? 'border-[#4A7AE5]' : 'border-[#D5D5D5]'
                  }`}>
                    {active && <div className="w-2 h-2 rounded-full bg-[#4A7AE5]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold ${active ? 'text-[#1E2532]' : 'text-[#6B7C93]'}`}>{opt.label}</p>
                      {opt.soon && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#E5A620]/10 text-[#E5A620]">Soon</span>}
                    </div>
                    <p className="text-xs text-[#9CA3AF] mt-0.5">{opt.description}</p>
                  </div>
                </motion.button>
              )
            })}
          </div>
        </Card>
      </StaggerItem>

      <StaggerItem>
        <Card>
          <SectionLabel>Theme</SectionLabel>
          <div className="flex gap-3 mt-3">
            {[
              { id: 'light', label: 'Light', icon: Sun },
              { id: 'dark', label: 'Dark', icon: Moon },
            ].map((t) => {
              const Icon = t.icon
              const active = theme === t.id
              return (
                <motion.button
                  key={t.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setTheme(t.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-colors ${
                    active ? 'border-[#4A7AE5] bg-[#4A7AE5]/5' : 'border-[#EBEBEB] hover:border-[#D5D5D5]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-[#4A7AE5]' : 'text-[#6B7C93]'}`} />
                  <span className={`text-sm font-semibold ${active ? 'text-[#1E2532]' : 'text-[#6B7C93]'}`}>{t.label}</span>
                </motion.button>
              )
            })}
          </div>
          {theme === 'dark' && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-[#6B7C93] mt-3"
            >
              Dark theme is coming in a future update.
            </motion.p>
          )}
        </Card>
      </StaggerItem>

      <StaggerItem>
        <Card>
          <SectionLabel>Text Size</SectionLabel>
          <div className="mt-3">
            <SegmentedControl
              options={[
                { id: 'compact', label: 'Compact' },
                { id: 'default', label: 'Default' },
                { id: 'large', label: 'Large' },
              ]}
              value={fontSize}
              onChange={setFontSize}
            />
          </div>
          <div className="mt-4 px-4 py-3 rounded-lg border border-[#EBEBEB]">
            <p className={`text-[#1E2532] ${
              fontSize === 'compact' ? 'text-xs' : fontSize === 'large' ? 'text-base' : 'text-sm'
            }`}>
              This is a preview of your selected text size. The entire interface will adjust to match.
            </p>
          </div>
        </Card>
      </StaggerItem>
    </SettingsSection>
  )
}

// ─── About & Security ────────────────────────────────────

function AboutSection() {
  return (
    <SettingsSection title="About & Security" subtitle="How this app works and keeps your data safe">
      <StaggerItem>
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <motion.div
              animate={{ rotate: [0, -8, 8, 0] }}
              transition={{ duration: 0.6, delay: 0.6, ease: 'easeInOut' }}
            >
              <MessageSquare className="w-5 h-5 text-[#4A7AE5]" />
            </motion.div>
            <div>
              <h3 className="text-sm font-semibold text-[#1E2532]">Project Apollo</h3>
              <p className="text-xs text-[#6B7C93]">Version 0.1.0</p>
            </div>
          </div>
          <p className="text-xs text-[#6B7C93] leading-relaxed mb-4">
            A power-user chat interface for AI. Built with React, Framer Motion, and Tailwind CSS. Open source and community-driven.
          </p>
          <Button icon={Github}>
            View on GitHub
          </Button>
        </Card>
      </StaggerItem>

      <StaggerItem>
        <Card>
          <SectionLabel>How Your Data Stays Private</SectionLabel>
          <div className="space-y-4 mt-3">
            {[
              {
                title: 'No servers, no accounts',
                text: "This app runs entirely in your browser. There is no backend server, no database, and no user accounts. Nothing is transmitted anywhere except directly to Anthropic's API when you send a message."
              },
              {
                title: 'API key stays local and encrypted',
                text: 'Your Anthropic API key is encrypted at rest using the Web Crypto API (AES-GCM) with a non-extractable key before being stored in IndexedDB. Even scripts running on the page cannot export the raw encryption key.'
              },
              {
                title: 'Conversations stay local',
                text: "All conversation data — messages, branches, highlights, notes — lives in your browser's IndexedDB. We have no way to see, access, or recover it."
              },
              {
                title: 'Open source & auditable',
                text: 'The entire codebase is on GitHub. You can verify every network request, every storage call, and every line of code yourself.'
              },
            ].map((item, i) => (
              <div key={i}>
                <h4 className="text-xs font-semibold text-[#1E2532] mb-1">{item.title}</h4>
                <p className="text-xs text-[#6B7C93] leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </Card>
      </StaggerItem>
    </SettingsSection>
  )
}
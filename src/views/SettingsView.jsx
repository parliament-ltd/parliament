import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Key, Cpu, DollarSign, Sliders, Database, Sun, Shield,
  ArrowLeft, MessageSquare, Github, ExternalLink, Info,
  Download, Upload, Trash2, AlertTriangle, Moon, HardDrive,
  Clock, Bell, BellOff, CheckCircle, AlertCircle, Lock
} from 'lucide-react'
import { useSettings } from '../stores/SettingsContext'
import { Button, Card, Input, Modal, Toggle, RadioGroup, SegmentedControl, SectionLabel, IconButton } from '../components'

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
  { id: 'api', label: 'API Configuration', icon: Key },
  { id: 'model', label: 'Model Preferences', icon: Cpu },
  { id: 'usage', label: 'Usage & Spending', icon: DollarSign },
  { id: 'context', label: 'Context & Defaults', icon: Sliders },
  { id: 'data', label: 'Data & Backups', icon: Database },
  { id: 'appearance', label: 'Appearance', icon: Sun },
  { id: 'about', label: 'About & Security', icon: Shield },
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
  const { settings, updateSetting } = useSettings()
  const [activeSection, setActiveSection] = useState('api')

  // Local state for API key (not persisted until validated)
  const [apiKey, setApiKey] = useState('')
  const [keyStatus, setKeyStatus] = useState(null)

  // Modal state
  const [showExportModal, setShowExportModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [exportPassphrase, setExportPassphrase] = useState('')
  const [exportConfirmPassphrase, setExportConfirmPassphrase] = useState('')
  const [importPassphrase, setImportPassphrase] = useState('')
  const [spendingLimitDismissed, setSpendingLimitDismissed] = useState(false)
  const [spendingLimitConfirmed, setSpendingLimitConfirmed] = useState(false)

  const validateKey = () => {
    setKeyStatus('validating')
    // TODO: wire to real provider.validateKey()
    setTimeout(() => setKeyStatus(apiKey.startsWith('sk-') ? 'valid' : 'invalid'), 1500)
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
          {activeSection === 'api' && <ApiSection key="api" apiKey={apiKey} setApiKey={setApiKey} keyStatus={keyStatus} validateKey={validateKey} storageMode={settings.storageMode} setStorageMode={(v) => updateSetting('storageMode', v)} />}
          {activeSection === 'model' && <ModelSection key="model" selectedModel={settings.defaultModel} setSelectedModel={(v) => updateSetting('defaultModel', v)} />}
          {activeSection === 'usage' && <UsageSection key="usage" budgetAlert={settings.budgetAlert} setBudgetAlert={(v) => updateSetting('budgetAlert', v)} budgetEnabled={settings.budgetEnabled} setBudgetEnabled={(v) => updateSetting('budgetEnabled', v)} spendingLimitDismissed={spendingLimitDismissed} setSpendingLimitDismissed={setSpendingLimitDismissed} spendingLimitConfirmed={spendingLimitConfirmed} setSpendingLimitConfirmed={setSpendingLimitConfirmed} />}
          {activeSection === 'context' && <ContextSection key="context" summaryDepth={settings.summaryDepth} setSummaryDepth={(v) => updateSetting('summaryDepth', v)} contextThreshold={settings.contextThreshold} setContextThreshold={(v) => updateSetting('contextThreshold', v)} autoCompress={settings.autoCompress} setAutoCompress={(v) => updateSetting('autoCompress', v)} />}
          {activeSection === 'data' && <DataSection key="data" backupReminder={settings.backupReminder} setBackupReminder={(v) => updateSetting('backupReminder', v)} showExportModal={showExportModal} setShowExportModal={setShowExportModal} showImportModal={showImportModal} setShowImportModal={setShowImportModal} showDeleteConfirm={showDeleteConfirm} setShowDeleteConfirm={setShowDeleteConfirm} exportPassphrase={exportPassphrase} setExportPassphrase={setExportPassphrase} exportConfirmPassphrase={exportConfirmPassphrase} setExportConfirmPassphrase={setExportConfirmPassphrase} importPassphrase={importPassphrase} setImportPassphrase={setImportPassphrase} />}
          {activeSection === 'appearance' && <AppearanceSection key="appearance" theme={settings.theme} setTheme={(v) => updateSetting('theme', v)} fontSize={settings.fontSize} setFontSize={(v) => updateSetting('fontSize', v)} />}
          {activeSection === 'about' && <AboutSection key="about" />}
        </AnimatePresence>
      </div>
    </div>
  )
}
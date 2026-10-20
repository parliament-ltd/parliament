import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  Key, Cpu, DollarSign, Sliders, Database, Sun, Shield,
  ArrowLeft, MessageSquare, Github, ExternalLink, Info,
  Download, Upload, Trash2, AlertTriangle, Moon, HardDrive,
  Bell, BellOff, CheckCircle, AlertCircle, Lock, ChevronRight,
} from 'lucide-react'
import { useSettings } from '../stores/SettingsContext'
import { useConversations } from '../stores/ConversationContext'
import { useShimmer } from '../hooks/useShimmer'
import { Button, Card, Input, Modal, Toggle, RadioGroup, SegmentedControl, SectionLabel, IconButton } from '../components'
import { getProvider } from '../providers'
import { saveApiKey, deleteApiKey, encryptExport, decryptImport } from '../lib/crypto'
import { exportAllData, importData, clearAllData, getSetting, setSetting } from '../lib/db'
import { isStorageKept, askToKeepStorage } from '../lib/storageKeep'
import { useLingui } from '@lingui/react'
import { COPY } from '../copy'
import TourTooltip from '../components/TourTooltip'
import NetworkActivityCard from '../components/NetworkActivityCard'
import { useBackup } from '../stores/BackupContext'
import { useIsNarrow } from '../lib/useViewportWidth'

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
    title: 'Add your API key',
    desc: 'Start by adding your Anthropic API key. It is encrypted with AES-GCM and stored only in your browser. The rest of the settings are optional; you can circle back anytime.',
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

// PR-12: presentational metadata only (description / speed / badge). The
// model list itself, plus cost and contextWindow, comes from the provider
// abstraction at render time — see ModelSection below. Keys must match
// AnthropicProvider.getModels() ids.
const MODEL_DISPLAY_META = {
  'claude-haiku':    { description: 'Fast & affordable',     speed: 'Fastest',  badge: 'Budget-friendly' },
  'claude-sonnet':   { description: 'Balanced performance',  speed: 'Fast',     badge: 'Recommended' },
  'claude-opus':     { description: 'Maximum capability',    speed: 'Moderate', badge: 'Most powerful' },
  'claude-opus-4-7': { description: 'Latest frontier model', speed: 'Moderate', badge: 'Newest' },
}

// Render `cost` from provider.getModels() as a per-million-tokens dollar
// string. Returns 'Free' for { type: 'free-local' } and '—' for null /
// unknown shapes so the row always has something to display.
function formatModelCost(cost, side) {
  if (!cost) return '—'
  if (cost.type === 'free-local') return 'Free'
  if (cost.type === 'metered') {
    const value = side === 'input' ? cost.inputPerMillion : cost.outputPerMillion
    if (typeof value !== 'number') return '—'
    return `$${value.toFixed(2)}`
  }
  return '—'
}

const STORAGE_MODES = [
  { id: 'persistent', label: 'Remember my key', description: 'Saved in this browser until you delete it', icon: HardDrive },
  { id: 'memory', label: "Don't save", description: 'Re-enter every time for maximum security', icon: Shield },
]

export default function SettingsView() {
  const navigate = useNavigate()
  const { settings, updateSetting, storageUsage } = useSettings()
  const { conversations } = useConversations()
  const [activeSection, setActiveSection] = useState('api')
  const { triggerShimmer, shimmerPhase, shimmerDone } = useShimmer()
  const isNarrow = useIsNarrow(768)

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
  const [validateCooldown, setValidateCooldown] = useState(false)

  // Modal state
  const [showExportModal, setShowExportModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [exportPassphrase, setExportPassphrase] = useState('')
  const [exportConfirmPassphrase, setExportConfirmPassphrase] = useState('')
  const [importPassphrase, setImportPassphrase] = useState('')

  // PR-18c: shimmer + connection-pill intentionally desktop-only. Today
  // mobile users arrive with a key already saved (the /build wizard is
  // desktop-first), so the validation feedback flow doesn't fire on
  // narrow. Revisit when Phase 2 multi-provider config (audit §3.20)
  // brings key validation surfaces onto mobile — at that point we'd
  // want the sweep + green Connected dot on the mobile header too.
  const validateKey = async () => {
    if (validateCooldown || keyStatus === 'validating') return
    setKeyStatus('validating')
    setKeyError('')
    setValidateCooldown(true)
    try {
      const provider = getProvider('anthropic')
      const result = await provider.validateKey(apiKey)
      setKeyStatus(result.status)
      if (!result.valid) {
        setKeyError(result.error)
      } else {
        // Key is valid — save it with the chosen storage mode
        await saveApiKey(apiKey, settings.storageMode)
        triggerShimmer()
      }
    } catch {
      setKeyStatus('invalid')
      setKeyError('Could not reach the Anthropic API. Please check your connection.')
    } finally {
      setTimeout(() => setValidateCooldown(false), 5000)
    }
  }

  // Per-section rendering closure — shared between desktop's single-pane
  // AnimatePresence and mobile's multi-open accordion so the section
  // components themselves stay identical across viewports.
  const sectionForId = (id) => {
    switch (id) {
      case 'api':
        return <ApiSection key="api" apiKey={apiKey} setApiKey={(v) => { setApiKey(v); setKeyStatus(null) }} keyStatus={keyStatus} keyError={keyError} validateKey={validateKey} validateCooldown={validateCooldown} storageMode={settings.storageMode} setStorageMode={(v) => updateSetting('storageMode', v)} shimmerPhase={shimmerPhase} />
      case 'model':
        return <ModelSection key="model" selectedModel={settings.defaultModel} setSelectedModel={(v) => updateSetting('defaultModel', v)} />
      case 'usage':
        return <UsageSection key="usage" budgetAlert={settings.budgetAlert} setBudgetAlert={(v) => updateSetting('budgetAlert', v)} budgetEnabled={settings.budgetEnabled} setBudgetEnabled={(v) => updateSetting('budgetEnabled', v)} spendingLimitDismissed={settings.spendingLimitDismissed} setSpendingLimitDismissed={(v) => updateSetting('spendingLimitDismissed', v)} />
      case 'context':
        return <ContextSection key="context" summaryDepth={settings.summaryDepth} setSummaryDepth={(v) => updateSetting('summaryDepth', v)} contextThreshold={settings.contextThreshold} setContextThreshold={(v) => updateSetting('contextThreshold', v)} autoCompress={settings.autoCompress} setAutoCompress={(v) => updateSetting('autoCompress', v)} />
      case 'data':
        return <DataSection key="data" backupReminder={settings.backupReminder} setBackupReminder={(v) => updateSetting('backupReminder', v)} showExportModal={showExportModal} setShowExportModal={setShowExportModal} showImportModal={showImportModal} setShowImportModal={setShowImportModal} showDeleteConfirm={showDeleteConfirm} setShowDeleteConfirm={setShowDeleteConfirm} exportPassphrase={exportPassphrase} setExportPassphrase={setExportPassphrase} exportConfirmPassphrase={exportConfirmPassphrase} setExportConfirmPassphrase={setExportConfirmPassphrase} importPassphrase={importPassphrase} setImportPassphrase={setImportPassphrase} storageUsage={storageUsage} conversations={conversations} />
      case 'appearance':
        return <AppearanceSection key="appearance" theme={settings.theme} setTheme={(v) => updateSetting('theme', v)} fontSize={settings.fontSize} setFontSize={(v) => updateSetting('fontSize', v)} />
      case 'about':
        return <AboutSection key="about" />
      default:
        return null
    }
  }

  if (isNarrow) {
    return (
      <>
        <MobileSettings navigate={navigate} sectionForId={sectionForId} />
        {showTour && <TourTooltip steps={SETTINGS_TOUR_STEPS} onDone={handleTourDone} />}
      </>
    )
  }

  return (
    <div className="flex h-screen font-sans overflow-hidden bg-white text-[var(--p-text-primary)]">

      {/* Power-on sweep line */}
      {shimmerPhase >= 1 && (
        <motion.div
          initial={{ top: -3, opacity: 0 }}
          animate={{ top: '100vh', opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1, ease: 'easeOut', times: [0, 0.04, 0.8, 1] }}
          style={{
            position: 'fixed',
            left: 0,
            right: 0,
            height: 3,
            background: 'linear-gradient(90deg, transparent, #D4A843, transparent)',
            boxShadow: '0 0 14px 3px rgba(212,168,67,0.4)',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        />
      )}


      {/* Left Navigation */}
      <motion.div
        initial={{ x: -260 }}
        animate={{ x: 0 }}
        transition={SPRING_SMOOTH}
        className={`w-64 flex flex-col flex-shrink-0 border-r ${shimmerPhase >= 4 ? 'shimmer-sidebar-border' : 'border-[#F1F1EF]'}`}
      >
        <div className="p-4">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING_SMOOTH, delay: 0.2 }}
            className="flex items-center gap-2"
          >
            <IconButton icon={ArrowLeft} onClick={() => navigate('/')} title="Back to Chats" />
            <div>
              <h1 className="text-lg font-medium text-[var(--p-text-primary)] leading-tight">Settings</h1>
              <AnimatePresence>
                {shimmerDone && (
                  <motion.div
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={SPRING_SMOOTH}
                    className="flex items-center gap-1.5"
                  >
                    <motion.span
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                      className="w-1.5 h-1.5 rounded-full bg-[#22C55E] inline-block"
                    />
                    <span className="text-[10px] font-medium text-[#22C55E]">Connected</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        <motion.nav
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="flex-1 px-3 space-y-0.5"
        >
          {NAV_ITEMS.map((item, index) => {
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
                className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors flex items-center gap-2.5 border ${
                  active
                    ? 'text-[var(--p-text-primary)] font-medium border-[var(--p-text-primary)]/30'
                    : 'text-[var(--p-text-secondary)] hover:text-[var(--p-text-primary)] border-transparent hover:border-[var(--p-text-primary)]/15'
                } ${shimmerPhase >= 3 ? 'shimmer-nav' : ''}`}
                style={shimmerPhase >= 3 ? { animationDelay: `${index * 55}ms` } : {}}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-[#B8A070]' : 'text-[var(--p-text-secondary)]'}`} />
                {item.label}
              </motion.button>
            )
          })}
        </motion.nav>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-10 py-8">
        <AnimatePresence mode="wait">
          {sectionForId(activeSection)}
        </AnimatePresence>
      </div>

      {/* Onboarding Tour */}
      {showTour && <TourTooltip steps={SETTINGS_TOUR_STEPS} onDone={handleTourDone} />}
    </div>
  )
}

// ─── Mobile Settings (PR-18c) ────────────────────────────
//
// Chevron-expandable cards pattern, mirrored from the
// "Menu for mobile settings.png" mockup. Multi-open accordion: each
// section toggles independently; the first section (API) is expanded on
// first paint so the most important config is one tap away. Section
// content reuses the same per-section components the desktop renders,
// so semantics, modals, and validation flows are identical across
// viewports. The h2 inside each SettingsSection auto-hides on narrow
// (see SettingsSection above) so the row header isn't duplicated.

function MobileSettings({ navigate, sectionForId }) {
  const [expanded, setExpanded] = useState(() => new Set([NAV_ITEMS[0].id]))
  const reduceMotion = useReducedMotion()

  const toggle = (id) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="mobile-settings-screen font-sans bg-white text-[var(--p-text-primary)]">
      {/* Decorative handle — visual only, no gesture semantics. */}
      <div className="mobile-settings-handle" aria-hidden="true" />
      <div className="mobile-settings-header">
        <IconButton icon={ArrowLeft} onClick={() => navigate('/')} title="Back" />
        <h1 className="text-lg font-medium text-[var(--p-text-primary)] leading-tight">Settings</h1>
      </div>
      <div className="mobile-settings-list">
        {NAV_ITEMS.map((item) => (
          <MobileSettingsRow
            key={item.id}
            item={item}
            expanded={expanded.has(item.id)}
            onToggle={() => toggle(item.id)}
            reduceMotion={reduceMotion}
          >
            {sectionForId(item.id)}
          </MobileSettingsRow>
        ))}
      </div>
    </div>
  )
}

function MobileSettingsRow({ item, expanded, onToggle, reduceMotion, children }) {
  const Icon = item.icon
  const heightTransition = reduceMotion ? { duration: 0 } : { duration: 0.25, ease: 'easeInOut' }
  const rotateTransition = reduceMotion ? { duration: 0 } : { duration: 0.2 }
  return (
    <div className="mobile-settings-section">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="mobile-settings-row"
        {...(item.tourTarget ? { 'data-tour': item.tourTarget } : {})}
      >
        <Icon className="w-4 h-4 flex-shrink-0 text-[var(--p-text-secondary)]" />
        <span className="flex-1 text-left text-sm font-medium text-[var(--p-text-primary)]">{item.label}</span>
        <motion.span
          animate={{ rotate: expanded ? 90 : 0 }}
          transition={rotateTransition}
          className="inline-flex text-[var(--p-text-secondary)]"
        >
          <ChevronRight className="w-4 h-4" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={heightTransition}
            className="mobile-settings-panel"
          >
            <div className="mobile-settings-panel-inner">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Section Wrapper ─────────────────────────────────────

function SettingsSection({ title, subtitle, children }) {
  // PR-18c: title duplicates the mobile chevron-row label, so hide it
  // on narrow. The subtitle stays as in-context copy above the cards.
  const isNarrow = useIsNarrow(768)
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={SPRING_SMOOTH}
    >
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="mb-6">
        {!isNarrow && <h2 className="text-lg font-medium text-[var(--p-text-primary)]">{title}</h2>}
        <p className="text-sm text-[var(--p-text-secondary)] mt-0.5">{subtitle}</p>
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

function ApiSection({ apiKey, setApiKey, keyStatus, keyError, validateKey, validateCooldown, storageMode, setStorageMode, shimmerPhase }) {
  return (
    <SettingsSection title="API Configuration" subtitle="Connect your Anthropic API key to start chatting">
      <StaggerItem>
        <Card className={shimmerPhase >= 1 ? 'shimmer-card' : ''}>
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
              disabled={!apiKey || keyStatus === 'validating' || validateCooldown}
            >
              {keyStatus === 'validating' ? 'Checking...' : keyStatus === 'valid' ? 'Valid' : 'Validate'}
            </Button>
          </div>

          {keyStatus === 'valid' && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mt-3 text-[#0F7B6C]"
            >
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs font-medium">API key is valid</span>
            </motion.div>
          )}
        </Card>
      </StaggerItem>

      <StaggerItem>
        <Card
          className={shimmerPhase >= 2 ? 'shimmer-card' : ''}
          style={shimmerPhase >= 2 ? { animationDelay: '0ms' } : {}}
        >
          <RadioGroup
            label="Key Storage"
            options={STORAGE_MODES}
            value={storageMode}
            onChange={setStorageMode}
          />
        </Card>
      </StaggerItem>

      <StaggerItem>
        <Card
          className={shimmerPhase >= 2 ? 'shimmer-card' : ''}
          style={shimmerPhase >= 2 ? { animationDelay: '60ms' } : {}}
        >
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-[#B8A070] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-[var(--p-text-secondary)] leading-relaxed">
                Your API key is encrypted using the Web Crypto API (AES-GCM) before being stored. It never leaves your browser.
              </p>
              <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-[#B8A070] mt-2 hover:underline">
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
  const providerModels = getProvider().getModels()
  return (
    <SettingsSection title="Model Preferences" subtitle="Choose your default model for new conversations">
      {providerModels.map((model) => {
        const active = selectedModel === model.id
        const meta = MODEL_DISPLAY_META[model.id] ?? { description: '', speed: '', badge: '' }
        const inputCost = formatModelCost(model.cost, 'input')
        const outputCost = formatModelCost(model.cost, 'output')
        return (
          <StaggerItem key={model.id}>
            <motion.div
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setSelectedModel(model.id)}
              className={`px-5 py-4 rounded-md border cursor-pointer transition-colors ${
                active ? 'border-[#B8A070] bg-[#B8A070]/5' : 'border-[#E9E9E7] hover:border-[#9B9A97]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className={`text-sm font-medium ${active ? 'text-[var(--p-text-primary)]' : 'text-[var(--p-text-secondary)]'}`}>{model.name}</h3>
                  {meta.badge && (
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      active ? 'bg-[#B8A070]/10 text-[#B8A070]' : 'bg-[#F7F6F3] text-[var(--p-text-secondary)]'
                    }`}>
                      {meta.badge}
                    </span>
                  )}
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  active ? 'border-[#B8A070]' : 'border-[#9B9A97]'
                }`}>
                  <motion.div
                    initial={false}
                    animate={{ scale: active ? 1 : 0 }}
                    className="w-2 h-2 rounded-full bg-[#B8A070]"
                  />
                </div>
              </div>
              {meta.description && <p className="text-xs text-[var(--p-text-secondary)] mb-3">{meta.description}</p>}
              <div className="flex gap-4 text-xs text-[var(--p-text-secondary)]">
                <span>Input: <span className="font-medium text-[var(--p-text-primary)]">{inputCost}</span>/1M tokens</span>
                <span>Output: <span className="font-medium text-[var(--p-text-primary)]">{outputCost}</span>/1M tokens</span>
                {meta.speed && <span>Speed: <span className="font-medium text-[var(--p-text-primary)]">{meta.speed}</span></span>}
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
                <p className="text-lg font-medium text-[var(--p-text-primary)]">{stat.value}</p>
                <p className="text-xs text-[var(--p-text-secondary)]">{stat.label}</p>
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
                  className="flex-1 accent-[#B8A070]"
                />
                <span className="text-sm font-medium text-[var(--p-text-primary)] w-16 text-right">${budgetAlert}</span>
              </div>
              <p className="text-xs text-[var(--p-text-secondary)] mt-2">You'll see a warning when your estimated spending reaches this amount.</p>
            </motion.div>
          )}
        </Card>
      </StaggerItem>

      {!spendingLimitDismissed && (
        <StaggerItem>
          <Card>
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-[#D9730D] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-xs font-medium text-[var(--p-text-primary)] mb-1">Set a spending limit on Anthropic</h4>
                <p className="text-xs text-[var(--p-text-secondary)] leading-relaxed mb-3">
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
          <p className="text-xs text-[var(--p-text-secondary)] mt-1 mb-3">Controls how detailed the review summary is.</p>
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
            <span className="text-sm font-medium text-[var(--p-text-primary)]">{contextThreshold}%</span>
          </div>
          <p className="text-xs text-[var(--p-text-secondary)] mt-1 mb-3">When context usage exceeds this level, you'll be prompted to compress via branching.</p>
          <input
            type="range"
            min={10}
            max={95}
            step={5}
            value={contextThreshold}
            onChange={(e) => setContextThreshold(Number(e.target.value))}
            className="w-full accent-[#B8A070]"
          />
          <div className="flex justify-between text-[10px] text-[var(--p-text-secondary)] mt-1">
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
              { id: 'disabled', label: 'Disabled', description: "Never compress. I'll manage context manually" },
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

// ─── Passphrase Strength ─────────────────────────────────

function passphraseStrength(pw) {
  if (!pw || pw.length < 8) return null
  let score = 0
  if (/[a-z]/.test(pw)) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^a-zA-Z0-9]/.test(pw)) score++
  if (pw.length >= 12) score++
  if (score <= 2) return { label: 'Weak', color: '#E03E3E' }
  if (score <= 3) return { label: 'Fair', color: '#D9730D' }
  return { label: 'Strong', color: '#0F7B6C' }
}

// Whether the browser keeps Parliament's storage, and a way to ask (C88).
// Says nothing in a browser that cannot tell.
function StorageKeptLine() {
  const { i18n } = useLingui()
  const [kept, setKept] = useState(null)
  const [asking, setAsking] = useState(false)
  const { openBackup } = useBackup()
  useEffect(() => {
    let live = true
    isStorageKept().then((v) => { if (live) setKept(v) })
    return () => { live = false }
  }, [])
  if (kept === null) return null
  const ask = async () => {
    setAsking(true)
    try {
      setKept((await askToKeepStorage({ getSetting, setSetting, again: true })) === 'kept')
    } finally {
      setAsking(false)
    }
  }
  return (
    <p className="text-xs mt-3 text-[var(--p-text-secondary)]">
      {i18n._(kept ? COPY.storage.kept : COPY.storage.notKept)}
      {!kept && (
        <>
          <button type="button" onClick={ask} disabled={asking} className="ml-2 underline underline-offset-2 text-[var(--p-text-primary)] disabled:opacity-50">
            {i18n._(COPY.storage.ask)}
          </button>
          <button type="button" onClick={() => openBackup('backup')} className="ml-3 underline underline-offset-2 text-[var(--p-text-primary)]">
            {i18n._(COPY.storage.backup)}
          </button>
        </>
      )}
    </p>
  )
}

// ─── Data & Backups ──────────────────────────────────────

// Small entry point that opens the V2 Backup & Restore modal from
// inside Settings → Data & Backups. PR-7's primary CTA. Lives next to
// the legacy V1 Export/Import cards during the cutover.
function V2BackupOpenButton() {
  const { openBackup } = useBackup()
  return (
    <div className="flex gap-2">
      <Button icon={Database} onClick={() => openBackup('backup')}>
        Backup &amp; restore
      </Button>
    </div>
  )
}

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
      a.download = `parliament-backup-${new Date().toISOString().slice(0, 10)}.apb`
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
      a.download = `parliament-backup-${new Date().toISOString().slice(0, 10)}.json`
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
        throw new Error('The file could not be read. Make sure it is a valid Parliament backup file.')
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
        throw new Error('The file does not appear to be a valid Parliament backup.')
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
      {/* V2 Backup & Restore (PR-7) — primary entry point. Opens the
          unified .parliament-format modal that supersedes the V1 .apb
          flow below. The V1 export/import cards are preserved during
          the V2 cutover so users with existing .apb files can still
          read them; cleanup at PR-10b. */}
      <StaggerItem>
        <Card>
          <SectionLabel>Backup &amp; restore</SectionLabel>
          <p className="text-xs text-[var(--p-text-secondary)] mt-1 mb-3">
            Save a copy of your rooms, chats, library, and annotations to a single
            <code className="mx-1 px-1 py-0.5 rounded bg-[var(--p-bg-subtle)] text-[var(--p-text-primary)]">.parliament</code>
            file, or restore one to bring everything back.
          </p>
          <V2BackupOpenButton />
        </Card>
      </StaggerItem>

      {/* Storage Monitoring */}
      <StaggerItem>
        <Card>
          <div className="flex items-center gap-1.5">
            <SectionLabel>Storage</SectionLabel>
            <span
              title="Shows how much browser storage your chats, notes, and settings are using."
              className="inline-flex text-[var(--p-text-muted)] hover:text-[var(--p-text-secondary)] cursor-help transition-colors"
            >
              <Info className="w-3 h-3" />
            </span>
          </div>
          <div className="mt-3 mb-2">
            <div className="w-full h-2 rounded-full bg-[#E9E9E7] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${storagePercent}%` }}
                transition={SPRING_SMOOTH}
                className={`h-full rounded-full ${
                  storageCritical ? 'bg-[#E03E3E]' : storageWarning ? 'bg-[#D9730D]' : 'bg-[#B8A070]'
                }`}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className={`text-xs font-medium ${storageCritical ? 'text-[#E03E3E]' : storageWarning ? 'text-[#D9730D]' : 'text-[var(--p-text-secondary)]'}`}>
                {formatBytes(storageUsage.usage)} used
              </span>
              <span className="text-xs text-[var(--p-text-secondary)]">
                {formatBytes(storageUsage.quota)} available
              </span>
            </div>
          </div>
          <div className="flex gap-6 mt-3 text-xs text-[var(--p-text-secondary)]">
            <span>{conversations.length} conversations</span>
          </div>
          <StorageKeptLine />
          {storageWarning && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`text-xs mt-2 ${storageCritical ? 'text-[#E03E3E]' : 'text-[#D9730D]'}`}
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
          <p className="text-xs text-[var(--p-text-secondary)] mt-1 mb-3">How often should we remind you to back up your data?</p>
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
          <p className="text-xs text-[var(--p-text-secondary)] mt-1 mb-3">Download all your conversations, highlights, notes, and settings.</p>
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
          <p className="text-xs text-[var(--p-text-secondary)] mt-1 mb-3">Restore from a previous backup file.</p>
          <Button icon={Upload} onClick={() => setShowImportModal(true)}>
            Import Backup
          </Button>
        </Card>
      </StaggerItem>

      <StaggerItem>
        <Card danger>
          <SectionLabel>Danger Zone</SectionLabel>
          <p className="text-xs text-[var(--p-text-secondary)] mt-1 mb-3">Permanently delete all data from this browser. This cannot be undone.</p>
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
              disabled={!exportPassphrase || exportPassphrase.length < 8 || exportPassphrase !== exportConfirmPassphrase || exportLoading}
              onClick={handleExportEncrypted}
            >
              {exportLoading ? 'Exporting…' : 'Export'}
            </Button>
          </>
        }
      >
        <p className="text-xs text-[var(--p-text-secondary)] mb-4">Choose a passphrase to encrypt your backup. You'll need this to import it later. Minimum 8 characters.</p>
        <div className="space-y-3">
          <div>
            <Input label="Passphrase" value={exportPassphrase} onChange={setExportPassphrase} secret placeholder="Enter a passphrase" />
            {exportPassphrase && (
              <div className="mt-1.5 flex items-center gap-2">
                {exportPassphrase.length < 8 ? (
                  <span className="text-xs text-[#E03E3E]">Minimum 8 characters</span>
                ) : (() => {
                  const s = passphraseStrength(exportPassphrase)
                  return s ? (
                    <>
                      <div className="flex gap-0.5">
                        {['Weak', 'Fair', 'Strong'].map((lvl, i) => (
                          <div key={lvl} className="h-1 w-8 rounded-full" style={{
                            backgroundColor: ['Weak', 'Fair', 'Strong'].indexOf(s.label) >= i ? s.color : '#E9E9E7'
                          }} />
                        ))}
                      </div>
                      <span className="text-xs font-medium" style={{ color: s.color }}>{s.label}</span>
                    </>
                  ) : null
                })()}
              </div>
            )}
          </div>
          <Input
            label="Confirm Passphrase"
            value={exportConfirmPassphrase}
            onChange={setExportConfirmPassphrase}
            secret
            placeholder="Confirm your passphrase"
            error={exportConfirmPassphrase && exportPassphrase !== exportConfirmPassphrase ? 'Passphrases do not match' : undefined}
          />
          {exportError && <p className="text-xs text-[#E03E3E]">{exportError}</p>}
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
        <p className="text-xs text-[var(--p-text-secondary)] mb-4">Select a backup file (.apb or .json) and enter the passphrase if encrypted.</p>
        <div className="space-y-3">
          <div>
            <SectionLabel>Backup File</SectionLabel>
            <input
              ref={fileInputRef}
              type="file"
              accept=".apb,.json"
              onChange={(e) => {
                const file = e.target.files?.[0] || null
                if (file) {
                  const name = file.name.toLowerCase()
                  if (!name.endsWith('.apb') && !name.endsWith('.json')) {
                    setImportError('Invalid file type. Please select a .apb or .json backup file.')
                    setImportFile(null)
                    e.target.value = ''
                    return
                  }
                }
                setImportFile(file)
                setImportError('')
                setImportFileIsEncrypted(file?.name.endsWith('.apb') ?? false)
              }}
              className="mt-2 text-xs text-[var(--p-text-secondary)] file:mr-3 file:px-3 file:py-1.5 file:rounded-md file:border file:border-[#E9E9E7] file:bg-white file:text-xs file:font-medium file:text-[var(--p-text-primary)] hover:file:border-[#B8A070] file:transition-colors file:cursor-pointer"
            />
          </div>
          {importFileIsEncrypted && (
            <Input label="Passphrase" value={importPassphrase} onChange={setImportPassphrase} secret placeholder="Enter backup passphrase" />
          )}
          {importError && <p className="text-xs text-[#E03E3E]">{importError}</p>}
          {importSuccess && (
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#0F7B6C] shrink-0" />
              <p className="text-xs text-[#0F7B6C] font-medium">Backup imported successfully.</p>
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
          <AlertTriangle className="w-5 h-5 text-[#E03E3E] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-[var(--p-text-primary)] mb-1">This action cannot be undone.</p>
            <p className="text-xs text-[var(--p-text-secondary)] leading-relaxed">
              All conversations, messages, highlights, notes, favorites, pinned references, and settings will be permanently deleted from this browser. Your Anthropic API key will also be removed.
            </p>
          </div>
        </div>
      </Modal>
    </SettingsSection>
  )
}

// ─── Appearance ──────────────────────────────────────────

function AppearanceSection({ theme, setTheme, fontSize, setFontSize }) {
  return (
    <SettingsSection title="Appearance" subtitle="Customize how the interface looks">
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
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md border transition-colors ${
                    active
                      ? 'border-[#B8A070] bg-[#B8A070]/10'
                      : 'border-[var(--p-border)] hover:border-[var(--p-text-muted)]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-[#B8A070]' : 'text-[var(--p-text-secondary)]'}`} />
                  <span className={`text-sm font-medium ${active ? 'text-[var(--p-text-primary)]' : 'text-[var(--p-text-secondary)]'}`}>{t.label}</span>
                </motion.button>
              )
            })}
          </div>
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
          <div className="mt-4 px-4 py-3 rounded-md border border-[#E9E9E7]">
            <p className={`text-[var(--p-text-primary)] ${
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
              <MessageSquare className="w-5 h-5 text-[#B8A070]" />
            </motion.div>
            <div>
              <h3 className="text-sm font-medium text-[var(--p-text-primary)]">Parliament</h3>
              <p className="text-xs text-[var(--p-text-secondary)]">Version 0.1.0</p>
            </div>
          </div>
          <p className="text-xs text-[var(--p-text-secondary)] leading-relaxed mb-4">
            A power-user chat interface for AI. Built with React, Framer Motion, and Tailwind CSS. Open source and community-driven.
          </p>
          <Button icon={Github} disabled title="Available when the app launches publicly">
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
                text: "All conversation data (messages, branches, highlights, notes) lives in your browser's IndexedDB. We have no way to see, access, or recover it."
              },
              {
                title: 'Verify it yourself',
                text: 'The Network Activity log below records every outbound request this app makes. You can confirm only Anthropic\u2019s API ever receives data. When the app launches publicly, the full source will be on GitHub for line-by-line review.'
              },
            ].map((item, i) => (
              <div key={i}>
                <h4 className="text-xs font-medium text-[var(--p-text-primary)] mb-1">{item.title}</h4>
                <p className="text-xs text-[var(--p-text-secondary)] leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </Card>
      </StaggerItem>

      <StaggerItem>
        <NetworkActivityCard />
      </StaggerItem>
    </SettingsSection>
  )
}
import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Key, Eye, EyeOff, CheckCircle, AlertCircle, ChevronDown,
  Shield, Cpu, DollarSign, Sliders, Database, Download, Upload, Trash2,
  Sun, Moon, Info, ExternalLink, Github, HardDrive, Layout,
  ArrowLeft, MessageSquare, X, AlertTriangle, FileJson, RefreshCw, Lock
} from 'lucide-react'
import { useSettings } from '../../stores/SettingsContext'
import { useConversations } from '../../stores/ConversationContext'
import { useMode } from '../../stores/ModeContext'
import { getProvider } from '../../providers'
import { saveApiKey, encryptExport, decryptImport } from '../../lib/crypto'
import { exportAllData, importData, clearAllData } from '../../lib/db'
import { useShimmer } from '../../hooks/useShimmer'

const SPRING_SNAPPY = { type: 'spring', stiffness: 500, damping: 30 }
const SPRING_SMOOTH = { type: 'spring', stiffness: 300, damping: 28 }

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

const MODELS = [
  { id: 'claude-haiku', name: 'Claude Haiku', description: 'Fast & affordable', inputCost: '$0.25', outputCost: '$1.25', speed: 'Fastest', badge: 'Budget-friendly' },
  { id: 'claude-sonnet', name: 'Claude Sonnet', description: 'Balanced performance', inputCost: '$3.00', outputCost: '$15.00', speed: 'Fast', badge: 'Recommended' },
  { id: 'claude-opus', name: 'Claude Opus', description: 'Maximum capability', inputCost: '$15.00', outputCost: '$75.00', speed: 'Moderate', badge: 'Most powerful' },
]

const STORAGE_MODES = [
  { id: 'persistent', label: 'Remember my key', description: 'Saved in this browser until you delete it', icon: HardDrive },
  { id: 'memory', label: "Don't save", description: 'Re-enter every time — maximum security', icon: Shield },
]

const MODE_OPTIONS = [
  { id: 'auto', label: 'Auto', description: 'Detect from your device — desktop uses Albatross, mobile uses Swift' },
  { id: 'albatross', label: 'Albatross', description: 'Desktop layout with dual sidebars and full keyboard support' },
  { id: 'swift', label: 'Swift', description: 'Mobile-optimized, touch-first layout', beta: true },
  { id: 'pelican', label: 'Pelican', description: 'Data analysis workspace — upload CSV, XLSX, or JSON and explore with charts and AI insights', beta: true },
  { id: 'kingfisher', label: 'Kingfisher', description: 'Deep reading layout with annotation panel', soon: true },
  { id: 'secretarybird', label: 'Secretarybird', description: 'iPad + stylus canvas layout', soon: true },
  { id: 'starling', label: 'Starling', description: 'Collaborative split-view layout', soon: true },
]

/* ═══════════════════════════════════════════════════════════ */
/*  SHARED COMPONENTS                                           */
/* ═══════════════════════════════════════════════════════════ */

function Card({ children, danger = false, className = '', style = {} }) {
  return (
    <div
      className={`px-4 py-4 border ${
        danger ? 'border-[#E03E3E]/20 bg-[#E03E3E]/[0.02]' : 'border-[#E9E9E7] bg-white'
      } ${className}`}
      style={{ borderRadius: 6, ...style }}
    >
      {children}
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <label className="text-xs font-medium text-[#787774] uppercase tracking-wider block mb-3">
      {children}
    </label>
  )
}

function ToggleSwitch({ enabled, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
      style={{ backgroundColor: enabled ? '#B8A070' : '#9B9A97' }}
    >
      <motion.div
        animate={{ x: enabled ? 22 : 3 }}
        transition={SPRING_SNAPPY}
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
      />
    </button>
  )
}

function RadioOption({ active, onSelect, icon: Icon, label, description, children }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left flex items-start gap-3 px-4 py-3.5 border transition-colors ${
        active ? 'border-[#B8A070] bg-[#B8A070]/[0.06]' : 'border-[#E9E9E7] active:bg-[#F7F6F3]'
      }`}
      style={{ borderRadius: 6 }}
    >
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
        active ? 'border-[#B8A070]' : 'border-[#9B9A97]'
      }`}>
        {active && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={SPRING_SNAPPY}
            className="w-2.5 h-2.5 rounded-full bg-[#B8A070]"
          />
        )}
      </div>
      {Icon && <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${active ? 'text-[#B8A070]' : 'text-[#787774]'}`} />}
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${active ? 'text-[#191919]' : 'text-[#37352F]'}`}>{label}</div>
        {description && <div className="text-xs text-[#787774] mt-0.5">{description}</div>}
        {children}
      </div>
    </button>
  )
}

function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="flex gap-1 bg-[#F1F1EF] p-1" style={{ borderRadius: 6 }}>
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
            value === opt.id ? 'bg-white text-[#191919] shadow-sm' : 'text-[#787774] active:text-[#191919]'
          }`}
          style={{ borderRadius: 4 }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function InfoBanner({ icon: Icon, color = 'blue', children }) {
  const colors = {
    blue: 'bg-[#B8A070]/[0.05] border-[#B8A070]/[0.15]',
    amber: 'bg-[#D9730D]/5 border-[#D9730D]/20',
    grey: 'bg-[#F1F1EF] border-[#E9E9E7]',
  }
  const iconColors = { blue: 'text-[#B8A070]', amber: 'text-[#D9730D]', grey: 'text-[#787774]' }
  return (
    <div className={`flex items-start gap-3 px-4 py-3 border ${colors[color]}`} style={{ borderRadius: 6 }}>
      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconColors[color]}`} />
      <div className="text-xs text-[#787774] leading-relaxed flex-1">{children}</div>
    </div>
  )
}

function BottomSheet({ open, onClose, title, subtitle, icon: Icon, children }) {
  if (!open) return null
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50"
      style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={SPRING_SMOOTH}
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] flex flex-col"
        style={{ maxWidth: 430, margin: '0 auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-[#9B9A97]" />
        </div>
        <div className="flex items-center justify-between px-5 pb-3 pt-1">
          <div className="flex items-center gap-3">
            {Icon && (
              <div
                className="w-8 h-8 flex items-center justify-center"
                style={{ borderRadius: 6, backgroundColor: 'rgba(184,160,112,0.10)' }}
              >
                <Icon className="w-4 h-4 text-[#B8A070]" />
              </div>
            )}
            <div>
              <span className="text-base font-medium text-[#191919]">{title}</span>
              {subtitle && <p className="text-xs text-[#787774]">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 rounded-full active:bg-[#F7F6F3]">
            <X className="w-4 h-4 text-[#787774]" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-8" style={{ WebkitOverflowScrolling: 'touch' }}>
          {children}
        </div>
      </motion.div>
    </motion.div>
  )
}

function AccordionSection({ id, label, subtitle, icon: Icon, isOpen, onToggle, shimmerClass = '', shimmerStyle = {}, children }) {
  return (
    <div className="border-b border-[#F1F1EF]">
      <button
        onClick={() => onToggle(id)}
        className={`w-full flex items-center gap-3.5 px-5 py-4 active:bg-[#F7F6F3] transition-colors ${shimmerClass}`}
        style={shimmerStyle}
      >
        <div
          className="w-9 h-9 flex items-center justify-center flex-shrink-0 transition-colors"
          style={{
            borderRadius: 6,
            backgroundColor: isOpen ? 'rgba(184,160,112,0.10)' : '#F1F1EF',
          }}
        >
          <Icon className={`w-4 h-4 transition-colors ${isOpen ? 'text-[#B8A070]' : 'text-[#787774]'}`} />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className={`text-[14px] font-medium transition-colors ${isOpen ? 'text-[#191919]' : 'text-[#37352F]'}`}>{label}</div>
          <div className="text-[11px] text-[#9B9A97]">{subtitle}</div>
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={SPRING_SNAPPY}>
          <ChevronDown className="w-4 h-4 text-[#9B9A97]" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={SPRING_SMOOTH}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════ */
/*  SECTION CONTENTS                                            */
/* ═══════════════════════════════════════════════════════════ */

function ApiSection({ apiKey, setApiKey, showKey, setShowKey, keyStatus, setKeyStatus, keyError, validateKey, validateCooldown, storageMode, setStorageMode, spendingLimitDismissed, setSpendingLimitDismissed, spendingLimitConfirmed, setSpendingLimitConfirmed, shimmerPhase }) {
  return (
    <>
      <Card className={shimmerPhase >= 1 ? 'shimmer-card' : ''}>
        <SectionLabel>API Key</SectionLabel>
        <div className="relative mb-2">
          <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9A97]" />
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); setKeyStatus(null) }}
            placeholder="sk-ant-api03-..."
            className={`w-full bg-white pl-10 pr-10 py-3 text-sm text-[#191919] outline-none placeholder:text-[#9B9A97] border transition-colors font-mono ${
              keyStatus === 'invalid' || keyStatus === 'billing_error' ? 'border-[#E03E3E]' : 'border-[#E9E9E7] focus:border-[#B8A070]'
            }`}
            style={{ borderRadius: 6 }}
          />
          <button
            onClick={() => setShowKey(!showKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#787774]"
          >
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <button
          onClick={validateKey}
          disabled={!apiKey || keyStatus === 'validating' || validateCooldown}
          className="w-full py-2.5 text-xs font-medium border border-[#E9E9E7] bg-white text-[#191919] active:bg-[#F7F6F3] transition-colors disabled:opacity-40"
          style={{ borderRadius: 6 }}
        >
          {keyStatus === 'validating' ? (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Checking...
            </motion.span>
          ) : keyStatus === 'valid' ? 'Valid' : 'Validate Key'}
        </button>
        <AnimatePresence>
          {keyStatus === 'valid' && (
            <motion.div
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={SPRING_SNAPPY}
              className="flex items-center gap-2 mt-3 text-xs text-[#0F7B6C]"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>API key is valid — connected to Anthropic</span>
            </motion.div>
          )}
          {(keyStatus === 'invalid' || keyStatus === 'billing_error') && (
            <motion.div
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              transition={SPRING_SNAPPY}
              className={`flex items-center gap-2 mt-3 text-xs ${keyStatus === 'billing_error' ? 'text-[#D9730D]' : 'text-[#E03E3E]'}`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{keyError || (keyStatus === 'billing_error' ? 'Billing issue — check your Anthropic dashboard.' : 'This API key is not valid. Please check your key and try again.')}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      <Card
        className={shimmerPhase >= 2 ? 'shimmer-card' : ''}
        style={shimmerPhase >= 2 ? { animationDelay: '0ms' } : {}}
      >
        <SectionLabel>Key Storage</SectionLabel>
        <div className="space-y-2">
          {STORAGE_MODES.map((mode) => (
            <RadioOption
              key={mode.id}
              active={storageMode === mode.id}
              onSelect={() => setStorageMode(mode.id)}
              icon={mode.icon}
              label={mode.label}
              description={mode.description}
            />
          ))}
        </div>
      </Card>

      <InfoBanner icon={Shield} color="blue">
        Your API key is stored locally and never sent to our servers. All API calls go directly to Anthropic. Encrypted at rest via Web Crypto API.
      </InfoBanner>

      {!spendingLimitDismissed && (
        <Card>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-3">
              <div
                className="w-8 h-8 flex items-center justify-center flex-shrink-0"
                style={{ borderRadius: 6, backgroundColor: 'rgba(217,115,13,0.10)' }}
              >
                <DollarSign className="w-4 h-4 text-[#D9730D]" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-[#191919] mb-1">Set a spending limit</h4>
                <p className="text-xs text-[#787774] leading-relaxed mb-3">
                  We strongly recommend setting a monthly spending limit in your Anthropic dashboard.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href="https://console.anthropic.com/settings/limits"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border border-[#E9E9E7] bg-white text-[#191919] active:bg-[#F7F6F3]"
                    style={{ borderRadius: 6 }}
                  >
                    Open Dashboard <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    onClick={() => setSpendingLimitConfirmed(true)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium transition-colors ${
                      spendingLimitConfirmed
                        ? 'bg-[#0F7B6C]/10 text-[#0F7B6C] border border-[#0F7B6C]/20'
                        : 'text-[#787774] active:bg-[#F1F1EF]'
                    }`}
                    style={{ borderRadius: 6 }}
                  >
                    {spendingLimitConfirmed ? <><CheckCircle className="w-3 h-3" /> Done</> : "I've set a limit"}
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => setSpendingLimitDismissed(true)}
              className="p-1 rounded-full active:bg-[#F1F1EF] text-[#9B9A97] flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </Card>
      )}
    </>
  )
}

function ModelSection({ selectedModel, setSelectedModel }) {
  return (
    <>
      <Card>
        <SectionLabel>Default Model</SectionLabel>
        <div className="space-y-2">
          {MODELS.map((model) => {
            const active = selectedModel === model.id
            return (
              <RadioOption
                key={model.id}
                active={active}
                onSelect={() => setSelectedModel(model.id)}
                label={model.name}
                description={model.description}
              >
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    model.id === 'claude-sonnet' ? 'bg-[#B8A070]/10 text-[#9C8760]'
                      : model.id === 'claude-haiku' ? 'bg-[#0F7B6C]/10 text-[#0F7B6C]' : 'bg-[#9065B0]/10 text-[#9065B0]'
                  }`}>{model.badge}</span>
                </div>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className="text-[10px] text-[#787774]">In: <span className="font-medium text-[#37352F]">{model.inputCost}/MTok</span></span>
                  <span className="text-[10px] text-[#787774]">Out: <span className="font-medium text-[#37352F]">{model.outputCost}/MTok</span></span>
                  <span className="text-[10px] text-[#787774]">Speed: <span className="font-medium text-[#37352F]">{model.speed}</span></span>
                </div>
              </RadioOption>
            )
          })}
        </div>
      </Card>
      <InfoBanner icon={Info} color="grey">
        You can override the default model per-conversation. Costs are billed directly by Anthropic to your API key.
      </InfoBanner>
    </>
  )
}

function UsageSection({ budgetEnabled, setBudgetEnabled, budgetAlert, setBudgetAlert, spendingLimitDismissed, setSpendingLimitDismissed }) {
  return (
    <>
      <Card>
        <SectionLabel>This Month</SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Total Tokens', value: '—' },
            { label: 'Conversations', value: '—' },
            { label: 'Est. Cost', value: '—' },
          ].map((stat) => (
            <div key={stat.label} className="px-3 py-3 bg-[#F7F6F3] border border-[#F1F1EF]" style={{ borderRadius: 6 }}>
              <div className="text-[10px] text-[#787774] mb-0.5">{stat.label}</div>
              <div className="text-lg font-medium text-[#191919]">{stat.value}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>Budget Alert</SectionLabel>
          <ToggleSwitch enabled={budgetEnabled} onToggle={() => setBudgetEnabled(!budgetEnabled)} />
        </div>
        <AnimatePresence>
          {budgetEnabled && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={SPRING_SNAPPY}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm text-[#787774]">Warn at</span>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9B9A97]" />
                  <input
                    type="number"
                    value={budgetAlert}
                    onChange={(e) => setBudgetAlert(Number(e.target.value))}
                    className="w-24 bg-white pl-7 pr-3 py-2.5 text-sm text-[#191919] outline-none border border-[#E9E9E7] focus:border-[#B8A070] transition-colors"
                    style={{ borderRadius: 6 }}
                  />
                </div>
                <span className="text-sm text-[#787774]">/ mo</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </>
  )
}

function ContextSection({ summaryDepth, setSummaryDepth, contextThreshold, setContextThreshold, autoCompress, setAutoCompress }) {
  return (
    <>
      <Card>
        <SectionLabel>Default Summary Depth</SectionLabel>
        <SegmentedControl
          options={[{ id: 'brief', label: 'Brief' }, { id: 'detailed', label: 'Detailed' }]}
          value={summaryDepth}
          onChange={setSummaryDepth}
        />
        <p className="text-[10px] text-[#9B9A97] mt-2">Brief uses highlights/notes only. Detailed analyzes full content.</p>
      </Card>

      <Card>
        <SectionLabel>Context Warning Threshold</SectionLabel>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={50}
            max={95}
            step={5}
            value={contextThreshold}
            onChange={(e) => setContextThreshold(Number(e.target.value))}
            className="flex-1 accent-[#B8A070] h-2"
          />
          <span className="text-sm font-medium text-[#191919] w-12 text-right">{contextThreshold}%</span>
        </div>
      </Card>

      <Card>
        <SectionLabel>Auto-Compression</SectionLabel>
        <div className="space-y-2">
          {[
            { id: 'prompt', label: 'Ask me first', description: 'Show a prompt before compressing' },
            { id: 'auto', label: 'Automatic', description: 'Compress silently at threshold' },
            { id: 'off', label: 'Never', description: "I'll manage context manually" },
          ].map((opt) => (
            <RadioOption
              key={opt.id}
              active={autoCompress === opt.id}
              onSelect={() => setAutoCompress(opt.id)}
              label={opt.label}
              description={opt.description}
            />
          ))}
        </div>
      </Card>
    </>
  )
}

function DataSection({ backupReminder, setBackupReminder, showExportSheet, setShowExportSheet, showImportSheet, setShowImportSheet, showDeleteConfirm, setShowDeleteConfirm, storageUsage, conversations }) {
  const usedMB = storageUsage ? (storageUsage.usage / 1024 / 1024).toFixed(1) : 0
  const quotaMB = storageUsage ? (storageUsage.quota / 1024 / 1024 / 1024).toFixed(1) : 0

  return (
    <>
      <Card>
        <div className="flex items-center justify-between mb-3">
          <SectionLabel>Storage</SectionLabel>
          <span className="text-[10px] text-[#787774] bg-[#F1F1EF] px-2 py-0.5 rounded-full">
            {conversations?.length || 0} conversations
          </span>
        </div>
        {storageUsage && (
          <div className="mb-3">
            <div className="h-1.5 bg-[#F1F1EF] rounded-full overflow-hidden mb-1.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (storageUsage.usage / storageUsage.quota) * 100)}%` }}
                transition={{ ...SPRING_SMOOTH, delay: 0.2 }}
                className="h-full rounded-full bg-[#B8A070]"
              />
            </div>
            <p className="text-[10px] text-[#787774]">{usedMB} MB of ~{quotaMB} GB used</p>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExportSheet(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium border border-[#E9E9E7] bg-white text-[#191919] active:bg-[#F7F6F3]"
            style={{ borderRadius: 6 }}
          >
            <Download className="w-3.5 h-3.5" /> Export All
          </button>
          <button
            onClick={() => setShowImportSheet(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-medium border border-[#E9E9E7] bg-white text-[#191919] active:bg-[#F7F6F3]"
            style={{ borderRadius: 6 }}
          >
            <Upload className="w-3.5 h-3.5" /> Import
          </button>
        </div>
      </Card>

      <InfoBanner icon={Lock} color="grey">
        Exported backups are encrypted with a passphrase you choose. Without it, the file cannot be read.
      </InfoBanner>

      <Card>
        <SectionLabel>Backup Reminders</SectionLabel>
        <SegmentedControl
          options={[{ id: 'weekly', label: 'Weekly' }, { id: 'biweekly', label: 'Biweekly' }, { id: 'never', label: 'Never' }]}
          value={backupReminder}
          onChange={setBackupReminder}
        />
      </Card>

      <InfoBanner icon={Shield} color="blue">
        <span className="font-medium text-[#191919]">Why local storage?</span> Your conversations are in your browser's IndexedDB — not on servers. Clearing browser data removes them. Regular backups keep your work safe.
      </InfoBanner>

      <Card danger>
        <SectionLabel>Danger Zone</SectionLabel>
        <p className="text-xs text-[#787774] mb-3">Permanently deletes all conversations, highlights, notes, branches, and settings.</p>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="flex items-center justify-center gap-2 w-full py-2.5 text-xs font-medium border border-[#E03E3E]/30 bg-[#E03E3E]/5 text-[#E03E3E] active:bg-[#E03E3E]/10"
          style={{ borderRadius: 6 }}
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete All Local Data
        </button>
      </Card>
    </>
  )
}

function InteractionModeSection({ storedMode, setMode }) {
  return (
    <>
      <Card>
        <SectionLabel>Interface Mode</SectionLabel>
        <p className="text-xs text-[#787774] mt-1 mb-3">Choose how the interface adapts to your device.</p>
        <div className="space-y-2">
          {MODE_OPTIONS.map((opt) => {
            const active = storedMode === opt.id || (!storedMode && opt.id === 'auto')
            return (
              <RadioOption
                key={opt.id}
                active={active}
                onSelect={() => setMode(opt.id)}
                label={
                  <span className="flex items-center gap-2">
                    {opt.label}
                    {opt.beta && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#B8A070]/10 text-[#B8A070]">Beta</span>}
                    {opt.soon && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#D9730D]/10 text-[#D9730D]">Soon</span>}
                  </span>
                }
                description={opt.description}
              />
            )
          })}
        </div>
      </Card>
    </>
  )
}

function AppearanceSection({ theme, setTheme, fontSize, setFontSize }) {
  return (
    <>
      <Card>
        <SectionLabel>Theme</SectionLabel>
        <div className="flex gap-2">
          {[
            { id: 'light', label: 'Light', icon: Sun },
            { id: 'dark', label: 'Dark', icon: Moon },
          ].map((t) => {
            const Icon = t.icon
            const active = theme === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border transition-colors ${
                  active ? 'border-[#B8A070] bg-[#B8A070]/[0.06]' : 'border-[#E9E9E7] active:bg-[#F7F6F3]'
                }`}
                style={{ borderRadius: 6 }}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-[#B8A070]' : 'text-[#787774]'}`} />
                <span className={`text-sm font-medium ${active ? 'text-[#191919]' : 'text-[#787774]'}`}>{t.label}</span>
              </button>
            )
          })}
        </div>
      </Card>

      <Card>
        <SectionLabel>Text Size</SectionLabel>
        <SegmentedControl
          options={[{ id: 'compact', label: 'Compact' }, { id: 'default', label: 'Default' }, { id: 'large', label: 'Large' }]}
          value={fontSize}
          onChange={setFontSize}
        />
      </Card>
    </>
  )
}

function AboutSection() {
  return (
    <>
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <motion.div animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 0.6, delay: 0.6, ease: 'easeInOut' }}>
            <MessageSquare className="w-5 h-5 text-[#B8A070]" />
          </motion.div>
          <div>
            <h3 className="text-sm font-medium text-[#191919]">Parliament</h3>
            <p className="text-xs text-[#787774]">Version 0.1.0</p>
          </div>
        </div>
        <p className="text-xs text-[#787774] leading-relaxed mb-4">
          A power-user chat interface for AI. Built with React, Framer Motion, and Tailwind CSS. Open source and community-driven.
        </p>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium border border-[#E9E9E7] bg-white text-[#191919] active:bg-[#F7F6F3]"
          style={{ borderRadius: 6 }}
        >
          <Github className="w-3.5 h-3.5" /> View on GitHub
        </a>
      </Card>

      <Card>
        <SectionLabel>How Your Data Stays Private</SectionLabel>
        <div className="space-y-4">
          {[
            { title: 'No servers, no accounts', text: "Runs entirely in your browser. Nothing transmitted except to Anthropic's API." },
            { title: 'API key encrypted at rest', text: 'AES-GCM via Web Crypto API with a non-extractable key in IndexedDB.' },
            { title: 'Conversations stay local', text: 'All data lives in IndexedDB. We cannot see, access, or recover it.' },
            { title: 'Open source & auditable', text: 'Entire codebase on GitHub. Verify every request and storage call yourself.' },
          ].map((item, i) => (
            <div key={i}>
              <h4 className="text-xs font-medium text-[#191919] mb-0.5">{item.title}</h4>
              <p className="text-xs text-[#787774] leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}

/* ═══════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                              */
/* ═══════════════════════════════════════════════════════════ */

export default function SwiftSettingsLayout() {
  const navigate = useNavigate()
  const { settings, updateSetting, storageUsage } = useSettings()
  const { conversations } = useConversations()
  const { storedMode, setMode } = useMode()

  const [openSection, setOpenSection] = useState('api')
  const { triggerShimmer, shimmerPhase, shimmerDone } = useShimmer()

  // Local API key state
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [keyStatus, setKeyStatus] = useState(null)
  const [keyError, setKeyError] = useState('')
  const [validateCooldown, setValidateCooldown] = useState(false)

  // Spending limit UI state
  const [spendingLimitDismissed, setSpendingLimitDismissed] = useState(false)
  const [spendingLimitConfirmed, setSpendingLimitConfirmed] = useState(false)

  // Bottom sheet state
  const [showExportSheet, setShowExportSheet] = useState(false)
  const [showImportSheet, setShowImportSheet] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Export/import form state
  const [exportPassphrase, setExportPassphrase] = useState('')
  const [exportConfirmPassphrase, setExportConfirmPassphrase] = useState('')
  const [exportStatus, setExportStatus] = useState(null)
  const [importPassphrase, setImportPassphrase] = useState('')
  const [importStatus, setImportStatus] = useState(null)
  const [importError, setImportError] = useState('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const toggleSection = useCallback((id) => {
    setOpenSection(prev => prev === id ? null : id)
  }, [])

  const validateKey = useCallback(async () => {
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
        await saveApiKey(apiKey, settings.storageMode)
        triggerShimmer()
      }
    } catch {
      setKeyStatus('invalid')
      setKeyError('Could not reach the Anthropic API. Please check your connection.')
    } finally {
      setTimeout(() => setValidateCooldown(false), 5000)
    }
  }, [apiKey, settings.storageMode, validateCooldown, keyStatus])

  const handleExport = useCallback(async (plain = false) => {
    setExportStatus('exporting')
    try {
      const data = await exportAllData()
      if (plain) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `parliament-backup-${Date.now()}.json`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        const jsonString = JSON.stringify(data)
        const encrypted = await encryptExport(jsonString, exportPassphrase)
        const blob = new Blob([JSON.stringify(encrypted)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `parliament-backup-${Date.now()}.apb`
        a.click()
        URL.revokeObjectURL(url)
      }
      setExportStatus('done')
      setTimeout(() => { setShowExportSheet(false); setExportStatus(null); setExportPassphrase(''); setExportConfirmPassphrase('') }, 1200)
    } catch {
      setExportStatus('error')
    }
  }, [exportPassphrase])

  const handleImport = useCallback(async (file) => {
    if (!file) return
    setImportError('')
    setImportStatus('importing')
    try {
      let text
      try {
        text = await file.text()
      } catch {
        throw new Error('The file could not be read.')
      }

      let parsed
      try {
        parsed = JSON.parse(text)
      } catch {
        throw new Error('Not a valid Parliament backup file.')
      }

      let data
      if (parsed.salt && parsed.iv && parsed.ciphertext) {
        // Encrypted .apb file
        try {
          data = await decryptImport(parsed, importPassphrase)
        } catch {
          throw new Error('Incorrect passphrase. Please check and try again.')
        }
      } else {
        // Plain .json file
        data = parsed
      }

      if (!data || typeof data !== 'object' || !Array.isArray(data.conversations)) {
        throw new Error('The file does not appear to be a valid Parliament backup.')
      }

      await importData(data)
      setImportStatus('done')
      setTimeout(() => { setShowImportSheet(false); setImportStatus(null); setImportPassphrase(''); setImportError('') }, 1200)
    } catch (err) {
      setImportStatus('error')
      setImportError(err.message || 'Import failed. Check the file and passphrase.')
    }
  }, [importPassphrase])

  const handleDeleteAll = useCallback(async () => {
    if (deleteConfirmText !== 'delete') return
    await clearAllData()
    navigate('/')
  }, [deleteConfirmText, navigate])

  return (
    <div
      className="flex flex-col font-sans overflow-hidden"
      style={{ backgroundColor: '#FFFFFF', color: '#191919', height: '100dvh', maxWidth: 430, margin: '0 auto' }}
    >

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

      {/* Top Bar */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING_SMOOTH, delay: 0.05 }}
        className={`flex items-center gap-3 px-4 pb-3 border-b flex-shrink-0 ${shimmerPhase >= 4 ? 'shimmer-sidebar-border' : 'border-[#F1F1EF]'}`}
        style={{ paddingTop: 'max(env(safe-area-inset-top, 12px), 12px)' }}
      >
        <button
          onClick={() => navigate('/')}
          className="p-2 -ml-1 active:bg-[#F7F6F3]"
          style={{ borderRadius: 6 }}
        >
          <ArrowLeft className="w-5 h-5 text-[#787774]" />
        </button>
        <div>
          <h1 className="text-lg font-medium text-[#191919] leading-tight">Settings</h1>
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

      {/* Accordion List */}
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>

          <AccordionSection id="api" label="API Configuration" subtitle="Connect your Anthropic API key" icon={Key}
            isOpen={openSection === 'api'} onToggle={toggleSection}
            shimmerClass={shimmerPhase >= 3 ? 'shimmer-nav' : ''} shimmerStyle={shimmerPhase >= 3 ? { animationDelay: '0ms' } : {}}>
            <ApiSection
              apiKey={apiKey} setApiKey={setApiKey}
              showKey={showKey} setShowKey={setShowKey}
              keyStatus={keyStatus} setKeyStatus={setKeyStatus}
              keyError={keyError} validateKey={validateKey} validateCooldown={validateCooldown}
              storageMode={settings.storageMode} setStorageMode={(v) => updateSetting('storageMode', v)}
              spendingLimitDismissed={spendingLimitDismissed} setSpendingLimitDismissed={setSpendingLimitDismissed}
              spendingLimitConfirmed={spendingLimitConfirmed} setSpendingLimitConfirmed={setSpendingLimitConfirmed}
              shimmerPhase={shimmerPhase}
            />
          </AccordionSection>

          <AccordionSection id="interaction" label="Interface Mode" subtitle="Choose how you interact with Parliament" icon={Layout}
            isOpen={openSection === 'interaction'} onToggle={toggleSection}>
            <InteractionModeSection storedMode={storedMode} setMode={setMode} />
          </AccordionSection>

          <AccordionSection id="model" label="Model Preferences" subtitle="Choose your default model" icon={Cpu}
            isOpen={openSection === 'model'} onToggle={toggleSection}
            shimmerClass={shimmerPhase >= 3 ? 'shimmer-nav' : ''} shimmerStyle={shimmerPhase >= 3 ? { animationDelay: '55ms' } : {}}>
            <ModelSection
              selectedModel={settings.defaultModel}
              setSelectedModel={(v) => updateSetting('defaultModel', v)}
            />
          </AccordionSection>

          <AccordionSection id="usage" label="Usage & Spending" subtitle="Track tokens and costs" icon={DollarSign}
            isOpen={openSection === 'usage'} onToggle={toggleSection}
            shimmerClass={shimmerPhase >= 3 ? 'shimmer-nav' : ''} shimmerStyle={shimmerPhase >= 3 ? { animationDelay: '110ms' } : {}}>
            <UsageSection
              budgetEnabled={settings.budgetEnabled} setBudgetEnabled={(v) => updateSetting('budgetEnabled', v)}
              budgetAlert={settings.budgetAlert} setBudgetAlert={(v) => updateSetting('budgetAlert', v)}
              spendingLimitDismissed={settings.spendingLimitDismissed} setSpendingLimitDismissed={(v) => updateSetting('spendingLimitDismissed', v)}
            />
          </AccordionSection>

          <AccordionSection id="context" label="Context & Defaults" subtitle="Conversation behavior" icon={Sliders}
            isOpen={openSection === 'context'} onToggle={toggleSection}
            shimmerClass={shimmerPhase >= 3 ? 'shimmer-nav' : ''} shimmerStyle={shimmerPhase >= 3 ? { animationDelay: '165ms' } : {}}>
            <ContextSection
              summaryDepth={settings.summaryDepth} setSummaryDepth={(v) => updateSetting('summaryDepth', v)}
              contextThreshold={settings.contextThreshold} setContextThreshold={(v) => updateSetting('contextThreshold', v)}
              autoCompress={settings.autoCompress} setAutoCompress={(v) => updateSetting('autoCompress', v)}
            />
          </AccordionSection>

          <AccordionSection id="data" label="Data & Backups" subtitle="Export, import, manage data" icon={Database}
            isOpen={openSection === 'data'} onToggle={toggleSection}
            shimmerClass={shimmerPhase >= 3 ? 'shimmer-nav' : ''} shimmerStyle={shimmerPhase >= 3 ? { animationDelay: '220ms' } : {}}>
            <DataSection
              backupReminder={settings.backupReminder} setBackupReminder={(v) => updateSetting('backupReminder', v)}
              showExportSheet={showExportSheet} setShowExportSheet={setShowExportSheet}
              showImportSheet={showImportSheet} setShowImportSheet={setShowImportSheet}
              showDeleteConfirm={showDeleteConfirm} setShowDeleteConfirm={setShowDeleteConfirm}
              storageUsage={storageUsage} conversations={conversations}
            />
          </AccordionSection>

          <AccordionSection id="appearance" label="Appearance" subtitle="Theme and text size" icon={Sun}
            isOpen={openSection === 'appearance'} onToggle={toggleSection}
            shimmerClass={shimmerPhase >= 3 ? 'shimmer-nav' : ''} shimmerStyle={shimmerPhase >= 3 ? { animationDelay: '275ms' } : {}}>
            <AppearanceSection
              theme={settings.theme} setTheme={(v) => updateSetting('theme', v)}
              fontSize={settings.fontSize} setFontSize={(v) => updateSetting('fontSize', v)}
            />
          </AccordionSection>

          <AccordionSection id="about" label="About & Security" subtitle="How your data stays private" icon={Shield}
            isOpen={openSection === 'about'} onToggle={toggleSection}
            shimmerClass={shimmerPhase >= 3 ? 'shimmer-nav' : ''} shimmerStyle={shimmerPhase >= 3 ? { animationDelay: '330ms' } : {}}>
            <AboutSection />
          </AccordionSection>

        </motion.div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 py-6 px-5">
          <HardDrive className="w-3 h-3 text-[#9B9A97]" />
          <span className="text-[11px] text-[#9B9A97]">Data stored locally via IndexedDB</span>
        </div>
      </div>

      {/* Export Bottom Sheet */}
      <AnimatePresence>
        {showExportSheet && (
          <BottomSheet open={showExportSheet} onClose={() => { setShowExportSheet(false); setExportPassphrase(''); setExportConfirmPassphrase(''); setExportStatus(null) }}
            title="Export Backup" subtitle="Encrypt and download your data" icon={Download}>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[#787774] uppercase tracking-wider block mb-2">Create a passphrase <span className="font-normal normal-case">(min. 8 characters)</span></label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9A97]" />
                  <input
                    type="password"
                    value={exportPassphrase}
                    onChange={(e) => setExportPassphrase(e.target.value)}
                    placeholder="Enter a passphrase..."
                    className="w-full bg-white pl-10 pr-4 py-3 text-sm text-[#191919] outline-none placeholder:text-[#9B9A97] border border-[#E9E9E7] focus:border-[#B8A070] transition-colors"
                    style={{ borderRadius: 6 }}
                  />
                </div>
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
              <div>
                <label className="text-xs font-medium text-[#787774] uppercase tracking-wider block mb-2">Confirm passphrase</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9A97]" />
                  <input
                    type="password"
                    value={exportConfirmPassphrase}
                    onChange={(e) => setExportConfirmPassphrase(e.target.value)}
                    placeholder="Re-enter passphrase..."
                    className="w-full bg-white pl-10 pr-4 py-3 text-sm text-[#191919] outline-none placeholder:text-[#9B9A97] border border-[#E9E9E7] focus:border-[#B8A070] transition-colors"
                    style={{ borderRadius: 6 }}
                  />
                </div>
              </div>
              {exportPassphrase && exportConfirmPassphrase && exportPassphrase !== exportConfirmPassphrase && (
                <p className="text-xs text-[#E03E3E] flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3" /> Passphrases don't match
                </p>
              )}
              {exportStatus === 'error' && (
                <p className="text-xs text-[#E03E3E] flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3" /> Export failed. Please try again.
                </p>
              )}
              {exportStatus === 'done' && (
                <p className="text-xs text-[#0F7B6C] flex items-center gap-1.5">
                  <CheckCircle className="w-3 h-3" /> Exported successfully.
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => handleExport(false)}
                  disabled={!exportPassphrase || exportPassphrase.length < 8 || exportPassphrase !== exportConfirmPassphrase || exportStatus === 'exporting'}
                  className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium bg-[#B8A070] text-white active:bg-[#9C8760] disabled:opacity-40 transition-colors"
                  style={{ borderRadius: 6 }}
                >
                  <Lock className="w-3.5 h-3.5" /> Encrypt & Export
                </button>
                <button
                  onClick={() => handleExport(true)}
                  disabled={exportStatus === 'exporting'}
                  className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border border-[#E9E9E7] text-[#787774] active:bg-[#F7F6F3] disabled:opacity-40"
                  style={{ borderRadius: 6 }}
                >
                  <FileJson className="w-3.5 h-3.5" /> JSON
                </button>
              </div>
            </div>
          </BottomSheet>
        )}
      </AnimatePresence>

      {/* Import Bottom Sheet */}
      <AnimatePresence>
        {showImportSheet && (
          <BottomSheet open={showImportSheet} onClose={() => { setShowImportSheet(false); setImportPassphrase(''); setImportStatus(null); setImportError('') }}
            title="Import Backup" subtitle="Restore from an encrypted backup" icon={Upload}>
            <div className="space-y-4">
              <label
                className="flex flex-col items-center justify-center gap-2 py-6 border-2 border-dashed border-[#E9E9E7] text-sm text-[#787774] active:bg-[#F7F6F3] cursor-pointer"
                style={{ borderRadius: 6 }}
              >
                <Upload className="w-5 h-5 text-[#9B9A97]" />
                <span>Tap to select backup file</span>
                <input
                  type="file"
                  accept=".apb,.json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const name = file.name.toLowerCase()
                    if (!name.endsWith('.apb') && !name.endsWith('.json')) {
                      setImportError('Invalid file type. Please select a .apb or .json backup file.')
                      e.target.value = ''
                      return
                    }
                    setImportError('')
                    handleImport(file)
                  }}
                />
              </label>
              <div>
                <label className="text-xs font-medium text-[#787774] uppercase tracking-wider block mb-2">Passphrase (for .apb files)</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9B9A97]" />
                  <input
                    type="password"
                    value={importPassphrase}
                    onChange={(e) => setImportPassphrase(e.target.value)}
                    placeholder="Enter backup passphrase..."
                    className="w-full bg-white pl-10 pr-4 py-3 text-sm text-[#191919] outline-none placeholder:text-[#9B9A97] border border-[#E9E9E7] focus:border-[#B8A070] transition-colors"
                    style={{ borderRadius: 6 }}
                  />
                </div>
              </div>
              {(importStatus === 'error' || importError) && (
                <p className="text-xs text-[#E03E3E] flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3" /> {importError || 'Import failed. Wrong passphrase or corrupted file.'}
                </p>
              )}
              {importStatus === 'done' && (
                <p className="text-xs text-[#0F7B6C] flex items-center gap-1.5">
                  <CheckCircle className="w-3 h-3" /> Imported successfully.
                </p>
              )}
            </div>
          </BottomSheet>
        )}
      </AnimatePresence>

      {/* Delete Confirm Bottom Sheet */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <BottomSheet open={showDeleteConfirm} onClose={() => { setShowDeleteConfirm(false); setDeleteConfirmText('') }}
            title="Delete All Data" subtitle="This cannot be undone" icon={Trash2}>
            <div className="space-y-4">
              <InfoBanner icon={AlertTriangle} color="amber">
                This will permanently delete all conversations, highlights, notes, branches, and settings. Make sure you have a backup first.
              </InfoBanner>
              <div>
                <label className="text-xs font-medium text-[#787774] uppercase tracking-wider block mb-2">
                  Type "delete" to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="delete"
                  className="w-full bg-white px-4 py-3 text-sm text-[#191919] outline-none placeholder:text-[#9B9A97] border border-[#E9E9E7] focus:border-[#E03E3E] transition-colors"
                  style={{ borderRadius: 6 }}
                />
              </div>
              <button
                onClick={handleDeleteAll}
                disabled={deleteConfirmText !== 'delete'}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium bg-[#E03E3E] text-white active:bg-[#C43434] disabled:opacity-40 transition-colors"
                style={{ borderRadius: 6 }}
              >
                <Trash2 className="w-4 h-4" /> Delete Everything
              </button>
            </div>
          </BottomSheet>
        )}
      </AnimatePresence>
    </div>
  )
}

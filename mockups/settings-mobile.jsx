import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key, Eye, EyeOff, CheckCircle, AlertCircle, ChevronDown,
  Shield, Cpu, DollarSign, Sliders, Database, Download, Upload, Trash2,
  Sun, Moon, Info, ExternalLink, Github, HardDrive, Clock,
  ArrowLeft, MessageSquare, X, AlertTriangle, FileJson, RefreshCw, Lock
} from 'lucide-react';

const SPRING_SNAPPY = { type: 'spring', stiffness: 500, damping: 30 };
const SPRING_SMOOTH = { type: 'spring', stiffness: 300, damping: 28 };
const SPRING_GENTLE = { type: 'spring', stiffness: 200, damping: 24 };

const MODELS = [
  { id: 'haiku', name: 'Claude Haiku', description: 'Fast & affordable', inputCost: '$0.25', outputCost: '$1.25', speed: 'Fastest', badge: 'Budget-friendly' },
  { id: 'sonnet', name: 'Claude Sonnet', description: 'Balanced performance', inputCost: '$3.00', outputCost: '$15.00', speed: 'Fast', badge: 'Recommended' },
  { id: 'opus', name: 'Claude Opus', description: 'Maximum capability', inputCost: '$15.00', outputCost: '$75.00', speed: 'Moderate', badge: 'Most powerful' },
];

const STORAGE_MODES = [
  { id: 'persistent', label: 'Remember my key', description: 'Saved in this browser until you delete it', icon: HardDrive },
  { id: 'session', label: 'Session only', description: 'Cleared when you close the browser', icon: Clock },
  { id: 'memory', label: 'Don\'t save', description: 'Re-enter every time — maximum security', icon: Shield },
];

const NAV_ITEMS = [
  { id: 'api', label: 'API Configuration', icon: Key, subtitle: 'Connect your Anthropic API key' },
  { id: 'model', label: 'Model Preferences', icon: Cpu, subtitle: 'Choose your default model' },
  { id: 'usage', label: 'Usage & Spending', icon: DollarSign, subtitle: 'Track tokens and costs' },
  { id: 'context', label: 'Context & Defaults', icon: Sliders, subtitle: 'Conversation behavior' },
  { id: 'data', label: 'Data & Backups', icon: Database, subtitle: 'Export, import, manage data' },
  { id: 'appearance', label: 'Appearance', icon: Sun, subtitle: 'Theme and text size' },
  { id: 'about', label: 'About & Security', icon: Shield, subtitle: 'How your data stays private' },
];

/* ═══════════════════════════════════════════════════════════ */
/*  SHARED COMPONENTS                                           */
/* ═══════════════════════════════════════════════════════════ */

function SettingsCard({ children, danger = false }) {
  return (
    <div className={`px-4 py-4 rounded-xl border ${
      danger ? 'border-[#EF4444]/20 bg-[#EF4444]/[0.02]' : 'border-[#EBEBEB] bg-white'
    }`}>
      {children}
    </div>
  );
}

function ToggleSwitch({ enabled, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
      style={{ backgroundColor: enabled ? '#4A7AE5' : '#D5D5D5' }}
    >
      <motion.div
        animate={{ x: enabled ? 22 : 3 }}
        transition={SPRING_SNAPPY}
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
      />
    </button>
  );
}

function RadioOption({ active, onSelect, icon: Icon, label, description, children }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left flex items-start gap-3 px-4 py-3.5 rounded-xl border transition-colors ${
        active ? 'border-[#4A7AE5] bg-[#4A7AE5]/5' : 'border-[#EBEBEB] active:bg-[#FAFAFA]'
      }`}
    >
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
        active ? 'border-[#4A7AE5]' : 'border-[#D5D5D5]'
      }`}>
        {active && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={SPRING_SNAPPY} className="w-2.5 h-2.5 rounded-full bg-[#4A7AE5]" />}
      </div>
      {Icon && <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${active ? 'text-[#4A7AE5]' : 'text-[#6B7C93]'}`} />}
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-semibold ${active ? 'text-[#1E2532]' : 'text-[#4A5568]'}`}>{label}</div>
        {description && <div className="text-xs text-[#6B7C93] mt-0.5">{description}</div>}
        {children}
      </div>
    </button>
  );
}

function SegmentedControl({ options, value, onChange }) {
  return (
    <div className="flex gap-1 bg-[#F5F5F5] rounded-xl p-1">
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
            value === opt.id ? 'bg-white text-[#1E2532] shadow-sm' : 'text-[#6B7C93] active:text-[#1E2532]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function InfoBanner({ icon: Icon, color = 'blue', children }) {
  const colors = {
    blue: 'bg-[#4A7AE5]/5 border-[#4A7AE5]/15',
    amber: 'bg-[#E5A620]/5 border-[#E5A620]/20',
    grey: 'bg-[#F5F5F5] border-[#EBEBEB]',
  };
  const iconColors = { blue: 'text-[#4A7AE5]', amber: 'text-[#E5A620]', grey: 'text-[#6B7C93]' };
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${colors[color]}`}>
      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconColors[color]}`} />
      <div className="text-xs text-[#6B7C93] leading-relaxed flex-1">{children}</div>
    </div>
  );
}

function BottomSheet({ open, onClose, title, subtitle, icon: Icon, children }) {
  if (!open) return null;
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
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-[#D5D5D5]" />
        </div>
        <div className="flex items-center justify-between px-5 pb-3 pt-1">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="w-8 h-8 rounded-lg bg-[#4A7AE5]/10 flex items-center justify-center">
                <Icon className="w-4 h-4 text-[#4A7AE5]" />
              </div>
            )}
            <div>
              <span className="text-base font-semibold text-[#1E2532]">{title}</span>
              {subtitle && <p className="text-xs text-[#6B7C93]">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 rounded-full active:bg-[#EEEEEE]">
            <X className="w-4 h-4 text-[#6B7C93]" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-8" style={{ WebkitOverflowScrolling: 'touch' }}>
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  ACCORDION SECTION WRAPPER                                   */
/* ═══════════════════════════════════════════════════════════ */

function AccordionSection({ id, label, subtitle, icon: Icon, isOpen, onToggle, children }) {
  return (
    <div className="border-b border-[#F0F0F0]">
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center gap-3.5 px-5 py-4 active:bg-[#FAFAFA] transition-colors"
      >
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
          isOpen ? 'bg-[#4A7AE5]/10' : 'bg-[#F5F5F5]'
        }`}>
          <Icon className={`w-4 h-4 transition-colors ${isOpen ? 'text-[#4A7AE5]' : 'text-[#6B7C93]'}`} />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className={`text-[14px] font-semibold transition-colors ${isOpen ? 'text-[#1E2532]' : 'text-[#4A5568]'}`}>{label}</div>
          <div className="text-[11px] text-[#C0C8D4]">{subtitle}</div>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={SPRING_SNAPPY}
        >
          <ChevronDown className="w-4 h-4 text-[#C0C8D4]" />
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
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  SECTION CONTENTS                                            */
/* ═══════════════════════════════════════════════════════════ */

function ApiSection({ apiKey, setApiKey, showKey, setShowKey, keyStatus, setKeyStatus, validateKey, storageMode, setStorageMode, spendingLimitDismissed, setSpendingLimitDismissed, spendingLimitConfirmed, setSpendingLimitConfirmed }) {
  return (
    <>
      {/* API Key Input */}
      <SettingsCard>
        <label className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider block mb-3">API Key</label>
        <div className="relative mb-2">
          <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D5D5D5]" />
          <input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); setKeyStatus(null); }}
            placeholder="sk-ant-api03-..."
            className="w-full bg-white rounded-xl pl-10 pr-10 py-3 text-sm text-[#1E2532] outline-none placeholder:text-[#D5D5D5] border border-[#EBEBEB] focus:border-[#4A7AE5] transition-colors font-mono"
          />
          <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#6B7C93]">
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <button
          onClick={validateKey}
          disabled={!apiKey || keyStatus === 'validating'}
          className="w-full py-2.5 rounded-xl text-xs font-semibold border border-[#EBEBEB] bg-white text-[#1E2532] active:bg-[#FAFAFA] transition-colors disabled:opacity-40"
        >
          {keyStatus === 'validating' ? (
            <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} className="inline-block">
              <RefreshCw className="w-3.5 h-3.5" />
            </motion.span>
          ) : 'Validate Key'}
        </button>
        <AnimatePresence>
          {keyStatus === 'valid' && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={SPRING_SNAPPY}
              className="flex items-center gap-2 mt-3 text-xs text-[#22C55E]">
              <CheckCircle className="w-3.5 h-3.5" /><span>API key is valid — connected to Anthropic</span>
            </motion.div>
          )}
          {keyStatus === 'invalid' && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={SPRING_SNAPPY}
              className="flex items-center gap-2 mt-3 text-xs text-[#EF4444]">
              <AlertCircle className="w-3.5 h-3.5" /><span>Invalid key — check and try again</span>
            </motion.div>
          )}
        </AnimatePresence>
      </SettingsCard>

      {/* Storage Mode */}
      <SettingsCard>
        <label className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider block mb-3">Key Storage</label>
        <div className="space-y-2">
          {STORAGE_MODES.map((mode) => (
            <RadioOption key={mode.id} active={storageMode === mode.id} onSelect={() => setStorageMode(mode.id)}
              icon={mode.icon} label={mode.label} description={mode.description} />
          ))}
        </div>
      </SettingsCard>

      <InfoBanner icon={Shield} color="blue">
        Your API key is stored locally and never sent to our servers. All API calls go directly to Anthropic. Encrypted at rest via Web Crypto API.
      </InfoBanner>

      {/* Spending limit recommendation */}
      {!spendingLimitDismissed && (
        <SettingsCard>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#E5A620]/10 flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-4 h-4 text-[#E5A620]" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-[#1E2532] mb-1">Set a spending limit</h4>
                <p className="text-xs text-[#6B7C93] leading-relaxed mb-3">We strongly recommend setting a monthly spending limit in your Anthropic dashboard.</p>
                <div className="flex flex-wrap items-center gap-2">
                  <a href="https://console.anthropic.com/settings/limits" target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-[#EBEBEB] bg-white text-[#1E2532] active:bg-[#FAFAFA]">
                    Open Dashboard <ExternalLink className="w-3 h-3" />
                  </a>
                  <button onClick={() => setSpendingLimitConfirmed(true)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      spendingLimitConfirmed ? 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20' : 'text-[#6B7C93] active:bg-[#F5F5F5]'
                    }`}>
                    {spendingLimitConfirmed ? <><CheckCircle className="w-3 h-3" /> Done</> : "I've set a limit"}
                  </button>
                </div>
              </div>
            </div>
            <button onClick={() => setSpendingLimitDismissed(true)} className="p-1 rounded-full active:bg-[#EEEEEE] text-[#C0C8D4] flex-shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </SettingsCard>
      )}
    </>
  );
}

function ModelSection({ selectedModel, setSelectedModel }) {
  return (
    <>
      <SettingsCard>
        <label className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider block mb-3">Default Model</label>
        <div className="space-y-2">
          {MODELS.map((model) => {
            const active = selectedModel === model.id;
            return (
              <RadioOption key={model.id} active={active} onSelect={() => setSelectedModel(model.id)} label={model.name} description={model.description}>
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    model.id === 'sonnet' ? 'bg-[#4A7AE5]/10 text-[#4A7AE5]'
                      : model.id === 'haiku' ? 'bg-[#22C55E]/10 text-[#22C55E]' : 'bg-[#7C6CD4]/10 text-[#7C6CD4]'
                  }`}>{model.badge}</span>
                </div>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className="text-[10px] text-[#6B7C93]">In: <span className="font-semibold text-[#4A5568]">{model.inputCost}/MTok</span></span>
                  <span className="text-[10px] text-[#6B7C93]">Out: <span className="font-semibold text-[#4A5568]">{model.outputCost}/MTok</span></span>
                  <span className="text-[10px] text-[#6B7C93]">Speed: <span className="font-semibold text-[#4A5568]">{model.speed}</span></span>
                </div>
              </RadioOption>
            );
          })}
        </div>
      </SettingsCard>
      <InfoBanner icon={Info} color="grey">
        You can override the default model per-conversation. Costs are billed directly by Anthropic to your API key.
      </InfoBanner>
    </>
  );
}

function UsageSection({ budgetEnabled, setBudgetEnabled, budgetAlert, setBudgetAlert }) {
  return (
    <>
      <SettingsCard>
        <label className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider block mb-3">This Month</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Total Tokens', value: '1.2M' },
            { label: 'Conversations', value: '34' },
            { label: 'Est. Cost', value: '$8.42' },
          ].map((stat) => (
            <div key={stat.label} className="px-3 py-3 bg-[#FAFAFA] border border-[#F0F0F0] rounded-xl">
              <div className="text-[10px] text-[#6B7C93] mb-0.5">{stat.label}</div>
              <div className="text-lg font-semibold text-[#1E2532]">{stat.value}</div>
            </div>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard>
        <label className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider block mb-3">Breakdown by Model</label>
        <div className="space-y-3">
          {[
            { model: 'Sonnet', tokens: '980K', cost: '$6.14', pct: 73 },
            { model: 'Haiku', tokens: '180K', cost: '$0.28', pct: 15 },
            { model: 'Opus', tokens: '40K', cost: '$2.00', pct: 12 },
          ].map((row) => (
            <div key={row.model}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-[#1E2532]">{row.model}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-[#6B7C93]">{row.tokens}</span>
                  <span className="text-xs font-semibold text-[#1E2532]">{row.cost}</span>
                </div>
              </div>
              <div className="h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${row.pct}%` }}
                  transition={{ ...SPRING_GENTLE, delay: 0.3 }} className="h-full rounded-full bg-[#4A7AE5]" />
              </div>
            </div>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider">Budget Alert</label>
          <ToggleSwitch enabled={budgetEnabled} onToggle={() => setBudgetEnabled(!budgetEnabled)} />
        </div>
        <AnimatePresence>
          {budgetEnabled && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={SPRING_SNAPPY} className="overflow-hidden">
              <div className="flex items-center gap-3">
                <span className="text-sm text-[#6B7C93]">Warn at</span>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#D5D5D5]" />
                  <input type="number" value={budgetAlert} onChange={(e) => setBudgetAlert(Number(e.target.value))}
                    className="w-24 bg-white rounded-xl pl-7 pr-3 py-2.5 text-sm text-[#1E2532] outline-none border border-[#EBEBEB] focus:border-[#4A7AE5] transition-colors" />
                </div>
                <span className="text-sm text-[#6B7C93]">/ mo</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SettingsCard>
    </>
  );
}

function ContextSection({ summaryDepth, setSummaryDepth, contextThreshold, setContextThreshold, autoCompress, setAutoCompress }) {
  return (
    <>
      <SettingsCard>
        <label className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider block mb-3">Default Summary Depth</label>
        <SegmentedControl options={[{ id: 'brief', label: 'Brief' }, { id: 'detailed', label: 'Detailed' }]}
          value={summaryDepth} onChange={setSummaryDepth} />
        <p className="text-[10px] text-[#C0C8D4] mt-2">Brief uses highlights/notes only. Detailed analyzes full content.</p>
      </SettingsCard>

      <SettingsCard>
        <label className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider block mb-3">Context Warning Threshold</label>
        <div className="flex items-center gap-4">
          <input type="range" min={50} max={95} step={5} value={contextThreshold}
            onChange={(e) => setContextThreshold(Number(e.target.value))}
            className="flex-1 accent-[#4A7AE5] h-2" />
          <span className="text-sm font-semibold text-[#1E2532] w-12 text-right">{contextThreshold}%</span>
        </div>
      </SettingsCard>

      <SettingsCard>
        <label className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider block mb-3">Auto-Compression</label>
        <div className="space-y-2">
          {[
            { id: 'prompt', label: 'Ask me first', description: 'Show a prompt before compressing' },
            { id: 'auto', label: 'Automatic', description: 'Compress silently at threshold' },
            { id: 'off', label: 'Never', description: 'I\'ll manage context manually' },
          ].map((opt) => (
            <RadioOption key={opt.id} active={autoCompress === opt.id} onSelect={() => setAutoCompress(opt.id)}
              label={opt.label} description={opt.description} />
          ))}
        </div>
      </SettingsCard>
    </>
  );
}

function DataSection({ showExportSheet, setShowExportSheet, showImportSheet, setShowImportSheet, showDeleteConfirm, setShowDeleteConfirm, backupReminder, setBackupReminder }) {
  return (
    <>
      <SettingsCard>
        <div className="flex items-center justify-between mb-4">
          <label className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider">Backup Status</label>
          <span className="text-[10px] text-[#6B7C93] bg-[#F5F5F5] px-2 py-0.5 rounded-full">12 conversations</span>
        </div>
        <InfoBanner icon={AlertTriangle} color="amber">
          Last backup: <span className="font-semibold text-[#4A5568]">Never</span> — We recommend exporting regularly.
        </InfoBanner>
        <div className="flex items-center gap-2 mt-3">
          <button onClick={() => setShowExportSheet(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold border border-[#EBEBEB] bg-white text-[#1E2532] active:bg-[#FAFAFA]">
            <Download className="w-3.5 h-3.5" /> Export All
          </button>
          <button onClick={() => setShowImportSheet(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold border border-[#EBEBEB] bg-white text-[#1E2532] active:bg-[#FAFAFA]">
            <Upload className="w-3.5 h-3.5" /> Import
          </button>
        </div>
      </SettingsCard>

      <InfoBanner icon={Lock} color="grey">
        Exported backups are encrypted with a passphrase you choose. Without it, the file cannot be read.
      </InfoBanner>

      <SettingsCard>
        <label className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider block mb-3">Backup Reminders</label>
        <SegmentedControl options={[{ id: 'weekly', label: 'Weekly' }, { id: 'biweekly', label: 'Biweekly' }, { id: 'never', label: 'Never' }]}
          value={backupReminder} onChange={setBackupReminder} />
      </SettingsCard>

      <InfoBanner icon={Shield} color="blue">
        <span className="font-semibold text-[#1E2532]">Why local storage?</span> Your conversations are in your browser's IndexedDB — not on servers. Clearing browser data removes them. Regular backups keep your work safe.
      </InfoBanner>

      {/* Danger zone */}
      <SettingsCard danger>
        <label className="text-xs font-semibold text-[#EF4444] uppercase tracking-wider block mb-2">Danger Zone</label>
        <p className="text-xs text-[#6B7C93] mb-3">Permanently deletes all conversations, highlights, notes, branches, and settings.</p>
        <button onClick={() => setShowDeleteConfirm(true)}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-semibold border border-[#EF4444]/30 bg-[#EF4444]/5 text-[#EF4444] active:bg-[#EF4444]/10">
          <Trash2 className="w-3.5 h-3.5" /> Delete All Local Data
        </button>
      </SettingsCard>
    </>
  );
}

function AppearanceSection({ theme, setTheme, fontSize, setFontSize }) {
  return (
    <>
      <SettingsCard>
        <label className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider block mb-3">Theme</label>
        <div className="flex gap-2">
          {[
            { id: 'light', label: 'Light', icon: Sun },
            { id: 'dark', label: 'Dark', icon: Moon },
          ].map((t) => {
            const Icon = t.icon;
            const active = theme === t.id;
            return (
              <button key={t.id} onClick={() => setTheme(t.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-colors ${
                  active ? 'border-[#4A7AE5] bg-[#4A7AE5]/5' : 'border-[#EBEBEB] active:bg-[#FAFAFA]'
                }`}>
                <Icon className={`w-4 h-4 ${active ? 'text-[#4A7AE5]' : 'text-[#6B7C93]'}`} />
                <span className={`text-sm font-semibold ${active ? 'text-[#1E2532]' : 'text-[#6B7C93]'}`}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </SettingsCard>

      <SettingsCard>
        <label className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider block mb-3">Text Size</label>
        <SegmentedControl options={[{ id: 'compact', label: 'Compact' }, { id: 'default', label: 'Default' }, { id: 'large', label: 'Large' }]}
          value={fontSize} onChange={setFontSize} />
      </SettingsCard>
    </>
  );
}

function AboutSection() {
  return (
    <>
      <SettingsCard>
        <div className="flex items-center gap-3 mb-4">
          <motion.div animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 0.6, delay: 0.6, ease: 'easeInOut' }}>
            <MessageSquare className="w-5 h-5 text-[#4A7AE5]" />
          </motion.div>
          <div>
            <h3 className="text-sm font-semibold text-[#1E2532]">Project Apollo</h3>
            <p className="text-xs text-[#6B7C93]">Version 0.1.0</p>
          </div>
        </div>
        <p className="text-xs text-[#6B7C93] leading-relaxed mb-4">A power-user chat interface for AI. Built with React, Framer Motion, and Tailwind CSS. Open source and community-driven.</p>
        <a href="#" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border border-[#EBEBEB] bg-white text-[#1E2532] active:bg-[#FAFAFA]">
          <Github className="w-3.5 h-3.5" /> View on GitHub
        </a>
      </SettingsCard>

      <SettingsCard>
        <label className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider block mb-4">How Your Data Stays Private</label>
        <div className="space-y-4">
          {[
            { title: 'No servers, no accounts', text: 'Runs entirely in your browser. Nothing transmitted except to Anthropic\'s API.' },
            { title: 'API key encrypted at rest', text: 'AES-GCM via Web Crypto API with a non-extractable key in IndexedDB.' },
            { title: 'Conversations stay local', text: 'All data lives in IndexedDB. We cannot see, access, or recover it.' },
            { title: 'Open source & auditable', text: 'Entire codebase on GitHub. Verify every request and storage call yourself.' },
          ].map((item, i) => (
            <div key={i}>
              <h4 className="text-xs font-semibold text-[#1E2532] mb-0.5">{item.title}</h4>
              <p className="text-xs text-[#6B7C93] leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </SettingsCard>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                              */
/* ═══════════════════════════════════════════════════════════ */

export default function SettingsMobile() {
  const [openSection, setOpenSection] = useState('api');

  // API state
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState(null);
  const [storageMode, setStorageMode] = useState('persistent');
  const [spendingLimitDismissed, setSpendingLimitDismissed] = useState(false);
  const [spendingLimitConfirmed, setSpendingLimitConfirmed] = useState(false);

  // Model
  const [selectedModel, setSelectedModel] = useState('sonnet');

  // Usage
  const [budgetEnabled, setBudgetEnabled] = useState(true);
  const [budgetAlert, setBudgetAlert] = useState(20);

  // Context
  const [summaryDepth, setSummaryDepth] = useState('brief');
  const [contextThreshold, setContextThreshold] = useState(80);
  const [autoCompress, setAutoCompress] = useState('prompt');

  // Data
  const [backupReminder, setBackupReminder] = useState('weekly');
  const [showExportSheet, setShowExportSheet] = useState(false);
  const [showImportSheet, setShowImportSheet] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [exportPassphrase, setExportPassphrase] = useState('');
  const [exportConfirmPassphrase, setExportConfirmPassphrase] = useState('');
  const [importPassphrase, setImportPassphrase] = useState('');

  // Appearance
  const [theme, setTheme] = useState('light');
  const [fontSize, setFontSize] = useState('default');

  const validateKey = () => {
    setKeyStatus('validating');
    setTimeout(() => setKeyStatus(apiKey.startsWith('sk-') ? 'valid' : 'invalid'), 1500);
  };

  const toggleSection = (id) => {
    setOpenSection(prev => prev === id ? null : id);
  };

  return (
    <div
      className="flex flex-col font-sans overflow-hidden"
      style={{
        backgroundColor: '#FFFFFF',
        color: '#1E2532',
        height: '100dvh',
        maxWidth: 430,
        margin: '0 auto',
      }}
    >
      {/* ═══ Top Bar ═══ */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING_SMOOTH, delay: 0.05 }}
        className="flex items-center gap-3 px-4 pt-3 pb-3 border-b border-[#F0F0F0]"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 12px), 12px)' }}
      >
        <button className="p-2 -ml-1 rounded-xl active:bg-[#EEEEEE]">
          <ArrowLeft className="w-5 h-5 text-[#6B7C93]" />
        </button>
        <h1 className="text-lg font-semibold text-[#1E2532]">Settings</h1>
      </motion.div>

      {/* ═══ Accordion List ═══ */}
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>

          <AccordionSection id="api" label="API Configuration" subtitle="Connect your Anthropic API key" icon={Key}
            isOpen={openSection === 'api'} onToggle={toggleSection}>
            <ApiSection {...{ apiKey, setApiKey, showKey, setShowKey, keyStatus, setKeyStatus, validateKey, storageMode, setStorageMode, spendingLimitDismissed, setSpendingLimitDismissed, spendingLimitConfirmed, setSpendingLimitConfirmed }} />
          </AccordionSection>

          <AccordionSection id="model" label="Model Preferences" subtitle="Choose your default model" icon={Cpu}
            isOpen={openSection === 'model'} onToggle={toggleSection}>
            <ModelSection {...{ selectedModel, setSelectedModel }} />
          </AccordionSection>

          <AccordionSection id="usage" label="Usage & Spending" subtitle="Track tokens and costs" icon={DollarSign}
            isOpen={openSection === 'usage'} onToggle={toggleSection}>
            <UsageSection {...{ budgetEnabled, setBudgetEnabled, budgetAlert, setBudgetAlert }} />
          </AccordionSection>

          <AccordionSection id="context" label="Context & Defaults" subtitle="Conversation behavior" icon={Sliders}
            isOpen={openSection === 'context'} onToggle={toggleSection}>
            <ContextSection {...{ summaryDepth, setSummaryDepth, contextThreshold, setContextThreshold, autoCompress, setAutoCompress }} />
          </AccordionSection>

          <AccordionSection id="data" label="Data & Backups" subtitle="Export, import, manage data" icon={Database}
            isOpen={openSection === 'data'} onToggle={toggleSection}>
            <DataSection {...{ showExportSheet, setShowExportSheet, showImportSheet, setShowImportSheet, showDeleteConfirm, setShowDeleteConfirm, backupReminder, setBackupReminder }} />
          </AccordionSection>

          <AccordionSection id="appearance" label="Appearance" subtitle="Theme and text size" icon={Sun}
            isOpen={openSection === 'appearance'} onToggle={toggleSection}>
            <AppearanceSection {...{ theme, setTheme, fontSize, setFontSize }} />
          </AccordionSection>

          <AccordionSection id="about" label="About & Security" subtitle="How your data stays private" icon={Shield}
            isOpen={openSection === 'about'} onToggle={toggleSection}>
            <AboutSection />
          </AccordionSection>

        </motion.div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 py-6 px-5">
          <HardDrive className="w-3 h-3 text-[#D5D5D5]" />
          <span className="text-[11px] text-[#D5D5D5]">Data stored locally via IndexedDB</span>
        </div>
      </div>

      {/* ═══ Export Bottom Sheet ═══ */}
      <AnimatePresence>
        <BottomSheet open={showExportSheet} onClose={() => setShowExportSheet(false)} title="Export Backup" subtitle="Encrypt and download your data" icon={Download}>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider block mb-2">Create a passphrase</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D5D5D5]" />
                <input type="password" value={exportPassphrase} onChange={(e) => setExportPassphrase(e.target.value)}
                  placeholder="Enter a passphrase..."
                  className="w-full bg-white rounded-xl pl-10 pr-4 py-3 text-sm text-[#1E2532] outline-none placeholder:text-[#D5D5D5] border border-[#EBEBEB] focus:border-[#4A7AE5] transition-colors" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider block mb-2">Confirm passphrase</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D5D5D5]" />
                <input type="password" value={exportConfirmPassphrase} onChange={(e) => setExportConfirmPassphrase(e.target.value)}
                  placeholder="Re-enter passphrase..."
                  className="w-full bg-white rounded-xl pl-10 pr-4 py-3 text-sm text-[#1E2532] outline-none placeholder:text-[#D5D5D5] border border-[#EBEBEB] focus:border-[#4A7AE5] transition-colors" />
              </div>
            </div>
            {exportPassphrase && exportConfirmPassphrase && exportPassphrase !== exportConfirmPassphrase && (
              <p className="text-xs text-[#EF4444] flex items-center gap-1.5"><AlertCircle className="w-3 h-3" /> Passphrases don't match</p>
            )}
            <div className="flex gap-2 pt-1">
              <button
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-[#4A7AE5] text-white active:bg-[#3A6AD5] disabled:opacity-40 transition-colors"
                disabled={!exportPassphrase || exportPassphrase !== exportConfirmPassphrase}>
                <Lock className="w-3.5 h-3.5" /> Encrypt & Export
              </button>
              <button onClick={() => { /* plain JSON export */ }}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border border-[#EBEBEB] text-[#6B7C93] active:bg-[#FAFAFA]">
                <FileJson className="w-3.5 h-3.5" /> JSON
              </button>
            </div>
          </div>
        </BottomSheet>
      </AnimatePresence>

      {/* ═══ Import Bottom Sheet ═══ */}
      <AnimatePresence>
        <BottomSheet open={showImportSheet} onClose={() => setShowImportSheet(false)} title="Import Backup" subtitle="Restore from an encrypted backup" icon={Upload}>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider block mb-2">Select backup file</label>
              <label className="flex items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed border-[#EBEBEB] text-sm text-[#6B7C93] active:bg-[#FAFAFA] cursor-pointer">
                <Upload className="w-4 h-4" /> Choose .apb or .json file
                <input type="file" className="hidden" accept=".apb,.json" />
              </label>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider block mb-2">Passphrase</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D5D5D5]" />
                <input type="password" value={importPassphrase} onChange={(e) => setImportPassphrase(e.target.value)}
                  placeholder="Enter backup passphrase..."
                  className="w-full bg-white rounded-xl pl-10 pr-4 py-3 text-sm text-[#1E2532] outline-none placeholder:text-[#D5D5D5] border border-[#EBEBEB] focus:border-[#4A7AE5] transition-colors" />
              </div>
            </div>
            <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold bg-[#4A7AE5] text-white active:bg-[#3A6AD5] disabled:opacity-40"
              disabled={!importPassphrase}>
              <Lock className="w-3.5 h-3.5" /> Decrypt & Import
            </button>
          </div>
        </BottomSheet>
      </AnimatePresence>

      {/* ═══ Delete Confirmation Bottom Sheet ═══ */}
      <AnimatePresence>
        <BottomSheet open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Delete everything?" subtitle="This cannot be undone">
          <div className="space-y-4">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#EF4444]/5 border border-[#EF4444]/20">
              <AlertTriangle className="w-5 h-5 text-[#EF4444] flex-shrink-0" />
              <p className="text-xs text-[#6B7C93] leading-relaxed">All conversations, API key, highlights, notes, branches, and settings will be permanently removed.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-[#6B7C93] border border-[#EBEBEB] active:bg-[#FAFAFA]">
                Cancel
              </button>
              <button className="flex-1 py-3 rounded-xl text-sm font-semibold bg-[#EF4444] text-white active:bg-[#DC2626]">
                Delete Everything
              </button>
            </div>
          </div>
        </BottomSheet>
      </AnimatePresence>
    </div>
  );
}

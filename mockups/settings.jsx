import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key, Eye, EyeOff, CheckCircle, AlertCircle, ChevronDown, ChevronRight,
  Shield, Cpu, DollarSign, Sliders, Database, Download, Upload, Trash2,
  Sun, Moon, Info, ExternalLink, Github, HardDrive, Clock, Bell, BellOff,
  ArrowLeft, MessageSquare, X, AlertTriangle, FileJson, RefreshCw, Lock
} from 'lucide-react';

const SPRING_SNAPPY = { type: 'spring', stiffness: 500, damping: 30 };
const SPRING_SMOOTH = { type: 'spring', stiffness: 300, damping: 28 };
const SPRING_GENTLE = { type: 'spring', stiffness: 200, damping: 24 };
const staggerContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.08 } } };
const staggerItem = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: SPRING_SMOOTH } };

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
  { id: 'api', label: 'API Configuration', icon: Key },
  { id: 'model', label: 'Model Preferences', icon: Cpu },
  { id: 'usage', label: 'Usage & Spending', icon: DollarSign },
  { id: 'context', label: 'Context & Defaults', icon: Sliders },
  { id: 'data', label: 'Data & Backups', icon: Database },
  { id: 'appearance', label: 'Appearance', icon: Sun },
  { id: 'about', label: 'About & Security', icon: Shield },
];

/* ═══════════════════════════════════════════════════════════ */

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('api');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState(null); // null | 'validating' | 'valid' | 'invalid'
  const [storageMode, setStorageMode] = useState('persistent');
  const [selectedModel, setSelectedModel] = useState('sonnet');
  const [theme, setTheme] = useState('light');
  const [summaryDepth, setSummaryDepth] = useState('brief');
  const [contextThreshold, setContextThreshold] = useState(80);
  const [autoCompress, setAutoCompress] = useState('prompt');
  const [budgetAlert, setBudgetAlert] = useState(20);
  const [budgetEnabled, setBudgetEnabled] = useState(true);
  const [backupReminder, setBackupReminder] = useState('weekly');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [fontSize, setFontSize] = useState('default');
  const [spendingLimitDismissed, setSpendingLimitDismissed] = useState(false);
  const [spendingLimitConfirmed, setSpendingLimitConfirmed] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [exportPassphrase, setExportPassphrase] = useState('');
  const [exportConfirmPassphrase, setExportConfirmPassphrase] = useState('');
  const [importPassphrase, setImportPassphrase] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [exportStatus, setExportStatus] = useState(null); // null | 'encrypting' | 'done'
  const [importStatus, setImportStatus] = useState(null); // null | 'decrypting' | 'done' | 'error'

  const validateKey = () => {
    setKeyStatus('validating');
    setTimeout(() => setKeyStatus(apiKey.startsWith('sk-') ? 'valid' : 'invalid'), 1500);
  };

  const maskedKey = apiKey ? apiKey.slice(0, 7) + '•'.repeat(Math.max(0, apiKey.length - 11)) + apiKey.slice(-4) : '';

  return (
    <div className="flex h-screen font-sans overflow-hidden" style={{ backgroundColor: '#FFFFFF', color: '#1E2532' }}>
      {/* Left Navigation */}
      <motion.div
        initial={{ x: -260 }}
        animate={{ x: 0 }}
        transition={SPRING_SMOOTH}
        className="w-64 flex flex-col flex-shrink-0"
        style={{ borderRight: '1px solid #F0F0F0' }}
      >
        <div className="p-4">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING_SMOOTH, delay: 0.2 }}
            className="flex items-center gap-2"
          >
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-1.5 rounded hover:bg-[#EEEEEE] text-[#6B7C93] hover:text-[#1E2532] transition-colors"
              title="Back to Chats"
            >
              <ArrowLeft className="w-4 h-4" />
            </motion.button>
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
            const Icon = item.icon;
            const active = activeSection === item.id;
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
                <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-[#4A7AE5]' : ''}`} />
                <span className="truncate">{item.label}</span>
              </motion.button>
            );
          })}
        </motion.nav>

        {/* Storage info footer */}
        <div className="p-4 border-t border-[#F0F0F0]">
          <div className="flex items-center gap-2 text-[10px] text-[#6B7C93]">
            <HardDrive className="w-3 h-3 flex-shrink-0" />
            <span>Data stored locally via IndexedDB</span>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-10">
          <AnimatePresence mode="wait">
            {activeSection === 'api' && (
              <SettingsSection key="api" title="API Configuration" subtitle="Connect to the Anthropic API with your personal key">
                {/* API Key Input */}
                <SettingsCard>
                  <label className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider block mb-3">API Key</label>
                  <div className="flex items-stretch gap-2">
                    <div className="relative flex-1">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D5D5D5]" />
                      <input
                        type={showKey ? 'text' : 'password'}
                        value={apiKey}
                        onChange={(e) => { setApiKey(e.target.value); setKeyStatus(null); }}
                        placeholder="sk-ant-api03-..."
                        className="w-full bg-white rounded-lg pl-10 pr-10 py-2.5 text-sm text-[#1E2532] outline-none placeholder:text-[#D5D5D5] border border-[#EBEBEB] focus:border-[#4A7AE5] transition-colors font-mono"
                      />
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7C93] hover:text-[#1E2532] transition-colors"
                      >
                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </motion.button>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.03, borderColor: '#4A7AE5' }}
                      whileTap={{ scale: 0.97 }}
                      onClick={validateKey}
                      disabled={!apiKey || keyStatus === 'validating'}
                      className="px-4 rounded-lg text-xs font-semibold border border-[#EBEBEB] bg-white text-[#1E2532] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {keyStatus === 'validating' ? (
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                          <RefreshCw className="w-3.5 h-3.5" />
                        </motion.div>
                      ) : 'Validate'}
                    </motion.button>
                  </div>

                  {/* Validation feedback */}
                  <AnimatePresence>
                    {keyStatus === 'valid' && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={SPRING_SNAPPY} className="flex items-center gap-2 mt-3 text-xs text-[#22C55E]">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>API key is valid — connected to Anthropic</span>
                      </motion.div>
                    )}
                    {keyStatus === 'invalid' && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={SPRING_SNAPPY} className="flex items-center gap-2 mt-3 text-xs text-[#EF4444]">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Invalid key — check your key and try again</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </SettingsCard>

                {/* Storage Mode */}
                <SettingsCard>
                  <label className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider block mb-3">Key Storage</label>
                  <div className="space-y-2">
                    {STORAGE_MODES.map((mode) => {
                      const Icon = mode.icon;
                      const active = storageMode === mode.id;
                      return (
                        <motion.button
                          key={mode.id}
                          whileHover={{ x: 2 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => setStorageMode(mode.id)}
                          className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
                            active
                              ? 'border-[#4A7AE5] bg-[#4A7AE5]/5'
                              : 'border-[#EBEBEB] hover:border-[#D5D5D5]'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            active ? 'border-[#4A7AE5]' : 'border-[#D5D5D5]'
                          }`}>
                            {active && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={SPRING_SNAPPY} className="w-2 h-2 rounded-full bg-[#4A7AE5]" />}
                          </div>
                          <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-[#4A7AE5]' : 'text-[#6B7C93]'}`} />
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-semibold ${active ? 'text-[#1E2532]' : 'text-[#4A5568]'}`}>{mode.label}</div>
                            <div className="text-xs text-[#6B7C93]">{mode.description}</div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </SettingsCard>

                {/* Security notice */}
                <motion.div variants={staggerItem} className="flex items-start gap-3 px-4 py-3 bg-[#4A7AE5]/5 border border-[#4A7AE5]/15 rounded-lg">
                  <Shield className="w-4 h-4 text-[#4A7AE5] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[#1E2532] leading-relaxed">Your API key is stored locally in this browser and never sent to our servers. All API calls go directly from your browser to Anthropic. Your key is encrypted at rest using the Web Crypto API.</p>
                    <a href="#" className="text-xs text-[#4A7AE5] font-semibold mt-1 inline-flex items-center gap-1 hover:underline">
                      View source code <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </motion.div>

                {/* Anthropic spending limit recommendation */}
                <AnimatePresence>
                  {!spendingLimitDismissed && (
                    <motion.div
                      variants={staggerItem}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0, overflow: 'hidden' }}
                      transition={SPRING_SMOOTH}
                    >
                      <SettingsCard>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#E5A620]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <DollarSign className="w-4 h-4 text-[#E5A620]" />
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-[#1E2532] mb-1">Set a spending limit on your API key</h4>
                              <p className="text-xs text-[#6B7C93] leading-relaxed mb-3">We strongly recommend setting a monthly spending limit in your Anthropic dashboard. This protects you from unexpected charges if your key is ever compromised or if a conversation uses more tokens than expected.</p>
                              <div className="flex items-center gap-2">
                                <motion.a
                                  href="https://console.anthropic.com/settings/limits"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  whileHover={{ scale: 1.03, borderColor: '#4A7AE5' }}
                                  whileTap={{ scale: 0.97 }}
                                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border border-[#EBEBEB] bg-white text-[#1E2532] transition-colors"
                                >
                                  Open Anthropic Dashboard <ExternalLink className="w-3 h-3" />
                                </motion.a>
                                <motion.button
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => setSpendingLimitConfirmed(true)}
                                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                                    spendingLimitConfirmed
                                      ? 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20'
                                      : 'text-[#6B7C93] hover:text-[#1E2532] hover:bg-[#F5F5F5]'
                                  }`}
                                >
                                  {spendingLimitConfirmed ? (
                                    <><CheckCircle className="w-3 h-3" /> Done</>
                                  ) : (
                                    "I've set a limit"
                                  )}
                                </motion.button>
                              </div>
                            </div>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setSpendingLimitDismissed(true)}
                            className="p-1 rounded hover:bg-[#EEEEEE] text-[#6B7C93] hover:text-[#1E2532] transition-colors flex-shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </motion.button>
                        </div>
                      </SettingsCard>
                    </motion.div>
                  )}
                </AnimatePresence>
              </SettingsSection>
            )}

            {activeSection === 'model' && (
              <SettingsSection key="model" title="Model Preferences" subtitle="Choose your default Claude model">
                <SettingsCard>
                  <label className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider block mb-3">Default Model</label>
                  <div className="space-y-2">
                    {MODELS.map((model) => {
                      const active = selectedModel === model.id;
                      return (
                        <motion.button
                          key={model.id}
                          whileHover={{ x: 2 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => setSelectedModel(model.id)}
                          className={`w-full text-left px-4 py-4 rounded-lg border transition-colors ${
                            active
                              ? 'border-[#4A7AE5] bg-[#4A7AE5]/5'
                              : 'border-[#EBEBEB] hover:border-[#D5D5D5]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                active ? 'border-[#4A7AE5]' : 'border-[#D5D5D5]'
                              }`}>
                                {active && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={SPRING_SNAPPY} className="w-2 h-2 rounded-full bg-[#4A7AE5]" />}
                              </div>
                              <span className="text-sm font-semibold text-[#1E2532]">{model.name}</span>
                            </div>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              model.id === 'sonnet'
                                ? 'bg-[#4A7AE5]/10 text-[#4A7AE5]'
                                : model.id === 'haiku'
                                  ? 'bg-[#22C55E]/10 text-[#22C55E]'
                                  : 'bg-[#7C6CD4]/10 text-[#7C6CD4]'
                            }`}>{model.badge}</span>
                          </div>
                          <p className="text-xs text-[#6B7C93] mb-3 ml-6">{model.description}</p>
                          <div className="flex items-center gap-4 ml-6">
                            <div className="text-[10px] text-[#6B7C93]">Input: <span className="font-semibold text-[#4A5568]">{model.inputCost}/MTok</span></div>
                            <div className="text-[10px] text-[#6B7C93]">Output: <span className="font-semibold text-[#4A5568]">{model.outputCost}/MTok</span></div>
                            <div className="text-[10px] text-[#6B7C93]">Speed: <span className="font-semibold text-[#4A5568]">{model.speed}</span></div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </SettingsCard>

                <motion.div variants={staggerItem} className="flex items-start gap-3 px-4 py-3 bg-[#F5F5F5] border border-[#EBEBEB] rounded-lg">
                  <Info className="w-4 h-4 text-[#6B7C93] mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-[#6B7C93] leading-relaxed">You can override the default model per-conversation. Costs are billed directly by Anthropic to your API key.</p>
                </motion.div>
              </SettingsSection>
            )}

            {activeSection === 'usage' && (
              <SettingsSection key="usage" title="Usage & Spending" subtitle="Track token usage and manage your budget">
                {/* Usage overview */}
                <SettingsCard>
                  <label className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider block mb-3">This Month</label>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="px-3 py-3 bg-[#FAFAFA] border border-[#F0F0F0] rounded-lg">
                      <div className="text-[10px] text-[#6B7C93] mb-1">Total Tokens</div>
                      <div className="text-lg font-semibold text-[#1E2532]">1.2M</div>
                    </div>
                    <div className="px-3 py-3 bg-[#FAFAFA] border border-[#F0F0F0] rounded-lg">
                      <div className="text-[10px] text-[#6B7C93] mb-1">Conversations</div>
                      <div className="text-lg font-semibold text-[#1E2532]">34</div>
                    </div>
                    <div className="px-3 py-3 bg-[#FAFAFA] border border-[#F0F0F0] rounded-lg">
                      <div className="text-[10px] text-[#6B7C93] mb-1">Estimated Cost</div>
                      <div className="text-lg font-semibold text-[#1E2532]">$8.42</div>
                    </div>
                  </div>
                </SettingsCard>

                {/* Cost by model */}
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
                            <span className="text-[10px] text-[#6B7C93]">{row.tokens} tokens</span>
                            <span className="text-xs font-semibold text-[#1E2532]">{row.cost}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${row.pct}%` }}
                            transition={{ ...SPRING_GENTLE, delay: 0.3 }}
                            className="h-full rounded-full bg-[#4A7AE5]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </SettingsCard>

                {/* Budget alert */}
                <SettingsCard>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider">Budget Alert</label>
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
                          <span className="text-sm text-[#6B7C93]">Warn me at</span>
                          <div className="relative">
                            <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#D5D5D5]" />
                            <input
                              type="number"
                              value={budgetAlert}
                              onChange={(e) => setBudgetAlert(Number(e.target.value))}
                              className="w-24 bg-white rounded-lg pl-7 pr-3 py-2 text-sm text-[#1E2532] outline-none border border-[#EBEBEB] focus:border-[#4A7AE5] transition-colors"
                            />
                          </div>
                          <span className="text-sm text-[#6B7C93]">per month</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </SettingsCard>
              </SettingsSection>
            )}

            {activeSection === 'context' && (
              <SettingsSection key="context" title="Context & Defaults" subtitle="Control how conversations behave">
                {/* Summary depth */}
                <SettingsCard>
                  <div className="flex items-center gap-2 mb-3">
                    <label className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider">Default Summary Depth</label>
                    <InfoTooltip text="Brief summaries use highlights and notes only. Detailed summaries analyze full conversation content and use more tokens." />
                  </div>
                  <div className="flex gap-1 bg-white border border-[#EBEBEB] rounded-lg p-1 w-fit">
                    {['brief', 'detailed'].map((d) => (
                      <motion.button
                        key={d}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setSummaryDepth(d)}
                        className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors capitalize ${
                          summaryDepth === d ? 'bg-[#EEEEEE] text-[#1E2532]' : 'text-[#6B7C93] hover:text-[#1E2532]'
                        }`}
                      >
                        {d}
                      </motion.button>
                    ))}
                  </div>
                </SettingsCard>

                {/* Context warning threshold */}
                <SettingsCard>
                  <div className="flex items-center gap-2 mb-3">
                    <label className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider">Context Warning Threshold</label>
                    <InfoTooltip text="Show a warning in the context health meter when usage exceeds this percentage." />
                  </div>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min={50}
                      max={95}
                      step={5}
                      value={contextThreshold}
                      onChange={(e) => setContextThreshold(Number(e.target.value))}
                      className="flex-1 accent-[#4A7AE5]"
                    />
                    <span className="text-sm font-semibold text-[#1E2532] w-12 text-right">{contextThreshold}%</span>
                  </div>
                </SettingsCard>

                {/* Auto-compress */}
                <SettingsCard>
                  <div className="flex items-center gap-2 mb-3">
                    <label className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider">Auto-Compression</label>
                    <InfoTooltip text="When the context window fills up, compress older messages to make room for new ones." />
                  </div>
                  <div className="space-y-2">
                    {[
                      { id: 'prompt', label: 'Ask me first', description: 'Show a prompt before compressing' },
                      { id: 'auto', label: 'Automatic', description: 'Compress silently when threshold is reached' },
                      { id: 'off', label: 'Never', description: 'I\'ll manage context manually' },
                    ].map((opt) => {
                      const active = autoCompress === opt.id;
                      return (
                        <motion.button
                          key={opt.id}
                          whileHover={{ x: 2 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => setAutoCompress(opt.id)}
                          className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
                            active ? 'border-[#4A7AE5] bg-[#4A7AE5]/5' : 'border-[#EBEBEB] hover:border-[#D5D5D5]'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            active ? 'border-[#4A7AE5]' : 'border-[#D5D5D5]'
                          }`}>
                            {active && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={SPRING_SNAPPY} className="w-2 h-2 rounded-full bg-[#4A7AE5]" />}
                          </div>
                          <div>
                            <div className={`text-sm font-semibold ${active ? 'text-[#1E2532]' : 'text-[#4A5568]'}`}>{opt.label}</div>
                            <div className="text-xs text-[#6B7C93]">{opt.description}</div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </SettingsCard>
              </SettingsSection>
            )}

            {activeSection === 'data' && (
              <SettingsSection key="data" title="Data & Backups" subtitle="Your conversations live in this browser — keep them safe">
                {/* Backup status */}
                <SettingsCard>
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider">Backup Status</label>
                    <span className="text-[10px] text-[#6B7C93] bg-[#F5F5F5] px-2 py-0.5 rounded-full">12 conversations stored</span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3 bg-[#E5A620]/5 border border-[#E5A620]/20 rounded-lg mb-4">
                    <AlertTriangle className="w-4 h-4 text-[#E5A620] flex-shrink-0" />
                    <p className="text-xs text-[#4A5568] leading-relaxed">Last backup: <span className="font-semibold">Never</span> — We recommend exporting a backup regularly.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.03, borderColor: '#4A7AE5' }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { setShowExportModal(true); setExportPassphrase(''); setExportConfirmPassphrase(''); setExportStatus(null); }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold border border-[#EBEBEB] bg-white text-[#1E2532] transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export All
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.03, borderColor: '#4A7AE5' }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { setShowImportModal(true); setImportPassphrase(''); setImportFile(null); setImportStatus(null); }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold border border-[#EBEBEB] bg-white text-[#1E2532] transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Import Backup
                    </motion.button>
                  </div>
                </SettingsCard>

                {/* How encryption works */}
                <motion.div variants={staggerItem} className="flex items-start gap-3 px-4 py-3 bg-[#F5F5F5] border border-[#EBEBEB] rounded-lg">
                  <Lock className="w-4 h-4 text-[#6B7C93] mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-[#6B7C93] leading-relaxed">Exported backups are encrypted with a passphrase you choose. Without the passphrase, the backup file cannot be read — even by us. Store your passphrase somewhere safe, like a password manager.</p>
                </motion.div>

                {/* Export Modal */}
                <AnimatePresence>
                  {showExportModal && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-50 flex items-center justify-center p-6"
                      style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
                    >
                      <div className="absolute inset-0" onClick={() => setShowExportModal(false)} />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={SPRING_SMOOTH}
                        className="relative z-10 bg-white border border-[#EBEBEB] rounded-xl w-full max-w-md shadow-2xl shadow-black/10"
                      >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBEBEB]">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#4A7AE5]/10 flex items-center justify-center">
                              <Download className="w-4 h-4 text-[#4A7AE5]" />
                            </div>
                            <div>
                              <h3 className="text-sm font-semibold text-[#1E2532]">Export Backup</h3>
                              <p className="text-xs text-[#6B7C93]">Encrypt and download your data</p>
                            </div>
                          </div>
                          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowExportModal(false)} className="p-2 rounded-lg hover:bg-[#EEEEEE] text-[#6B7C93] hover:text-[#1E2532] transition-colors">
                            <X className="w-4 h-4" />
                          </motion.button>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                          <div>
                            <label className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider block mb-2">Create a passphrase</label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D5D5D5]" />
                              <input
                                type="password"
                                value={exportPassphrase}
                                onChange={(e) => setExportPassphrase(e.target.value)}
                                placeholder="Enter a passphrase..."
                                className="w-full bg-white rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#1E2532] outline-none placeholder:text-[#D5D5D5] border border-[#EBEBEB] focus:border-[#4A7AE5] transition-colors"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider block mb-2">Confirm passphrase</label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D5D5D5]" />
                              <input
                                type="password"
                                value={exportConfirmPassphrase}
                                onChange={(e) => setExportConfirmPassphrase(e.target.value)}
                                placeholder="Re-enter passphrase..."
                                className="w-full bg-white rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#1E2532] outline-none placeholder:text-[#D5D5D5] border border-[#EBEBEB] focus:border-[#4A7AE5] transition-colors"
                              />
                            </div>
                          </div>

                          {/* Passphrase match indicator */}
                          <AnimatePresence>
                            {exportPassphrase.length > 0 && exportConfirmPassphrase.length > 0 && (
                              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={SPRING_SNAPPY}>
                                {exportPassphrase === exportConfirmPassphrase ? (
                                  <div className="flex items-center gap-2 text-xs text-[#22C55E]">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    <span>Passphrases match</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-xs text-[#EF4444]">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    <span>Passphrases don't match</span>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Passphrase strength hint */}
                          {exportPassphrase.length > 0 && exportPassphrase.length < 8 && (
                            <p className="text-[10px] text-[#E5A620]">Use at least 8 characters for a strong passphrase.</p>
                          )}

                          {/* Export success */}
                          <AnimatePresence>
                            {exportStatus === 'done' && (
                              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={SPRING_SNAPPY} className="flex items-center gap-2 px-3 py-2.5 bg-[#22C55E]/5 border border-[#22C55E]/20 rounded-lg">
                                <CheckCircle className="w-4 h-4 text-[#22C55E] flex-shrink-0" />
                                <div>
                                  <p className="text-xs font-semibold text-[#1E2532]">Backup exported</p>
                                  <p className="text-[10px] text-[#6B7C93]">Store this file and your passphrase somewhere safe.</p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <div className="flex items-center justify-between px-6 py-4 border-t border-[#EBEBEB]">
                          <p className="text-[10px] text-[#6B7C93]">12 conversations, ~2.4 MB</p>
                          <motion.button
                            whileHover={{ scale: 1.02, opacity: 0.9 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={!exportPassphrase || exportPassphrase !== exportConfirmPassphrase || exportPassphrase.length < 4 || exportStatus === 'encrypting'}
                            onClick={() => { setExportStatus('encrypting'); setTimeout(() => setExportStatus('done'), 1500); }}
                            className="px-5 py-2 rounded-lg text-xs font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                            style={{ backgroundColor: '#1E2532' }}
                          >
                            {exportStatus === 'encrypting' ? (
                              <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><RefreshCw className="w-3.5 h-3.5" /></motion.div> Encrypting...</>
                            ) : exportStatus === 'done' ? (
                              <><CheckCircle className="w-3.5 h-3.5" /> Downloaded</>
                            ) : (
                              <><Lock className="w-3.5 h-3.5" /> Encrypt & Download</>
                            )}
                          </motion.button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Import Modal */}
                <AnimatePresence>
                  {showImportModal && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-50 flex items-center justify-center p-6"
                      style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
                    >
                      <div className="absolute inset-0" onClick={() => setShowImportModal(false)} />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={SPRING_SMOOTH}
                        className="relative z-10 bg-white border border-[#EBEBEB] rounded-xl w-full max-w-md shadow-2xl shadow-black/10"
                      >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBEBEB]">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#7C6CD4]/10 flex items-center justify-center">
                              <Upload className="w-4 h-4 text-[#7C6CD4]" />
                            </div>
                            <div>
                              <h3 className="text-sm font-semibold text-[#1E2532]">Import Backup</h3>
                              <p className="text-xs text-[#6B7C93]">Restore from an encrypted backup</p>
                            </div>
                          </div>
                          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowImportModal(false)} className="p-2 rounded-lg hover:bg-[#EEEEEE] text-[#6B7C93] hover:text-[#1E2532] transition-colors">
                            <X className="w-4 h-4" />
                          </motion.button>
                        </div>
                        <div className="px-6 py-5 space-y-4">
                          {/* File drop zone */}
                          <div>
                            <label className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider block mb-2">Backup file</label>
                            <motion.div
                              whileHover={{ borderColor: '#4A7AE5' }}
                              className={`relative border-2 border-dashed rounded-lg px-4 py-6 text-center transition-colors cursor-pointer ${
                                importFile ? 'border-[#22C55E] bg-[#22C55E]/5' : 'border-[#EBEBEB] hover:bg-[#FAFAFA]'
                              }`}
                              onClick={() => { if (!importFile) setImportFile('apollo-backup-2025-02-27.apb'); }}
                            >
                              {importFile ? (
                                <div className="flex items-center justify-center gap-2">
                                  <FileJson className="w-4 h-4 text-[#22C55E]" />
                                  <span className="text-xs font-semibold text-[#1E2532]">{importFile}</span>
                                  <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={(e) => { e.stopPropagation(); setImportFile(null); setImportStatus(null); }}
                                    className="p-0.5 rounded hover:bg-[#EEEEEE] text-[#6B7C93]"
                                  >
                                    <X className="w-3 h-3" />
                                  </motion.button>
                                </div>
                              ) : (
                                <div>
                                  <Upload className="w-5 h-5 text-[#D5D5D5] mx-auto mb-2" />
                                  <p className="text-xs text-[#6B7C93]">Click to select a backup file</p>
                                  <p className="text-[10px] text-[#D5D5D5] mt-1">.apb (Apollo Backup)</p>
                                </div>
                              )}
                            </motion.div>
                          </div>

                          {/* Passphrase input */}
                          <div>
                            <label className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider block mb-2">Passphrase</label>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D5D5D5]" />
                              <input
                                type="password"
                                value={importPassphrase}
                                onChange={(e) => { setImportPassphrase(e.target.value); setImportStatus(null); }}
                                placeholder="Enter the passphrase used during export..."
                                className="w-full bg-white rounded-lg pl-10 pr-4 py-2.5 text-sm text-[#1E2532] outline-none placeholder:text-[#D5D5D5] border border-[#EBEBEB] focus:border-[#4A7AE5] transition-colors"
                              />
                            </div>
                          </div>

                          {/* Import status */}
                          <AnimatePresence>
                            {importStatus === 'done' && (
                              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={SPRING_SNAPPY} className="flex items-center gap-2 px-3 py-2.5 bg-[#22C55E]/5 border border-[#22C55E]/20 rounded-lg">
                                <CheckCircle className="w-4 h-4 text-[#22C55E] flex-shrink-0" />
                                <div>
                                  <p className="text-xs font-semibold text-[#1E2532]">Import complete</p>
                                  <p className="text-[10px] text-[#6B7C93]">12 conversations restored successfully.</p>
                                </div>
                              </motion.div>
                            )}
                            {importStatus === 'error' && (
                              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={SPRING_SNAPPY} className="flex items-center gap-2 px-3 py-2.5 bg-[#EF4444]/5 border border-[#EF4444]/20 rounded-lg">
                                <AlertCircle className="w-4 h-4 text-[#EF4444] flex-shrink-0" />
                                <div>
                                  <p className="text-xs font-semibold text-[#1E2532]">Decryption failed</p>
                                  <p className="text-[10px] text-[#6B7C93]">Wrong passphrase or corrupted file. Please try again.</p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* What happens on import */}
                          <div className="flex items-start gap-2 px-3 py-2 bg-[#F5F5F5] rounded-lg">
                            <Info className="w-3.5 h-3.5 text-[#6B7C93] mt-0.5 flex-shrink-0" />
                            <p className="text-[10px] text-[#6B7C93] leading-relaxed">Importing will merge conversations with your existing data. Duplicates will be skipped. Your current conversations won't be overwritten.</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#EBEBEB]">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setShowImportModal(false)}
                            className="px-4 py-2 rounded-lg text-xs font-semibold text-[#6B7C93] hover:text-[#1E2532] hover:bg-[#EEEEEE] transition-colors"
                          >
                            Cancel
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.02, opacity: 0.9 }}
                            whileTap={{ scale: 0.98 }}
                            disabled={!importFile || !importPassphrase || importStatus === 'decrypting'}
                            onClick={() => { setImportStatus('decrypting'); setTimeout(() => setImportStatus(importPassphrase.length > 3 ? 'done' : 'error'), 1500); }}
                            className="px-5 py-2 rounded-lg text-xs font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                            style={{ backgroundColor: '#1E2532' }}
                          >
                            {importStatus === 'decrypting' ? (
                              <><motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><RefreshCw className="w-3.5 h-3.5" /></motion.div> Decrypting...</>
                            ) : importStatus === 'done' ? (
                              <><CheckCircle className="w-3.5 h-3.5" /> Imported</>
                            ) : (
                              <><Lock className="w-3.5 h-3.5" /> Decrypt & Import</>
                            )}
                          </motion.button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Backup reminder */}
                <SettingsCard>
                  <div className="flex items-center gap-2 mb-3">
                    <label className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider">Backup Reminders</label>
                    <InfoTooltip text="A gentle nudge on the Chats page when it's time to export a backup." />
                  </div>
                  <div className="flex gap-1 bg-white border border-[#EBEBEB] rounded-lg p-1 w-fit">
                    {[
                      { id: 'weekly', label: 'Weekly' },
                      { id: 'biweekly', label: 'Biweekly' },
                      { id: 'never', label: 'Never' },
                    ].map((opt) => (
                      <motion.button
                        key={opt.id}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setBackupReminder(opt.id)}
                        className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                          backupReminder === opt.id ? 'bg-[#EEEEEE] text-[#1E2532]' : 'text-[#6B7C93] hover:text-[#1E2532]'
                        }`}
                      >
                        {opt.label}
                      </motion.button>
                    ))}
                  </div>
                </SettingsCard>

                {/* Why local storage */}
                <motion.div variants={staggerItem} className="flex items-start gap-3 px-4 py-3 bg-[#4A7AE5]/5 border border-[#4A7AE5]/15 rounded-lg">
                  <Shield className="w-4 h-4 text-[#4A7AE5] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-[#1E2532] mb-1">Why local storage?</p>
                    <p className="text-xs text-[#6B7C93] leading-relaxed">Your conversations are stored in your browser's IndexedDB — not on our servers. This means your data stays completely private, but it also means clearing browser data will remove it. Regular backups ensure you never lose your work.</p>
                  </div>
                </motion.div>

                {/* Danger zone */}
                <SettingsCard danger>
                  <label className="text-xs font-semibold text-[#EF4444] uppercase tracking-wider block mb-3">Danger Zone</label>
                  <p className="text-xs text-[#6B7C93] mb-4">This permanently deletes all conversations, highlights, notes, branches, and settings from this browser. This cannot be undone.</p>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold border border-[#EF4444]/30 bg-[#EF4444]/5 text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete All Local Data
                  </motion.button>
                </SettingsCard>

                {/* Delete confirmation modal */}
                <AnimatePresence>
                  {showDeleteConfirm && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-50 flex items-center justify-center p-6"
                      style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}
                    >
                      <div className="absolute inset-0" onClick={() => setShowDeleteConfirm(false)} />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={SPRING_SMOOTH}
                        className="relative z-10 bg-white border border-[#EBEBEB] rounded-xl w-full max-w-sm p-6 shadow-2xl shadow-black/10"
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-lg bg-[#EF4444]/10 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-[#1E2532]">Delete everything?</h3>
                            <p className="text-xs text-[#6B7C93]">This cannot be undone</p>
                          </div>
                        </div>
                        <p className="text-xs text-[#6B7C93] leading-relaxed mb-5">All conversations, API key, highlights, notes, branches, and settings will be permanently removed from this browser.</p>
                        <div className="flex items-center justify-end gap-2">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setShowDeleteConfirm(false)}
                            className="px-4 py-2 rounded-lg text-xs font-semibold text-[#6B7C93] hover:text-[#1E2532] hover:bg-[#EEEEEE] transition-colors"
                          >
                            Cancel
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#EF4444] text-white hover:bg-[#DC2626] transition-colors"
                          >
                            Delete Everything
                          </motion.button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </SettingsSection>
            )}

            {activeSection === 'appearance' && (
              <SettingsSection key="appearance" title="Appearance" subtitle="Customize how the interface looks">
                {/* Theme */}
                <SettingsCard>
                  <label className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider block mb-3">Theme</label>
                  <div className="flex gap-3">
                    {[
                      { id: 'light', label: 'Light', icon: Sun },
                      { id: 'dark', label: 'Dark', icon: Moon },
                    ].map((t) => {
                      const Icon = t.icon;
                      const active = theme === t.id;
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
                      );
                    })}
                  </div>
                </SettingsCard>

                {/* Font size */}
                <SettingsCard>
                  <label className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider block mb-3">Text Size</label>
                  <div className="flex gap-1 bg-white border border-[#EBEBEB] rounded-lg p-1 w-fit">
                    {[
                      { id: 'compact', label: 'Compact' },
                      { id: 'default', label: 'Default' },
                      { id: 'large', label: 'Large' },
                    ].map((size) => (
                      <motion.button
                        key={size.id}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setFontSize(size.id)}
                        className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                          fontSize === size.id ? 'bg-[#EEEEEE] text-[#1E2532]' : 'text-[#6B7C93] hover:text-[#1E2532]'
                        }`}
                      >
                        {size.label}
                      </motion.button>
                    ))}
                  </div>
                </SettingsCard>
              </SettingsSection>
            )}

            {activeSection === 'about' && (
              <SettingsSection key="about" title="About & Security" subtitle="How this app works and keeps your data safe">
                <SettingsCard>
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
                  <p className="text-xs text-[#6B7C93] leading-relaxed mb-4">A power-user chat interface for AI. Built with React, Framer Motion, and Tailwind CSS. Open source and community-driven.</p>
                  <motion.a
                    href="#"
                    whileHover={{ scale: 1.02, borderColor: '#4A7AE5' }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold border border-[#EBEBEB] bg-white text-[#1E2532] transition-colors"
                  >
                    <Github className="w-3.5 h-3.5" />
                    View on GitHub
                  </motion.a>
                </SettingsCard>

                {/* Security model */}
                <SettingsCard>
                  <label className="text-xs font-semibold text-[#6B7C93] uppercase tracking-wider block mb-4">How Your Data Stays Private</label>
                  <div className="space-y-4">
                    {[
                      { title: 'No servers, no accounts', text: 'This app runs entirely in your browser. There is no backend server, no database, and no user accounts. Nothing is transmitted anywhere except directly to Anthropic\'s API when you send a message.' },
                      { title: 'API key stays local and encrypted', text: 'Your Anthropic API key is encrypted at rest using the Web Crypto API (AES-GCM) with a non-extractable key before being stored in IndexedDB. Even scripts running on the page cannot export the raw encryption key.' },
                      { title: 'Conversations stay local', text: 'All conversation data — messages, branches, highlights, notes — lives in your browser\'s IndexedDB. We have no way to see, access, or recover it.' },
                      { title: 'Open source & auditable', text: 'The entire codebase is on GitHub. You can verify every network request, every storage call, and every line of code yourself.' },
                    ].map((item, i) => (
                      <div key={i}>
                        <h4 className="text-xs font-semibold text-[#1E2532] mb-1">{item.title}</h4>
                        <p className="text-xs text-[#6B7C93] leading-relaxed">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </SettingsCard>
              </SettingsSection>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */

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
        {React.Children.map(children, (child) => (
          <motion.div variants={staggerItem}>{child}</motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}

function SettingsCard({ children, danger = false }) {
  return (
    <div className={`px-5 py-4 rounded-xl border ${
      danger ? 'border-[#EF4444]/20 bg-[#EF4444]/[0.02]' : 'border-[#EBEBEB] bg-white'
    }`}>
      {children}
    </div>
  );
}

function InfoTooltip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <Info className="w-3.5 h-3.5 text-[#6B7C93] cursor-help" />
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-1/2 -translate-x-1/2 top-6 w-56 px-3 py-2 bg-white border border-[#EBEBEB] rounded-lg shadow-lg z-10"
          >
            <p className="text-[10px] text-[#6B7C93] leading-relaxed">{text}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ToggleSwitch({ enabled, onToggle }) {
  return (
    <motion.button
      onClick={onToggle}
      className="relative w-9 h-5 rounded-full transition-colors"
      style={{ backgroundColor: enabled ? '#4A7AE5' : '#D5D5D5' }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        animate={{ x: enabled ? 18 : 2 }}
        transition={SPRING_SNAPPY}
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
      />
    </motion.button>
  );
}

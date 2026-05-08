/**
 * Climate Safety Assistant Component
 *
 * Chat interface with a toggleable AI mode selector sidebar.
 * Supports: Offline (rule-based), Groq (free cloud), Ollama (AMD GPU/local)
 * API keys entered in the sidebar are saved to localStorage and sent with each request.
 * Terminal mode: green-on-black hacker aesthetic with typewriter effect.
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Bot, User, Sparkles, Cpu, Cloud, Zap,
  Settings, X, CheckCircle, AlertCircle, Eye, EyeOff,
  Key, Trash2, ExternalLink, Wifi, Loader, Terminal,
} from 'lucide-react';
import { apiFetch } from '../utils/helpers';

const quickQuestions = [
  'Is it safe to travel to Sydney this week?',
  'What should I pack for Tokyo earthquake emergency kit?',
  "What's causing the wildfires in California?",
  'Give me a 72-hour survival plan for a hurricane',
];

const MODES = [
  {
    id: 'offline',
    label: 'Rule-Based',
    sublabel: 'No API key needed',
    icon: Zap,
    color: 'text-slate-300',
    activeColor: 'text-white',
    border: 'border-slate-600/40',
    activeBorder: 'border-slate-400/60',
    bg: 'bg-slate-800/40',
    activeBg: 'bg-slate-700/60',
    description: 'Deterministic tool planner. Always works, zero cost, no key required.',
    requiresKey: false,
  },
  {
    id: 'groq',
    label: 'Groq AI',
    sublabel: 'Free cloud · Llama 3',
    icon: Cloud,
    color: 'text-green-400',
    activeColor: 'text-green-300',
    border: 'border-green-700/30',
    activeBorder: 'border-green-400/60',
    bg: 'bg-green-950/30',
    activeBg: 'bg-green-900/40',
    description: 'Fast LLM via Groq cloud. Free API key at console.groq.com.',
    requiresKey: true,
    storageKey: 'cg_groq_key',
    keyPlaceholder: 'gsk_••••••••••••••••',
    setupUrl: 'https://console.groq.com',
  },
  {
    id: 'ollama',
    label: 'Ollama · AMD GPU',
    sublabel: 'Qwen 2.5 72B · MI300X',
    icon: Cpu,
    color: 'text-orange-400',
    activeColor: 'text-orange-300',
    border: 'border-orange-700/30',
    activeBorder: 'border-orange-400/60',
    bg: 'bg-orange-950/30',
    activeBg: 'bg-orange-900/40',
    description: 'Qwen 2.5 72B running on AMD MI300X via ROCm. Set OLLAMA_BASE_URL in your server env.',
    requiresKey: false,
    setupUrl: 'https://ollama.com',
  },
];

function loadKeys() {
  try {
    return { groq: localStorage.getItem('cg_groq_key') || '' };
  } catch { return { groq: '' }; }
}

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello! I'm ClimateGuard AI Assistant. Ask me anything about climate safety, disaster preparedness, or risk assessment for any location." },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverMode, setServerMode] = useState('offline');
  const [selectedMode, setSelectedMode] = useState('offline');
  const [available, setAvailable] = useState({ offline: true, groq: false, ollama: true });
  const [showSidebar, setShowSidebar] = useState(false);
  const [terminalMode, setTerminalMode] = useState(false);
  const [typewriterIdx, setTypewriterIdx] = useState({});
  const [ollamaStatus, setOllamaStatus] = useState(null);
  const [ollamaChecking, setOllamaChecking] = useState(false);

  const [userKeys, setUserKeys] = useState(loadKeys);
  const [keyInputs, setKeyInputs] = useState({ groq: '' });
  const [showKey, setShowKey] = useState({ groq: false });
  const [expandedKey, setExpandedKey] = useState(null);
  const [keySaved, setKeySaved] = useState({ groq: false });
  const [testStatus, setTestStatus] = useState({ groq: null });

  const chatEnd = useRef(null);

  useEffect(() => {
    apiFetch('/api/mcp/mode').then(data => {
      if (data?.mode) { setServerMode(data.mode); }
      if (data?.available) {
        setAvailable(prev => ({
          ...data.available,
          groq: data.available.groq || !!loadKeys().groq,
        }));
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const testKey = async (modeId, key) => {
    const k = key || userKeys[modeId];
    if (!k) return;
    setTestStatus(prev => ({ ...prev, [modeId]: 'testing' }));
    try {
      const data = await apiFetch('/api/mcp/test-key', {
        method: 'POST',
        body: JSON.stringify({ mode: modeId, apiKey: k }),
      });
      setTestStatus(prev => ({ ...prev, [modeId]: data?.ok ? 'ok' : `error:${data?.error || 'Failed'}` }));
      if (data?.ok) {
        setAvailable(prev => ({ ...prev, [modeId]: true }));
      }
    } catch {
      setTestStatus(prev => ({ ...prev, [modeId]: 'error:Connection failed' }));
    }
    setTimeout(() => setTestStatus(prev => ({ ...prev, [modeId]: null })), 6000);
  };

  const saveKey = (modeId, key) => {
    const trimmed = key.trim();
    if (!trimmed) return;
    try { localStorage.setItem(`cg_${modeId}_key`, trimmed); } catch {}
    setUserKeys(prev => ({ ...prev, [modeId]: trimmed }));
    setAvailable(prev => ({ ...prev, [modeId]: true }));
    setKeySaved(prev => ({ ...prev, [modeId]: true }));
    setTimeout(() => setKeySaved(prev => ({ ...prev, [modeId]: false })), 2000);
    setExpandedKey(null);
  };

  const clearKey = (modeId) => {
    try { localStorage.removeItem(`cg_${modeId}_key`); } catch {}
    setUserKeys(prev => ({ ...prev, [modeId]: '' }));
    setKeyInputs(prev => ({ ...prev, [modeId]: '' }));
    setAvailable(prev => ({ ...prev, [modeId]: false }));
  };

  const checkOllama = async () => {
    setOllamaChecking(true);
    setOllamaStatus(null);
    try {
      const data = await apiFetch('/api/mcp/ollama/status');
      setOllamaStatus(data);
    } catch {
      setOllamaStatus({ running: false, error: 'Could not reach server', hint: 'Run: npm run dev:amd' });
    } finally {
      setOllamaChecking(false);
    }
  };

  const handleModeClick = (mode) => {
    setSelectedMode(mode.id);
    if (mode.requiresKey && !userKeys[mode.id]) {
      setExpandedKey(expandedKey === mode.id ? null : mode.id);
    } else {
      setExpandedKey(null);
    }
  };

  const extractCity = (text) => {
    const patterns = [
      /(?:in|to|for|about|around)\s+([A-Za-zÀ-ÿ'\- ]{2,50})(?:\?|\.|,|$)/i,
      /^([A-Za-zÀ-ÿ'\- ]{2,50})(?:\?|\.|,|$)/i,
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m?.[1]) return m[1].trim();
    }
    return null;
  };

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    setMessages(prev => [...prev, { role: 'user', content: text.trim() }]);
    setInput('');
    setLoading(true);

    try {
      const city = extractCity(text.trim());
      let context = null;
      if (city) {
        const [r] = await Promise.allSettled([
          apiFetch('/api/risk', { method: 'POST', body: JSON.stringify({ location: city }) }),
        ]);
        if (r.status === 'fulfilled' && r.value) {
          const risk = r.value;
          context = {
            location: { name: risk.location?.name || city, overall: risk.overall, riskLevel: risk.riskLevel?.level, dominant: risk.dominant },
            summary: `Dominant hazard: ${risk.dominant || 'unknown'}. Overall risk is ${risk.riskLevel?.level || 'UNKNOWN'}.`,
          };
        }
      }

      const mcp = await apiFetch('/api/mcp/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: text.trim(),
          context,
          mode: selectedMode,
          apiKey: userKeys[selectedMode] || undefined,
        }),
      });

      if (mcp && (mcp.answer || mcp.response || mcp.reply)) {
        const content = mcp.answer || mcp.response || mcp.reply || '';
        setMessages(prev => [...prev, { role: 'assistant', content, toolTrace: mcp.toolTrace || null, source: mcp.source }]);
      } else {
        const data = await apiFetch('/api/chat', {
          method: 'POST',
          body: JSON.stringify({ message: text.trim(), context }),
        });
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      }
    } catch (err) {
      console.error('Assistant send error:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const activeMeta = MODES.find(m => m.id === selectedMode) || MODES[0];
  const ActiveIcon = activeMeta.icon;

  return (
    <div className={`flex gap-4 h-[calc(100vh-120px)] max-w-5xl mx-auto transition-colors duration-300 ${terminalMode ? 'font-mono' : ''}`}>

      {/* ── Chat panel ── */}
      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-4 px-1">
          {terminalMode
            ? <Terminal className="w-5 h-5 text-green-400 shrink-0" />
            : <Sparkles className="w-5 h-5 text-blue-400 shrink-0" />}
          <h2 className={`text-lg font-bold ${terminalMode ? 'text-green-400' : 'text-slate-200'}`}>
            {terminalMode ? '> climateguard_ai_v1' : 'AI Safety Assistant'}
          </h2>
          <span className={`flex items-center gap-1 px-2 py-0.5 ${activeMeta.activeBg} border ${activeMeta.activeBorder} rounded-full text-[10px] ${activeMeta.activeColor}`}>
            <ActiveIcon className="w-3 h-3" />
            {activeMeta.label}
          </span>
          <div className="flex-1" />
          <button
            onClick={() => setTerminalMode(v => !v)}
            title="Toggle terminal mode"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
              terminalMode
                ? 'bg-green-900/40 border-green-500/50 text-green-300'
                : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-600'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowSidebar(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all ${
              showSidebar
                ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-slate-200 hover:border-slate-600'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            AI Mode
          </button>
        </div>

        <div className={`flex-1 overflow-y-auto rounded-xl border p-4 space-y-4 mb-4 transition-all duration-300 ${
          terminalMode
            ? 'border-green-800/60 bg-black/90 backdrop-blur-md'
            : 'border-slate-700/50 bg-slate-900/50 backdrop-blur-md'
        }`}>
          {terminalMode && (
            <div className="text-green-600 text-xs font-mono border-b border-green-900/40 pb-2 mb-2">
              ClimateGuard AI Terminal v1.0 — AMD MI300X Backend — Type your query below
              <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity }}>_</motion.span>
            </div>
          )}
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className={terminalMode ? 'block' : `flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'flex-col'}`}
              >
                {terminalMode ? (
                  <div className="text-xs leading-relaxed">
                    <span className={msg.role === 'user' ? 'text-cyan-400' : 'text-green-500'}>
                      {msg.role === 'user' ? '$ user > ' : '> system < '}
                    </span>
                    <span className={msg.role === 'user' ? 'text-cyan-200' : 'text-green-300'}>
                      {msg.content}
                    </span>
                    {msg.toolTrace && (
                      <div className="mt-1 pl-4 text-green-700 text-[10px]">
                        {msg.toolTrace.map((t, idx) => (
                          <div key={idx}>[TOOL: {t.tool}] args={JSON.stringify(t.arguments || {})}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {msg.role === 'assistant' ? (
                      <>
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                            <Bot className="w-4 h-4 text-blue-400" />
                          </div>
                          <div className="max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed bg-slate-800/80 text-slate-300 border border-slate-700/30">
                            {msg.content}
                            {msg.source && msg.source !== 'offline-agent' && (
                              <div className="mt-1 text-[10px] text-slate-600">via {msg.source}</div>
                            )}
                          </div>
                        </div>
                        {msg.toolTrace && (
                          <div className="ml-11 max-w-[85%] rounded-md px-3 py-2 text-xs text-slate-300 bg-slate-800/70 border border-slate-700/30">
                            <div className="font-medium text-slate-200 mb-1">Tool Trace</div>
                            {Array.isArray(msg.toolTrace) ? msg.toolTrace.map((t, idx) => (
                              <div key={idx} className="mb-2">
                                <div className="text-xs text-blue-300">{t.tool}</div>
                                <div className="text-[11px] text-slate-400 break-words">Args: {JSON.stringify(t.arguments || t.args || {}, null, 0)}</div>
                                {t.result && <div className="text-[11px] text-slate-400 mt-1">Result: {typeof t.result === 'string' ? t.result.slice(0, 200) : JSON.stringify(t.result).slice(0, 200)}</div>}
                              </div>
                            )) : <pre className="text-[11px] text-slate-400">{JSON.stringify(msg.toolTrace, null, 2)}</pre>}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed bg-blue-600 text-white">{msg.content}</div>
                        <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-slate-400" />
                        </div>
                      </>
                    )}
                  </>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            terminalMode ? (
              <div className="text-green-600 text-xs font-mono">
                {'> system < '}
                <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.6, repeat: Infinity }}>
                  processing...
                </motion.span>
              </div>
            ) : (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-blue-400" />
                </div>
                <div className="bg-slate-800/80 border border-slate-700/30 rounded-xl px-4 py-3 flex gap-1 items-center">
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )
          )}
          <div ref={chatEnd} />
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {quickQuestions.map(q => (
            <button key={q} onClick={() => sendMessage(q)}
              className={`px-2.5 py-1 border rounded-full text-[11px] transition-colors ${
                terminalMode
                  ? 'bg-black/50 border-green-900/50 text-green-600 hover:text-green-400 hover:border-green-700 font-mono'
                  : 'bg-slate-800/50 hover:bg-slate-700/50 border-slate-700/50 text-slate-400 hover:text-slate-200'
              }`}
            >{terminalMode ? `> ${q}` : q}</button>
          ))}
        </div>

        <form onSubmit={e => { e.preventDefault(); sendMessage(input); }} className="flex gap-2">
          {terminalMode && <span className="self-center text-green-500 text-sm font-mono shrink-0">$</span>}
          <input
            type="text" value={input} onChange={e => setInput(e.target.value)}
            placeholder={terminalMode ? 'enter query...' : 'Ask me anything about climate safety...'}
            className={`flex-1 px-4 py-2.5 border rounded-xl text-sm outline-none transition-all ${
              terminalMode
                ? 'bg-black/80 border-green-800/60 text-green-300 placeholder-green-900 focus:border-green-600 font-mono'
                : 'bg-slate-800/50 border-slate-700/50 text-slate-200 placeholder-slate-600 focus:border-blue-500/50'
            }`}
          />
          <button type="submit" disabled={loading || !input.trim()}
            className={`px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50 ${
              terminalMode ? 'bg-green-700 hover:bg-green-600 text-black font-mono font-bold' : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}>
            {terminalMode ? '>' : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>

      {/* ── AI Mode Sidebar ── */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ opacity: 0, x: 24, width: 0 }}
            animate={{ opacity: 1, x: 0, width: 280 }}
            exit={{ opacity: 0, x: 24, width: 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 overflow-hidden"
          >
            <div className="flex flex-col h-full" style={{ width: 280 }}>

              {/* Sidebar header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-200">AI Engine</span>
                </div>
                <button onClick={() => setShowSidebar(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mb-3 px-3 py-2 rounded-lg bg-slate-800/40 border border-slate-700/30 text-[11px] text-slate-500">
                Server default: <span className="text-slate-300 font-medium capitalize">{serverMode}</span>
                <span className="text-slate-600"> · your choice overrides per-session</span>
              </div>

              {/* Mode cards */}
              <div className="flex flex-col gap-2 flex-1 overflow-y-auto pr-0.5">
                {MODES.map(mode => {
                  const Icon = mode.icon;
                  const isActive = selectedMode === mode.id;
                  const hasKey = !!userKeys[mode.id];
                  const isReady = available[mode.id] || hasKey;
                  const isExpanded = expandedKey === mode.id;

                  return (
                    <div key={mode.id}
                      className={`rounded-xl border transition-all ${isActive ? `${mode.activeBg} ${mode.activeBorder}` : `${mode.bg} ${mode.border}`}`}
                    >
                      {/* Card header — div so nested buttons stay valid */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => handleModeClick(mode)}
                        onKeyDown={e => e.key === 'Enter' && handleModeClick(mode)}
                        className="w-full text-left p-3 cursor-pointer"
                      >
                        <div className="flex items-start gap-2.5">
                          <div className={`mt-0.5 p-1.5 rounded-lg ${isActive ? mode.activeBg : 'bg-slate-800/60'}`}>
                            <Icon className={`w-4 h-4 ${isActive ? mode.activeColor : mode.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`text-sm font-semibold ${isActive ? mode.activeColor : mode.color}`}>{mode.label}</span>
                              {isActive && <span className="px-1.5 py-0.5 bg-white/10 rounded text-[9px] text-white/70 font-medium">ACTIVE</span>}
                            </div>
                            <div className="text-[11px] text-slate-500 mb-1">{mode.sublabel}</div>
                            <div className="text-[11px] text-slate-400 leading-relaxed">{mode.description}</div>

                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {isReady ? (
                                <span className="flex items-center gap-1 text-[10px] text-green-400">
                                  <CheckCircle className="w-3 h-3" /> Ready
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-[10px] text-amber-400">
                                  <AlertCircle className="w-3 h-3" /> API key needed
                                </span>
                              )}
                              {mode.requiresKey && hasKey && (
                                <button
                                  onClick={e => { e.stopPropagation(); clearKey(mode.id); }}
                                  className="flex items-center gap-0.5 text-[10px] text-slate-500 hover:text-red-400 transition-colors ml-auto"
                                >
                                  <Trash2 className="w-3 h-3" /> Clear key
                                </button>
                              )}
                              {mode.requiresKey && !hasKey && mode.setupUrl && (
                                <a href={mode.setupUrl} target="_blank" rel="noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="flex items-center gap-0.5 text-[10px] text-blue-400 hover:text-blue-300 ml-auto"
                                >
                                  Get free key <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* API key input panel — expands inline */}
                      <AnimatePresence>
                        {mode.requiresKey && isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="overflow-hidden"
                          >
                            <div className="px-3 pb-3 pt-0 border-t border-white/5">
                              <div className="flex items-center gap-1.5 mb-2 mt-2">
                                <Key className={`w-3 h-3 ${mode.color}`} />
                                <span className={`text-[11px] font-medium ${mode.color}`}>Enter your API key</span>
                              </div>
                              <div className="relative flex items-center">
                                <input
                                  type={showKey[mode.id] ? 'text' : 'password'}
                                  value={keyInputs[mode.id] || ''}
                                  onChange={e => setKeyInputs(prev => ({ ...prev, [mode.id]: e.target.value }))}
                                  onKeyDown={e => { if (e.key === 'Enter') saveKey(mode.id, keyInputs[mode.id]); }}
                                  placeholder={mode.keyPlaceholder}
                                  className="w-full pr-8 pl-3 py-2 bg-slate-900/60 border border-slate-600/40 rounded-lg text-[11px] text-slate-200 placeholder-slate-600 outline-none focus:border-slate-500/60 font-mono"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowKey(prev => ({ ...prev, [mode.id]: !prev[mode.id] }))}
                                  className="absolute right-2 text-slate-500 hover:text-slate-300"
                                >
                                  {showKey[mode.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => saveKey(mode.id, keyInputs[mode.id])}
                                  disabled={!keyInputs[mode.id]?.trim()}
                                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-all disabled:opacity-40 ${
                                    keySaved[mode.id]
                                      ? 'bg-green-600/80 text-white'
                                      : `${mode.activeBg} ${mode.activeColor} border ${mode.activeBorder} hover:brightness-125`
                                  }`}
                                >
                                  {keySaved[mode.id] ? '✓ Saved!' : 'Save & Activate'}
                                </button>
                                <button
                                  onClick={() => testKey(mode.id, keyInputs[mode.id])}
                                  disabled={!keyInputs[mode.id]?.trim() || testStatus[mode.id] === 'testing'}
                                  className="px-2.5 py-1.5 rounded-lg text-[11px] text-slate-400 hover:text-slate-200 bg-slate-800/60 border border-slate-600/40 flex items-center gap-1 disabled:opacity-40 transition-all"
                                  title="Test this key against the API"
                                >
                                  {testStatus[mode.id] === 'testing' ? <Loader className="w-3 h-3 animate-spin" /> : <Wifi className="w-3 h-3" />}
                                  Test
                                </button>
                                <button
                                  onClick={() => setExpandedKey(null)}
                                  className="px-2.5 py-1.5 rounded-lg text-[11px] text-slate-500 hover:text-slate-300 bg-slate-800/40 border border-slate-700/30"
                                >
                                  Cancel
                                </button>
                              </div>
                              {testStatus[mode.id] && testStatus[mode.id] !== 'testing' && (
                                <div className={`mt-2 px-2 py-1.5 rounded-md text-[10px] flex items-center gap-1.5 ${
                                  testStatus[mode.id] === 'ok'
                                    ? 'bg-green-900/30 border border-green-700/40 text-green-300'
                                    : 'bg-red-900/30 border border-red-700/40 text-red-300'
                                }`}>
                                  {testStatus[mode.id] === 'ok'
                                    ? <><CheckCircle className="w-3 h-3 shrink-0" /> Connected successfully — key is valid!</>
                                    : <><AlertCircle className="w-3 h-3 shrink-0" /> {testStatus[mode.id].replace('error:', '')}</>
                                  }
                                </div>
                              )}
                              <p className="text-[10px] text-slate-600 mt-1.5">Stored in browser only. Never sent to any third party.</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Show test + change buttons if key is already saved and card is active */}
                      {mode.requiresKey && hasKey && isActive && !isExpanded && (
                        <div className="px-3 pb-2.5 flex items-center gap-3 flex-wrap">
                          <button
                            onClick={() => testKey(mode.id, userKeys[mode.id])}
                            disabled={testStatus[mode.id] === 'testing'}
                            className={`flex items-center gap-1 text-[10px] transition-all disabled:opacity-50 ${
                              testStatus[mode.id] === 'ok' ? 'text-green-400' :
                              testStatus[mode.id]?.startsWith('error') ? 'text-red-400' :
                              `${mode.color} opacity-70 hover:opacity-100`
                            }`}
                          >
                            {testStatus[mode.id] === 'testing'
                              ? <Loader className="w-3 h-3 animate-spin" />
                              : testStatus[mode.id] === 'ok'
                              ? <CheckCircle className="w-3 h-3" />
                              : testStatus[mode.id]?.startsWith('error')
                              ? <AlertCircle className="w-3 h-3" />
                              : <Wifi className="w-3 h-3" />
                            }
                            {testStatus[mode.id] === 'testing' ? 'Testing...' :
                             testStatus[mode.id] === 'ok' ? 'Connected' :
                             testStatus[mode.id]?.startsWith('error') ? 'Invalid key' :
                             'Test connection'}
                          </button>
                          <button
                            onClick={() => { setKeyInputs(prev => ({ ...prev, [mode.id]: '' })); setExpandedKey(mode.id); }}
                            className={`flex items-center gap-1 text-[10px] ${mode.color} opacity-50 hover:opacity-100 transition-opacity`}
                          >
                            <Key className="w-3 h-3" /> Change key
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* AMD Ollama status panel */}
              <div className="mt-3 rounded-lg bg-orange-950/30 border border-orange-800/30 overflow-hidden shrink-0">
                <div className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span className="text-[11px] font-semibold text-orange-300">AMD / Ollama</span>
                    {ollamaStatus && (
                      <span className={`flex items-center gap-1 text-[10px] ${ollamaStatus.running ? 'text-green-400' : 'text-red-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${ollamaStatus.running ? 'bg-green-400' : 'bg-red-400'}`} />
                        {ollamaStatus.running ? (ollamaStatus.modelLoaded ? 'Ready' : 'Running — model missing') : 'Offline'}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={checkOllama}
                    disabled={ollamaChecking}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] bg-orange-900/40 border border-orange-700/40 text-orange-300 hover:bg-orange-800/50 transition-colors disabled:opacity-50"
                  >
                    {ollamaChecking ? <Loader className="w-3 h-3 animate-spin" /> : <Wifi className="w-3 h-3" />}
                    {ollamaChecking ? 'Checking...' : 'Test'}
                  </button>
                </div>

                {ollamaStatus && (
                  <div className="px-3 pb-3 text-[10px] space-y-1.5 border-t border-orange-900/30 pt-2">
                    <div className="text-orange-400/70">
                      URL: <span className="text-orange-300 font-mono">{ollamaStatus.baseUrl}</span>
                    </div>
                    <div className="text-orange-400/70">
                      Model: <span className="text-orange-300 font-mono">{ollamaStatus.model}</span>
                    </div>
                    {ollamaStatus.availableModels?.length > 0 && (
                      <div className="text-orange-400/70">
                        Loaded: <span className="text-orange-300">{ollamaStatus.availableModels.join(', ')}</span>
                      </div>
                    )}
                    {ollamaStatus.hint && (
                      <div className="mt-1.5 px-2 py-1.5 rounded bg-orange-900/20 border border-orange-800/30 text-orange-300/80 font-mono">
                        {ollamaStatus.hint}
                      </div>
                    )}
                  </div>
                )}

                {!ollamaStatus && (
                  <div className="px-3 pb-2.5 text-[10px] text-orange-400/60 space-y-0.5">
                    <div>Laptop: <span className="text-orange-300 font-mono">npm run dev:amd</span></div>
                    <div>AMD MI300X: <span className="text-orange-300 font-mono">npm run dev:amd72b</span></div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

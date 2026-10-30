import React, { useState } from 'react';
import { 
  Settings, Shield, Sliders, CheckCircle2, Lock, 
  Save, RotateCcw, Database, HardDrive, Cpu, AlertTriangle
} from 'lucide-react';

export function SettingsPage() {
  const [activePreset, setActivePreset] = useState<string>('Strict');
  const [autoAcceptThreshold, setAutoAcceptThreshold] = useState<number>(80);
  const [reviewCutoffThreshold, setReviewCutoffThreshold] = useState<number>(60);
  const [guardBandMargin, setGuardBandMargin] = useState<number>(5.0);
  const [nlpEngine, setNlpEngine] = useState<string>('pure_deterministic');
  const [savedNotification, setSavedNotification] = useState<string | null>(null);

  const presets = [
    {
      id: 'Strict',
      name: 'Strict (Aerospace & Mission-Critical)',
      description: 'Zero unauthorized tolerance. Missing physical test evidence is strictly UNVERIFIABLE. High auto-accept bar (&ge; 80%).',
      recommendedFor: 'DO-160G, DO-178C, FAA, NASA'
    },
    {
      id: 'Balanced',
      name: 'Balanced (Automotive & Industrial)',
      description: 'Standard 2% engineering tolerance bands allowed when cited. Contextual similarity threshold calibrated at &ge; 75%.',
      recommendedFor: 'ISO 26262, IEC 61508'
    },
    {
      id: 'Exploratory',
      name: 'Exploratory (Early R&D Prototyping)',
      description: 'Permissive mapping (&ge; 65%). Design claims surfaced with warning badges for early gap assessments.',
      recommendedFor: 'Concept Studies, Pre-CDR reviews'
    }
  ];

  const handleSave = () => {
    setSavedNotification('Engine settings and reconciliation thresholds successfully persisted.');
    setTimeout(() => setSavedNotification(null), 3000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Header */}
      <div className="h-14 border-b border-slate-800 bg-slate-900 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-slate-400" />
          <h1 className="font-semibold text-slate-100 text-sm">Engine Configuration & Presets</h1>
          <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">
            Active Preset: {activePreset}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {savedNotification && (
            <span className="text-xs px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {savedNotification}
            </span>
          )}
          <button
            onClick={handleSave}
            className="text-xs px-3.5 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center gap-1.5 transition-colors shadow-md"
          >
            <Save className="w-3.5 h-3.5" />
            Save Configuration
          </button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-1 overflow-auto p-8 max-w-5xl mx-auto space-y-8">
        
        {/* Preset Selector Section */}
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              Operational Regulatory Presets
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Select an industry-calibrated ruleset. Configures threshold gates, tolerance allowances, and review triggers.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {presets.map(p => (
              <div
                key={p.id}
                onClick={() => setActivePreset(p.id)}
                className={`p-5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                  activePreset === p.id 
                    ? 'bg-blue-600/10 border-blue-500/50 ring-2 ring-blue-500/30' 
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-100">{p.name}</span>
                    {activePreset === p.id && (
                      <CheckCircle2 className="w-4 h-4 text-blue-400" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {p.description}
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-800/80 mt-4 text-[10px] font-mono text-blue-400">
                  Target: {p.recommendedFor}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Deterministic Reconciliation Thresholds */}
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/30 space-y-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-400" />
            <span>Threshold Calibration & Guard-Bands</span>
          </h2>

          <div className="grid grid-cols-3 gap-6 text-xs">
            <div>
              <label className="block font-mono text-slate-400 mb-1.5">
                Auto-Accept Score Cutoff (&ge;)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="60"
                  max="95"
                  value={autoAcceptThreshold}
                  onChange={e => setAutoAcceptThreshold(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
                <span className="font-mono text-blue-400 font-bold w-10 text-right">{autoAcceptThreshold}%</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">High confidence auto-mapping threshold.</p>
            </div>

            <div>
              <label className="block font-mono text-slate-400 mb-1.5">
                Review Queue Cutoff (&ge;)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="40"
                  max="75"
                  value={reviewCutoffThreshold}
                  onChange={e => setReviewCutoffThreshold(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
                <span className="font-mono text-amber-400 font-bold w-10 text-right">{reviewCutoffThreshold}%</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Below this, mappings are rejected as unrelated.</p>
            </div>

            <div>
              <label className="block font-mono text-slate-400 mb-1.5">
                Guard-Band Margin Warning (%)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="15"
                  value={guardBandMargin}
                  onChange={e => setGuardBandMargin(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
                <span className="font-mono text-purple-400 font-bold w-10 text-right">{guardBandMargin}%</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Triggers marginal compliance warning badge.</p>
            </div>
          </div>
        </div>

        {/* NLP & Inference Engine Configuration */}
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/30 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-purple-400" />
            <span>AI & NLP Inference Architecture</span>
          </h2>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div 
              onClick={() => setNlpEngine('pure_deterministic')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                nlpEngine === 'pure_deterministic' 
                  ? 'bg-purple-600/10 border-purple-500/50' 
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="font-bold text-slate-200 mb-1">Pure-Local Deterministic Mode (Default)</div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Zero API keys, zero external network calls. SentenceTransformers (all-MiniLM-L6-v2) cached locally on disk + RapidFuzz + Pint units registry. Fully air-gapped compliant.
              </p>
            </div>

            <div 
              onClick={() => setNlpEngine('ollama_local')}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                nlpEngine === 'ollama_local' 
                  ? 'bg-purple-600/10 border-purple-500/50' 
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="font-bold text-slate-200 mb-1">Local Ollama LLM Enhancement</div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Connects to local Ollama runtime (<code className="text-purple-300">http://localhost:11434</code>) for natural language reasoning narratives while leaving deterministic math to Pint.
              </p>
            </div>
          </div>
        </div>

        {/* 10 Non-Negotiable Principles Security Lock */}
        <div className="p-5 rounded-xl border border-emerald-900/40 bg-emerald-950/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <div className="text-xs font-bold text-emerald-300 uppercase tracking-wide">
                10 Non-Negotiable Engineering Principles Locked
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Hardcoded invariant checks in <code className="text-emerald-300">reconciliation_engine.py</code> and Pint units verifier cannot be disabled by user settings.
              </div>
            </div>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            ENFORCED
          </span>
        </div>

      </div>
    </div>
  );
}


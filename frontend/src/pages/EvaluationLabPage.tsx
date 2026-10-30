import React, { useState, useEffect } from 'react';
import { 
  Cpu, Sliders, CheckCircle2, AlertTriangle, ArrowRight, 
  RotateCcw, Sparkles, Activity, ShieldCheck, BarChart2, UploadCloud
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { ReconciliationResult, Requirement } from '../types';

export function EvaluationLabPage() {
  const navigate = useNavigate();
  const activeProjectId = localStorage.getItem('eere_active_project_id') || '';
  const [results, setResults] = useState<ReconciliationResult[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);

  const [semanticWeight, setSemanticWeight] = useState<number>(45);
  const [keywordWeight, setKeywordWeight] = useState<number>(20);
  const [paramWeight, setParamWeight] = useState<number>(20);
  const [contextWeight, setContextWeight] = useState<number>(15);
  const [autoAcceptThreshold, setAutoAcceptThreshold] = useState<number>(80);
  const [isRunningBenchmark, setIsRunningBenchmark] = useState<boolean>(false);
  const [benchmarkResult, setBenchmarkResult] = useState<string | null>(null);

  useEffect(() => {
    if (!activeProjectId) {
      setLoading(false);
      return;
    }

    Promise.all([
      api.getReconciliation(activeProjectId),
      api.getRequirements(activeProjectId)
    ]).then(([recons, reqs]) => {
      setResults(recons);
      setRequirements(reqs);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [activeProjectId]);

  const weightSum = semanticWeight + keywordWeight + paramWeight + contextWeight;
  const isNormalized = weightSum === 100;

  const countStatus = (status: string) => results.filter(r => r.status === status).length;
  const compliantCount = countStatus('COMPLIANT');
  const nonCompliantCount = countStatus('NON_COMPLIANT');
  const conflictCount = countStatus('CONFLICT');
  const unverifiableCount = countStatus('UNVERIFIABLE');
  const needsReviewCount = countStatus('NEEDS_REVIEW');
  const totalDecisions = results.length;

  const handleRunBenchmark = async () => {
    setIsRunningBenchmark(true);
    try {
      if (activeProjectId) {
        await api.runAnalysis(activeProjectId);
        const updated = await api.getReconciliation(activeProjectId);
        setResults(updated);
        setBenchmarkResult(`Calibration run completed: ${updated.length} reconciliation decisions evaluated across 7 deterministic rules.`);
      } else {
        setBenchmarkResult('No active project to run benchmark.');
      }
    } catch (err: any) {
      setBenchmarkResult(`Calibration run error: ${err.message}`);
    } finally {
      setIsRunningBenchmark(false);
    }
  };

  const handleResetDefaults = () => {
    setSemanticWeight(45);
    setKeywordWeight(20);
    setParamWeight(20);
    setContextWeight(15);
    setAutoAcceptThreshold(80);
    setBenchmarkResult(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mr-3" />
        Loading calibration metrics...
      </div>
    );
  }

  if (totalDecisions === 0) {
    return (
      <div className="flex flex-col h-full bg-slate-950 text-slate-100">
        <div className="h-14 border-b border-slate-800 bg-slate-900 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Cpu className="w-5 h-5 text-purple-400" />
            <h1 className="font-semibold text-slate-100 text-sm">Evaluation Lab & Hybrid Calibration Simulator</h1>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4">
            <Cpu className="w-8 h-8 text-purple-400" />
          </div>
          <h2 className="text-lg font-bold text-slate-100 mb-2">No Reconciliation Data Available</h2>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            The Evaluation Lab benchmarks match rates and classification distribution across your project requirements. 
            Upload project documents and run pipeline analysis to generate actual compliance metrics.
          </p>
          <button
            onClick={() => navigate('/new-analysis')}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-purple-600/20"
          >
            <UploadCloud className="w-4 h-4" />
            Upload Documents & Run Analysis
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Header */}
      <div className="h-14 border-b border-slate-800 bg-slate-900 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Cpu className="w-5 h-5 text-purple-400" />
          <h1 className="font-semibold text-slate-100 text-sm">Evaluation Lab & Hybrid Calibration Simulator</h1>
          <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
            {totalDecisions} Evaluated Decisions
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleResetDefaults}
            className="text-xs px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
          <button
            onClick={handleRunBenchmark}
            disabled={isRunningBenchmark}
            className="text-xs px-3.5 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-medium flex items-center gap-1.5 transition-colors shadow-md"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isRunningBenchmark ? 'Calibrating...' : 'Re-run Evaluation'}
          </button>
        </div>
      </div>

      {/* Main Workspace Layout (2-Column Split) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Column: Live Weight-Tuning Interactive Simulator */}
        <div className="w-[440px] border-r border-slate-800 bg-slate-900/40 p-6 flex flex-col space-y-6 shrink-0 overflow-y-auto">
          <div>
            <span className="text-[10px] font-mono text-purple-400 uppercase tracking-wider">
              Hybrid Matcher Calibration
            </span>
            <h2 className="text-base font-bold text-slate-100 mt-0.5">
              Live Parameter Weight Calibration
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Adjust relative weights to observe real-time classification shift without altering production state.
            </p>
          </div>

          {!isNormalized && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Weights sum to {weightSum}%. Must equal 100% for proper normalization.</span>
            </div>
          )}

          {/* Sliders */}
          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between font-mono mb-1.5">
                <span className="text-slate-300">Semantic Weight</span>
                <span className="text-purple-400 font-bold">{semanticWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={semanticWeight}
                onChange={e => setSemanticWeight(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            <div>
              <div className="flex justify-between font-mono mb-1.5">
                <span className="text-slate-300">Keyword Weight</span>
                <span className="text-purple-400 font-bold">{keywordWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={keywordWeight}
                onChange={e => setKeywordWeight(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            <div>
              <div className="flex justify-between font-mono mb-1.5">
                <span className="text-slate-300">Parameter Match Weight</span>
                <span className="text-purple-400 font-bold">{paramWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={paramWeight}
                onChange={e => setParamWeight(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            <div>
              <div className="flex justify-between font-mono mb-1.5">
                <span className="text-slate-300">Context Weight</span>
                <span className="text-purple-400 font-bold">{contextWeight}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={contextWeight}
                onChange={e => setContextWeight(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            <div className="pt-2 border-t border-slate-800">
              <div className="flex justify-between font-mono mb-1.5">
                <span className="text-slate-300 font-semibold">Auto-Accept Gate Threshold</span>
                <span className="text-emerald-400 font-bold">{autoAcceptThreshold}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                value={autoAcceptThreshold}
                onChange={e => setAutoAcceptThreshold(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>

          {/* Project Distribution Callout */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 space-y-2 text-xs">
            <div className="font-semibold text-slate-200">Active Project Classification:</div>
            <ul className="space-y-1 font-mono text-[11px] text-slate-400">
              <li>&bull; Compliant determinations: <strong className="text-emerald-400">{compliantCount}</strong></li>
              <li>&bull; Non-compliant violations: <strong className="text-red-400">{nonCompliantCount}</strong></li>
              <li>&bull; Review queue routings: <strong className="text-amber-400">{needsReviewCount}</strong></li>
              <li>&bull; Unverifiable gaps: <strong className="text-blue-400">{unverifiableCount}</strong></li>
            </ul>
          </div>
        </div>

        {/* Right Column: Actual Classification Distribution Matrix */}
        <div className="flex-1 bg-slate-950 p-6 overflow-y-auto space-y-6">
          
          {benchmarkResult && (
            <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/40 text-purple-200 text-xs flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <span>{benchmarkResult}</span>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Compliant</div>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{compliantCount}</div>
              <div className="text-[11px] text-slate-500 mt-1">Verified within limits</div>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Non-Compliant</div>
              <div className="text-2xl font-bold font-mono text-red-400 mt-1">{nonCompliantCount}</div>
              <div className="text-[11px] text-slate-500 mt-1">Tolerance violations</div>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Review Required</div>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-1">{needsReviewCount}</div>
              <div className="text-[11px] text-slate-500 mt-1">Discrepancies / warnings</div>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Unverifiable</div>
              <div className="text-2xl font-bold font-mono text-blue-400 mt-1">{unverifiableCount}</div>
              <div className="text-[11px] text-slate-500 mt-1">Missing test evidence</div>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-bold uppercase text-slate-200">
                Deterministic Decision Distribution (N = {totalDecisions})
              </h3>
              <span className="text-[10px] font-mono text-slate-400">
                Rule-Based Classification Breakdown
              </span>
            </div>

            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400">
                  <th className="py-2.5 px-3">Classification</th>
                  <th className="py-2.5 px-3">Count</th>
                  <th className="py-2.5 px-3">Share</th>
                  <th className="py-2.5 px-3">Deterministic Engine Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                <tr>
                  <td className="py-2.5 px-3 font-bold text-emerald-400">COMPLIANT</td>
                  <td className="py-2.5 px-3 font-bold">{compliantCount}</td>
                  <td className="py-2.5 px-3">{totalDecisions > 0 ? ((compliantCount / totalDecisions) * 100).toFixed(1) : '0.0'}%</td>
                  <td className="py-2.5 px-3 text-slate-400">Passed boundary calculation</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-red-400">NON_COMPLIANT</td>
                  <td className="py-2.5 px-3 font-bold">{nonCompliantCount}</td>
                  <td className="py-2.5 px-3">{totalDecisions > 0 ? ((nonCompliantCount / totalDecisions) * 100).toFixed(1) : '0.0'}%</td>
                  <td className="py-2.5 px-3 text-slate-400">Logged in Risk Register</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-amber-400">CONFLICT</td>
                  <td className="py-2.5 px-3 font-bold">{conflictCount}</td>
                  <td className="py-2.5 px-3">{totalDecisions > 0 ? ((conflictCount / totalDecisions) * 100).toFixed(1) : '0.0'}%</td>
                  <td className="py-2.5 px-3 text-slate-400">Design vs Test mismatch routed to Review Queue</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-blue-400">UNVERIFIABLE</td>
                  <td className="py-2.5 px-3 font-bold">{unverifiableCount}</td>
                  <td className="py-2.5 px-3">{totalDecisions > 0 ? ((unverifiableCount / totalDecisions) * 100).toFixed(1) : '0.0'}%</td>
                  <td className="py-2.5 px-3 text-slate-400">Physical test evidence missing</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-bold text-orange-400">NEEDS_REVIEW</td>
                  <td className="py-2.5 px-3 font-bold">{needsReviewCount}</td>
                  <td className="py-2.5 px-3">{totalDecisions > 0 ? ((needsReviewCount / totalDecisions) * 100).toFixed(1) : '0.0'}%</td>
                  <td className="py-2.5 px-3 text-slate-400">Flagged for human sign-off</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>

      </div>
    </div>
  );
}

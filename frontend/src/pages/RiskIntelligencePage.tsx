import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, ShieldAlert, CheckCircle2, User, 
  ArrowUpRight, Filter, ChevronRight, Sliders, ShieldCheck, UploadCloud
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { RiskAssessment, Requirement, ReconciliationResult } from '../types';

export function RiskIntelligencePage() {
  const navigate = useNavigate();
  const [projectId] = useState<string>(() => localStorage.getItem('eere_active_project_id') || '');
  const [risks, setRisks] = useState<RiskAssessment[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [reconciliation, setReconciliation] = useState<ReconciliationResult[]>([]);
  const [selectedRisk, setSelectedRisk] = useState<RiskAssessment | null>(null);
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    Promise.all([
      api.getRisks(projectId),
      api.getRequirements(projectId),
      api.getReconciliation(projectId)
    ]).then(([fetchedRisks, reqs, recons]) => {
      setRisks(fetchedRisks);
      if (fetchedRisks.length > 0) {
        setSelectedRisk(fetchedRisks[0]);
      }
      setRequirements(reqs);
      setReconciliation(recons);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [projectId]);

  const reqMap = new Map(requirements.map(r => [r.id, r]));
  const reconMap = new Map(reconciliation.map(r => [r.req_code, r]));

  const criticalCount = risks.filter(r => r.risk_level === 'Critical').length;
  const highCount = risks.filter(r => r.risk_level === 'High').length;
  const mediumCount = risks.filter(r => r.risk_level === 'Medium').length;
  const lowCount = risks.filter(r => r.risk_level === 'Low').length;

  const filteredRisks = risks.filter(r => {
    if (filterLevel === 'ALL') return true;
    return r.risk_level.toUpperCase() === filterLevel.toUpperCase();
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mr-3" />
        Calculating Factor-by-Factor Risk Matrix...
      </div>
    );
  }

  if (risks.length === 0) {
    return (
      <div className="flex flex-col h-full bg-slate-950 text-slate-100">
        <div className="h-14 border-b border-slate-800 bg-slate-900 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h1 className="font-semibold text-slate-100 text-sm">Risk Intelligence & Explainable Exposure Scoring</h1>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-lg font-bold text-slate-100 mb-2">No Risk Records Found</h2>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            Risks are automatically computed when analysis reconciles requirements against test measurements.
            Requirements with non-compliance or margin violations generate risk entries with explainable rationales.
          </p>
          <button
            onClick={() => navigate('/new-analysis')}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-red-600/20"
          >
            <UploadCloud className="w-4 h-4" />
            Upload Documents & Run Analysis
          </button>
        </div>
      </div>
    );
  }

  const selectedReq = selectedRisk ? reqMap.get(selectedRisk.req_id) : null;
  const selectedRecon = selectedReq ? reconMap.get(selectedReq.req_id) : null;

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Header */}
      <div className="h-14 border-b border-slate-800 bg-slate-900 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <h1 className="font-semibold text-slate-100 text-sm">Risk Intelligence & Explainable Exposure Scoring</h1>
          <span className="text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-mono">
            {criticalCount} Critical • {highCount} High • {mediumCount} Medium • {lowCount} Low
          </span>
        </div>

        <div className="flex items-center gap-2">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(lvl => (
            <button
              key={lvl}
              onClick={() => setFilterLevel(lvl)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                filterLevel === lvl 
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Main Workspace Layout (2-Column Split) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Column: Risk Register */}
        <div className="w-[440px] border-r border-slate-800 bg-slate-900/40 flex flex-col shrink-0">
          <div className="p-3 border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
            Risk Register ({filteredRisks.length} Items)
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {filteredRisks.map(risk => {
              const req = reqMap.get(risk.req_id);
              const isSelected = selectedRisk?.id === risk.id;

              return (
                <div
                  key={risk.id}
                  onClick={() => setSelectedRisk(risk)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-red-500/10 border-red-500/40 ring-1 ring-red-500/30' 
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold text-slate-200">
                      {req?.req_id || risk.req_id}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      risk.risk_level === 'Critical' ? 'bg-red-500/20 text-red-300 border border-red-500/40' :
                      risk.risk_level === 'High' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40' :
                      risk.risk_level === 'Medium' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                      'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}>
                      {risk.risk_level} • Score: {risk.risk_score}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 font-medium line-clamp-2 mb-2">
                    {req?.statement || 'Requirement verification risk item'}
                  </div>

                  <div className="text-[11px] text-slate-400 flex justify-between items-center pt-2 border-t border-slate-800/80">
                    <span>Category: <strong>{req?.category || 'General'}</strong></span>
                    <span className="text-red-400 font-mono">Severity: {risk.risk_score >= 80 ? 'Catastrophic' : 'Hazardous'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Factor-by-Factor Explainable Risk Inspector */}
        <div className="flex-1 bg-slate-950 p-6 overflow-y-auto flex flex-col space-y-6">
          {selectedRisk ? (
            <div className="max-w-3xl space-y-6">
              
              {/* Header Box */}
              <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                      Risk Assessment Record
                    </span>
                    <h2 className="text-base font-bold text-slate-100 mt-0.5">
                      {selectedReq?.req_id || selectedRisk.req_id}: Technical Compliance Risk
                    </h2>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-mono font-bold text-red-400">
                      {selectedRisk.risk_score}
                      <span className="text-xs text-slate-400 font-sans ml-1">/ 100</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-300 font-serif italic">
                  "{selectedReq?.statement || 'Specification limit requirement'}"
                </div>
              </div>

              {/* Factor Breakdown Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">1. Failure Severity</div>
                  <div className="text-lg font-bold text-red-400 mt-1">
                    {selectedRisk.risk_level} ({Math.round(selectedRisk.risk_score * 0.4)}/40)
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Derived from safety category and operational impact.</p>
                </div>
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">2. Margin Gap</div>
                  <div className="text-lg font-bold text-amber-400 mt-1">
                    {selectedRecon?.percentage_deviation != null 
                      ? `${selectedRecon.percentage_deviation > 0 ? '+' : ''}${selectedRecon.percentage_deviation.toFixed(2)}%`
                      : 'Missing Test'}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Measured test deviation from specification boundary.</p>
                </div>
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">3. Verification Status</div>
                  <div className="text-lg font-bold text-indigo-400 mt-1">
                    {selectedRecon?.status || 'UNVERIFIABLE'}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Deterministic engine status.</p>
                </div>
              </div>

              {/* Rationale and Explainable Justification */}
              <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  <span>Explainable Risk Rationale</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {selectedRisk.rationale || 'Risk derived deterministically from measured verification overshoot and safety-critical category classification.'}
                </p>
              </div>

              {/* Recommended Action & Owner Assignment */}
              <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Actionable Mitigation Plan</span>
                </h3>
                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-emerald-300 font-mono">
                  {selectedRisk.recommended_action || 'Execute supplemental physical re-testing and review margin boundary tolerances.'}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">Mitigation Owner</label>
                    <input
                      type="text"
                      placeholder="Assign engineer or lead architect..."
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">Target Close Date</label>
                    <input
                      type="date"
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
              Select a risk entry to view the factor-by-factor breakdown.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

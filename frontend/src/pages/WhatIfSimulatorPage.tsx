import React, { useState, useEffect } from 'react';
import { 
  Sliders, Play, ArrowRight, ShieldAlert, CheckCircle, XCircle, 
  AlertTriangle, RefreshCw, Layers, ArrowUpRight, HelpCircle 
} from 'lucide-react';
import { api } from '../services/api';
import { ReconciliationResult, SimulationResult } from '../types';
import { StatusBadge } from '../components/decision/DecisionDetailView';

export function WhatIfSimulatorPage() {
  const [reconciliations, setReconciliations] = useState<ReconciliationResult[]>([]);
  const [selectedReqId, setSelectedReqId] = useState<string>('');
  const [overrideThreshold, setOverrideThreshold] = useState<string>('');
  const [overrideValue, setOverrideValue] = useState<string>('');
  const [overrideUnit, setOverrideUnit] = useState<string>('');
  const [overrideTolerance, setOverrideTolerance] = useState<string>('');
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [simulating, setSimulating] = useState(false);

  const activeProjectId = localStorage.getItem('eere_active_project_id') || '';

  useEffect(() => {
    if (activeProjectId) {
      api.getReconciliation(activeProjectId)
        .then(recs => {
          setReconciliations(recs);
          if (recs.length > 0 && !selectedReqId) {
            // Default to first non-compliant or first req
            const nonComp = recs.find(r => r.status === 'NON_COMPLIANT');
            const target = nonComp ? nonComp.req_code : recs[0].req_code;
            setSelectedReqId(target);
          }
        })
        .catch(console.error);
    }
  }, [activeProjectId]);

  const selectedReq = reconciliations.find(r => r.req_code === selectedReqId);

  const handleRunSimulation = async () => {
    if (!selectedReqId || !activeProjectId) return;
    setSimulating(true);
    try {
      const payload: any = { requirement_id: selectedReqId };
      if (overrideThreshold.trim()) payload.override_threshold = parseFloat(overrideThreshold) || overrideThreshold;
      if (overrideValue.trim()) payload.override_measured_value = parseFloat(overrideValue) || overrideValue;
      if (overrideUnit.trim()) payload.override_unit = overrideUnit.trim();
      if (overrideTolerance.trim()) {
        payload.override_tolerance_authorized = true;
        payload.override_allowed_tolerance = parseFloat(overrideTolerance);
      }

      const res = await api.runSimulation(activeProjectId, payload);
      setSimResult(res);
    } catch (err: any) {
      alert(`Simulation error: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">What-If Compliance Simulator</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              SANDBOXED HYPOTHETICAL
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Simulate threshold adjustments, sensor measurement variations, and tolerance authorizations. Simulations are strictly isolated and never alter baseline audit records.
          </p>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Parameter Overrides Controls (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-400" />
            <span>Simulation Parameters</span>
          </h2>

          {/* Select Target Requirement */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-400">Target Requirement</label>
            <select
              value={selectedReqId}
              onChange={(e) => {
                setSelectedReqId(e.target.value);
                setSimResult(null);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
            >
              {reconciliations.length === 0 ? (
                <option value="">No requirements in active project</option>
              ) : (
                reconciliations.map(r => (
                  <option key={r.id} value={r.req_code}>
                    {r.req_code} ({r.spec_limit}) — Current: {r.status}
                  </option>
                ))
              )}
            </select>
          </div>

          {selectedReq && (
            <div className="p-3 bg-slate-950/80 border border-slate-800/80 rounded-lg text-xs space-y-1 font-mono">
              <div className="text-slate-400">Current Spec Limit: <span className="text-amber-400 font-bold">{selectedReq.spec_limit}</span></div>
              <div className="text-slate-400">Current Measured: <span className="text-emerald-400 font-bold">{selectedReq.test_measurement || 'None'}</span></div>
              <div className="text-slate-400">Current Status: <StatusBadge status={selectedReq.status} /></div>
            </div>
          )}

          {/* Override Form Fields */}
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-mono text-slate-400 block mb-1">Hypothetical Spec Threshold</label>
              <input
                type="text"
                placeholder="e.g. 95.0 or 15.0"
                value={overrideThreshold}
                onChange={(e) => setOverrideThreshold(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-slate-400 block mb-1">Hypothetical Measured Value</label>
              <input
                type="text"
                placeholder="e.g. 80.0 or 176.0"
                value={overrideValue}
                onChange={(e) => setOverrideValue(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">Unit Assumption</label>
                <input
                  type="text"
                  placeholder="e.g. C, F, kg, V"
                  value={overrideUnit}
                  onChange={(e) => setOverrideUnit(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">Tolerance Band</label>
                <input
                  type="text"
                  placeholder="e.g. 5.0"
                  value={overrideTolerance}
                  onChange={(e) => setOverrideTolerance(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleRunSimulation}
            disabled={simulating}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all font-mono"
          >
            <Play className="w-4 h-4" />
            <span>{simulating ? 'Calculating Hypotheses...' : 'Execute What-If Simulation'}</span>
          </button>
        </div>

        {/* Right Column: Side-by-Side Simulation Results (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
            <h2 className="text-sm font-semibold text-slate-200">Simulation Comparison</h2>
            {simResult && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300">
                HYPOTHETICAL RESULT
              </span>
            )}
          </div>

          {simResult ? (
            <div className="space-y-6 flex-1">
              
              {/* Baseline vs Hypothetical Comparison Cards */}
              <div className="grid grid-cols-2 gap-4">
                
                {/* Baseline Card */}
                <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
                  <span className="text-[11px] font-mono uppercase text-slate-500 font-bold">Baseline Stored Result</span>
                  <div className="space-y-1">
                    <div className="text-xs text-slate-400 font-mono">Status:</div>
                    <StatusBadge status={simResult.original_status} />
                  </div>
                  <div className="space-y-1 font-mono text-xs">
                    <span className="text-slate-400">Risk Score: </span>
                    <span className="text-white font-bold">{simResult.original_risk_score}</span>
                    <span className="text-slate-500 ml-1">({simResult.original_risk_level})</span>
                  </div>
                </div>

                {/* Hypothetical Card */}
                <div className="p-4 bg-blue-950/20 rounded-xl border border-blue-500/40 space-y-3">
                  <span className="text-[11px] font-mono uppercase text-blue-400 font-bold">Hypothetical Outcome</span>
                  <div className="space-y-1">
                    <div className="text-xs text-slate-400 font-mono">Status:</div>
                    <StatusBadge status={simResult.hypothetical_status} />
                  </div>
                  <div className="space-y-1 font-mono text-xs">
                    <span className="text-slate-400">Risk Score: </span>
                    <span className="text-emerald-400 font-bold">{simResult.hypothetical_risk_score}</span>
                    <span className="text-emerald-500 ml-1">({simResult.hypothetical_risk_level})</span>
                  </div>
                </div>

              </div>

              {/* Calculation & Rationale */}
              <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2 text-xs">
                <h4 className="font-mono text-slate-300 font-semibold uppercase text-[11px]">Reconciliation Math</h4>
                <div className="p-2.5 bg-slate-900 rounded font-mono text-blue-300 text-[11px]">
                  {simResult.reconciliation_details.calculation_formula || 'Direct Operator Evaluation'}
                </div>
                <p className="text-slate-400 leading-relaxed font-sans pt-1">
                  {simResult.reconciliation_details.reason}
                </p>
              </div>

              {/* Downstream Impact Alert */}
              {simResult.impacted_dependencies.length > 0 && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-bold text-amber-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Downstream System Impact Detected</span>
                  </div>
                  <p className="text-slate-300">
                    This hypothetical change impacts {simResult.impacted_dependencies.length} dependent requirement(s):
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1 font-mono">
                    {simResult.impacted_dependencies.map(dep => (
                      <span key={dep.requirement_id} className="px-2 py-0.5 rounded bg-slate-900 text-amber-300 border border-amber-500/40 text-[11px]">
                        {dep.requirement_id} (Distance {dep.distance})
                      </span>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 text-xs">
              <Sliders className="w-8 h-8 text-slate-600 mb-2" />
              <p className="font-semibold text-slate-400">Ready to simulate</p>
              <p>Configure hypothetical thresholds or values on the left and click Execute.</p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}


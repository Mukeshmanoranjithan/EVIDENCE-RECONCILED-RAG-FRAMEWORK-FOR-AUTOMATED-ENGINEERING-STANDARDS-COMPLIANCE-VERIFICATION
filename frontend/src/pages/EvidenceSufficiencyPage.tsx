import React, { useState, useEffect } from 'react';
import { 
  Eye, ShieldCheck, AlertCircle, CheckCircle2, XCircle, 
  HelpCircle, ArrowUpRight, Filter, Info, Layers, UploadCloud
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Requirement, ReconciliationResult } from '../types';

export function EvidenceSufficiencyPage() {
  const navigate = useNavigate();
  const [projectId] = useState<string>(() => localStorage.getItem('eere_active_project_id') || '');
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [reconciliation, setReconciliation] = useState<ReconciliationResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    Promise.all([
      api.getRequirements(projectId),
      api.getReconciliation(projectId)
    ]).then(([reqs, recons]) => {
      setRequirements(reqs);
      setReconciliation(recons);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [projectId]);

  const reconMap = new Map(reconciliation.map(r => [r.req_code, r]));

  // Evaluate evidence tiers per requirement based purely on extracted records
  const matrix = requirements.map(req => {
    const recon = reconMap.get(req.req_id);
    const hasTest = !!(recon?.test_measurement && recon.test_measurement !== '--');
    const hasDesign = !!(recon?.design_claim && recon.design_claim !== '--');
    const hasSimulation = false;
    const hasInspection = false;

    let sufficiencyScore = 0;
    if (hasTest) sufficiencyScore += 60;
    if (hasDesign) sufficiencyScore += 40;

    return {
      req,
      hasTest,
      hasDesign,
      hasSimulation,
      hasInspection,
      sufficiencyScore,
      status: recon?.status || 'UNVERIFIABLE'
    };
  });

  const avgSufficiency = matrix.length > 0 
    ? Math.round(matrix.reduce((acc, m) => acc + m.sufficiencyScore, 0) / matrix.length)
    : 0;

  const testGapsCount = matrix.filter(m => !m.hasTest).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mr-3" />
        Calculating Evidence Sufficiency Matrix...
      </div>
    );
  }

  if (matrix.length === 0) {
    return (
      <div className="flex flex-col h-full bg-slate-950 text-slate-100">
        <div className="h-14 border-b border-slate-800 bg-slate-900 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-emerald-400" />
            <h1 className="font-semibold text-slate-100 text-sm">Evidence Sufficiency & Verification Coverage</h1>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
            <Eye className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-lg font-bold text-slate-100 mb-2">No Requirements Found</h2>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            Evidence sufficiency measures physical test and design claim coverage across all requirements in your active project. 
            Create a project and upload specification and test PDFs to compute the matrix.
          </p>
          <button
            onClick={() => navigate('/new-analysis')}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-600/20"
          >
            <UploadCloud className="w-4 h-4" />
            Upload Project Documents
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
          <Eye className="w-5 h-5 text-emerald-400" />
          <h1 className="font-semibold text-slate-100 text-sm">Evidence Sufficiency & Verification Coverage</h1>
          <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
            Overall Sufficiency: {avgSufficiency}%
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded border border-slate-800">
            <span className="text-slate-400">Physical Test Gaps:</span>
            <span className={`font-mono font-bold ${testGapsCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {testGapsCount} Requirements Lacking Measured Data
            </span>
          </div>
        </div>
      </div>

      {/* Principles Callout Banner */}
      <div className="p-3.5 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-400 shrink-0" />
          <span>
            <strong>Deterministic Principle #3:</strong> Design claims never substitute for test measurements. 
            A requirement with 100% design claim coverage but missing test evidence evaluates strictly to <strong>UNVERIFIABLE</strong>.
          </span>
        </div>
      </div>

      {/* Main Table / Heatmap Canvas */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
              <div className="text-[11px] font-mono text-slate-400 uppercase">Mean Sufficiency Index</div>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{avgSufficiency}%</div>
              <div className="text-[11px] text-slate-500 mt-1">Weighted across verification tiers</div>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
              <div className="text-[11px] font-mono text-slate-400 uppercase">Test Verified</div>
              <div className="text-2xl font-bold font-mono text-blue-400 mt-1">
                {matrix.filter(m => m.hasTest).length} / {matrix.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Empirically measured test reports</div>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
              <div className="text-[11px] font-mono text-slate-400 uppercase">Design Claims Only</div>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                {matrix.filter(m => m.hasDesign && !m.hasTest).length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Unverifiable pending physical test</div>
            </div>

            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
              <div className="text-[11px] font-mono text-slate-400 uppercase">Zero Evidence Gaps</div>
              <div className="text-2xl font-bold font-mono text-red-400 mt-1">
                {matrix.filter(m => !m.hasDesign && !m.hasTest).length}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Complete verification void</div>
            </div>
          </div>

          {/* Verification Coverage Heatmap Matrix */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden shadow-lg">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-xs font-mono uppercase font-semibold text-slate-200">
                Requirement Evidence Coverage Matrix
              </h2>
              <span className="text-[11px] font-mono text-slate-400">
                Sorted by Verification Priority
              </span>
            </div>

            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400 bg-slate-950/60">
                  <th className="py-3 px-4">Requirement</th>
                  <th className="py-3 px-4">Parameter</th>
                  <th className="py-3 px-4 text-center">1. Physical Test</th>
                  <th className="py-3 px-4 text-center">2. Design Claim</th>
                  <th className="py-3 px-4 text-center">3. Simulation</th>
                  <th className="py-3 px-4 text-center">4. Inspection</th>
                  <th className="py-3 px-4 text-center">Sufficiency</th>
                  <th className="py-3 px-4 text-right">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {matrix.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-200">
                      {row.req.req_id}
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-sans">
                      {row.req.parameter}
                    </td>
                    
                    {/* Test Pillar */}
                    <td className="py-3 px-4 text-center">
                      {row.hasTest ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-4 h-4" /> PASS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-400">
                          <XCircle className="w-4 h-4" /> MISSING
                        </span>
                      )}
                    </td>

                    {/* Design Pillar */}
                    <td className="py-3 px-4 text-center">
                      {row.hasDesign ? (
                        <span className="inline-flex items-center gap-1 text-blue-400 font-semibold">
                          <CheckCircle2 className="w-4 h-4" /> CLAIMED
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* Simulation Pillar */}
                    <td className="py-3 px-4 text-center">
                      {row.hasSimulation ? (
                        <span className="inline-flex items-center gap-1 text-indigo-400 font-semibold">
                          <CheckCircle2 className="w-4 h-4" /> MODELLED
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* Inspection Pillar */}
                    <td className="py-3 px-4 text-center">
                      {row.hasInspection ? (
                        <span className="inline-flex items-center gap-1 text-slate-300 font-semibold">
                          <CheckCircle2 className="w-4 h-4" /> AUDITED
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* Sufficiency Gauge */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${row.sufficiencyScore >= 80 ? 'bg-emerald-500' : row.sufficiencyScore >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${row.sufficiencyScore}%` }}
                          />
                        </div>
                        <span className="text-slate-300 font-bold">{row.sufficiencyScore}%</span>
                      </div>
                    </td>

                    {/* Final Deterministic Status */}
                    <td className="py-3 px-4 text-right">
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        row.status === 'COMPLIANT' ? 'bg-emerald-500/20 text-emerald-300' :
                        row.status === 'NON_COMPLIANT' ? 'bg-red-500/20 text-red-300' :
                        row.status === 'CONFLICT' ? 'bg-amber-500/20 text-amber-300' :
                        'bg-slate-800 text-slate-400'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}

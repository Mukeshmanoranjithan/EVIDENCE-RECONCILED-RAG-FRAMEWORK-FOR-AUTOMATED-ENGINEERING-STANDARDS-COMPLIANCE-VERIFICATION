import React, { useState } from 'react';
import { 
  CheckCircle, XCircle, AlertTriangle, HelpCircle, Eye, 
  FileText, Shield, ArrowRight, Check, X, RefreshCw, ZoomIn, ExternalLink 
} from 'lucide-react';
import { DecisionDetail, ComplianceStatus } from '../../types';

interface DecisionDetailViewProps {
  detail: DecisionDetail;
  onClose: () => void;
  onApprove?: () => void;
  onRequestRetest?: () => void;
}

export function StatusBadge({ status }: { status: ComplianceStatus | string }) {
  switch (status) {
    case 'COMPLIANT':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          COMPLIANT
        </span>
      );
    case 'NON_COMPLIANT':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
          <XCircle className="w-3.5 h-3.5 text-red-400" />
          NON_COMPLIANT
        </span>
      );
    case 'CONFLICT':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/30">
          <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
          CONFLICT
        </span>
      );
    case 'NEEDS_REVIEW':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <Eye className="w-3.5 h-3.5 text-amber-400" />
          NEEDS_REVIEW
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/30">
          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
          UNVERIFIABLE
        </span>
      );
  }
}

export function NumberLineGauge({ 
  limit, 
  design, 
  measured, 
  unit 
}: { 
  limit: number; 
  design?: number; 
  measured?: number; 
  unit?: string 
}) {
  const vals = [limit, design ?? limit, measured ?? limit].filter((v): v is number => typeof v === 'number' && !isNaN(v));
  const minVal = Math.min(...vals) * 0.8;
  const maxVal = Math.max(...vals) * 1.2;
  const range = maxVal - minVal || 100;
  
  const toPct = (val: number) => Math.min(95, Math.max(5, ((val - minVal) / range) * 100));
  
  const limitPct = toPct(limit);
  const designPct = design != null ? toPct(design) : null;
  const measuredPct = measured != null ? toPct(measured) : null;

  const displayMin = typeof minVal === 'number' && !isNaN(minVal) ? minVal.toFixed(1) : '0';
  const displayMax = typeof maxVal === 'number' && !isNaN(maxVal) ? maxVal.toFixed(1) : '100';

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800 rounded-lg p-5">
      <div className="flex justify-between items-center text-xs font-mono text-slate-400 mb-3">
        <span>Min ({displayMin} {unit})</span>
        <span className="text-slate-300 font-semibold">Boundary & Measurement Alignment</span>
        <span>Max ({displayMax} {unit})</span>
      </div>
      
      {/* Number line track */}
      <div className="relative h-6 bg-slate-800 rounded-full flex items-center px-2">
        {/* Compliance safe zone line (up to limit) */}
        <div 
          className="absolute left-0 h-2 bg-emerald-500/20 rounded-l-full"
          style={{ width: `${limitPct}%` }}
        />
        
        {/* Limit Marker */}
        <div 
          className="absolute w-1 h-8 bg-amber-400 z-10 -top-1 rounded"
          style={{ left: `${limitPct}%` }}
          title={`Spec Limit: ${limit} ${unit}`}
        />
        
        {/* Design Claim Marker */}
        {designPct !== null && (
          <div 
            className="absolute w-3.5 h-3.5 rounded-full bg-blue-400 border-2 border-slate-900 z-20 top-1.5 -ml-1.5 shadow"
            style={{ left: `${designPct}%` }}
            title={`Design Claim: ${design} ${unit}`}
          />
        )}
        
        {/* Measured Result Marker */}
        {measuredPct !== null && (
          <div 
            className="absolute w-4 h-4 rounded-full bg-emerald-400 border-2 border-white z-30 top-1 -ml-2 shadow-lg animate-pulse"
            style={{ left: `${measuredPct}%` }}
            title={`Physical Measurement: ${measured} ${unit}`}
          />
        )}
      </div>
      
      {/* Legend & Labels */}
      <div className="flex flex-wrap gap-4 justify-center items-center text-xs font-mono mt-4 pt-3 border-t border-slate-800/80">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-amber-400 rounded-sm" />
          <span className="text-slate-300">Spec Limit ({limit} {unit})</span>
        </div>
        {design !== undefined && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-blue-400 rounded-full" />
            <span className="text-slate-300">Design ({design} {unit})</span>
          </div>
        )}
        {measured !== undefined && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-emerald-400 rounded-full ring-2 ring-emerald-500/30" />
            <span className="text-emerald-400 font-semibold">Test ({measured} {unit})</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function DecisionDetailView({ detail, onClose, onApprove, onRequestRetest }: DecisionDetailViewProps) {
  const [activeTab, setActiveTab] = useState<'trace' | 'counterfactual' | 'audit'>('trace');
  const [isSignedOff, setIsSignedOff] = useState(false);

  // Parse numeric values for gauge
  const limitNum = parseFloat(detail.spec_limit.replace(/[^\d\.]/g, '')) || 0;
  const designNum = detail.design_claim ? parseFloat(detail.design_claim.replace(/[^\d\.]/g, '')) : undefined;
  const testNum = detail.test_measurement ? parseFloat(detail.test_measurement.replace(/[^\d\.]/g, '')) : undefined;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 lg:p-8 animate-in fade-in duration-200">
      <div className="w-full max-w-7xl h-[92vh] bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Top Header */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="font-mono text-base font-bold text-white tracking-wide">{detail.req_code}</h2>
                <StatusBadge status={detail.status} />
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  {detail.priority}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded font-mono font-semibold ${
                  detail.risk_level === 'Critical' ? 'bg-red-500/20 text-red-400' :
                  detail.risk_level === 'High' ? 'bg-orange-500/20 text-orange-400' :
                  detail.risk_level === 'Medium' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-emerald-500/20 text-emerald-400'
                }`}>
                  Risk: {detail.risk_level} ({detail.risk_score})
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-xl">{detail.statement}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 3-Pane Split View Body */}
        <div className="flex-1 grid grid-cols-12 divide-x divide-slate-800 overflow-hidden">
          
          {/* Pane 1 (Left): Requirement & Reviewer Actions (3 cols) */}
          <div className="col-span-3 p-6 overflow-y-auto space-y-6 bg-slate-900/40">
            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Requirement Specification</h3>
              <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800/80 space-y-2">
                <p className="text-sm font-medium text-slate-200">{detail.statement}</p>
                <div className="text-xs font-mono text-slate-400 pt-2 border-t border-slate-800 flex justify-between">
                  <span>Category:</span>
                  <span className="text-slate-200">{detail.category}</span>
                </div>
                <div className="text-xs font-mono text-slate-400 flex justify-between">
                  <span>Target Limit:</span>
                  <span className="text-amber-400 font-semibold">{detail.spec_limit}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Deterministic Rule Verification</h3>
              <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800/80 space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Rule Triggered:</span>
                  <span className="text-blue-400 font-bold">{detail.rule_id_fired}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Deviation %:</span>
                  <span className={detail.percentage_deviation != null && detail.percentage_deviation > 0 ? "text-red-400" : "text-emerald-400"}>
                    {detail.percentage_deviation != null ? `${Number(detail.percentage_deviation).toFixed(2)}%` : '--'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Margin to Limit:</span>
                  <span className="text-slate-200">{detail.margin_to_limit != null ? `${Number(detail.margin_to_limit).toFixed(2)} ${detail.unit || ''}` : '--'}</span>
                </div>
                {detail.is_marginal && (
                  <div className="p-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded mt-2">
                    ⚠️ Guard-band warning: Margin is smaller than measurement uncertainty.
                  </div>
                )}
              </div>
            </div>

            {/* Reviewer Sign-off Action Box */}
            <div className="pt-4 border-t border-slate-800">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3">Reviewer Sign-off</h3>
              {isSignedOff ? (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-mono space-y-1">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle className="w-4 h-4" />
                    <span>Signed-off by Engineer</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Hash-chained internal verification record logged.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <button 
                    onClick={() => { setIsSignedOff(true); onApprove?.(); }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    Approve Decision & Sign Off
                  </button>
                  <button 
                    onClick={onRequestRetest}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Request Supplemental Re-test
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Pane 2 (Center): Reconciliation Story & Gauge (5 cols) */}
          <div className="col-span-5 p-6 overflow-y-auto space-y-6 bg-slate-900/20">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-semibold text-sm text-slate-200 flex items-center gap-2">
                Reconciliation Story
              </h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => setActiveTab('trace')}
                  className={`text-xs px-2.5 py-1 rounded ${activeTab === 'trace' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                  Calculation Trace
                </button>
                <button 
                  onClick={() => setActiveTab('counterfactual')}
                  className={`text-xs px-2.5 py-1 rounded ${activeTab === 'counterfactual' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                >
                  What-If Counterfactual
                </button>
              </div>
            </div>

            {activeTab === 'trace' ? (
              <>
                {/* Visual Reconciliation Step Pipeline */}
                <div className="space-y-3 font-mono text-xs">
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">1. Specification Target:</span>
                    <span className="font-semibold text-amber-400">{detail.spec_limit}</span>
                  </div>
                  <div className="flex justify-center text-slate-600">
                    <ArrowRight className="w-4 h-4 rotate-90" />
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">2. Design Claim:</span>
                    <span className="text-blue-400 font-semibold">{detail.design_claim || 'None'}</span>
                  </div>
                  <div className="flex justify-center text-slate-600">
                    <ArrowRight className="w-4 h-4 rotate-90" />
                  </div>
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">3. Physical Test Measurement:</span>
                    <span className="font-semibold text-emerald-400">{detail.test_measurement || 'None (Missing)'}</span>
                  </div>
                  <div className="flex justify-center text-slate-600">
                    <ArrowRight className="w-4 h-4 rotate-90" />
                  </div>
                  <div className="p-3 bg-blue-950/30 rounded-lg border border-blue-500/30 text-blue-300">
                    <div className="text-[11px] text-blue-400 mb-1">4. Formula & Unit Mathematical Evaluation:</div>
                    <div className="font-bold text-xs">{detail.calculation_formula || 'Direct Operator Evaluation'}</div>
                  </div>
                </div>

                {/* Number-Line Gauge */}
                <div>
                  <h4 className="text-xs font-mono uppercase text-slate-400 mb-2">Tolerance & Boundary Number-Line Gauge</h4>
                  <NumberLineGauge 
                    limit={limitNum} 
                    design={designNum} 
                    measured={testNum} 
                    unit={detail.unit} 
                  />
                </div>

                {/* Explanation text */}
                <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-lg text-xs leading-relaxed text-slate-300">
                  <span className="font-semibold text-white">Decision Rationale: </span>
                  {detail.reason}
                </div>
              </>
            ) : (
              /* Counterfactual Tab */
              <div className="p-5 bg-slate-950 rounded-lg border border-slate-800 space-y-4 text-xs">
                <h4 className="font-semibold text-slate-200">Counterfactual Analysis ("What would make it compliant?")</h4>
                <div className="p-4 bg-slate-900 border border-slate-800 rounded space-y-2 font-mono">
                  <p className="text-slate-300">
                    • Requirement would evaluate to <span className="text-emerald-400 font-bold">COMPLIANT</span> if:
                  </p>
                  <p className="text-slate-400 pl-4">
                    - Physical test measurement is measured <span className="text-amber-400">{detail.spec_limit}</span> under valid operating conditions.
                  </p>
                  <p className="text-slate-400 pl-4">
                    - Or specification limit is authorized to relax tolerance by <span className="text-amber-400">{detail.difference != null ? `+${Number(detail.difference).toFixed(2)} ${detail.unit || ''}` : '±5%'}</span>.
                  </p>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Counterfactual simulations can be tested directly in the What-If Simulator tab without altering baseline audit trails.
                </p>
              </div>
            )}
          </div>

          {/* Pane 3 (Right): Original PDF Source Viewer (4 cols) */}
          <div className="col-span-4 p-6 overflow-y-auto bg-slate-950/80 flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                <FileText className="w-4 h-4 text-blue-400" />
                <span className="truncate">{detail.source_doc_name}</span>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                Page {detail.source_page}
              </span>
            </div>

            {/* Grounded Source Snippet with Bounding Box Overlay */}
            <div className="flex-1 bg-white text-slate-900 rounded-lg p-6 shadow-inner relative font-serif text-sm leading-relaxed overflow-hidden select-none border border-slate-300">
              <div className="text-center font-bold text-sm pb-2 border-b border-slate-200 mb-3 text-slate-800 uppercase font-sans">
                {detail.source_doc_name}
              </div>
              
              <p className="text-xs text-slate-500 mb-2 font-mono">Category: {detail.category}</p>

              {/* Exact Text with Highlight */}
              <div className="relative p-3 my-3 rounded bg-amber-100/90 border-2 border-amber-500 text-slate-950 font-sans font-semibold text-xs shadow-sm">
                <span className="absolute -top-2.5 -left-1 px-1.5 py-0.5 rounded text-[9px] bg-amber-600 text-white font-mono uppercase tracking-wider font-bold">
                  Target Clause: {detail.req_code}
                </span>
                "{detail.statement}"
              </div>

              <div className="mt-4 p-3 bg-slate-50 rounded border border-slate-200 font-mono text-[11px] text-slate-600 space-y-1">
                <div>Physical Threshold: <strong>{detail.spec_limit}</strong></div>
                {detail.test_measurement && <div>Measured Test: <strong className="text-emerald-700">{detail.test_measurement}</strong></div>}
                {detail.design_claim && <div>Design Claim: <strong className="text-blue-700">{detail.design_claim}</strong></div>}
              </div>

              <div className="absolute bottom-3 right-4 text-[10px] font-mono text-slate-400">
                Page {detail.source_page} (PyMuPDF Grounded)
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Bounding Box: [{detail.highlight_bbox?.join(', ')}]</span>
              <span className="text-emerald-400">100% Traceable</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}


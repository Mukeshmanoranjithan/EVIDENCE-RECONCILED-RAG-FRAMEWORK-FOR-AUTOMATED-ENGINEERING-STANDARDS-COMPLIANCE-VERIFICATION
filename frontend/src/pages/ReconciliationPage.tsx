import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  CheckCircle, XCircle, AlertTriangle, Eye, HelpCircle, 
  Search, Download, Filter, ChevronRight, Sliders, ExternalLink 
} from 'lucide-react';
import { api } from '../services/api';
import { ReconciliationResult, DecisionDetail, ComplianceStatus } from '../types';
import { DecisionDetailView, StatusBadge } from '../components/decision/DecisionDetailView';

export function ReconciliationPage() {
  const [results, setResults] = useState<ReconciliationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReqCode, setSelectedReqCode] = useState<string | null>(null);
  const [decisionDetail, setDecisionDetail] = useState<DecisionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const activeProjectId = localStorage.getItem('eere_active_project_id') || '';

  useEffect(() => {
    if (!activeProjectId) {
      setLoading(false);
      return;
    }
    api.getReconciliation(activeProjectId)
      .then(setResults)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeProjectId]);

  // Handle URL query param: e.g. /reconciliation?req=REQ-001
  useEffect(() => {
    const reqFromUrl = searchParams.get('req');
    if (reqFromUrl && activeProjectId) {
      handleOpenDetail(reqFromUrl);
    }
  }, [searchParams, activeProjectId]);

  const handleOpenDetail = async (reqCode: string) => {
    setSelectedReqCode(reqCode);
    setDetailLoading(true);
    try {
      const detail = await api.getDecisionDetail(activeProjectId, reqCode);
      setDecisionDetail(detail);
    } catch (err) {
      console.error('Failed to load decision detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDownloadExcel = async () => {
    try {
      const res = await api.generateReport(activeProjectId, 'technical');
      alert(`Report generated! Path: ${res.excel_matrix}`);
    } catch (err: any) {
      alert(`Export error: ${err.message}`);
    }
  };

  const filtered = results.filter(r => {
    const matchesStatus = filterStatus === 'ALL' || r.status === filterStatus;
    const matchesQuery = searchQuery === '' || 
      r.req_code.toLowerCase().includes(searchQuery.toLowerCase()) || 
      r.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.spec_limit.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Deterministic Reconciliation & Compliance Matrix</h1>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic 7-tier rule reconciliation. Every decision shows calculation formula, tolerance boundary, and verified evidence links.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadExcel}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export Compliance Matrix (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-slate-900 border border-slate-800 p-4 rounded-xl">
        
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Filter by REQ ID, limit, or rationale..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 font-mono"
          />
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
          {['ALL', 'COMPLIANT', 'NON_COMPLIANT', 'CONFLICT', 'UNVERIFIABLE', 'NEEDS_REVIEW'].map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-colors ${
                filterStatus === st 
                  ? 'bg-blue-600 text-white font-bold' 
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

      </div>

      {/* Compliance Matrix Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Requirement ID</th>
                <th className="py-3.5 px-4 font-semibold">Specification Limit</th>
                <th className="py-3.5 px-4 font-semibold">Design Claim</th>
                <th className="py-3.5 px-4 font-semibold">Measured Test</th>
                <th className="py-3.5 px-4 font-semibold">Deviation %</th>
                <th className="py-3.5 px-4 font-semibold">Compliance Status</th>
                <th className="py-3.5 px-4 font-semibold">Rule Fired</th>
                <th className="py-3.5 px-4 font-semibold text-right">Decision Trace</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              {filtered.length > 0 ? (
                filtered.map(row => (
                  <tr 
                    key={row.id}
                    onClick={() => handleOpenDetail(row.req_code)}
                    className="hover:bg-slate-800/60 transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4 font-bold text-white group-hover:text-blue-400">
                      {row.req_code}
                    </td>
                    <td className="py-3 px-4 text-amber-300 font-medium">
                      {row.spec_limit}
                    </td>
                    <td className="py-3 px-4 text-blue-300">
                      {row.design_claim || '--'}
                    </td>
                    <td className="py-3 px-4 text-emerald-400 font-semibold">
                      {row.test_measurement || '--'}
                    </td>
                    <td className="py-3 px-4 font-semibold">
                      {row.percentage_deviation != null ? (
                        <span className={row.percentage_deviation > 0 ? "text-red-400" : "text-emerald-400"}>
                          {row.percentage_deviation > 0 ? `+${Number(row.percentage_deviation).toFixed(2)}%` : `${Number(row.percentage_deviation).toFixed(2)}%`}
                        </span>
                      ) : (
                        <span className="text-slate-500">--</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {row.rule_id_fired}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleOpenDetail(row.req_code); }}
                        className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-sans hover:underline font-medium"
                      >
                        <span>Inspect Story</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 font-sans">
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
                        <span>Loading reconciliation decisions...</span>
                      </div>
                    ) : (
                      <div className="max-w-md mx-auto space-y-3">
                        <div className="text-slate-200 font-semibold text-sm">No Reconciliation Results Available</div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Reconciliation requires project documents (Specifications and Test Reports). Upload documents in Document Intelligence or create an analysis to evaluate compliance.
                        </p>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Signature Split View Decision Detail Modal */}
      {selectedReqCode && decisionDetail && (
        <DecisionDetailView 
          detail={decisionDetail} 
          onClose={() => { setSelectedReqCode(null); setDecisionDetail(null); }}
          onApprove={() => alert(`Reviewer approval registered for ${selectedReqCode}.`)}
          onRequestRetest={() => alert(`Supplemental physical re-test request logged for ${selectedReqCode}.`)}
        />
      )}

    </div>
  );
}


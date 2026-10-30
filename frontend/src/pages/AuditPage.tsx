import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, AlertTriangle, RefreshCw, Key, Lock, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { AuditRecord } from '../types';

export function AuditPage() {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{ is_valid: boolean; message: string; verified_records_count: number } | null>(null);

  const activeProjectId = localStorage.getItem('eere_active_project_id') || '';

  useEffect(() => {
    if (activeProjectId) {
      api.getAuditRecords(activeProjectId)
        .then(setRecords)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [activeProjectId]);

  const handleVerify = async () => {
    if (!activeProjectId) return;
    setVerifying(true);
    try {
      const res = await api.verifyAuditChain(activeProjectId);
      setVerificationResult(res);
    } catch (err: any) {
      alert(`Verification error: ${err.message}`);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">Cryptographic Audit & Integrity Ledger</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
              SHA-256 HASH CHAIN
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Append-only, mathematically linked audit records. Every upload, extraction, manual edit, and compliance decision is recorded with a link to the previous record's hash.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all font-mono"
          >
            <Shield className="w-4 h-4" />
            <span>{verifying ? 'Verifying Hashes...' : 'Verify Audit Chain'}</span>
          </button>
        </div>
      </div>

      {/* Verification Result Banner */}
      {verificationResult && (
        <div className={`p-4 rounded-xl border flex items-center justify-between font-mono text-xs ${
          verificationResult.is_valid 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
            : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
          <div className="flex items-center gap-3">
            {verificationResult.is_valid ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <AlertTriangle className="w-5 h-5 text-red-400" />}
            <div>
              <div className="font-bold text-sm">
                {verificationResult.is_valid ? 'Cryptographic Chain Integrity Confirmed' : 'Tamper Alert Detected'}
              </div>
              <div className="text-slate-300 text-xs font-sans mt-0.5">{verificationResult.message}</div>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-slate-900 rounded border border-slate-700">
            {verificationResult.verified_records_count} Records Validated
          </span>
        </div>
      )}

      {/* Audit Notice Box */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400 leading-relaxed font-sans">
        <span className="font-bold text-slate-200">Notice on Cryptographic Assurance: </span>
        Hash chaining provides <span className="text-blue-400 font-semibold">tamper-evidence</span> (any retroactive modification of historical requirements or decisions breaks downstream hashes). It does not substitute for external regulatory sign-offs.
      </div>

      {/* Audit Ledger Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Index</th>
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Target</th>
                <th className="py-3 px-4">Previous Hash</th>
                <th className="py-3 px-4">Record SHA-256 Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {records.length > 0 ? (
                records.map(rec => (
                  <tr key={rec.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-blue-400">
                      #{rec.record_index}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {new Date(rec.timestamp).toISOString().replace('T', ' ').slice(0, 19)}
                    </td>
                    <td className="py-3 px-4 text-amber-300">
                      {rec.actor}
                    </td>
                    <td className="py-3 px-4 text-slate-200 font-bold">
                      {rec.action}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {rec.target_type}: {rec.target_id}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[10px] truncate max-w-[120px]" title={rec.prev_record_hash || ''}>
                      {rec.prev_record_hash ? rec.prev_record_hash.slice(0, 10) + '...' : 'GENESIS'}
                    </td>
                    <td className="py-3 px-4 text-emerald-400 text-[10px] font-bold truncate max-w-[140px]" title={rec.record_hash}>
                      {rec.record_hash.slice(0, 14)}...
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-sans">
                    {loading ? 'Loading audit ledger...' : 'No audit records found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}


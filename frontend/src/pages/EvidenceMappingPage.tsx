import React, { useState, useEffect } from 'react';
import { 
  GitMerge, Check, X, RefreshCw, ArrowRight, ShieldCheck, 
  AlertTriangle, Filter, Search 
} from 'lucide-react';
import { api } from '../services/api';
import { EvidenceMapping, Requirement, EvidenceRecord } from '../types';

export function EvidenceMappingPage() {
  const [mappings, setMappings] = useState<EvidenceMapping[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const activeProjectId = localStorage.getItem('eere_active_project_id') || '';

  useEffect(() => {
    if (activeProjectId) {
      Promise.all([
        api.getMappings(activeProjectId),
        api.getRequirements(activeProjectId),
        api.getEvidence(activeProjectId)
      ])
        .then(([m, r, e]) => {
          setMappings(m);
          setRequirements(r);
          setEvidence(e);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [activeProjectId]);

  const handleUpdateStatus = async (mappingId: string, newStatus: string) => {
    try {
      await api.updateMappingStatus(activeProjectId, mappingId, newStatus);
      setMappings(prev => prev.map(m => m.id === mappingId ? { ...m, status: newStatus as any } : m));
    } catch (err: any) {
      alert(`Mapping update error: ${err.message}`);
    }
  };

  const filtered = mappings.filter(m => filterStatus === 'ALL' || m.status === filterStatus);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">4-Way Hybrid Semantic Mapping</h1>
          <p className="text-xs text-slate-400 mt-1">
            Hybrid alignment of requirements and evidence candidates. Scores combine Semantic (45%), Keyword (20%), Parameter (20%), and Context (15%) with hard dimension gating.
          </p>
        </div>

        {/* Status Filters */}
        <div className="flex gap-2">
          {['ALL', 'auto_accepted', 'in_review', 'rejected'].map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-colors ${
                filterStatus === st 
                  ? 'bg-blue-600 text-white font-bold' 
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Mapping Cards List */}
      {filtered.length > 0 ? (
        <div className="space-y-4">
        {filtered.map(mapItem => {
          const req = requirements.find(r => r.id === mapItem.requirement_id);
          const ev = evidence.find(e => e.id === mapItem.evidence_id);

          return (
            <div 
              key={mapItem.id}
              className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-4"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-blue-400">
                    {req?.req_id || 'REQ'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-mono text-xs text-emerald-400">
                    {ev?.statement_type === 'measured_result' ? 'Physical Test Report' : 'Design Document'}
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                    mapItem.status === 'auto_accepted' ? 'bg-emerald-500/20 text-emerald-400' :
                    mapItem.status === 'in_review' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {mapItem.status}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-white">
                    Composite Score: {(mapItem.score_composite * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Dual-Card Side by Side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Left: Requirement Card */}
                <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                  <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">Requirement Target</span>
                  <p className="text-xs text-slate-200 font-medium">{req?.statement || 'Requirement statement'}</p>
                  <div className="text-[11px] font-mono text-slate-400">
                    Parameter: <span className="text-amber-400">{req?.parameter}</span>
                  </div>
                </div>

                {/* Right: Evidence Card */}
                <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                  <span className="text-[10px] font-mono uppercase text-slate-500 font-bold">Matched Evidence Candidate</span>
                  <p className="text-xs text-slate-200 font-medium">{ev?.raw_statement || 'Evidence statement'}</p>
                  <div className="text-[11px] font-mono text-slate-400">
                    Value: <span className="text-emerald-400 font-bold">{ev?.value} {ev?.unit || ''}</span>
                  </div>
                </div>

              </div>

              {/* 4 Score Breakdown Bars */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-slate-400">
                    <span>Semantic (45%):</span>
                    <span>{(mapItem.score_semantic * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${mapItem.score_semantic * 100}%` }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-slate-400">
                    <span>Keyword (20%):</span>
                    <span>{(mapItem.score_keyword * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${mapItem.score_keyword * 100}%` }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-slate-400">
                    <span>Parameter (20%):</span>
                    <span>{(mapItem.score_parameter * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${mapItem.score_parameter * 100}%` }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-slate-400">
                    <span>Context (15%):</span>
                    <span>{(mapItem.score_context * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${mapItem.score_context * 100}%` }} />
                  </div>
                </div>
              </div>

              {/* Reviewer Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => handleUpdateStatus(mapItem.id, 'auto_accepted')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Accept Mapping</span>
                </button>
                <button
                  onClick={() => handleUpdateStatus(mapItem.id, 'rejected')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-slate-700 rounded text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reject Match</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
      ) : (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 space-y-3">
          <GitMerge className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">No evidence mappings found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {mappings.length === 0
              ? "Upload both Specification and Test/Design PDFs to generate 4-way hybrid semantic alignments."
              : "No mappings matched the selected status filter."}
          </p>
        </div>
      )}

    </div>
  );
}


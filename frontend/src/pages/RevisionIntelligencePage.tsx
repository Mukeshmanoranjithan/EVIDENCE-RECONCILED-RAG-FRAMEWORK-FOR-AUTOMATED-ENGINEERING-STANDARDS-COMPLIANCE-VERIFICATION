import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, GitCommit, AlertTriangle, ArrowRight, CheckCircle2, 
  XCircle, Clock, ShieldAlert, FileText, ChevronRight, Sliders, UploadCloud
} from 'lucide-react';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';

interface RevisionRecord {
  id: string;
  document_id: string;
  document_name: string;
  revision_tag: string;
  file_hash: string;
  created_at: string;
}

export function RevisionIntelligencePage() {
  const navigate = useNavigate();
  const activeProjectId = localStorage.getItem('eere_active_project_id') || '';
  const [revisions, setRevisions] = useState<RevisionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeProjectId) {
      setLoading(false);
      return;
    }
    api.getRevisions(activeProjectId)
      .then(setRevisions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeProjectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mr-3" />
        Loading revision intelligence...
      </div>
    );
  }

  if (revisions.length < 2) {
    return (
      <div className="flex flex-col h-full bg-slate-950 text-slate-100">
        {/* Header */}
        <div className="h-14 border-b border-slate-800 bg-slate-900 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-cyan-400" />
            <h1 className="font-semibold text-slate-100 text-sm">Revision Intelligence & Stale Evidence Detection</h1>
          </div>
          <span className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-400 font-mono">
            {revisions.length} Revision{revisions.length === 1 ? '' : 's'} Registered
          </span>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4">
            <GitCommit className="w-8 h-8 text-cyan-400" />
          </div>
          <h2 className="text-lg font-bold text-slate-100 mb-2">No Document Revisions to Compare</h2>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            Revision Intelligence detects spec changes and flags stale test evidence when updated documents are uploaded. 
            Upload an updated version of a document in Document Intelligence to compare revisions side-by-side.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/documents')}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-cyan-600/20"
            >
              <UploadCloud className="w-4 h-4" />
              Upload New Revision
            </button>
            <button
              onClick={() => navigate('/new-analysis')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              Run New Project Analysis
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Header */}
      <div className="h-14 border-b border-slate-800 bg-slate-900 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-cyan-400" />
          <h1 className="font-semibold text-slate-100 text-sm">Revision Intelligence & Stale Evidence Detection</h1>
          <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">
            {revisions.length} Tracked Revisions
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-4">
        <div className="text-xs font-mono uppercase text-slate-400">Project Revision History</div>
        <div className="space-y-3">
          {revisions.map((rev) => (
            <div key={rev.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-100">{rev.document_name}</div>
                <div className="text-xs text-cyan-400 font-mono mt-1">Revision: {rev.revision_tag}</div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">SHA-256: {rev.file_hash}</div>
              </div>
              <div className="text-right text-xs text-slate-400 font-mono">
                {new Date(rev.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

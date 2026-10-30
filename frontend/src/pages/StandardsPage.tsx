import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Search, ShieldCheck, ExternalLink, 
  Layers, ChevronRight, Hash, Bookmark, CheckCircle2, UploadCloud
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Requirement } from '../types';

interface StandardItem {
  id: string;
  code: string;
  title: string;
  version: string;
  clauses_count: number;
  clauses: Array<{
    id: string;
    clause_number: string;
    title: string;
    text_excerpt: string;
    category: string;
  }>;
}

export function StandardsPage() {
  const navigate = useNavigate();
  const activeProjectId = localStorage.getItem('eere_active_project_id') || '';
  const [standards, setStandards] = useState<StandardItem[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [selectedStandard, setSelectedStandard] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeProjectId) {
      setLoading(false);
      return;
    }

    Promise.all([
      api.getStandards(activeProjectId),
      api.getRequirements(activeProjectId)
    ]).then(([stds, reqs]) => {
      setStandards(stds);
      setRequirements(reqs);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [activeProjectId]);

  const allClauses = standards.flatMap(s => 
    s.clauses.map(c => ({
      ...c,
      standardCode: s.code,
      standardTitle: s.title
    }))
  );

  const filteredClauses = allClauses.filter(c => {
    const matchesStd = selectedStandard === 'ALL' || c.standardCode === selectedStandard;
    const matchesSearch = !searchQuery || 
      c.clause_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.text_excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStd && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mr-3" />
        Loading regulatory standards...
      </div>
    );
  }

  if (standards.length === 0 || allClauses.length === 0) {
    return (
      <div className="flex flex-col h-full bg-slate-950 text-slate-100">
        <div className="h-14 border-b border-slate-800 bg-slate-900 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <h1 className="font-semibold text-slate-100 text-sm">Standards Knowledge Base & Clause Linkage</h1>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-indigo-400" />
          </div>
          <h2 className="text-lg font-bold text-slate-100 mb-2">No Regulatory Standards Linked</h2>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            Standards and compliance clauses are indexed when engineering specifications with regulatory references 
            (e.g., RTCA DO-160G, ISO 26262, MIL-STD) are processed into your project.
          </p>
          <button
            onClick={() => navigate('/documents')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-indigo-600/20"
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
          <BookOpen className="w-5 h-5 text-indigo-400" />
          <h1 className="font-semibold text-slate-100 text-sm">Standards Knowledge Base & Clause Linkage</h1>
          <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
            {allClauses.length} Indexed Regulatory Clauses
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search clause, keyword, title..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Column: Standards Filter List */}
        <div className="w-80 border-r border-slate-800 bg-slate-900/40 p-4 space-y-3 shrink-0 overflow-y-auto">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-2">
            Standards Catalog
          </div>

          <div
            onClick={() => setSelectedStandard('ALL')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              selectedStandard === 'ALL'
                ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300'
                : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="text-xs font-bold">All Regulatory Standards</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{allClauses.length} Total Clauses</div>
          </div>

          {standards.map(std => {
            const isSelected = selectedStandard === std.code;
            return (
              <div
                key={std.id}
                onClick={() => setSelectedStandard(std.code)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-slate-100">{std.code}</span>
                  <span className="text-[10px] font-mono text-indigo-400 font-semibold">{std.version}</span>
                </div>
                <div className="text-xs text-slate-300 mt-1 line-clamp-1">{std.title}</div>
                <div className="text-[10px] text-slate-500 font-mono mt-1">{std.clauses_count} Clauses</div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Clauses List */}
        <div className="flex-1 bg-slate-950 p-6 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-mono text-slate-400 uppercase">
              Showing {filteredClauses.length} Clauses
            </span>
          </div>

          <div className="space-y-3">
            {filteredClauses.map(clause => (
              <div key={clause.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-indigo-400">{clause.standardCode}</span>
                    <span className="text-slate-600">•</span>
                    <span className="font-mono text-xs font-semibold text-slate-200">{clause.clause_number}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                    {clause.category || 'General'}
                  </span>
                </div>

                <h3 className="text-xs font-semibold text-slate-100">{clause.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed font-serif italic">
                  "{clause.text_excerpt}"
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

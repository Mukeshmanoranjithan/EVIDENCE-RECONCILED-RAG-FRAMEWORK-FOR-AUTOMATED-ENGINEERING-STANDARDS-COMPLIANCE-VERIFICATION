import React, { useState, useEffect } from 'react';
import { 
  Layers, Search, Filter, Edit3, Check, X, 
  HelpCircle, Sparkles, ChevronRight, CheckCircle, AlertTriangle, RotateCcw
} from 'lucide-react';
import { api } from '../services/api';
import { Requirement } from '../types';

export function RequirementExplorerPage() {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTokens, setSearchTokens] = useState<string[]>([]);
  const [nlQuery, setNlQuery] = useState('');
  const [generatedFilter, setGeneratedFilter] = useState<string | null>(null);
  const [editingReqId, setEditingReqId] = useState<string | null>(null);
  const [editStatement, setEditStatement] = useState('');
  const [editReason, setEditReason] = useState('');

  const activeProjectId = localStorage.getItem('eere_active_project_id') || '';

  useEffect(() => {
    if (activeProjectId) {
      api.getRequirements(activeProjectId)
        .then(setRequirements)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [activeProjectId]);

  const handleApplyNlQuery = (q: string) => {
    setNlQuery(q);
    const trimmed = q.trim();
    if (!trimmed) {
      setSearchTokens([]);
      setGeneratedFilter(null);
      return;
    }

    const stopWords = new Set([
      'show', 'find', 'get', 'list', 'all', 'where', 'is', 'the', 'a', 'an', 
      'requirements', 'requirement', 'reqs', 'req', 'limit', 'limits', 
      'matching', 'with', 'criteria', 'that', 'for', 'in', 'of', 'me'
    ]);

    // Tokenize, strip punctuation and stop words
    const rawTokens = trimmed
      .toLowerCase()
      .replace(/['"(),;:]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 0 && !stopWords.has(t));

    // If query was just stop words or empty, fall back to trimmed string
    const tokens = rawTokens.length > 0 ? rawTokens : [trimmed.toLowerCase()];
    setSearchTokens(tokens);

    // Human-readable generated filter explanation
    const filterDesc = tokens.map(t => `contains("${t}")`).join(' AND ');
    setGeneratedFilter(filterDesc || `search("${trimmed}")`);
  };

  const handleClearQuery = () => {
    setNlQuery('');
    setSearchTokens([]);
    setGeneratedFilter(null);
  };

  const handleStartEdit = (req: Requirement) => {
    setEditingReqId(req.req_id);
    setEditStatement(req.statement);
    setEditReason('');
  };

  const handleSaveEdit = async (reqId: string) => {
    if (!editReason.trim()) {
      alert('Mandatory audit requirement: You must provide a formal reason for modifying requirement statements.');
      return;
    }
    try {
      await api.updateRequirement(activeProjectId, reqId, {
        statement: editStatement,
        reason: editReason
      });
      setRequirements(prev => prev.map(r => r.req_id === reqId ? { ...r, statement: editStatement } : r));
      setEditingReqId(null);
      alert(`Correction recorded in cryptographic audit ledger for ${reqId}.`);
    } catch (err: any) {
      alert(`Edit error: ${err.message}`);
    }
  };

  // Filter requirements against tokens (handling underscores, spaces, req_id, statement, category)
  const filtered = requirements.filter(r => {
    if (searchTokens.length === 0) return true;

    const searchableText = [
      r.req_id,
      r.statement,
      r.parameter,
      r.parameter.replace(/_/g, ' '),
      r.category,
      r.priority,
      r.unit || '',
      r.operator
    ].join(' ').toLowerCase();

    // Must match all tokens
    return searchTokens.every(token => {
      const tokenWithUnderscores = token.replace(/\s+/g, '_');
      const tokenWithSpaces = token.replace(/_/g, ' ');
      return (
        searchableText.includes(token) ||
        searchableText.includes(tokenWithUnderscores) ||
        searchableText.includes(tokenWithSpaces)
      );
    });
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3" />
        Loading Requirements...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Requirement Explorer</h1>
          <p className="text-xs text-slate-400 mt-1">
            Faceted browsing, natural-language query parsing, and audit-logged manual corrections.
          </p>
        </div>
        <div className="text-xs font-mono text-slate-400">
          Total: <strong className="text-blue-400">{requirements.length}</strong> Requirements
        </div>
      </div>

      {/* Natural Language Query Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
        <div className="flex items-center justify-between text-xs font-mono text-slate-300">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span>Natural-Language Requirement Query</span>
          </div>
          {searchTokens.length > 0 && (
            <button
              onClick={handleClearQuery}
              className="text-slate-400 hover:text-slate-200 flex items-center gap-1 text-[11px]"
            >
              <RotateCcw className="w-3 h-3" />
              Clear Filter
            </button>
          )}
        </div>
        
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={nlQuery}
              onChange={(e) => {
                setNlQuery(e.target.value);
                if (!e.target.value.trim()) {
                  setSearchTokens([]);
                  setGeneratedFilter(null);
                }
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyNlQuery(nlQuery)}
              placeholder="e.g. 'show max_operating_altitude', 'find altitude', 'thermal limits', 'REQ-201'..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-8 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
            />
            {nlQuery && (
              <button
                onClick={handleClearQuery}
                className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300 text-xs"
              >
                ✕
              </button>
            )}
          </div>
          <button
            onClick={() => handleApplyNlQuery(nlQuery)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold font-mono transition-colors shadow-md"
          >
            Parse Query
          </button>
        </div>

        {/* Transparent generated filter badge */}
        {generatedFilter && (
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
            <div className="flex items-center gap-2">
              <span>Deterministic Filter Applied:</span>
              <span className="px-2 py-0.5 rounded bg-blue-950 border border-blue-500/40 text-blue-300">
                {generatedFilter}
              </span>
              <span className="text-slate-500">({filtered.length} matched)</span>
            </div>
          </div>
        )}
      </div>

      {/* Requirements List */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map(req => (
            <div 
              key={req.id}
              className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-3 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-bold text-blue-400">{req.req_id}</span>
                  {req.parent_req_id && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      Child of {req.parent_req_id}
                    </span>
                  )}
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                    {req.priority}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">Category: {req.category}</span>
                </div>

                <div className="flex items-center gap-2">
                  {editingReqId !== req.req_id && (
                    <button
                      onClick={() => handleStartEdit(req)}
                      className="px-2.5 py-1 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded flex items-center gap-1 font-mono transition-colors"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>
              </div>

              {editingReqId === req.req_id ? (
                <div className="space-y-3 p-4 bg-slate-950 border border-slate-800 rounded-lg">
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">Statement</label>
                    <textarea
                      value={editStatement}
                      onChange={(e) => setEditStatement(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white focus:outline-none"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">
                      Reason for Modification (Mandatory Audit Trail)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Corrected OCR unit typo from spec p. 4"
                      value={editReason}
                      onChange={(e) => setEditReason(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => setEditingReqId(null)}
                      className="px-3 py-1 text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveEdit(req.req_id)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold"
                    >
                      Save & Log Audit Record
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm font-medium text-slate-200 leading-relaxed">{req.statement}</p>
              )}

              <div className="flex items-center justify-between text-xs font-mono text-slate-500 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-4">
                  <span>Parameter: <span className="text-slate-300 font-semibold">{req.parameter}</span></span>
                  <span>Threshold: <span className="text-amber-400 font-semibold">{req.operator} {req.threshold} {req.unit || ''}</span></span>
                  {req.condition_context && (
                    <span>Condition: <span className="text-slate-300">{req.condition_context}</span></span>
                  )}
                </div>
                <span>Page {req.page}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 space-y-3">
          <Layers className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300">No matching requirements found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {requirements.length === 0 
              ? "Upload a Specification PDF in New Analysis or Document Intelligence to extract requirements." 
              : `No requirements matched the search for "${nlQuery}".`}
          </p>
          {requirements.length > 0 && searchTokens.length > 0 && (
            <button
              onClick={handleClearQuery}
              className="mt-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg font-mono"
            >
              Clear Search & Show All ({requirements.length}) Requirements
            </button>
          )}
        </div>
      )}

    </div>
  );
}

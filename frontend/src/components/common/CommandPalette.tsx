import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Shield, Activity, GitMerge, Sliders, FileText, CheckCircle, 
  HelpCircle, AlertTriangle, Play, BookOpen, MessageSquare, RefreshCw 
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  requirements?: Array<{ req_id: string; statement: string; status?: string }>;
}

export function CommandPalette({ isOpen, onClose, requirements = [] }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const navItems = [
    { name: 'Command Center', path: '/', icon: Activity, group: 'Navigation' },
    { name: 'Projects', path: '/projects', icon: Shield, group: 'Navigation' },
    { name: 'New Analysis Wizard', path: '/analysis/new', icon: Play, group: 'Navigation' },
    { name: 'Requirement Explorer', path: '/requirements', icon: FileText, group: 'Analyze' },
    { name: 'Evidence Mapping', path: '/mapping', icon: GitMerge, group: 'Analyze' },
    { name: 'AI Reconciliation', path: '/reconciliation', icon: CheckCircle, group: 'Analyze' },
    { name: 'Dependency Graph', path: '/graph', icon: GitMerge, group: 'Analyze' },
    { name: 'Review Queue', path: '/review-queue', icon: AlertTriangle, group: 'Assure' },
    { name: 'What-If Simulator', path: '/simulator', icon: Sliders, group: 'Assure' },
    { name: 'Standards Knowledge Base', path: '/standards', icon: BookOpen, group: 'Knowledge' },
    { name: 'AI Engineering Assistant', path: '/assistant', icon: MessageSquare, group: 'Knowledge' },
    { name: 'Audit & Integrity Ledger', path: '/audit', icon: Shield, group: 'Govern' },
    { name: 'Compliance Reports', path: '/reports', icon: FileText, group: 'Govern' },
    { name: 'Settings & Presets', path: '/settings', icon: Sliders, group: 'Govern' },
  ];

  const filteredNav = navItems.filter(item => item.name.toLowerCase().includes(query.toLowerCase()));
  const filteredReqs = requirements.filter(r => 
    r.req_id.toLowerCase().includes(query.toLowerCase()) || 
    r.statement.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-start justify-center pt-20 p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Search input header */}
        <div className="flex items-center px-4 border-b border-slate-800">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search requirements (e.g. REQ-001), pages, actions... (Esc to close)"
            className="w-full px-3 py-4 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none font-mono"
          />
          <kbd className="px-2 py-0.5 text-[10px] font-mono bg-slate-800 text-slate-400 rounded border border-slate-700">ESC</kbd>
        </div>

        {/* Results list */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-4">
          
          {/* Quick Actions */}
          {query.length === 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-mono text-slate-500 uppercase tracking-wider">Quick Actions</div>
              <button
                onClick={() => { navigate('/analysis/new'); onClose(); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 text-left text-xs text-blue-400 hover:text-blue-300 font-medium"
              >
                <Play className="w-4 h-4" />
                <span>Create New Project & Ingest Compliance PDFs</span>
              </button>
            </div>
          )}

          {/* Requirements Matches */}
          {filteredReqs.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-mono text-slate-500 uppercase tracking-wider">Requirements</div>
              {filteredReqs.slice(0, 5).map(req => (
                <button
                  key={req.req_id}
                  onClick={() => {
                    navigate(`/reconciliation?req=${req.req_id}`);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-800 text-left transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-400">{req.req_id}</span>
                    <span className="text-xs text-slate-300 truncate max-w-md">{req.statement}</span>
                  </div>
                  {req.status && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      {req.status}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Navigation Pages */}
          {filteredNav.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-mono text-slate-500 uppercase tracking-wider">Pages</div>
              {filteredNav.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-800 text-left text-xs text-slate-300 hover:text-white transition-colors"
                  >
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span>{item.name}</span>
                    <span className="ml-auto text-[10px] font-mono text-slate-500">{item.group}</span>
                  </button>
                );
              })}
            </div>
          )}

          {filteredNav.length === 0 && filteredReqs.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-500">
              No matching requirements or pages found for "{query}".
            </div>
          )}

        </div>

      </div>
    </div>
  );
}


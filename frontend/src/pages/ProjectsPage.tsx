import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, Play, Plus, Clock, FileText, CheckCircle, 
  ExternalLink, Folder, Trash2, Search 
} from 'lucide-react';
import { api } from '../services/api';
import { Project } from '../types';

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.getProjects()
      .then(setProjects)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (id: string) => {
    localStorage.setItem('eere_active_project_id', id);
    window.location.href = '/reconciliation';
  };

  const handleDeleteProject = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete project "${name}"?\nThis will remove all associated requirements, evidence records, and upload files from disk.`)) {
      return;
    }
    try {
      await api.deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
      if (localStorage.getItem('eere_active_project_id') === id) {
        localStorage.removeItem('eere_active_project_id');
      }
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const filtered = projects.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.domain.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Engineering Projects</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your compliance workspaces. Everything is strictly derived from your uploaded project documents.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/analysis/new')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-600/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Project</span>
          </button>
        </div>
      </div>

      {/* Search Bar if projects exist */}
      {projects.length > 0 && (
        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search projects by name or domain..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 font-mono"
          />
        </div>
      )}

      {/* Projects Grid or Empty State */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(proj => (
            <div
              key={proj.id}
              onClick={() => handleSelect(proj.id)}
              className="p-5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl cursor-pointer transition-all hover:shadow-xl space-y-4 group flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300">
                    {proj.domain}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-500">Preset: {proj.preset}</span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteProject(e, proj.id, proj.name)}
                      className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors"
                      title={`Delete ${proj.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h2 className="font-bold text-base text-white group-hover:text-blue-400 transition-colors">
                  {proj.name}
                </h2>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {proj.description || 'No description provided.'}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 font-mono">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(proj.created_at).toLocaleDateString()}</span>
                </div>
                <span className="text-blue-400 font-sans text-xs group-hover:underline">Open Workspace →</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Clear Empty State */
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mx-auto text-blue-400">
            <Folder className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No engineering projects found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Get started by creating your first project workspace. Upload your engineering Specification and Test Reports to automatically extract requirements, map evidence, and run deterministic compliance audits.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => navigate('/analysis/new')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Project</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

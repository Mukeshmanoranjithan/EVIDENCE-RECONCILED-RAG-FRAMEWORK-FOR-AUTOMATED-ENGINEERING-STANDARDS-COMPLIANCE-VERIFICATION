import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, CheckCircle, XCircle, AlertTriangle, Eye, ArrowUpRight, 
  Clock, FileText, Activity, RefreshCw, ChevronRight, Layers, Play, FolderPlus 
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { api } from '../services/api';
import { ReconciliationResult, Project } from '../types';

export function CommandCenterPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [reconciliation, setReconciliation] = useState<ReconciliationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const activeProjectId = localStorage.getItem('eere_active_project_id') || '';

  useEffect(() => {
    Promise.all([
      api.getProjects(),
      activeProjectId ? api.getReconciliation(activeProjectId).catch(() => []) : Promise.resolve([])
    ])
      .then(([projs, recs]) => {
        setProjects(projs);
        setReconciliation(recs);
      })
      .finally(() => setLoading(false));
  }, [activeProjectId]);

  const activeProject = projects.find(p => p.id === activeProjectId);

  const totalReqs = reconciliation.length;
  const compliant = reconciliation.filter(r => r.status === 'COMPLIANT').length;
  const nonCompliant = reconciliation.filter(r => r.status === 'NON_COMPLIANT').length;
  const conflicts = reconciliation.filter(r => r.status === 'CONFLICT').length;
  const unverifiable = reconciliation.filter(r => r.status === 'UNVERIFIABLE').length;
  const needsReview = reconciliation.filter(r => r.status === 'NEEDS_REVIEW').length;
  const compRate = totalReqs > 0 ? ((compliant / totalReqs) * 100).toFixed(1) : '0.0';

  const donutData = totalReqs > 0 ? [
    { name: 'Compliant', value: compliant, color: '#10B981' },
    { name: 'Non-Compliant', value: nonCompliant, color: '#EF4444' },
    { name: 'Conflict', value: conflicts, color: '#F97316' },
    { name: 'Unverifiable', value: unverifiable, color: '#64748B' },
    { name: 'Needs Review', value: needsReview, color: '#F59E0B' },
  ].filter(d => d.value > 0) : [];

  const attentionItems = reconciliation.filter(r => r.status !== 'COMPLIANT');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Compliance Command Center</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time compliance telemetry, risk indicators, and audit-ready verification for {activeProject?.name || 'Active Project'}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/analysis/new')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-blue-600/20 transition-colors"
          >
            <Play className="w-3.5 h-3.5" />
            <span>New Analysis</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid - All numbers derived from actual database records */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Reqs</span>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{totalReqs}</div>
          <div className="text-[10px] text-slate-500 font-mono">From uploaded documents</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Compliance Rate</span>
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{compRate}%</div>
          <div className="text-[10px] text-emerald-500 font-mono">{compliant} of {totalReqs} satisfied</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Non-Compliant</span>
            <XCircle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400 font-mono">{nonCompliant}</div>
          <div className="text-[10px] text-red-500 font-mono">Violated limits</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Unverifiable</span>
            <Eye className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-300 font-mono">{unverifiable}</div>
          <div className="text-[10px] text-slate-500 font-mono">Missing test data</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Conflicts / Review</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">{conflicts + needsReview}</div>
          <div className="text-[10px] text-amber-500 font-mono">Requires attention</div>
        </div>

      </div>

      {/* Main Visuals: Donut Chart & Needs Attention Queue */}
      {totalReqs > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Compliance Donut Card (5 cols) */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-200">Compliance Distribution</h2>
              <span className="text-[10px] font-mono text-slate-400">Strict Rule-Based</span>
            </div>

            <div className="h-56 w-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0B0F17', borderColor: '#1E293B', borderRadius: '8px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              
              <div className="absolute flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-white font-mono">{compRate}%</span>
                <span className="text-[10px] text-slate-400 font-mono uppercase">Verified</span>
              </div>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-800 text-xs font-mono">
              {donutData.map(item => (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-400">{item.name}:</span>
                  <span className="font-semibold text-white ml-auto">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Needs Your Attention List (7 cols) */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-200">Needs Your Attention</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300">
                  {attentionItems.length} items
                </span>
              </div>
              <button
                onClick={() => navigate('/review-queue')}
                className="text-xs text-blue-400 hover:text-blue-300 font-mono flex items-center gap-1"
              >
                <span>Review Queue</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 max-h-80 pr-1">
              {attentionItems.length > 0 ? (
                attentionItems.map(item => (
                  <div 
                    key={item.id}
                    onClick={() => navigate(`/reconciliation?req=${item.req_code}`)}
                    className="p-3 bg-slate-950 hover:bg-slate-800/80 border border-slate-800/80 hover:border-slate-700 rounded-lg cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div className="space-y-1 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white group-hover:text-blue-400 transition-colors">
                          {item.req_code}
                        </span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          item.status === 'NON_COMPLIANT' ? 'bg-red-500/20 text-red-400' :
                          item.status === 'CONFLICT' ? 'bg-orange-500/20 text-orange-400' :
                          item.status === 'NEEDS_REVIEW' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1">{item.reason}</p>
                    </div>

                    <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors shrink-0" />
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 text-xs">
                  <CheckCircle className="w-8 h-8 text-emerald-500 mb-2" />
                  <p className="font-semibold text-slate-300">All Requirements Satisfied</p>
                  <p>All requirements are fully verified and compliant.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      ) : (
        /* Zero State when project has no requirements */
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Layers className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No requirements analyzed yet</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {activeProject 
                ? `Project '${activeProject.name}' has no extracted requirements. Upload your Specification and Test PDFs to begin analysis.`
                : 'No project selected. Create or select a project to view compliance telemetry.'}
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => navigate('/analysis/new')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md transition-colors font-mono"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Launch Analysis Wizard</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

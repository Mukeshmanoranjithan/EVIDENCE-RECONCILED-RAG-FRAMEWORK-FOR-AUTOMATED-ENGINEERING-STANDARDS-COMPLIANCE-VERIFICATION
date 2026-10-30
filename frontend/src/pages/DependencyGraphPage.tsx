import React, { useState, useEffect } from 'react';
import { 
  GitMerge, AlertTriangle, ShieldCheck, Filter, RefreshCw, 
  Layers, ArrowRight, CornerDownRight, Zap, Info, ChevronRight, CheckCircle2, XCircle, Plus, Trash2, Link2
} from 'lucide-react';
import { api } from '../services/api';
import { Requirement, ReconciliationResult } from '../types';

interface GraphNode {
  id: string;
  code: string;
  label: string;
  category: string;
  status: string;
  depth: number;
  parents: string[];
  children: string[];
}

interface DependencyRecord {
  id: string;
  source_req_id: string;
  target_req_id: string;
  dependency_type: string;
  status: string;
}

export function DependencyGraphPage() {
  const [projectId] = useState<string>(() => localStorage.getItem('eere_active_project_id') || '');
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [reconciliation, setReconciliation] = useState<ReconciliationResult[]>([]);
  const [dependencies, setDependencies] = useState<DependencyRecord[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [filterImpactedOnly, setFilterImpactedOnly] = useState<boolean>(false);
  const [simulateFailureId, setSimulateFailureId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Link Dependency Modal
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkSource, setLinkSource] = useState('');
  const [linkTarget, setLinkTarget] = useState('');
  const [linkType, setLinkType] = useState('functional');
  const [isLinking, setIsLinking] = useState(false);

  const loadData = () => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    Promise.all([
      api.getRequirements(projectId),
      api.getReconciliation(projectId),
      api.getDependencies(projectId).catch(() => [])
    ]).then(([reqs, recons, deps]) => {
      setRequirements(reqs);
      setReconciliation(recons);
      setDependencies(deps);
      if (reqs.length > 0 && !selectedNodeId) {
        setSelectedNodeId(reqs[0].req_id);
      }
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  // Construct DAG nodes and dependencies
  const statusMap = new Map(reconciliation.map(r => [r.req_code, r.status]));

  // Combine parent_req_id and explicit dependencies table
  const nodes: GraphNode[] = requirements.map((req) => {
    const code = req.req_id;
    
    // Parents: parent_req_id + any dependency where target is this req
    const depParents = dependencies.filter(d => d.target_req_id === code).map(d => d.source_req_id);
    const parents: string[] = req.parent_req_id ? [req.parent_req_id, ...depParents] : depParents;

    // Children: sub-requirements + any dependency where source is this req
    const subReqChildren = requirements.filter(r => r.parent_req_id === code).map(r => r.req_id);
    const depChildren = dependencies.filter(d => d.source_req_id === code).map(d => d.target_req_id);
    const children: string[] = Array.from(new Set([...subReqChildren, ...depChildren]));

    const depth = parents.length > 0 ? 1 : 0;

    return {
      id: req.id,
      code,
      label: req.statement,
      category: req.category,
      status: statusMap.get(code) || 'UNVERIFIABLE',
      depth,
      parents: Array.from(new Set(parents)),
      children
    };
  });

  // Calculate failure propagation downstream
  const getImpactedNodes = (rootCode: string): Set<string> => {
    const impacted = new Set<string>();
    const queue = [rootCode];
    while (queue.length > 0) {
      const current = queue.shift()!;
      impacted.add(current);
      const currNode = nodes.find(n => n.code === current);
      if (currNode) {
        currNode.children.forEach(ch => {
          if (!impacted.has(ch)) queue.push(ch);
        });
      }
    }
    return impacted;
  };

  const activeFailureImpacted = simulateFailureId ? getImpactedNodes(simulateFailureId) : new Set<string>();
  const selectedNode = nodes.find(n => n.code === selectedNodeId) || nodes[0];

  const handleCreateDependency = async () => {
    if (!linkSource || !linkTarget || linkSource === linkTarget || !projectId) return;
    setIsLinking(true);
    try {
      await api.createDependency(projectId, {
        source_req_id: linkSource,
        target_req_id: linkTarget,
        dependency_type: linkType
      });
      setShowLinkModal(false);
      setLinkSource('');
      setLinkTarget('');
      loadData();
    } catch (err: any) {
      alert(`Error linking dependency: ${err.message}`);
    } finally {
      setIsLinking(false);
    }
  };

  const handleDeleteDependency = async (depId: string) => {
    if (!projectId) return;
    try {
      await api.deleteDependency(projectId, depId);
      loadData();
    } catch (err: any) {
      alert(`Error removing dependency: ${err.message}`);
    }
  };

  const handleResetSimulation = () => {
    setSimulateFailureId(null);
    setFilterImpactedOnly(false);
  };

  const getStatusColor = (status: string, isFailedDownstream: boolean) => {
    if (isFailedDownstream) return 'bg-red-500/20 border-red-500 text-red-300 ring-2 ring-red-500/50 animate-pulse';
    switch (status) {
      case 'COMPLIANT': return 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300';
      case 'NON_COMPLIANT': return 'bg-red-500/20 border-red-500 text-red-300';
      case 'CONFLICT': return 'bg-amber-500/20 border-amber-500 text-amber-300';
      default: return 'bg-slate-900 border-slate-800 text-slate-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mr-3" />
        Loading System Dependency Graph...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Header */}
      <div className="h-14 border-b border-slate-800 bg-slate-900 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <GitMerge className="w-5 h-5 text-indigo-400" />
          <h1 className="font-semibold text-slate-100 text-sm">System Dependency & Failure-Propagation Graph</h1>
          <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
            {nodes.length} Requirements • {dependencies.length} Links
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Link Dependency Button */}
          <button
            onClick={() => {
              setLinkSource(selectedNode?.code || (nodes[0]?.code || ''));
              setLinkTarget(nodes.find(n => n.code !== selectedNode?.code)?.code || '');
              setShowLinkModal(true);
            }}
            className="text-xs px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 font-medium transition-colors shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            Link Dependency
          </button>

          {/* Simulate Failure Dropdown */}
          <div className="flex items-center gap-2 bg-slate-950 px-2 py-1 rounded border border-slate-800 text-xs text-slate-300">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Simulate Failure:</span>
            <select
              value={simulateFailureId || ''}
              onChange={e => {
                const val = e.target.value || null;
                setSimulateFailureId(val);
                if (!val) setFilterImpactedOnly(false);
              }}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="">None (Nominal Graph)</option>
              {nodes.map(n => (
                <option key={n.code} value={n.code}>{n.code} ({n.category})</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setFilterImpactedOnly(!filterImpactedOnly)}
            className={`text-xs px-3 py-1.5 rounded flex items-center gap-1.5 border transition-colors ${
              filterImpactedOnly 
                ? 'bg-red-600/30 border-red-500 text-red-200' 
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            {filterImpactedOnly ? 'Show All Nodes' : 'Filter Impacted Only'}
          </button>
        </div>
      </div>

      {/* Main Graph Canvas and Inspector */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Visual DAG Interactive Canvas */}
        <div className="flex-1 bg-slate-950 p-8 overflow-auto flex flex-col items-center relative">
          
          {/* Subtle Grid Background */}
          <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

          {/* Simulation Alert Banner */}
          {simulateFailureId && (
            <div className="w-full max-w-4xl mb-6 p-4 rounded-xl bg-red-950/80 border border-red-500/50 flex items-center justify-between text-xs text-red-200 shadow-xl backdrop-blur-sm z-10">
              <div className="flex items-center gap-3 font-medium">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 animate-bounce" />
                <div>
                  <div className="font-bold text-sm">Failure Blast Radius Active: Root Failure at {simulateFailureId}</div>
                  <div className="text-slate-300 text-xs mt-0.5">
                    {activeFailureImpacted.size > 1 ? (
                      <span><strong>{activeFailureImpacted.size - 1}</strong> dependent downstream subsystem(s) compromised and marked <strong className="text-red-400">IMPACTED</strong>.</span>
                    ) : (
                      <span>No downstream dependencies linked to <strong>{simulateFailureId}</strong> yet. Use <strong>"Link Dependency"</strong> above to link it to dependent subsystems.</span>
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={handleResetSimulation}
                className="text-xs px-3 py-1.5 rounded bg-red-900/60 hover:bg-red-900 border border-red-700 text-white font-semibold transition-colors"
              >
                Reset Simulation
              </button>
            </div>
          )}

          {/* Multi-Tier Layered DAG Visualizer */}
          <div className="space-y-12 relative z-0 w-full max-w-4xl py-4">
            
            {/* Level 0: Primary System Tier */}
            <div className="flex flex-col items-center">
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-widest mb-3">
                TIER 1: Primary System Specifications ({nodes.filter(n => n.depth === 0).length})
              </div>
              <div className="flex flex-wrap justify-center gap-6">
                {nodes.filter(n => n.depth === 0).map(node => {
                  const isImpacted = activeFailureImpacted.has(node.code);
                  if (filterImpactedOnly && !isImpacted) return null;
                  return (
                    <div
                      key={node.code}
                      onClick={() => setSelectedNodeId(node.code)}
                      className={`w-72 p-4 rounded-xl border cursor-pointer transition-all shadow-lg ${
                        selectedNodeId === node.code ? 'ring-2 ring-indigo-500' : ''
                      } ${getStatusColor(node.status, isImpacted)}`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-xs font-bold">{node.code}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                          isImpacted ? 'bg-red-500 text-white' : 'bg-slate-900/80 text-slate-300'
                        }`}>
                          {isImpacted ? 'IMPACTED' : node.status}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-slate-200 line-clamp-2">
                        {node.label}
                      </div>
                      {node.children.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-indigo-400 flex items-center gap-1">
                          <Link2 className="w-3 h-3" />
                          <span>Impacts {node.children.length} sub-system(s)</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Downward Connector if Tier 2 exists */}
            {nodes.some(n => n.depth > 0) && (
              <div className="w-full flex justify-center">
                <div className="w-0.5 h-8 bg-indigo-500/40" />
              </div>
            )}

            {/* Level 1: Subsystem & Environmental Tier */}
            {nodes.some(n => n.depth > 0) && (
              <div className="flex flex-col items-center">
                <div className="text-[11px] font-mono text-slate-400 uppercase tracking-widest mb-3">
                  TIER 2: Dependent Subsystems & Allocation ({nodes.filter(n => n.depth > 0).length})
                </div>
                <div className="flex flex-wrap justify-center gap-6">
                  {nodes.filter(n => n.depth > 0).map(node => {
                    const isImpacted = activeFailureImpacted.has(node.code);
                    if (filterImpactedOnly && !isImpacted) return null;
                    return (
                      <div
                        key={node.code}
                        onClick={() => setSelectedNodeId(node.code)}
                        className={`w-72 p-4 rounded-xl border cursor-pointer transition-all shadow-md ${
                          selectedNodeId === node.code ? 'ring-2 ring-indigo-500' : ''
                        } ${getStatusColor(node.status, isImpacted)}`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-mono text-xs font-bold">{node.code}</span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                            isImpacted ? 'bg-red-500 text-white' : 'bg-slate-900/80 text-slate-300'
                          }`}>
                            {isImpacted ? 'IMPACTED' : node.status}
                          </span>
                        </div>
                        <div className="text-xs font-medium text-slate-200 line-clamp-2">
                          {node.label}
                        </div>
                        <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] font-mono text-slate-400">
                          Depends on: <strong className="text-indigo-300">{node.parents.join(', ')}</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Right Inspector Panel */}
        <div className="w-88 border-l border-slate-800 bg-slate-900/60 p-5 flex flex-col shrink-0 overflow-y-auto">
          <div className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider mb-4">
            Requirement Dependency Details
          </div>

          {selectedNode ? (
            <div className="space-y-5 text-xs">
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/70 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-bold text-indigo-400">{selectedNode.code}</span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-200">
                    Tier {selectedNode.depth + 1}
                  </span>
                </div>
                <div className="text-slate-200 font-medium leading-relaxed">
                  {selectedNode.label}
                </div>
                <div className="pt-2 border-t border-slate-900 text-slate-400 flex justify-between">
                  <span>Category: <strong>{selectedNode.category}</strong></span>
                  <span>Status: <strong>{selectedNode.status}</strong></span>
                </div>
              </div>

              {/* Upstream Blockers */}
              <div>
                <div className="font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-blue-400 rotate-180" />
                  <span>Upstream Parents ({selectedNode.parents.length})</span>
                </div>
                {selectedNode.parents.length === 0 ? (
                  <div className="text-slate-500 italic p-2 bg-slate-950/40 rounded border border-slate-800">
                    Root level specification (No upstream parent)
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {selectedNode.parents.map(p => (
                      <div key={p} className="p-2 bg-slate-950 rounded border border-slate-800 font-mono text-indigo-300 flex items-center justify-between">
                        <span>{p}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Downstream Impact */}
              <div>
                <div className="font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                  <CornerDownRight className="w-3.5 h-3.5 text-amber-400" />
                  <span>Downstream Impact ({selectedNode.children.length})</span>
                </div>
                {selectedNode.children.length === 0 ? (
                  <div className="text-slate-500 italic p-2 bg-slate-950/40 rounded border border-slate-800">
                    Leaf requirement (No dependent sub-systems)
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {selectedNode.children.map(c => {
                      const dep = dependencies.find(d => d.source_req_id === selectedNode.code && d.target_req_id === c);
                      return (
                        <div key={c} className="p-2 bg-slate-950 rounded border border-slate-800 font-mono text-amber-300 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold">{c}</span>
                            {dep && <span className="text-[10px] text-slate-500">({dep.dependency_type})</span>}
                          </div>
                          {dep && (
                            <button
                              onClick={() => handleDeleteDependency(dep.id)}
                              className="text-red-400 hover:text-red-300 p-1"
                              title="Delete Link"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick Action Button */}
              <div className="pt-4 border-t border-slate-800 space-y-2">
                <button
                  onClick={() => setSimulateFailureId(selectedNode.code)}
                  className="w-full py-2 bg-red-950/60 hover:bg-red-900 border border-red-700/60 rounded text-red-200 font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Simulate Failure at {selectedNode.code}
                </button>
              </div>

            </div>
          ) : (
            <div className="text-slate-500 italic">Select a requirement node to inspect.</div>
          )}
        </div>

      </div>

      {/* Link Dependency Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-indigo-400" />
                <span>Link Requirement Dependency</span>
              </h3>
              <button 
                onClick={() => setShowLinkModal(false)}
                className="text-slate-400 hover:text-slate-200 text-xs font-mono"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Define an engineering dependency: if the <strong>Source</strong> requirement fails or its parameter changes, 
              the <strong>Target</strong> requirement is impacted.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-mono text-slate-300 mb-1">Source Requirement (Parent / Driver)</label>
                <select
                  value={linkSource}
                  onChange={e => setLinkSource(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
                >
                  {nodes.map(n => (
                    <option key={n.code} value={n.code}>{n.code} ({n.category})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-mono text-slate-300 mb-1">Target Requirement (Impacted Subsystem)</label>
                <select
                  value={linkTarget}
                  onChange={e => setLinkTarget(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
                >
                  {nodes.map(n => (
                    <option key={n.code} value={n.code}>{n.code} ({n.category})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-mono text-slate-300 mb-1">Dependency Type</label>
                <select
                  value={linkType}
                  onChange={e => setLinkType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono"
                >
                  <option value="functional">Functional Allocation</option>
                  <option value="thermal">Thermal Dissipation Link</option>
                  <option value="electrical">Power & Electrical Link</option>
                  <option value="structural">Mechanical & Structural Link</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setShowLinkModal(false)}
                className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDependency}
                disabled={isLinking || linkSource === linkTarget}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-lg text-xs shadow-md transition-colors"
              >
                {isLinking ? 'Linking...' : 'Establish Link'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  Bell, AlertCircle, CheckCircle2, XCircle, RotateCcw, 
  MessageSquare, User, Filter, Check, ArrowRight, ShieldAlert,
  Clock, ArrowUpRight
} from 'lucide-react';
import { api } from '../services/api';
import { ReviewTask, Requirement, EvidenceRecord } from '../types';

export function ReviewQueuePage() {
  const [projectId] = useState<string>(() => localStorage.getItem('eere_active_project_id') || '');
  const [tasks, setTasks] = useState<ReviewTask[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [selectedTask, setSelectedTask] = useState<ReviewTask | null>(null);
  const [reviewerComment, setReviewerComment] = useState<string>('');
  const [reviewerName, setReviewerName] = useState<string>('Lead Engineer (Systems)');
  const [notification, setNotification] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    Promise.all([
      api.getReviewQueue(projectId),
      api.getRequirements(projectId)
    ]).then(([fetchedTasks, reqs]) => {
      setTasks(fetchedTasks);
      if (fetchedTasks.length > 0) {
        setSelectedTask(fetchedTasks[0]);
      }
      setRequirements(reqs);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [projectId]);

  const reqMap = new Map(requirements.map(r => [r.id, r]));

  const handleResolveTask = async (taskId: string, status: 'resolved' | 'rejected') => {
    try {
      await api.updateReviewTask(projectId, taskId, {
        status,
        assigned_to: reviewerName
      });
      setNotification(`Review task ${status === 'resolved' ? 'approved' : 'rejected'} successfully.`);
      // Update local state
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      setNotification(`Error updating task: ${err.message}`);
    }
  };

  const handleBulkApprove = async () => {
    const pendingTasks = tasks.filter(t => t.status !== 'resolved');
    for (const t of pendingTasks) {
      await api.updateReviewTask(projectId, t.id, { status: 'resolved', assigned_to: reviewerName });
    }
    setTasks(prev => prev.map(t => ({ ...t, status: 'resolved' })));
    setNotification(`Bulk approved ${pendingTasks.length} review tasks.`);
    setTimeout(() => setNotification(null), 3000);
  };

  const filteredTasks = tasks.filter(t => {
    if (filterPriority === 'ALL') return true;
    return t.priority.toUpperCase() === filterPriority.toUpperCase();
  });

  const pendingCount = tasks.filter(t => t.status !== 'resolved').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mr-3" />
        Loading Engineering Review Queue...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Header */}
      <div className="h-14 border-b border-slate-800 bg-slate-900 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-amber-400" />
          <h1 className="font-semibold text-slate-100 text-sm">Engineering Review & Sign-Off Queue</h1>
          <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
            {pendingCount} Pending Action
          </span>
        </div>

        <div className="flex items-center gap-3">
          {notification && (
            <span className="text-xs px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {notification}
            </span>
          )}
          <button
            onClick={handleBulkApprove}
            disabled={pendingCount === 0}
            className="text-xs px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-medium flex items-center gap-1.5 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            Bulk Sign-Off ({pendingCount})
          </button>
        </div>
      </div>

      {/* Main Workspace: 2-Column Split */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Column: Task List */}
        <div className="w-[480px] border-r border-slate-800 bg-slate-900/40 flex flex-col shrink-0">
          
          {/* Filter Bar */}
          <div className="p-3 border-b border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Priority Filter:</span>
            <div className="flex gap-1">
              {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map(p => (
                <button
                  key={p}
                  onClick={() => setFilterPriority(p)}
                  className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                    filterPriority === p 
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {filteredTasks.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No review tasks matching selected filter. All requirements clear.
              </div>
            ) : (
              filteredTasks.map(task => {
                const req = reqMap.get(task.requirement_id);
                const isSelected = selectedTask?.id === task.id;
                const isResolved = task.status === 'resolved';

                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/20' 
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-200">
                          {req?.req_id || task.requirement_id}
                        </span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                          task.priority === 'Critical' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {task.priority}
                        </span>
                      </div>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        isResolved ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {task.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 font-medium line-clamp-2 mb-2">
                      {req?.statement || 'Requirement verification task'}
                    </div>

                    <div className="text-[11px] text-amber-400/90 bg-amber-950/40 p-2 rounded border border-amber-900/40">
                      <strong>Flag Reason:</strong> {task.reason}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detailed Reviewer Action Workstation */}
        <div className="flex-1 bg-slate-950 p-6 overflow-y-auto flex flex-col">
          {selectedTask ? (
            <div className="max-w-3xl space-y-6">
              
              {/* Task Header */}
              <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      Action Item ID: {selectedTask.id}
                    </span>
                    <h2 className="text-lg font-bold text-slate-100 mt-0.5">
                      {reqMap.get(selectedTask.requirement_id)?.req_id || selectedTask.requirement_id}: Engineering Verification Gap
                    </h2>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                      Priority: {selectedTask.priority}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-300">
                  <div className="font-semibold text-slate-400 mb-1">Requirement Statement:</div>
                  <p className="font-serif italic text-slate-200">
                    "{reqMap.get(selectedTask.requirement_id)?.statement}"
                  </p>
                </div>
              </div>

              {/* Uncertainty & Rationale Breakdown */}
              <div className="p-5 rounded-xl border border-amber-900/40 bg-amber-950/20 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Deterministic Rule Engine Finding</span>
                </div>
                <div className="text-xs text-slate-300 leading-relaxed">
                  {selectedTask.reason}
                </div>
                <div className="pt-2 text-[11px] font-mono text-slate-400 border-t border-amber-900/30 flex gap-6">
                  <span>Engine Rule: <strong>RULE_6_AMBIGUITY</strong></span>
                  <span>Non-Negotiable Principle: <strong>#6 (Condition Match)</strong></span>
                </div>
              </div>

              {/* Reviewer Sign-Off Form */}
              <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
                <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                  <span>Engineering Disposition & Sign-Off</span>
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">Reviewer Name & Role</label>
                    <input
                      type="text"
                      value={reviewerName}
                      onChange={e => setReviewerName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-slate-400 mb-1">Audit Record Timestamp</label>
                    <input
                      type="text"
                      disabled
                      value={new Date().toISOString()}
                      className="w-full px-3 py-1.5 bg-slate-950/50 border border-slate-900 rounded text-xs font-mono text-slate-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">
                    Mandatory Engineering Justification / Rationale
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide technical justification for accepting or requesting re-test (e.g., 'Ambient test conditions verified acceptable under engineering concession EC-2026-04')..."
                    value={reviewerComment}
                    onChange={e => setReviewerComment(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => handleResolveTask(selectedTask.id, 'resolved')}
                    className="flex-1 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors shadow-md"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Accept & Sign-Off (Compliant via Concession)
                  </button>
                  <button
                    onClick={() => handleResolveTask(selectedTask.id, 'rejected')}
                    className="flex-1 py-2 rounded bg-red-600/80 hover:bg-red-600 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors shadow-md"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject Evidence & Issue Lab Retest Order
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
              Select a review item from the queue to inspect and sign off.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}


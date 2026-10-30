import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  Shield, Activity, Play, FileText, GitMerge, CheckCircle, Sliders, 
  BookOpen, MessageSquare, AlertTriangle, Eye, Layers, Settings, HelpCircle,
  Search, Sun, Moon, ToggleLeft, ToggleRight, RefreshCw, ChevronDown, Check,
  Cpu, HardDrive, Bell
} from 'lucide-react';
import { CommandPalette } from '../common/CommandPalette';
import { api } from '../../services/api';
import { Project } from '../../types';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isPlainLanguageMode, setIsPlainLanguageMode] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>(() => localStorage.getItem('eere_active_project_id') || '');
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Load projects on startup
    api.getProjects()
      .then(projs => {
        setProjects(projs);
        const storedId = localStorage.getItem('eere_active_project_id');
        const projectExists = storedId && projs.some(p => p.id === storedId);
        
        if (projectExists) {
          setActiveProjectId(storedId);
        } else if (projs.length > 0) {
          setActiveProjectId(projs[0].id);
          localStorage.setItem('eere_active_project_id', projs[0].id);
        } else {
          setActiveProjectId('');
          localStorage.removeItem('eere_active_project_id');
        }
      })
      .catch(console.error);
  }, []);

  const handleSelectProject = (id: string) => {
    setActiveProjectId(id);
    localStorage.setItem('eere_active_project_id', id);
    setIsProjectDropdownOpen(false);
    window.location.reload(); // Refresh view for new project context
  };

  const activeProject = projects.find(p => p.id === activeProjectId);

  const navGroups = [
    {
      title: 'OVERVIEW',
      items: [
        { name: 'Command Center', path: '/', icon: Activity },
        { name: 'Projects', path: '/projects', icon: Shield },
        { name: 'New Analysis', path: '/analysis/new', icon: Play },
      ]
    },
    {
      title: 'ANALYZE',
      items: [
        { name: 'Document Intelligence', path: '/documents', icon: FileText },
        { name: 'Requirement Explorer', path: '/requirements', icon: Layers },
        { name: 'Evidence Mapping', path: '/mapping', icon: GitMerge },
        { name: 'AI Reconciliation', path: '/reconciliation', icon: CheckCircle },
        { name: 'Dependency Graph', path: '/graph', icon: GitMerge },
      ]
    },
    {
      title: 'ASSURE',
      items: [
        { name: 'Revision Intelligence', path: '/revisions', icon: RefreshCw },
        { name: 'Evidence Sufficiency', path: '/sufficiency', icon: Eye },
        { name: 'Risk Intelligence', path: '/risk', icon: AlertTriangle },
        { name: 'Review Queue', path: '/review-queue', icon: Bell },
        { name: 'What-If Simulator', path: '/simulator', icon: Sliders },
      ]
    },
    {
      title: 'KNOWLEDGE',
      items: [
        { name: 'Standards Knowledge Base', path: '/standards', icon: BookOpen },
        { name: 'AI Engineering Assistant', path: '/assistant', icon: MessageSquare },
      ]
    },
    {
      title: 'GOVERN',
      items: [
        { name: 'Audit & Integrity', path: '/audit', icon: Shield },
        { name: 'Evaluation Lab', path: '/evaluation', icon: Cpu },
        { name: 'Reports & Evidence Packs', path: '/reports', icon: FileText },
        { name: 'Settings & Presets', path: '/settings', icon: Settings },
        { name: 'Help & Onboarding', path: '/help', icon: HelpCircle },
      ]
    }
  ];

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 select-none">
        
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm tracking-wide text-white">EERE v2</div>
              <div className="text-[10px] font-mono text-blue-400">ENGINEERING ENGINE</div>
            </div>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
            PRO
          </span>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navGroups.map(group => (
            <div key={group.title}>
              <div className="px-3 text-[10px] font-mono font-bold text-slate-500 tracking-wider mb-2">
                {group.title}
              </div>
              <div className="space-y-0.5">
                {group.items.map(item => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        isActive 
                          ? 'bg-blue-600 text-white font-semibold shadow-sm shadow-blue-500/20' 
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate">{item.name}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer with Local Badge */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2 text-[11px] font-mono text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Local & Offline Engine</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">No data leaves this machine</div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top App Header */}
        <header className="h-16 px-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center justify-between shrink-0">
          
          {/* Project Selector & Search */}
          <div className="flex items-center gap-4">
            
            {/* Project Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium text-slate-200 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="max-w-[200px] truncate font-semibold">
                  {activeProject ? activeProject.name : 'No Active Project'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isProjectDropdownOpen && (
                <div className="absolute left-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1 text-[10px] font-mono text-slate-500 uppercase tracking-wider">Switch Project</div>
                  <div className="max-h-60 overflow-y-auto">
                    {projects.length > 0 ? (
                      projects.map(p => (
                        <button
                          key={p.id}
                          onClick={() => handleSelectProject(p.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs hover:bg-slate-800 transition-colors ${
                            p.id === activeProjectId ? 'text-blue-400 font-bold bg-blue-500/10' : 'text-slate-300'
                          }`}
                        >
                          <span className="truncate">{p.name}</span>
                          {p.id === activeProjectId && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-xs text-slate-500 text-center">No projects yet.</div>
                    )}
                  </div>
                  <div className="pt-2 mt-2 border-t border-slate-800 px-2">
                    <button
                      onClick={() => { setIsProjectDropdownOpen(false); navigate('/projects'); }}
                      className="w-full text-center py-1.5 text-xs text-blue-400 hover:underline"
                    >
                      Manage All Projects →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Command Palette Button (Ctrl+K) */}
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Search or jump to...</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 text-slate-400 rounded border border-slate-700">Ctrl+K</kbd>
            </button>
          </div>

          {/* Right Mode Switches & Actions */}
          <div className="flex items-center gap-4">
            
            {/* Engineer Mode vs Plain Language Toggle */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className={!isPlainLanguageMode ? "text-blue-400 font-bold" : "text-slate-500"}>Engineer</span>
              <button
                onClick={() => setIsPlainLanguageMode(!isPlainLanguageMode)}
                className="text-slate-400 hover:text-white transition-colors"
                title="Toggle Plain-Language Explanations vs Raw Math Formulas"
              >
                {isPlainLanguageMode ? (
                  <ToggleRight className="w-6 h-6 text-emerald-400" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-blue-400" />
                )}
              </button>
              <span className={isPlainLanguageMode ? "text-emerald-400 font-bold" : "text-slate-500"}>Manager</span>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Toggle Dark / Light Theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Global Notification Banner if present */}
        {notification && (
          <div className="bg-blue-600 text-white text-xs px-6 py-2 flex items-center justify-between font-mono animate-in slide-in-from-top duration-200">
            <span>{notification}</span>
            <button onClick={() => setNotification(null)} className="text-white hover:opacity-80">×</button>
          </div>
        )}

        {/* Page Content Viewport */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-950/60">
          {children}
        </main>
      </div>

      {/* Global Command Palette Dialog */}
      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </div>
  );
}


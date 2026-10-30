import React, { useState, useEffect } from 'react';
import { 
  FileText, Download, CheckCircle2, ShieldCheck, 
  Archive, FileSpreadsheet, Sparkles, Clock, Hash, Lock, UploadCloud
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export function ReportsPage() {
  const navigate = useNavigate();
  const [projectId] = useState<string>(() => localStorage.getItem('eere_active_project_id') || '');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [generatedReports, setGeneratedReports] = useState<any[]>([]);

  const handleGenerateReport = async (format: 'pdf' | 'excel' | 'evidence_pack') => {
    if (!projectId) {
      setNotification("Please select or create an active project first.");
      return;
    }

    setIsGenerating(true);
    setNotification(`Generating formal ${format.toUpperCase()} artifact...`);
    try {
      const res = await api.generateReport(projectId, 'technical');
      let targetPath = '';
      if (format === 'pdf') targetPath = res.pdf_report;
      else if (format === 'excel') targetPath = res.excel_matrix;
      else targetPath = res.digital_evidence_pack;

      const filename = targetPath ? targetPath.split(/[\\/]/).pop() : `${format}_report`;
      setNotification(`Artifact generated successfully: ${filename}`);
      setGeneratedReports(prev => [
        {
          id: Date.now().toString(),
          name: filename,
          path: targetPath,
          format: format.toUpperCase(),
          timestamp: new Date().toLocaleString()
        },
        ...prev
      ]);
      setTimeout(() => setNotification(null), 5000);
    } catch (err: any) {
      setNotification(`Export error: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Header */}
      <div className="h-14 border-b border-slate-800 bg-slate-900 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-blue-400" />
          <h1 className="font-semibold text-slate-100 text-sm">Reports & Digital Evidence Packs</h1>
          <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">
            Cryptographic Integrity Enforced
          </span>
        </div>

        {notification && (
          <span className="text-xs px-2.5 py-1 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
            {notification}
          </span>
        )}
      </div>

      {/* Main Workspace Layout */}
      <div className="flex-1 overflow-auto p-8 max-w-5xl mx-auto space-y-8">
        
        {/* Intro Banner */}
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
          <h2 className="text-base font-bold text-slate-100">
            Engineering Verification Documentation Suite
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
            Generate formal, auditable verification artifacts for engineering review, regulatory submissions (FAA, ISO, FDA), 
            and customer sign-offs. Every generated file includes full derivation formulas, page coordinate citations, and SHA-256 audit records.
          </p>
        </div>

        {/* 3 Core Artifact Generators */}
        <div className="grid grid-cols-3 gap-6">
          
          {/* 1. Formal PDF Report */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/50 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-100">Formal PDF Compliance Report</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Publication-quality engineering document generated via ReportLab with executive summary, compliance status metrics, step-by-step calculation tables, and sign-off blocks.
              </p>
            </div>
            <button
              onClick={() => handleGenerateReport('pdf')}
              disabled={isGenerating}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium flex items-center justify-center gap-2 transition-colors shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              Generate PDF Report
            </button>
          </div>

          {/* 2. Excel Compliance Matrix */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/50 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-100">Excel Compliance Matrix (.xlsx)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Engineered with OpenPyXL. Multi-tab workbook containing Requirements &times; Documents traceability grid, numerical margins, Pint unit conversion factors, and formula columns.
              </p>
            </div>
            <button
              onClick={() => handleGenerateReport('excel')}
              disabled={isGenerating}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium flex items-center justify-center gap-2 transition-colors shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              Export Excel Matrix
            </button>
          </div>

          {/* 3. Digital Evidence Pack */}
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/50 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Archive className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-100">Digital Evidence Pack (ZIP)</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Self-contained, cryptographically signed package bundling source PDFs, extracted JSON entities, reconciliation logs, and a SHA-256 manifest.
              </p>
            </div>
            <button
              onClick={() => handleGenerateReport('evidence_pack')}
              disabled={isGenerating}
              className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-medium flex items-center justify-center gap-2 transition-colors shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              Build Evidence Pack (ZIP)
            </button>
          </div>

        </div>

        {/* Recently Generated Assets */}
        {generatedReports.length > 0 && (
          <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Generated Artifacts ({generatedReports.length})
            </h3>
            <div className="space-y-2">
              {generatedReports.map(rep => (
                <div key={rep.id} className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-bold text-slate-200">{rep.name}</span>
                    <span className="ml-2 text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">{rep.format}</span>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">{rep.path}</div>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">{rep.timestamp}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Evidence Pack Integrity Specification */}
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/30 space-y-3">
          <div className="flex items-center gap-2 text-slate-300 font-semibold text-xs">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>Digital Evidence Pack Manifest Specification</span>
          </div>
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-400">
            {JSON.stringify({
              manifest_version: "2.0",
              engine: "EERE v2 (Engineering Evidence Reconciliation Engine)",
              algorithm: "SHA-256",
              contents: [
                { path: "documents/specification.pdf", hash: "<sha256_checksum>" },
                { path: "reconciliation/decisions.json", hash: "<sha256_checksum>" },
                { path: "audit/hash_chain.json", hash: "<sha256_checksum>" }
              ]
            }, null, 2)}
          </div>
        </div>

      </div>
    </div>
  );
}

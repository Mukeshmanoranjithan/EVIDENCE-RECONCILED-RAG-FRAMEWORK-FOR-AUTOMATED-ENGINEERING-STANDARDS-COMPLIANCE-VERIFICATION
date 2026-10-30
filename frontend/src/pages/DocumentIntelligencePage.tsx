import React, { useState, useEffect } from 'react';
import { 
  FileText, Search, Download, Eye, Layers, CheckCircle2, 
  AlertCircle, ChevronRight, Hash, Bookmark, ZoomIn, ZoomOut,
  Maximize2, Filter, Upload, Trash2, Plus
} from 'lucide-react';
import { api } from '../services/api';
import { ProjectDocument, Requirement, EvidenceRecord } from '../types';

export function DocumentIntelligencePage() {
  const [projectId] = useState<string>(() => localStorage.getItem('eere_active_project_id') || '');
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<ProjectDocument | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showOverlays, setShowOverlays] = useState<boolean>(true);
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  const fetchProjectData = () => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      api.getDocuments(projectId),
      api.getRequirements(projectId),
      api.getEvidence(projectId)
    ]).then(([docs, reqs, evs]) => {
      setDocuments(docs);
      if (docs.length > 0) {
        setSelectedDoc(prev => (prev && docs.some(d => d.id === prev.id)) ? prev : docs[0]);
      } else {
        setSelectedDoc(null);
      }
      setRequirements(reqs);
      setEvidence(evs);
    }).catch(err => {
      console.error(err);
    }).finally(() => {
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('doc_type', docType);
      await api.uploadDocument(projectId, formData);
      await api.runAnalysis(projectId);
      fetchProjectData();
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string, filename: string) => {
    if (!window.confirm(`Delete document "${filename}" and all derived requirements and evidence?`)) return;
    try {
      await api.deleteDocument(projectId, docId);
      fetchProjectData();
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const exportEntitiesCsv = () => {
    const rows = [
      ['Entity Type', 'Identifier', 'Statement / Context', 'Parameter', 'Operator', 'Value / Threshold', 'Unit', 'Page'],
      ...requirements.map(r => ['Requirement', r.req_id, `"${r.statement.replace(/"/g, '""')}"`, r.parameter, r.operator, r.threshold, r.unit || '', r.page.toString()]),
      ...evidence.map(e => [e.statement_type, e.evidence_id, `"${(e.raw_statement || '').replace(/"/g, '""')}"`, e.parameter, e.operator, e.value, e.unit || '', e.page.toString()])
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${selectedDoc?.filename || 'document'}_extracted_entities.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Entities associated with the currently selected document
  const docReqs = selectedDoc ? requirements.filter(r => (r as any).document_id === selectedDoc.id) : [];
  const docEvs = selectedDoc ? evidence.filter(e => (e as any).document_id === selectedDoc.id) : [];

  const filteredEntities = [
    ...docReqs.map(r => ({ type: 'Requirement', id: r.req_id, text: r.statement, param: r.parameter, op: r.operator, val: r.threshold, unit: r.unit, page: r.page, bbox: r.bbox, raw: r })),
    ...docEvs.map(e => ({ type: e.statement_type === 'measured_result' ? 'Test Measurement' : 'Design Claim', id: e.evidence_id, text: e.raw_statement || '', param: e.parameter, op: e.operator, val: e.value, unit: e.unit, page: e.page, bbox: e.bbox, raw: e }))
  ].filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return item.id.toLowerCase().includes(q) || item.text.toLowerCase().includes(q) || item.param.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3" />
        Loading Document Intelligence workspace...
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 max-w-2xl mx-auto my-12 space-y-4">
        <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
          <FileText className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white">No documents uploaded for this project</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Upload your Specification, Design, or Physical Test Report PDFs. The backend will parse the PDF layout, extract engineering clauses, and compute SHA-256 integrity hashes.
          </p>
        </div>
        <div className="pt-2 flex justify-center gap-3">
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors font-mono">
            <Upload className="w-4 h-4" />
            <span>Upload Specification PDF</span>
            <input type="file" accept=".pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'specification')} />
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Action Toolbar */}
      <div className="h-14 border-b border-slate-800 bg-slate-900 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-blue-400" />
          <h1 className="font-semibold text-slate-100 text-sm">Document Intelligence & Entity Grounding</h1>
          <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">
            {documents.length} Source Document{documents.length > 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowOverlays(!showOverlays)}
            className={`text-xs px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors ${
              showOverlays ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            {showOverlays ? 'Hide Entity Overlays' : 'Show Entity Overlays'}
          </button>
          <button
            onClick={exportEntitiesCsv}
            className="text-xs px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export Entities (CSV)
          </button>
        </div>
      </div>

      {/* Main Workspace Layout (3-Column / Split Layout) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Column: Document Tree */}
        <div className="w-72 border-r border-slate-800 bg-slate-900/50 flex flex-col shrink-0">
          <div className="p-3 border-b border-slate-800 flex items-center justify-between">
            <div className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
              Project Artifacts
            </div>
            <label className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer" title="Upload Additional PDF">
              <Plus className="w-4 h-4" />
              <input type="file" accept=".pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'specification')} />
            </label>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {documents.map(doc => (
              <div
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                className={`w-full text-left p-2.5 rounded-lg text-xs transition-colors flex items-start justify-between group cursor-pointer ${
                  selectedDoc?.id === doc.id 
                    ? 'bg-blue-600/20 border border-blue-500/40 text-blue-300 font-medium' 
                    : 'hover:bg-slate-800/60 text-slate-300 border border-transparent'
                }`}
              >
                <div className="flex items-start gap-2.5 overflow-hidden">
                  <FileText className="w-4 h-4 mt-0.5 shrink-0 text-slate-400" />
                  <div className="overflow-hidden">
                    <div className="truncate font-semibold">{doc.filename}</div>
                    <div className="text-[10px] text-slate-400 uppercase mt-0.5 font-mono">
                      {doc.doc_type.replace('_', ' ')} • {doc.page_count} Page{doc.page_count > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteDocument(doc.id, doc.filename); }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded transition-opacity"
                  title="Delete Document"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Document SHA-256 Hash Badge */}
          {selectedDoc && (
            <div className="p-3 border-t border-slate-800 bg-slate-950/40 font-mono text-[10px] text-slate-400 space-y-1">
              <div className="text-slate-500 uppercase">SHA-256 Hash:</div>
              <div className="truncate text-blue-400">{selectedDoc.file_hash}</div>
            </div>
          )}
        </div>

        {/* Center Column: Grounded Extracted Text and Entities */}
        <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
          {/* Zoom Controls */}
          <div className="h-10 border-b border-slate-800 bg-slate-900/70 px-4 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-3">
              <span>Artifact: <strong className="text-white">{selectedDoc?.filename}</strong></span>
              <span className="text-slate-600">|</span>
              <span className="font-mono text-[11px] uppercase">{selectedDoc?.doc_type}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setZoomLevel(Math.max(60, zoomLevel - 10))} className="p-1 hover:bg-slate-800 rounded text-slate-300">
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="font-mono text-[11px] px-1">{zoomLevel}%</span>
              <button onClick={() => setZoomLevel(Math.min(150, zoomLevel + 10))} className="p-1 hover:bg-slate-800 rounded text-slate-300">
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Document Entities Canvas */}
          <div className="flex-1 overflow-auto p-6 flex justify-center bg-slate-900/30">
            <div 
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
              className="w-[720px] min-h-[880px] bg-white text-slate-900 shadow-2xl rounded-sm p-10 transition-transform duration-150 relative font-sans text-xs leading-relaxed select-text"
            >
              {/* Document Header */}
              <div className="border-b-2 border-slate-800 pb-3 mb-6 flex justify-between items-start font-sans">
                <div>
                  <div className="text-base font-bold tracking-tight text-slate-900 uppercase">
                    {selectedDoc?.filename}
                  </div>
                  <div className="text-[11px] text-slate-600 font-mono mt-0.5">
                    Extracted from project upload • SHA-256: {selectedDoc?.file_hash.substring(0, 16)}...
                  </div>
                </div>
                <div className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 border border-slate-300 uppercase font-bold text-slate-700">
                  {selectedDoc?.doc_type}
                </div>
              </div>

              {/* Real Extracted Entities from Selected Document */}
              {filteredEntities.length > 0 ? (
                <div className="space-y-4">
                  <div className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                    Extracted Clauses & Grounded Parameters ({filteredEntities.length})
                  </div>
                  {filteredEntities.map((ent, idx) => (
                    <div
                      key={ent.id || idx}
                      onClick={() => setSelectedEntity(ent)}
                      className={`p-3.5 rounded border cursor-pointer transition-all ${
                        showOverlays
                          ? 'bg-blue-50/80 border-blue-400 hover:border-blue-600 ring-2 ring-blue-400/20'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="font-semibold text-xs text-blue-900 flex items-center justify-between mb-1.5 font-mono">
                        <span>{ent.id} [{ent.type}]</span>
                        <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono">
                          Page {ent.page} • Parameter: {ent.param}
                        </span>
                      </div>
                      <p className="text-slate-900 text-xs font-serif leading-relaxed">
                        "{ent.text}"
                      </p>
                      <div className="mt-2 text-xs text-slate-600 font-mono flex items-center gap-4">
                        <span>Boundary/Value: <strong>{ent.op} {ent.val} {ent.unit || ''}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center text-slate-400 font-mono text-xs">
                  No entities extracted from this document yet. Click 'Run Analysis' to process.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Entity Inspector */}
        <div className="w-80 border-l border-slate-800 bg-slate-900/60 p-4 flex flex-col shrink-0 overflow-y-auto space-y-4">
          <div className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
            Entity Inspector
          </div>

          {selectedEntity ? (
            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                <div className="text-blue-400 font-bold">{selectedEntity.id}</div>
                <div className="text-slate-400 text-[11px]">{selectedEntity.type}</div>
                <div className="text-slate-200 font-sans text-xs pt-1 border-t border-slate-800 leading-relaxed">
                  "{selectedEntity.text}"
                </div>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Parameter:</span>
                  <span className="text-white font-semibold">{selectedEntity.param}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Operator:</span>
                  <span className="text-amber-400">{selectedEntity.op}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Threshold / Value:</span>
                  <span className="text-emerald-400">{selectedEntity.val}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Physical Unit:</span>
                  <span className="text-blue-300">{selectedEntity.unit || 'None'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Source Page:</span>
                  <span className="text-slate-200">{selectedEntity.page}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 text-center py-12">
              Click an extracted clause on the document canvas to inspect its parsed parameters.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

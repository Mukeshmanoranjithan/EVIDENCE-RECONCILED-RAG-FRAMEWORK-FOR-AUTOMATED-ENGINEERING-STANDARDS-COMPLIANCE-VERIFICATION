import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, Upload, Check, ChevronRight, ChevronLeft, 
  FileText, Shield, Sliders, AlertTriangle 
} from 'lucide-react';
import { api } from '../services/api';

export function NewAnalysisPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [projectName, setProjectName] = useState('New Avionics Verification');
  const [domain, setDomain] = useState('aerospace');
  const [preset, setPreset] = useState('Strict');
  const [specFile, setSpecFile] = useState<File | null>(null);
  const [designFile, setDesignFile] = useState<File | null>(null);
  const [testFile, setTestFile] = useState<File | null>(null);
  const [progressStage, setProgressStage] = useState('');
  const [progressPct, setProgressPct] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  const handleRunAnalysis = async () => {
    if (!specFile) {
      alert("Specification document is required. Please go back to Step 2 and upload a Specification PDF.");
      setCurrentStep(2);
      return;
    }

    setIsProcessing(true);
    setCurrentStep(5);
    
    setProgressStage("1. Uploading PDF artifacts & computing SHA-256 hashes...");
    setProgressPct(30);

    try {
      const formData = new FormData();
      formData.append('name', projectName);
      formData.append('domain', domain);
      formData.append('version', 'v1.0');
      formData.append('preset', preset);
      formData.append('spec_file', specFile);
      if (designFile) formData.append('design_file', designFile);
      if (testFile) formData.append('test_file', testFile);

      setProgressStage("2. Extracting requirements, parameters, and evidence...");
      setProgressPct(60);

      const proj = await api.analyzeWizard(formData);

      setProgressStage("3. Running deterministic Pint reconciliation & signing audit ledger...");
      setProgressPct(95);

      localStorage.setItem('eere_active_project_id', proj.id);
      setTimeout(() => {
        window.location.href = '/reconciliation';
      }, 500);
    } catch (err: any) {
      alert(`Analysis failed: ${err.message}`);
      setIsProcessing(false);
      setCurrentStep(2);
    }
  };

  const steps = [
    { num: 1, title: 'Project' },
    { num: 2, title: 'Upload' },
    { num: 3, title: 'Review' },
    { num: 4, title: 'Preset' },
    { num: 5, title: 'Execute' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-4">
      
      {/* Wizard Header & Stepper */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-white">New Compliance Verification Wizard</h1>
        <p className="text-xs text-slate-400">
          Upload your project artifacts. Every requirement, evidence record, and compliance decision is derived directly from your files.
        </p>

        {/* Stepper Track */}
        <div className="flex items-center justify-center gap-4 pt-6">
          {steps.map(s => (
            <div key={s.num} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all ${
                currentStep >= s.num 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                  : 'bg-slate-800 text-slate-500'
              }`}>
                {currentStep > s.num ? <Check className="w-4 h-4" /> : s.num}
              </div>
              <span className={`text-xs font-mono hidden md:inline ${currentStep >= s.num ? 'text-slate-200' : 'text-slate-500'}`}>
                {s.title}
              </span>
              {s.num < steps.length && (
                <div className="w-8 h-0.5 bg-slate-800 mx-1 hidden md:block" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl min-h-[360px] flex flex-col justify-between">
        
        {/* Step 1: Project Metadata */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-200">Step 1: Project Setup</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-400 block mb-1">Engineering Domain</label>
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="aerospace">Aerospace (DO-160G / DO-178C)</option>
                  <option value="automotive">Automotive (ISO 26262 ASIL A-D)</option>
                  <option value="medical">Medical Device (IEC 62304 / ISO 13485)</option>
                  <option value="industrial">Industrial Automation (IEC 61508)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Document Upload */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-200">Step 2: Upload Documents</h2>
              <p className="text-xs text-slate-400">Select PDF documents from your local filesystem. Specification document is required.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              
              {/* Spec Upload */}
              <div className="p-4 bg-slate-950 border border-dashed border-slate-800 rounded-xl text-center space-y-2 hover:border-blue-500 transition-colors">
                <FileText className="w-8 h-8 text-amber-400 mx-auto" />
                <div className="text-xs font-bold text-white">1. Specification (Required)</div>
                <div className="text-[11px] text-slate-500">What MUST be satisfied</div>
                <label className="inline-block mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs cursor-pointer">
                  <span>Browse PDF</span>
                  <input type="file" accept=".pdf" className="hidden" onChange={(e) => setSpecFile(e.target.files?.[0] || null)} />
                </label>
                {specFile ? (
                  <div className="text-[10px] text-emerald-400 truncate font-mono">
                    ✓ {specFile.name} ({(specFile.size / 1024).toFixed(1)} KB)
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-500 font-mono">No file chosen</div>
                )}
              </div>

              {/* Design Upload */}
              <div className="p-4 bg-slate-950 border border-dashed border-slate-800 rounded-xl text-center space-y-2 hover:border-blue-500 transition-colors">
                <FileText className="w-8 h-8 text-blue-400 mx-auto" />
                <div className="text-xs font-bold text-white">2. Design Claims</div>
                <div className="text-[11px] text-slate-500">What design CLAIMS</div>
                <label className="inline-block mt-2 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs cursor-pointer">
                  <span>Browse PDF</span>
                  <input type="file" accept=".pdf" className="hidden" onChange={(e) => setDesignFile(e.target.files?.[0] || null)} />
                </label>
                {designFile ? (
                  <div className="text-[10px] text-emerald-400 truncate font-mono">
                    ✓ {designFile.name} ({(designFile.size / 1024).toFixed(1)} KB)
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-500 font-mono">Optional</div>
                )}
              </div>

              {/* Test Upload */}
              <div className="p-4 bg-slate-950 border border-dashed border-slate-800 rounded-xl text-center space-y-2 hover:border-blue-500 transition-colors">
                <FileText className="w-8 h-8 text-emerald-400 mx-auto" />
                <div className="text-xs font-bold text-white">3. Physical Test Report</div>
                <div className="text-[11px] text-slate-500">What was MEASURED</div>
                <label className="inline-block mt-2 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs cursor-pointer">
                  <span>Browse PDF</span>
                  <input type="file" accept=".pdf" className="hidden" onChange={(e) => setTestFile(e.target.files?.[0] || null)} />
                </label>
                {testFile ? (
                  <div className="text-[10px] text-emerald-400 truncate font-mono">
                    ✓ {testFile.name} ({(testFile.size / 1024).toFixed(1)} KB)
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-500 font-mono">Optional (missing test = UNVERIFIABLE)</div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* Step 3: Review Document Types */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-200">Step 3: Review Selected Documents</h2>
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center py-2 border-b border-slate-800">
                <span className="text-slate-400">Specification (Required):</span>
                <span className={specFile ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                  {specFile ? specFile.name : 'Missing (Required)'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-800">
                <span className="text-slate-400">Design Document:</span>
                <span className={designFile ? "text-blue-400" : "text-slate-500"}>
                  {designFile ? designFile.name : 'Not provided'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-400">Physical Test Report:</span>
                <span className={testFile ? "text-emerald-400" : "text-slate-500"}>
                  {testFile ? testFile.name : 'Not provided (Will evaluate to UNVERIFIABLE)'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Verification Preset */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-200">Step 4: Select Verification Preset</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { name: 'Strict', desc: 'Zero unauthorized tolerance. Strict Pint mathematical gating. High auto-accept threshold (>= 80%).' },
                { name: 'Balanced', desc: 'Standard 2% tolerance allowed when specified. Default engineering verification rules.' },
                { name: 'Exploratory', desc: 'Permissive mapping (>= 70%). Ideal for early prototype reviews.' },
              ].map(p => (
                <div
                  key={p.name}
                  onClick={() => setPreset(p.name)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    preset === p.name ? 'bg-blue-600/10 border-blue-500 ring-1 ring-blue-500' : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="font-bold text-xs text-white mb-1">{p.name}</div>
                  <div className="text-[11px] text-slate-400">{p.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Processing Animation */}
        {currentStep === 5 && (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-12 h-12 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
            <div className="space-y-1">
              <h3 className="font-bold text-base text-white">Executing Verification Pipeline</h3>
              <p className="text-xs font-mono text-blue-400">{progressStage}</p>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-950 rounded-full h-3 border border-slate-800 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-xs font-mono text-slate-500">{progressPct}% Complete</span>
          </div>
        )}

        {/* Wizard Controls Bottom Bar */}
        {currentStep < 5 && (
          <div className="flex items-center justify-between pt-6 border-t border-slate-800 mt-6">
            <button
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            {currentStep < 4 ? (
              <button
                onClick={() => {
                  if (currentStep === 2 && !specFile) {
                    alert("Please select at least a Specification PDF document to continue.");
                    return;
                  }
                  setCurrentStep(prev => Math.min(4, prev + 1));
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow transition-colors"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleRunAnalysis}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all font-mono"
              >
                <Play className="w-4 h-4" />
                <span>Launch EERE Verification</span>
              </button>
            )}
          </div>
        )}

      </div>

    </div>
  );
}

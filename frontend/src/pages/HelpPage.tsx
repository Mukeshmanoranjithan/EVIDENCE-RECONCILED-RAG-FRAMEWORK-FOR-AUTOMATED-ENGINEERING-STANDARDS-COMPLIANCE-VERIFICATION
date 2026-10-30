import React, { useState } from 'react';
import { 
  HelpCircle, Shield, CheckCircle2, AlertTriangle, 
  Terminal, Layers, ArrowRight, Zap, BookOpen, Compass
} from 'lucide-react';

export function HelpPage() {
  const [activeTab, setActiveTab] = useState<'principles' | 'scenarios' | 'shortcuts'>('principles');

  const principles = [
    { num: 1, title: 'Never invent evidence', text: 'All values, tolerances, and findings are grounded in document extracts with exact page coordinates and bounding boxes.' },
    { num: 2, title: 'Missing evidence is UNVERIFIABLE', text: 'Missing evidence is NEVER marked NON_COMPLIANT; absence of test evidence indicates an unverified state, not a defect.' },
    { num: 3, title: 'Design claims never substitute for test measurements', text: 'An analytical design claim alone can never prove compliance; empirical laboratory verification is required.' },
    { num: 4, title: 'No LLM or similarity score decides compliance', text: 'Decisions are executed exclusively by Pint unit conversions and deterministic boundary operator mathematics.' },
    { num: 5, title: 'Incompatible units are never compared', text: 'Dimensional mismatches (e.g. Volts vs Celsius) are blocked by hard gates and routed to NEEDS_REVIEW.' },
    { num: 6, title: 'Test conditions must match', text: 'Ambient temperatures, pressures, and computational load states must match or flag NEEDS_REVIEW.' },
    { num: 7, title: 'Every decision shows its calculation', text: 'Exact mathematical derivations, percentage deviations, and source page numbers are exposed on every screen.' },
    { num: 8, title: 'Uploaded text is untrusted data', text: 'Input documents are treated strictly as passive text, sanitized against prompt-injection instructions.' },
    { num: 9, title: 'Never claims official certification', text: 'EERE v2 assists engineering verification audits but does not claim to replace regulatory certification authorities.' },
    { num: 10, title: 'Real data only; demo clearly labelled', text: 'Zero fabricated values. Demo simulations are explicitly tagged [DEMO] in headers, tables, and reports.' }
  ];

  const scenarios = [
    { id: 'A', name: 'Nominal Compliant', spec: '≤ 85 °C', design: '80 °C', test: '82 °C', result: 'COMPLIANT', rule: 'RULE_4_TEST_PRIMARY' },
    { id: 'B', name: 'Measured Violation', spec: '≤ 85 °C', design: '80 °C', test: '91 °C', result: 'NON_COMPLIANT', rule: 'RULE_4_TEST_PRIMARY' },
    { id: 'C', name: 'Design Claim Only', spec: '≤ 85 °C', design: '80 °C', test: 'Missing', result: 'UNVERIFIABLE', rule: 'RULE_3_DESIGN_CLAIM_ONLY' },
    { id: 'D', name: 'Conflicting Test Evidence', spec: '≤ 85 °C', design: '80 °C', test: '82 °C & 91 °C', result: 'CONFLICT', rule: 'RULE_2_CONFLICT' },
    { id: 'E', name: 'Unit Conversion (Bug Fix)', spec: '≤ 85 °C', design: 'N/A', test: '176 °F (80 °C)', result: 'COMPLIANT', rule: 'RULE_4_TEST_PRIMARY' },
    { id: 'F', name: 'Inclusive Boundary Limit', spec: '≤ 85 °C', design: '85 °C', test: '85 °C', result: 'COMPLIANT', rule: 'RULE_4_TEST_PRIMARY' },
    { id: 'G', name: 'Strict Boundary Limit', spec: '< 85 °C', design: '85 °C', test: '85 °C', result: 'NON_COMPLIANT', rule: 'RULE_4_TEST_PRIMARY' },
    { id: 'H', name: 'Incompatible Unit Mismatch', spec: '≤ 85 °C', design: 'N/A', test: '80 V', result: 'NEEDS_REVIEW', rule: 'RULE_1_UNIT_INCOMPATIBLE' },
    { id: 'I', name: 'Condition Mismatch', spec: '≤ 85 °C @ 25 °C amb', design: 'N/A', test: '82 °C @ 60 °C amb', result: 'NEEDS_REVIEW', rule: 'RULE_6_AMBIGUITY' },
    { id: 'J', name: 'Unauthorized Tolerance', spec: '≤ 85 °C (tol: none)', design: 'N/A', test: '85.5 °C', result: 'NON_COMPLIANT', rule: 'RULE_4_TEST_PRIMARY' },
    { id: 'K', name: 'Analytical Model Only', spec: '≤ 12.0 kg', design: '11.5 kg', test: 'Missing', result: 'UNVERIFIABLE', rule: 'RULE_3_DESIGN_CLAIM_ONLY' },
    { id: 'L', name: 'Stale Evidence (Rev B)', spec: 'Rev B: ≤ 80 °C', design: 'N/A', test: '82 °C (Rev A test)', result: 'NEEDS_REVIEW', rule: 'RULE_7_STALE_EVIDENCE' }
  ];

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Header */}
      <div className="h-14 border-b border-slate-800 bg-slate-900 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <HelpCircle className="w-5 h-5 text-blue-400" />
          <h1 className="font-semibold text-slate-100 text-sm">Help, Documentation & Verification Manifesto</h1>
          <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">
            EERE v2 Reference
          </span>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('principles')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              activeTab === 'principles' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            10 Non-Negotiable Principles
          </button>
          <button
            onClick={() => setActiveTab('scenarios')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              activeTab === 'scenarios' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            12 Verification Scenarios (A-L)
          </button>
          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              activeTab === 'shortcuts' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Keyboard Shortcuts
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-8 max-w-5xl mx-auto space-y-6">
        
        {activeTab === 'principles' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-blue-900/40 bg-blue-950/20 text-xs text-blue-200">
              <strong>Engine Integrity Contract:</strong> Every algorithm, neural embedding check, and unit calculation in EERE v2 strictly conforms to these 10 core principles.
            </div>

            <div className="grid grid-cols-2 gap-4">
              {principles.map(p => (
                <div key={p.num} className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                      {p.num}
                    </span>
                    <h3 className="font-bold text-xs text-slate-100">{p.title}</h3>
                  </div>
                  <p className="text-xs text-slate-400 pl-8 leading-relaxed">
                    {p.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'scenarios' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-emerald-900/40 bg-emerald-950/20 text-xs text-emerald-200">
              <strong>Scenario E Math Fix:</strong> In v1, Scenario E was ambiguous. In v2: 176 °F = (176 &minus; 32) &times; 5/9 = 80 °C &le; 85 °C &rarr; <strong>COMPLIANT</strong>.
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400 bg-slate-950/60">
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Scenario Name</th>
                    <th className="py-2.5 px-3">Spec Limit</th>
                    <th className="py-2.5 px-3">Design Claim</th>
                    <th className="py-2.5 px-3">Test Value</th>
                    <th className="py-2.5 px-3">Deterministic Outcome</th>
                    <th className="py-2.5 px-3 font-mono">Rule Fired</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {scenarios.map(s => (
                    <tr key={s.id} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-bold text-blue-400">{s.id}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-200">{s.name}</td>
                      <td className="py-2.5 px-3 text-slate-300">{s.spec}</td>
                      <td className="py-2.5 px-3 text-slate-400">{s.design}</td>
                      <td className="py-2.5 px-3 text-slate-300">{s.test}</td>
                      <td className="py-2.5 px-3 font-bold">
                        <span className={`px-2 py-0.5 rounded ${
                          s.result === 'COMPLIANT' ? 'bg-emerald-500/20 text-emerald-300' :
                          s.result === 'NON_COMPLIANT' ? 'bg-red-500/20 text-red-300' :
                          s.result === 'CONFLICT' ? 'bg-amber-500/20 text-amber-300' :
                          s.result === 'NEEDS_REVIEW' ? 'bg-orange-500/20 text-orange-300' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {s.result}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[10px] text-slate-400">{s.rule}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'shortcuts' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 flex items-center justify-between">
                <span className="text-slate-300">Open Command Palette</span>
                <kbd className="px-2 py-1 bg-slate-950 border border-slate-700 rounded font-mono text-blue-400">Ctrl + K / Cmd + K</kbd>
              </div>
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 flex items-center justify-between">
                <span className="text-slate-300">Close Modals / Overlays</span>
                <kbd className="px-2 py-1 bg-slate-950 border border-slate-700 rounded font-mono text-blue-400">Esc</kbd>
              </div>
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 flex items-center justify-between">
                <span className="text-slate-300">Switch Plain Language vs Engineer View</span>
                <kbd className="px-2 py-1 bg-slate-950 border border-slate-700 rounded font-mono text-blue-400">Alt + P</kbd>
              </div>
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 flex items-center justify-between">
                <span className="text-slate-300">Quick Jump to Decision Detail</span>
                <kbd className="px-2 py-1 bg-slate-950 border border-slate-700 rounded font-mono text-blue-400">Enter on Table Row</kbd>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}


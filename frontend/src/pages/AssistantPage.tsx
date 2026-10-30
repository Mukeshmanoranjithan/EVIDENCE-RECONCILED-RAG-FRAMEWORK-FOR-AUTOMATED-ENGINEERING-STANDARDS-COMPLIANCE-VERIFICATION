import React, { useState } from 'react';
import { 
  MessageSquare, Send, ShieldAlert, FileText, CheckCircle, 
  ExternalLink, Sparkles, Copy, Check 
} from 'lucide-react';
import { api } from '../services/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: Array<{ document_name: string; page: number; text_snippet: string }>;
  injectionDetected?: boolean;
}

export function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I am your local Engineering Compliance Assistant. I answer technical compliance questions strictly using your project's verified evidence, with explicit document and page citations.\n\nHow can I assist your engineering audit today?"
    }
  ]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const activeProjectId = localStorage.getItem('eere_active_project_id') || '';

  const suggestedPrompts = [
    "Why is REQ-001 compliant?",
    "Which requirements lack physical test evidence?",
    "Show all non-compliant requirements and percentage deviations",
    "Summarize total project compliance and risk status"
  ];

  const handleSend = async (textToSend?: string) => {
    const q = (textToSend || query).trim();
    if (!q || !activeProjectId || loading) return;

    const userMsg: Message = { role: 'user', content: q };
    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const res = await api.askAssistant(activeProjectId, q);
      const assistantMsg: Message = {
        role: 'assistant',
        content: res.answer,
        citations: res.citations,
        injectionDetected: res.prompt_injection_detected
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev, 
        { role: 'assistant', content: `Error communicating with local RAG assistant: ${err.message}` }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto h-[84vh] flex flex-col">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-400" />
              <span>AI Engineering Assistant (Local RAG)</span>
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
              STRICT GROUNDING & CITATIONS
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Answers queries strictly using project evidence. Never invents data; prompt-injection immune.
          </p>
        </div>
      </div>

      {/* Suggested Prompt Pills */}
      <div className="flex flex-wrap gap-2 shrink-0">
        {suggestedPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 font-medium"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>{p}</span>
          </button>
        ))}
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
        {messages.map((msg, idx) => (
          <div 
            key={idx}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className={`max-w-2xl p-4 rounded-xl text-xs leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none shadow-md' 
                : 'bg-slate-950 text-slate-200 border border-slate-800/80 rounded-bl-none space-y-3'
            }`}>
              
              {/* Injection warning badge if detected */}
              {msg.injectionDetected && (
                <div className="p-2 bg-red-500/20 border border-red-500/40 rounded flex items-center gap-2 text-red-300 font-mono text-[11px]">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Prompt-injection attempt detected & safely neutralized.</span>
                </div>
              )}

              {/* Message text formatted with line breaks */}
              <div className="whitespace-pre-line font-sans">
                {msg.content}
              </div>

              {/* Citations Box */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="pt-3 border-t border-slate-800 space-y-1.5 font-mono">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Traceable Citations:
                  </span>
                  <div className="grid grid-cols-1 gap-1.5">
                    {msg.citations.map((c, cIdx) => (
                      <div key={cIdx} className="p-2 bg-slate-900/80 rounded border border-slate-800 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2 truncate pr-2">
                          <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="font-semibold text-slate-300">{c.document_name}</span>
                          <span className="text-slate-500">(Page {c.page})</span>
                          <span className="text-slate-400 truncate max-w-xs italic font-sans font-normal">"{c.text_snippet}"</span>
                        </div>
                        <span className="text-blue-400 shrink-0 font-sans text-[10px] hover:underline cursor-pointer">
                          Jump to Source
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Copy button */}
              {msg.role === 'assistant' && (
                <div className="flex justify-end pt-1">
                  <button 
                    onClick={() => handleCopy(msg.content, idx)}
                    className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors font-mono"
                  >
                    {copiedIdx === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedIdx === idx ? 'Copied' : 'Copy answer'}</span>
                  </button>
                </div>
              )}

            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono p-3 bg-slate-950 rounded-lg w-max border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span>Consulting local engineering evidence database...</span>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask a compliance question about requirements, evidence, or math formulas..."
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 font-mono"
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !query.trim()}
          className="p-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl shadow-lg shadow-blue-600/20 transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}


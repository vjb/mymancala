import React, { useEffect, useRef } from 'react';
import { ShieldCheck, X, CheckCircle2 } from 'lucide-react';
import { DiagnosticResult } from '../../preflight-diagnostics';
import { trapFocus } from '../../lib/a11y';

interface DiagnosticsModalProps {
  results: DiagnosticResult[];
  isRunning: boolean;
  onRun: () => void;
  onClose: () => void;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({
  results,
  isRunning,
  onRun,
  onClose
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (modalRef.current) {
        trapFocus(modalRef.current, e, onClose);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="diagnostics-modal-title"
      data-testid="diagnostics-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-100"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 id="diagnostics-modal-title" className="font-bold text-sm sm:text-base">
              Pre-Flight Diagnostic Suite
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-2.5 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-slate-400">
            <span>Total Tests: {results.length}</span>
            <span className="text-emerald-400 font-bold">
              Passed: {results.filter(r => r.status === 'PASS').length} / {results.length}
            </span>
          </div>

          <div className="divide-y divide-slate-800/80">
            {results.map((item, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center space-x-2 min-w-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="truncate">
                    <div className="font-semibold text-slate-200 truncate">{item.name}</div>
                    <div className="text-floor text-xs text-slate-500">{item.category}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <span className="px-2 py-0.5 rounded text-floor text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {item.status}
                  </span>
                  <span className="text-floor text-xs text-slate-400">{item.duration}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <span className="text-floor text-xs text-slate-400">Zero-Leak Conservation & Solver Invariants</span>
          <button
            onClick={onRun}
            disabled={isRunning}
            className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold shadow-md transition disabled:opacity-50"
          >
            {isRunning ? "Running..." : "Re-run"}
          </button>
        </div>
      </div>
    </div>
  );
};

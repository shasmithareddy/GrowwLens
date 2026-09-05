import React, { useState } from 'react';
import { X, Play, Activity, ShieldCheck, CheckCircle2, AlertOctagon, Terminal } from 'lucide-react';
import { Alert } from '../types';
import { API_BASE } from '../api/config';

interface RaceConditionDemoProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: Alert[];
}

export const RaceConditionDemo: React.FC<RaceConditionDemoProps> = ({ isOpen, onClose, alerts }) => {
  const [selectedAlertId, setSelectedAlertId] = useState<string>(alerts[0]?.id || 'alert_bpcl_1');
  const [isRunning, setIsRunning] = useState(false);
  const [raceResult, setRaceResult] = useState<any>(null);

  if (!isOpen) return null;

  const handleSimulate = async () => {
    setIsRunning(true);
    setRaceResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/alerts/simulate-race?alert_id=${selectedAlertId}`, {
        method: 'POST'
      });
      const data = await res.json();
      setRaceResult(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-groww-border overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-groww-textDark">
                Concurrent Worker Race Condition & Idempotency Inspector
              </h3>
              <p className="text-xs text-groww-textMuted">
                Simulates 2 concurrent worker threads executing transactional row-locks against the exact same market event.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Architecture Concept Box */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs space-y-2 font-mono">
            <div className="flex items-center justify-between text-[11px] text-groww-textMuted uppercase font-bold">
              <span>Concurrency Execution Model</span>
              <span className="text-emerald-700 font-bold">ACID Row Locking + Composite Key</span>
            </div>
            <div className="text-gray-700 leading-relaxed">
              Market Event (Tick $240.05) ──┬──► Worker A (Thread 1) ──► <span className="text-emerald-700 font-bold">BEGIN IMMEDIATE / SELECT FOR UPDATE</span> ──► TRIGGERED
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└──► Worker B (Thread 2) ──► Locked / Sees TRIGGERED ──► <span className="text-amber-700 font-bold">DUPLICATE ABORTED</span>
            </div>
          </div>

          {/* Alert Selector & Run Trigger */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="w-full sm:w-80">
              <label className="text-xs font-semibold text-groww-textDark block mb-1">Select Target Alert</label>
              <select
                value={selectedAlertId}
                onChange={(e) => setSelectedAlertId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#FBFBFC] border border-groww-border rounded-xl focus:outline-none focus:border-indigo-500 font-medium"
              >
                {alerts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.symbol} ({a.condition === 'GREATER_THAN' ? '≥' : '≤'} ₹{a.threshold}) - Status: {a.status}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleSimulate}
              disabled={isRunning}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-xs transition-colors disabled:opacity-50 self-end"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{isRunning ? 'Firing Workers...' : 'Fire Concurrent Workers'}</span>
            </button>
          </div>

          {/* Results Display */}
          {raceResult && (
            <div className="space-y-4 pt-2 border-t border-gray-100">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <div className="text-[10px] text-groww-textMuted uppercase font-bold">Worker A</div>
                  <div className="text-sm font-extrabold font-mono text-emerald-600">{raceResult.worker_a_result}</div>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <div className="text-[10px] text-groww-textMuted uppercase font-bold">Worker B</div>
                  <div className="text-sm font-extrabold font-mono text-amber-600">{raceResult.worker_b_result}</div>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <div className="text-[10px] text-groww-textMuted uppercase font-bold">Logical Alerts</div>
                  <div className="text-sm font-extrabold font-mono text-groww-textDark">{raceResult.total_logical_alerts_created}</div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="text-[10px] text-emerald-800 uppercase font-bold">Deduplicated</div>
                  <div className="text-sm font-extrabold font-mono text-emerald-700">100% Guaranteed</div>
                </div>
              </div>

              {/* Execution Trace */}
              <div>
                <h4 className="text-xs font-bold text-groww-textDark mb-2 flex items-center space-x-1.5">
                  <Terminal className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Sub-Millisecond Thread Serialization Trace</span>
                </h4>
                <div className="bg-[#1E1E2E] text-[#CDD6F4] p-4 rounded-xl font-mono text-xs space-y-2">
                  {raceResult.trace_log.map((log: any, idx: number) => (
                    <div key={idx} className="border-b border-gray-800/60 pb-1.5 last:border-none last:pb-0">
                      <div className="flex items-center justify-between text-[11px] text-gray-400 mb-0.5">
                        <span className="font-bold text-cyan-400">[{log.worker}]</span>
                        <span>{log.duration_ms} ms</span>
                      </div>
                      <div className={log.status.includes('ACQUIRED') ? 'text-emerald-400' : 'text-amber-400'}>
                        ▶ {log.action}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

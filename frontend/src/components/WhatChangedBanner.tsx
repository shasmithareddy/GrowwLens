import React, { useState } from 'react';
import { Sparkles, ChevronDown, ChevronUp, Check, Clock, TrendingUp, Zap, Newspaper, AlertCircle } from 'lucide-react';
import { WhatChangedReport } from '../types';

interface WhatChangedBannerProps {
  report: WhatChangedReport | null;
  onMarkAllSeen: () => void;
  onSelectStock: (symbol: string) => void;
}

export const WhatChangedBanner: React.FC<WhatChangedBannerProps> = ({
  report,
  onMarkAllSeen,
  onSelectStock
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!report || report.items.length === 0) {
    return (
      <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 mb-6 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-groww-primary/20 flex items-center justify-center text-groww-primary">
            <Check className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-groww-textDark">You are completely caught up!</h3>
            <p className="text-xs text-groww-textMuted">No unexpected anomalies or technical crossovers since your last check.</p>
          </div>
        </div>
        <button
          onClick={onMarkAllSeen}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg text-groww-textMuted hover:bg-emerald-100/50 transition-colors"
        >
          Reset Baseline
        </button>
      </div>
    );
  }

  const uniqueItems = Array.from(
    new Map(report.items.map((item) => [item.symbol, item])).values()
  );

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50/80 via-teal-50/40 to-white p-4 shadow-sm transition-all xl:mb-0">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          <div className="w-9 h-9 rounded-xl bg-groww-primary flex items-center justify-center text-white shadow-xs shrink-0 mt-0.5 sm:mt-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="break-words text-sm font-bold text-groww-textDark sm:text-base">
                What changed since you last checked?
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-xs">
                {report.total_meaningful_changes} meaningful {report.total_meaningful_changes === 1 ? 'change' : 'changes'}
              </span>
            </div>
            <p className="text-xs text-groww-textMuted flex items-center space-x-1.5 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-groww-textMuted" />
              <span>Observed across {uniqueItems.length} stocks in your watchlist</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-gray-200 text-groww-textDark hover:bg-gray-50 transition-colors shadow-xs"
          >
            <span>{isExpanded ? 'Collapse' : 'Expand Details'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onMarkAllSeen}
            className="flex items-center space-x-1 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-groww-primary text-white hover:bg-groww-hover transition-colors shadow-xs"
            title="Saves the current market state as your new baseline"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Mark as Seen</span>
          </button>
        </div>
      </div>

      {/* Expanded Differential Changes Grid */}
      {isExpanded && (
        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-emerald-100 pt-4">
          {uniqueItems.map((item) => (
            <div
              key={item.symbol}
              onClick={() => onSelectStock(item.symbol)}
              className="min-w-0 overflow-hidden rounded-xl border border-groww-border bg-white p-3.5 shadow-2xs transition-all hover:border-groww-primary hover:shadow-xs cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-xs text-groww-textDark">
                    {item.symbol.substring(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-groww-textDark group-hover:text-groww-primary transition-colors">
                      {item.symbol}
                    </h4>
                    <p className="text-[10px] text-groww-textMuted truncate max-w-[120px]">{item.company_name}</p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-xs font-bold text-groww-textDark">
                    {item.currency}{item.current_price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-groww-textMuted">
                    was {item.currency}{item.last_seen_price.toFixed(2)} ({item.time_elapsed_min}m ago)
                  </div>
                </div>
              </div>

              {/* Sub-changes cards */}
              <div className="space-y-1.5 pt-1">
                {item.changes.map((chg, idx) => (
                  <div
                    key={idx}
                    className={`text-[11px] p-2 rounded-lg flex items-start space-x-2 border ${
                      chg.color === 'green' ? 'bg-emerald-50/70 border-emerald-100 text-emerald-900' :
                      chg.color === 'red' ? 'bg-red-50/70 border-red-100 text-red-900' :
                      chg.color === 'amber' ? 'bg-amber-50/70 border-amber-100 text-amber-900' :
                      'bg-sky-50/70 border-sky-100 text-sky-900'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {chg.type === 'PRICE_SHIFT' ? <TrendingUp className="w-3.5 h-3.5" /> :
                       chg.type === 'VOLUME_ANOMALY' ? <Zap className="w-3.5 h-3.5" /> :
                       chg.type === 'NEWS' ? <Newspaper className="w-3.5 h-3.5" /> :
                       <AlertCircle className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{chg.title}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-white/80 shadow-2xs">
                          {chg.badge}
                        </span>
                      </div>
                      <p className="text-[10px] opacity-85 mt-0.5 leading-tight">{chg.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

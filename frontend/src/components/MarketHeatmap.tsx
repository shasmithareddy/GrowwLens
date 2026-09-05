import React from 'react';
import { ArrowDownRight, ArrowUpRight, BarChart3, Layers, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { Stock } from '../types';

interface MarketHeatmapProps {
  watchlistName?: string;
  watchlistStocks?: Stock[];
  onSelectStock: (symbol: string) => void;
}

const tileClass = (change: number): string => {
  if (change >= 3) return 'bg-emerald-600 text-white border-emerald-600';
  if (change >= 1) return 'bg-emerald-100 text-emerald-950 border-emerald-200';
  if (change > 0) return 'bg-emerald-50 text-emerald-900 border-emerald-100';
  if (change <= -3) return 'bg-rose-600 text-white border-rose-600';
  if (change <= -1) return 'bg-rose-100 text-rose-950 border-rose-200';
  if (change < 0) return 'bg-rose-50 text-rose-900 border-rose-100';
  return 'bg-gray-50 text-gray-700 border-gray-200';
};

const tileSize = (change: number, index: number): string => {
  if (index === 0 || Math.abs(change) >= 3) return 'sm:col-span-2 sm:row-span-2';
  if (Math.abs(change) >= 1) return 'sm:col-span-2';
  return '';
};

export const MarketHeatmap: React.FC<MarketHeatmapProps> = ({
  watchlistName = 'Current watchlist',
  watchlistStocks = [],
  onSelectStock,
}) => {
  const stocks = Array.from(new Map(watchlistStocks.map((stock) => [stock.symbol, stock])).values())
    .sort((first, second) => Math.abs(second.change_1d_pct) - Math.abs(first.change_1d_pct));
  const gainers = stocks.filter((stock) => stock.change_1d_pct > 0).length;
  const losers = stocks.filter((stock) => stock.change_1d_pct < 0).length;
  const averageChange = stocks.length
    ? stocks.reduce((total, stock) => total + stock.change_1d_pct, 0) / stocks.length
    : 0;

  return (
    <section className="mb-8 min-w-0 overflow-hidden rounded-2xl border border-groww-border bg-white shadow-xs">
      <header className="flex flex-col gap-4 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-groww-primary">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-groww-textDark">{watchlistName} heatmap</h2>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">{stocks.length} stocks</span>
            </div>
            <p className="mt-0.5 text-xs text-groww-textMuted">Daily movement across this watchlist only</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-emerald-700"><TrendingUp className="h-3.5 w-3.5" /> {gainers} up</span>
          <span className="flex items-center gap-1.5 text-rose-700"><TrendingDown className="h-3.5 w-3.5" /> {losers} down</span>
          <span className={`font-semibold ${averageChange >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            Average {averageChange >= 0 ? '+' : ''}{averageChange.toFixed(2)}%
          </span>
        </div>
      </header>

      {stocks.length === 0 ? (
        <div className="flex min-h-56 flex-col items-center justify-center gap-2 px-6 text-center">
          <BarChart3 className="h-8 w-8 text-gray-300" />
          <p className="text-sm font-semibold text-groww-textDark">No stocks in this watchlist</p>
          <p className="text-xs text-groww-textMuted">Add stocks to see their daily movement here.</p>
        </div>
      ) : (
        <div className="grid auto-rows-[116px] grid-cols-1 gap-2 bg-gray-50/70 p-3 sm:grid-cols-4 lg:grid-cols-6 sm:auto-rows-[104px] sm:p-4">
          {stocks.map((stock, index) => {
            const change = stock.change_1d_pct;
            const isUp = change > 0;
            const isFlat = change === 0;
            const Icon = isFlat ? Minus : isUp ? ArrowUpRight : ArrowDownRight;

            return (
              <button
                key={stock.symbol}
                type="button"
                onClick={() => onSelectStock(stock.symbol)}
                className={`group relative flex min-w-0 flex-col justify-between overflow-hidden rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${tileClass(change)} ${tileSize(change, index)}`}
                title={`Open ${stock.symbol} details`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-extrabold tracking-tight">{stock.symbol}</div>
                    <div className="truncate text-[10px] opacity-75">{stock.company_name}</div>
                  </div>
                  <Icon className="h-4 w-4 shrink-0 opacity-80" />
                </div>
                <div>
                  <div className="font-mono text-sm font-bold">
                    {stock.currency}{stock.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[11px] font-bold">
                    <span>{isUp ? '+' : ''}{change.toFixed(2)}%</span>
                    <span className="truncate text-[10px] font-medium opacity-75">
                      {stock.change_since_added_pct >= 0 ? '+' : ''}{stock.change_since_added_pct.toFixed(2)}% since added
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <footer className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-[10px] text-groww-textMuted sm:px-6">
        <span>Tile colour reflects 1D price movement. Size highlights larger moves.</span>
        <span className="hidden items-center gap-1 sm:flex"><BarChart3 className="h-3 w-3" /> Select a tile for details</span>
      </footer>
    </section>
  );
};

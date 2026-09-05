import React, { useState } from 'react';
import { Search, Plus, Edit2, TrendingUp, TrendingDown, Bell, Zap, BarChart2, Pin, Sparkles, X, Check, Columns3 } from 'lucide-react';
import { Stock, Watchlist } from '../types';
import { API_BASE } from '../api/config';

interface WatchlistTableProps {
  watchlists: Watchlist[];
  activeWatchlistId: string;
  onSelectWatchlist: (id: string) => void;
  onCreateWatchlist: (name: string) => void;
  onOpenAddStock: () => void;
  onSelectStock: (stock: Stock) => void;
  onOpenTriggerModal: (stock: Stock) => void;
  onOpenBuyModal: (stock: Stock, mode: 'BUY' | 'SELL') => void;
  onTogglePinStock?: (symbol: string) => void;
  onAddStockToWatchlist?: (symbol: string) => void;
  updatedSymbols: Set<string>; // symbols that just received a tick
}

export const WatchlistTable: React.FC<WatchlistTableProps> = ({
  watchlists,
  activeWatchlistId,
  onSelectWatchlist,
  onCreateWatchlist,
  onOpenAddStock,
  onSelectStock,
  onOpenTriggerModal,
  onOpenBuyModal,
  onTogglePinStock,
  onAddStockToWatchlist,
  updatedSymbols
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingWl, setIsCreatingWl] = useState(false);
  const [newWlName, setNewWlName] = useState('');
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('growwlens-visible-columns');
    return saved ? JSON.parse(saved) : {
      trend: true, price: true, change: true, volume: true, range: true, flow: true, actions: true,
    };
  });

  // Sector Peers Modal State
  const [peersModalStock, setPeersModalStock] = useState<Stock | null>(null);
  const [peersList, setPeersList] = useState<any[]>([]);
  const [loadingPeers, setLoadingPeers] = useState(false);
  const [addedSymbols, setAddedSymbols] = useState<Set<string>>(new Set());

  const activeWl = watchlists.find(w => w.id === activeWatchlistId) || watchlists[0];
  const items = activeWl ? activeWl.items : [];
  const uniqueItems = Array.from(
    new Map(items.map((stock) => [stock.symbol, stock])).values()
  );

  const filteredItems = uniqueItems.filter(itm =>
    itm.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    itm.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    itm.sector.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newWlName.trim()) {
      onCreateWatchlist(newWlName.trim());
      setNewWlName('');
      setIsCreatingWl(false);
    }
  };

  const handleOpenPeers = async (e: React.MouseEvent, stock: Stock) => {
    e.stopPropagation();
    setPeersModalStock(stock);
    setLoadingPeers(true);
    try {
      const res = await fetch(`${API_BASE}/api/stocks/${stock.symbol}/peers`);
      const data = await res.json();
      setPeersList(data.peers || []);
    } catch (err) {
      console.error('Failed to fetch sector peers:', err);
    } finally {
      setLoadingPeers(false);
    }
  };

  const handleAddPeerToWatchlist = (peerSymbol: string) => {
    if (onAddStockToWatchlist) {
      onAddStockToWatchlist(peerSymbol);
    }
    setAddedSymbols(prev => new Set(prev).add(peerSymbol));
  };

  const formatIndianNumber = (num: number): string => {
    return num.toLocaleString('en-IN');
  };

  const formatCompactNumber = (num: number): string => {
    const abs = Math.abs(num);
    if (abs >= 10000000) return (num / 10000000).toFixed(2) + 'Cr';
    if (abs >= 100000) return (num / 100000).toFixed(1) + 'L';
    if (abs >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  const toggleColumn = (column: string) => {
    setVisibleColumns((current) => {
      const next = { ...current, [column]: !current[column] };
      localStorage.setItem('growwlens-visible-columns', JSON.stringify(next));
      return next;
    });
  };

  const columns = [
    ['trend', 'Trend'], ['price', 'Market price'], ['change', '1D change'],
    ['volume', '1D volume'], ['range', '52W performance'], ['flow', '15m volume flow'], ['actions', 'Actions'],
  ] as const;

  return (
    <div className="min-w-0 bg-white border border-groww-border rounded-2xl shadow-xs overflow-hidden">
      {/* Watchlist Tabs Bar matching Groww UI */}
      <div className="border-b border-groww-border px-6 pt-3 flex items-center justify-between overflow-x-auto">
        <div className="flex items-center space-x-8 min-w-max">
          {watchlists.map((wl) => {
            const isActive = wl.id === activeWatchlistId;
            return (
              <button
                key={wl.id}
                onClick={() => onSelectWatchlist(wl.id)}
                className={`pb-3 text-sm font-semibold transition-all relative ${
                  isActive
                    ? 'text-groww-textDark'
                    : 'text-groww-textMuted hover:text-groww-textDark'
                }`}
              >
                <span>{wl.name}</span>
                <span className="text-[10px] text-gray-400 ml-1.5 font-normal">
                  ({wl.items?.length || 0})
                </span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-groww-textDark rounded-full" />
                )}
              </button>
            );
          })}

          {isCreatingWl ? (
            <form onSubmit={handleCreateSubmit} className="flex items-center space-x-2 pb-2">
              <input
                type="text"
                autoFocus
                placeholder="Watchlist name..."
                value={newWlName}
                onChange={(e) => setNewWlName(e.target.value)}
                className="px-2.5 py-1 text-xs border border-groww-primary rounded-md focus:outline-none"
              />
              <button
                type="submit"
                className="px-2 py-1 text-xs bg-groww-primary text-white rounded font-medium"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingWl(false)}
                className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              onClick={() => setIsCreatingWl(true)}
              className="pb-3 text-sm font-semibold text-groww-primary hover:text-groww-hover flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>Watchlist</span>
            </button>
          )}
        </div>
      </div>

      {/* Table Search & Controls Bar */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-gray-100">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-groww-textMuted absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search your watchlist by symbol or sector"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-[#FBFBFC] border border-groww-border rounded-xl focus:bg-white focus:outline-none focus:border-groww-primary transition-all"
          />
        </div>

        <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
          <div className="relative">
          <button
            onClick={() => setShowColumnMenu((current) => !current)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-groww-border text-groww-textDark hover:bg-gray-50 transition-colors"
            title="Show or hide table columns"
          >
            <Columns3 className="w-3.5 h-3.5" />
            <span>Columns</span>
          </button>
          {showColumnMenu && (
            <div className="absolute right-0 top-10 z-30 w-48 rounded-xl border border-groww-border bg-white p-2 shadow-xl">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-groww-textMuted">Visible columns</div>
              {columns.map(([key, label]) => (
                <label key={key} className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-2 text-xs text-groww-textDark hover:bg-gray-50">
                  <span>{label}</span>
                  <input type="checkbox" checked={visibleColumns[key]} onChange={() => toggleColumn(key)} className="accent-emerald-500" />
                </label>
              ))}
            </div>
          )}
          </div>
          <button
            onClick={onOpenAddStock}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#F2F4F7] text-groww-textDark hover:bg-gray-200 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-groww-textDark" />
            <span>Add stocks</span>
          </button>
        </div>
      </div>

      {/* Table Content matching Groww UI */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-100 text-[11px] font-semibold text-groww-textMuted uppercase tracking-wider bg-[#FAFAFB]">
              <th className="py-3 px-4 sm:px-6">Company ({filteredItems.length})</th>
              {visibleColumns.trend && <th className="py-3 px-4 text-center">Trend</th>}
              {visibleColumns.price && <th className="py-3 px-4 text-right">Mkt price</th>}
              {visibleColumns.change && <th className="py-3 px-4 text-right">1D change</th>}
              {visibleColumns.volume && <th className="py-3 px-4 text-right">1D vol</th>}
              {visibleColumns.range && <th className="py-3 px-4 text-center min-w-[140px]">52W perf</th>}
              {visibleColumns.flow && <th className="py-3 px-4 text-center min-w-[150px]">15m ΔVol & Flow</th>}
              {visibleColumns.actions && <th className="py-3 px-4 sm:px-6 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {filteredItems.map((stock) => {
              const isUp = stock.change_1d >= 0;
              const justUpdated = updatedSymbols.has(stock.symbol);

              // Calculate 52-week position percentage (0 to 100%)
              const range = (stock.high_52w - stock.low_52w) || 1;
              const perfPercent = Math.min(100, Math.max(0, ((stock.price - stock.low_52w) / range) * 100));

              return (
                <tr
                  key={stock.symbol}
                  className={`hover:bg-gray-50/80 transition-colors group cursor-pointer ${
                    justUpdated ? (isUp ? 'tick-up' : 'tick-down') : ''
                  } ${stock.is_pinned ? 'bg-amber-50/30' : ''}`}
                  onClick={() => onSelectStock(stock)}
                >
                  {/* Company Info + Pinning */}
                  <td className="py-3.5 px-4 sm:px-6">
                    <div className="flex items-center space-x-2.5">
                      {/* Pin Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onTogglePinStock) onTogglePinStock(stock.symbol);
                        }}
                        className={`p-1 rounded-md transition-colors ${
                          stock.is_pinned
                            ? 'text-amber-500 bg-amber-100/60 hover:bg-amber-200'
                            : 'text-gray-300 hover:text-amber-500 hover:bg-gray-100 opacity-40 group-hover:opacity-100'
                        }`}
                        title={stock.is_pinned ? 'Pinned to top (Click to unpin)' : 'Pin stock to top of watchlist'}
                      >
                        <Pin className={`w-3.5 h-3.5 ${stock.is_pinned ? 'fill-amber-500' : ''}`} />
                      </button>

                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-xs text-white shadow-2xs ${
                        stock.symbol === 'BPCL' ? 'bg-blue-600' :
                        stock.symbol === 'APOLLO' ? 'bg-cyan-600' :
                        stock.symbol === 'RAYMOND' ? 'bg-red-600' :
                        stock.symbol === 'NVDA' ? 'bg-emerald-600' :
                        stock.symbol === 'TSLA' ? 'bg-rose-700' :
                        'bg-slate-700'
                      }`}>
                        {stock.symbol.substring(0, 2)}
                      </div>
                      <div className="relative">
                        <div className="font-bold text-groww-textDark group-hover:text-groww-primary transition-colors flex items-center space-x-1.5">
                          <span>{stock.symbol}</span>
                          {stock.shares_held > 0 && (
                            <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-gray-100 text-gray-600">
                              {stock.shares_held} shares
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-1 mt-0.5">
                          <p className="text-[11px] text-groww-textMuted truncate max-w-[120px] sm:max-w-[150px]">
                            {stock.company_name}
                          </p>
                          <span className="text-gray-300">•</span>
                          {/* Sector Peers Quick Button */}
                          <button
                            onClick={(e) => handleOpenPeers(e, stock)}
                            className="text-[10px] text-groww-textMuted hover:text-groww-primary font-medium hover:underline flex items-center space-x-0.5"
                            title="Find suggestions & peers in this sector"
                          >
                            <span>{stock.sector.split('&')[0]}</span>
                            <span className="text-[9px] bg-gray-100 px-1 py-0.2 rounded text-gray-500 group-hover:bg-emerald-50 group-hover:text-emerald-700">
                              peers ▾
                            </span>
                          </button>
                        </div>
                        <div className="pointer-events-none absolute left-0 top-full z-40 mt-2 hidden w-72 rounded-xl border border-gray-200 bg-white p-3 text-left shadow-xl group-hover:block">
                          <div className="mb-2 flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Since added</span>
                            <span className={`text-xs font-bold ${stock.change_since_added_pct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {stock.change_since_added_pct >= 0 ? '+' : ''}{stock.change_since_added_pct.toFixed(2)}%
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-600">
                            {stock.currency}{stock.added_price.toFixed(2)} on {new Date(stock.added_at * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            {' '}to {stock.currency}{stock.price.toFixed(2)} today.
                          </p>
                          {stock.news_impact ? (
                            <div className="mt-3 border-t border-gray-100 pt-2">
                              <div className="mb-1 flex items-center justify-between gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">News impact</span>
                                <span className={`text-[10px] font-bold ${stock.news_impact.impact === 'BEARISH' ? 'text-red-600' : 'text-emerald-600'}`}>
                                  {stock.news_impact.impact}
                                </span>
                              </div>
                              <p className="text-[11px] font-semibold leading-snug text-gray-800">{stock.news_impact.headline}</p>
                              <p className="mt-1 text-[10px] leading-relaxed text-gray-500">{stock.news_impact.summary}</p>
                            </div>
                          ) : (
                            <p className="mt-3 border-t border-gray-100 pt-2 text-[10px] text-gray-400">No linked news catalyst for this stock.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* SVG Sparkline */}
                  {visibleColumns.trend && <td className="py-3.5 px-4 text-center">
                    <div className="inline-block w-20 h-6">
                      <svg viewBox="0 0 100 30" className="w-full h-full overflow-visible">
                        {/* Baseline */}
                        <line x1="0" y1="15" x2="100" y2="15" stroke="#E4E7EC" strokeDasharray="2,2" strokeWidth="1" />
                        {/* Sparkline curve */}
                        <polyline
                          fill="none"
                          stroke={isUp ? '#00D09C' : '#F04438'}
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={stock.sparkline.map((val, i) => {
                            const minVal = Math.min(...stock.sparkline);
                            const maxVal = Math.max(...stock.sparkline);
                            const rangeVal = (maxVal - minVal) || 1;
                            const y = 25 - ((val - minVal) / rangeVal) * 20;
                            const x = (i / (stock.sparkline.length - 1)) * 100;
                            return `${x},${y}`;
                          }).join(' ')}
                        />
                      </svg>
                    </div>
                  </td>}

                  {/* Market Price with Tick Animation */}
                  {visibleColumns.price && <td className="py-3.5 px-4 text-right font-mono font-bold text-groww-textDark">
                    <span className={justUpdated ? (isUp ? 'text-groww-primary' : 'text-groww-red') : ''}>
                      {stock.currency}{stock.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </td>}

                  {/* 1D Change */}
                  {visibleColumns.change && <td className="py-3.5 px-4 text-right font-medium">
                    <span className={`inline-flex items-center space-x-0.5 ${isUp ? 'text-groww-primary' : 'text-groww-red'}`}>
                      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      <span>
                        {isUp ? '+' : ''}{stock.currency}{Math.abs(stock.change_1d).toFixed(2)} ({isUp ? '+' : ''}{stock.change_1d_pct.toFixed(2)}%)
                      </span>
                    </span>
                    <div className={`mt-1 text-[10px] ${stock.change_since_added_pct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      Since added: {stock.change_since_added_pct >= 0 ? '+' : ''}{stock.change_since_added_pct.toFixed(2)}%
                    </div>
                  </td>}

                  {/* 1D Volume & Anomaly Pill */}
                  {visibleColumns.volume && <td className="py-3.5 px-4 text-right">
                    <div className="font-mono text-groww-textDark font-medium">
                      {formatIndianNumber(stock.volume)}
                    </div>
                    {stock.is_volume_anomaly && (
                      <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse mt-0.5">
                        <Zap className="w-2.5 h-2.5 text-amber-600 fill-amber-600" />
                        <span>{stock.volume_ratio}× Vol</span>
                      </span>
                    )}
                  </td>}

                  {/* 52W Performance Slider matching Groww UI */}
                  {visibleColumns.range && <td className="py-3.5 px-4">
                    <div className="flex items-center justify-center space-x-2 text-[10px] text-groww-textMuted font-mono">
                      <span>L</span>
                      <div className="relative w-24 h-1 bg-gray-200 rounded-full">
                        <div
                          className="absolute -top-1 w-3 h-3 bg-groww-textDark border-2 border-white rounded-full shadow-xs -ml-1.5"
                          style={{ left: `${perfPercent}%` }}
                          title={`LTP: ${stock.currency}${stock.price} (52W: ${stock.low_52w} - ${stock.high_52w})`}
                        />
                      </div>
                      <span>H</span>
                    </div>
                  </td>}

                  {/* Zeiierman Volume Orderbook & ΔVol Velocity */}
                  {visibleColumns.flow && <td className="py-3.5 px-4 text-center">
                    <div className="flex flex-col items-center space-y-1">
                      {/* ΔVol Velocity Badge */}
                      {stock.volume_delta_15m !== undefined ? (
                        <div
                          className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                            stock.volume_delta_15m >= 0
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                          title={`15m Volume Velocity (ΔVol): ${stock.volume_delta_15m >= 0 ? '+' : ''}${stock.volume_delta_15m.toLocaleString('en-IN')} shares`}
                        >
                              <span>Δ {stock.volume_delta_15m >= 0 ? '+' : ''}{formatCompactNumber(stock.volume_delta_15m)}</span>
                          {stock.volume_delta_pct !== undefined && (
                            <span className="text-[9px] opacity-80">
                              {stock.volume_delta_pct === null ? '—' : `${stock.volume_delta_pct > 0 ? '+' : ''}${stock.volume_delta_pct}%`}
                            </span>
                          )}
                        </div>
                      ) : null}

                      {/* Mini Zeiierman Volume Profile Split Bar */}
                      <div
                        className="w-24 bg-gray-100 h-1.5 rounded-full overflow-hidden flex relative shadow-inner"
                        title={`Zeiierman Profile: ${stock.buy_pressure}% Bid (Support) vs ${stock.sell_pressure}% Ask (Resistance)`}
                      >
                        <div
                          className="bg-emerald-500 h-full transition-all"
                          style={{ width: `${stock.buy_pressure}%` }}
                        />
                        <div
                          className="bg-rose-500 h-full transition-all"
                          style={{ width: `${stock.sell_pressure}%` }}
                        />
                      </div>

                      {/* Point of Control (POC) Price & Buy/Sell Ratio */}
                      <div className="flex items-center space-x-1 text-[10px] font-mono text-groww-textMuted">
                        <span
                          className="text-amber-700 font-bold bg-amber-50 border border-amber-200/70 px-1 py-0.2 rounded text-[9px]"
                          title="Point of Control (POC) - heaviest volume price node"
                        >
                          POC ₹{stock.poc_price ? stock.poc_price.toFixed(1) : stock.price.toFixed(1)}
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className="text-emerald-700 font-semibold">{stock.buy_pressure}% B</span>
                      </div>
                    </div>
                  </td>}

                  {/* Actions (Set trigger, Buy, Details) */}
                  {visibleColumns.actions && <td className="py-3.5 px-4 sm:px-6 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        onClick={() => onOpenTriggerModal(stock)}
                        className="p-1.5 rounded-lg text-groww-textMuted hover:text-groww-primary hover:bg-emerald-50 transition-colors"
                        title="Set Trigger Order / Price Alert"
                      >
                        <Bell className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onOpenBuyModal(stock, 'BUY')}
                        className="px-2.5 py-1 text-xs font-bold rounded-md bg-groww-primary text-white hover:bg-groww-hover transition-colors shadow-2xs"
                      >
                        BUY
                      </button>
                      <button
                        onClick={() => onSelectStock(stock)}
                        className="p-1.5 rounded-lg text-groww-textMuted hover:text-groww-textDark hover:bg-gray-100 transition-colors"
                        title="Open Groww Terminal Chart"
                      >
                        <BarChart2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Sector Peers & Suggestions Modal */}
      {peersModalStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-scaleUp">
            <div className="flex items-start justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Same Sector Peers & Suggestions
                  </h3>
                  <p className="text-xs text-gray-500">
                    Industry: <span className="font-semibold text-emerald-700">{peersModalStock.sector}</span> for {peersModalStock.symbol}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPeersModalStock(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 max-h-80 overflow-y-auto">
              {loadingPeers ? (
                <div className="py-8 text-center text-xs text-gray-400">
                  Finding correlated peers in the same industry...
                </div>
              ) : peersList.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">
                  No direct peers found in this sector.
                </div>
              ) : (
                peersList.map((peer) => {
                  const isPeerUp = peer.change_pct >= 0;
                  const isAlreadyAdded = addedSymbols.has(peer.symbol) || items.some(i => i.symbol === peer.symbol);

                  return (
                    <div
                      key={peer.symbol}
                      className="p-3 rounded-xl border border-gray-100 hover:border-emerald-200 bg-gray-50/50 hover:bg-emerald-50/20 transition-all flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-lg bg-gray-900 text-white flex items-center justify-center font-bold text-xs">
                          {peer.symbol.substring(0, 2)}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 text-xs flex items-center space-x-1.5">
                            <span>{peer.symbol}</span>
                            <span className="text-[10px] text-gray-400 font-normal truncate max-w-[130px]">
                              {peer.name}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-gray-600 mt-0.5">
                            <span>{peer.currency || '₹'}{peer.price.toFixed(2)}</span>
                            <span className={`ml-2 font-semibold ${isPeerUp ? 'text-emerald-600' : 'text-red-500'}`}>
                              {isPeerUp ? '+' : ''}{peer.change_pct.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddPeerToWatchlist(peer.symbol)}
                        disabled={isAlreadyAdded}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
                          isAlreadyAdded
                            ? 'bg-gray-100 text-gray-400 cursor-default'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs'
                        }`}
                      >
                        {isAlreadyAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Added</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setPeersModalStock(null)}
                className="px-4 py-2 text-xs font-semibold bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

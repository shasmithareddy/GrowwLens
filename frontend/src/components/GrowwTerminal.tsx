import React, { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, CandlestickData, HistogramData } from 'lightweight-charts';
import {
  X, ArrowLeft, Zap, TrendingUp, TrendingDown, Newspaper,
  Layers, Sliders, Info, Check, Plus, BarChart2, ShieldCheck, Activity
} from 'lucide-react';
import { Stock, NewsTimelineItem, RelatedStock, VolumeOrderbookData } from '../types';
import { API_BASE } from '../api/config';

interface GrowwTerminalProps {
  stock: Stock | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenTriggerModal: (stock: Stock) => void;
  onOpenBuyModal: (stock: Stock, mode: 'BUY' | 'SELL') => void;
  onAddStockToWatchlist?: (symbol: string) => void;
}

export const GrowwTerminal: React.FC<GrowwTerminalProps> = ({
  stock,
  isOpen,
  onClose,
  onOpenTriggerModal,
  onOpenBuyModal,
  onAddStockToWatchlist
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const pocLineRef = useRef<any>(null);

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TIMELINE' | 'DEPTH' | 'RELATED'>('OVERVIEW');
  const [timeline, setTimeline] = useState<NewsTimelineItem[]>([]);
  const [related, setRelated] = useState<RelatedStock[]>([]);
  const [candles, setCandles] = useState<any[]>([]);
  const [timeframe, setTimeframe] = useState<'5m' | '15m' | '1D'>('5m');

  // Zeiierman Volume Orderbook State
  const [orderbookData, setOrderbookData] = useState<VolumeOrderbookData | null>(null);
  const [showOrderbookProfile, setShowOrderbookProfile] = useState<boolean>(true);
  const [orderbookRows, setOrderbookRows] = useState<number>(10);
  const [orderbookMult, setOrderbookMult] = useState<number>(0.5);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [addedSymbols, setAddedSymbols] = useState<Set<string>>(new Set());

  // Fetch history, timeline, related, and volume orderbook
  useEffect(() => {
    if (!stock) return;

    // Fetch candles
    fetch(`${API_BASE}/api/stocks/${stock.symbol}/history?timeframe=${timeframe}`)
      .then(res => res.json())
      .then(data => setCandles(data))
      .catch(() => {});

    // Fetch timeline
    fetch(`${API_BASE}/api/stocks/${stock.symbol}/timeline`)
      .then(res => res.json())
      .then(data => setTimeline(data))
      .catch(() => {});

    // Fetch related
    fetch(`${API_BASE}/api/stocks/${stock.symbol}/related`)
      .then(res => res.json())
      .then(data => setRelated(data))
      .catch(() => {});
  }, [stock?.symbol, timeframe]);

  // Fetch Zeiierman Volume Orderbook
  useEffect(() => {
    if (!stock) return;
    fetch(`${API_BASE}/api/stocks/${stock.symbol}/volume-orderbook?rows=${orderbookRows}&mult=${orderbookMult}`)
      .then(res => res.json())
      .then(data => setOrderbookData(data))
      .catch((err) => console.error("Volume orderbook fetch error:", err));
  }, [stock?.symbol, orderbookRows, orderbookMult]);

  // Initialize and update Lightweight Chart
  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;

    // Dispose old chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
      chartInstanceRef.current = null;
    }

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#FFFFFF' },
        textColor: '#667085',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#F2F4F7' },
        horzLines: { color: '#F2F4F7' },
      },
      crosshair: {
        vertLine: { color: '#98A2B3', width: 1, style: 3 },
        horzLine: { color: '#98A2B3', width: 1, style: 3 },
      },
      rightPriceScale: {
        borderColor: '#EAECF0',
      },
      timeScale: {
        borderColor: '#EAECF0',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: true,
      handleScale: true,
    });

    const candleSeries = (chart as any).addCandlestickSeries({
      upColor: '#00D09C',
      downColor: '#F04438',
      borderUpColor: '#00D09C',
      borderDownColor: '#F04438',
      wickUpColor: '#00D09C',
      wickDownColor: '#F04438',
    });

    const volumeSeries = (chart as any).addHistogramSeries({
      color: '#00D09C',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // overlay
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    const candleData: CandlestickData[] = candles.map(c => ({
      time: c.time as any,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const volData: HistogramData[] = candles.map(c => ({
      time: c.time as any,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(0, 208, 156, 0.4)' : 'rgba(240, 68, 56, 0.4)',
    }));

    candleSeries.setData(candleData);
    volumeSeries.setData(volData);

    chartInstanceRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartInstanceRef.current = null;
    };
  }, [candles]);

  // Update POC Price Line on Chart
  useEffect(() => {
    if (!candleSeriesRef.current || !orderbookData) return;
    try {
      if (pocLineRef.current) {
        candleSeriesRef.current.removePriceLine(pocLineRef.current);
        pocLineRef.current = null;
      }
      if (showOrderbookProfile && orderbookData.poc_price) {
        pocLineRef.current = candleSeriesRef.current.createPriceLine({
          price: orderbookData.poc_price,
          color: '#F59E0B',
          lineWidth: 2,
          lineStyle: 2, // Dashed
          axisLabelVisible: true,
          title: `POC ₹${orderbookData.poc_price.toFixed(2)}`,
        });
      }
    } catch (e) {
      console.warn("Price line render note:", e);
    }

    return () => {
      if (candleSeriesRef.current && pocLineRef.current) {
        try {
          candleSeriesRef.current.removePriceLine(pocLineRef.current);
        } catch (_) {}
        pocLineRef.current = null;
      }
    };
  }, [orderbookData, showOrderbookProfile]);

  if (!isOpen || !stock) return null;

  const isUp = stock.change_1d >= 0;

  // 52-week position calculation
  const range52w = (stock.high_52w - stock.low_52w) || 1;
  const perfPercent52w = Math.min(100, Math.max(0, ((stock.price - stock.low_52w) / range52w) * 100));

  // Day range estimation
  const dayLow = Math.min(stock.price * 0.992, stock.low_52w);
  const dayHigh = Math.max(stock.price * 1.015, stock.high_52w * 0.9);
  const dayRange = (dayHigh - dayLow) || 1;
  const dayPercent = Math.min(100, Math.max(0, ((stock.price - dayLow) / dayRange) * 100));

  const formatCompact = (num: number): string => {
    const abs = Math.abs(num);
    if (abs >= 10000000) return (num / 10000000).toFixed(2) + 'Cr';
    if (abs >= 100000) return (num / 100000).toFixed(1) + 'L';
    if (abs >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  const handleAddPeer = (peerSymbol: string) => {
    if (onAddStockToWatchlist) {
      onAddStockToWatchlist(peerSymbol);
    }
    setAddedSymbols(prev => new Set(prev).add(peerSymbol));
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white overflow-hidden animate-fadeIn">
      {/* Top Groww Terminal Bar matching Groww UI */}
      <div className="h-14 border-b border-groww-border px-4 sm:px-6 flex items-center justify-between bg-white shrink-0 shadow-2xs">
        <div className="flex items-center space-x-4">
          <button
            onClick={onClose}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 text-groww-textDark text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Watchlist</span>
          </button>
          <div className="h-4 w-px bg-gray-200" />
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-extrabold text-groww-textDark">{stock.company_name}</h2>
            <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
              {stock.symbol}
            </span>
            <span className="text-[11px] text-groww-textMuted hidden sm:inline">{stock.sector}</span>
          </div>
        </div>

        {/* Live Quotes & Order Action Pills */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="text-right">
            <div className="text-sm font-mono font-extrabold text-groww-textDark">
              {stock.currency}{stock.price.toFixed(2)}
            </div>
            <div className={`text-xs font-semibold flex items-center justify-end space-x-0.5 ${isUp ? 'text-groww-primary' : 'text-groww-red'}`}>
              {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>
                {isUp ? '+' : ''}{stock.currency}{stock.change_1d.toFixed(2)} ({isUp ? '+' : ''}{stock.change_1d_pct.toFixed(2)}%)
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onOpenBuyModal(stock, 'BUY')}
              className="px-3.5 py-1.5 rounded-lg bg-groww-primary hover:bg-groww-hover text-white text-xs font-bold transition-colors shadow-2xs"
            >
              BUY
            </button>
            <button
              onClick={() => onOpenBuyModal(stock, 'SELL')}
              className="px-3.5 py-1.5 rounded-lg bg-groww-red hover:bg-rose-600 text-white text-xs font-bold transition-colors shadow-2xs"
            >
              SELL
            </button>
            <button
              onClick={() => onOpenTriggerModal(stock)}
              className="px-3.5 py-1.5 rounded-lg bg-[#F2F4F7] hover:bg-gray-200 text-groww-textDark text-xs font-semibold transition-colors hidden md:inline-flex"
            >
              Set Trigger
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Terminal View Split Grid */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left / Center: Interactive Candlestick Chart + Zeiierman Volume Profile */}
        <div className="flex-1 flex flex-col border-r border-groww-border min-h-[350px]">
          {/* Chart Subheader / Indicators Pills */}
          <div className="p-3 border-b border-gray-100 bg-[#FAFAFB] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <span className="font-semibold text-groww-textDark">Timeframe:</span>
              {(['5m', '15m', '1D'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                    timeframe === tf
                      ? 'bg-white border border-groww-primary text-groww-primary shadow-2xs'
                      : 'text-groww-textMuted hover:bg-white hover:text-groww-textDark'
                  }`}
                >
                  {tf}
                </button>
              ))}
              <div className="h-3 w-px bg-gray-200 hidden sm:block" />
              <div className="hidden sm:flex items-center space-x-2 text-[11px] text-groww-textMuted">
                <span>EMA(20): <strong className="text-groww-textDark">{stock.currency}{stock.ema20.toFixed(2)}</strong></span>
                <span>•</span>
                <span>Vol Ratio: <strong className="text-amber-600">{stock.volume_ratio}×</strong></span>
              </div>
            </div>

            {/* Zeiierman Indicator Toggle & Settings */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowOrderbookProfile(!showOrderbookProfile)}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                  showOrderbookProfile
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                }`}
                title="Toggle Volume Orderbook (Zeiierman) Overlay"
              >
                <BarChart2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Zeiierman Orderbook</span>
                <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                  showOrderbookProfile ? 'bg-emerald-200/70 text-emerald-900' : 'bg-gray-100 text-gray-500'
                }`}>
                  {showOrderbookProfile ? 'ON' : 'OFF'}
                </span>
              </button>

              {showOrderbookProfile && (
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 border border-transparent hover:border-gray-200"
                  title="Configure Rows & Width"
                >
                  <Sliders className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Settings Bar for Zeiierman */}
          {showOrderbookProfile && showSettings && (
            <div className="px-4 py-2 bg-amber-50/50 border-b border-amber-200/60 flex items-center justify-between text-xs text-amber-900 animate-fadeIn">
              <div className="flex items-center space-x-4">
                <span className="font-bold flex items-center space-x-1">
                  <Info className="w-3.5 h-3.5 text-amber-600" />
                  <span>Pine Script Settings:</span>
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] text-amber-700">Rows:</span>
                  {[6, 10, 15].map((r) => (
                    <button
                      key={r}
                      onClick={() => setOrderbookRows(r)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                        orderbookRows === r ? 'bg-amber-600 text-white' : 'bg-white border border-amber-200 text-amber-800'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] text-amber-700">Width (mult):</span>
                  {[0.3, 0.5, 0.8].map((m) => (
                    <button
                      key={m}
                      onClick={() => setOrderbookMult(m)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                        orderbookMult === m ? 'bg-amber-600 text-white' : 'bg-white border border-amber-200 text-amber-800'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="text-amber-700 hover:text-amber-950 font-semibold text-[11px]"
              >
                Done
              </button>
            </div>
          )}

          {/* Canvas Mount with Zeiierman Volume Profile Side-Overlay */}
          <div className="flex-1 w-full relative flex overflow-hidden">
            {/* Lightweight Candlestick Chart */}
            <div ref={chartContainerRef} className="flex-1 h-full relative" />

            {/* Zeiierman Volume Orderbook Profile Docked Panel */}
            {showOrderbookProfile && orderbookData && (
              <div className="w-56 sm:w-64 border-l border-groww-border bg-white/95 backdrop-blur-xs flex flex-col shrink-0 z-10 overflow-hidden shadow-inner">
                {/* Profile Header Card */}
                <div className="p-2.5 border-b border-gray-100 bg-[#FAFAFB]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-gray-900 flex items-center space-x-1">
                      <span>Volume Orderbook</span>
                    </span>
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-gray-200 text-gray-700">
                      Pine v6
                    </span>
                  </div>

                  {/* Volume Delta Velocity (ΔVol) Pill */}
                  <div className="flex items-center justify-between text-[11px] mt-1">
                    <span className="text-gray-500 font-medium">15m ΔVol:</span>
                    <span className={`font-mono font-bold px-1.5 py-0.2 rounded ${
                      orderbookData.volume_delta >= 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      Δ {orderbookData.volume_delta >= 0 ? '+' : ''}{formatCompact(orderbookData.volume_delta)}
                    </span>
                  </div>

                  {/* Bid/Ask Volume Distribution Bar */}
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-emerald-700 font-bold">{orderbookData.buy_vol_pct}% Bid</span>
                      <span className="text-rose-700 font-bold">{orderbookData.sell_vol_pct}% Ask</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden flex">
                      <div className="bg-emerald-500 h-full" style={{ width: `${orderbookData.buy_vol_pct}%` }} />
                      <div className="bg-rose-500 h-full" style={{ width: `${orderbookData.sell_vol_pct}%` }} />
                    </div>
                  </div>

                  {/* POC Price Highlight */}
                  <div className="mt-2 p-1.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-[11px]">
                    <span className="font-bold text-amber-900 flex items-center space-x-1">
                      <span>★ POC Price</span>
                    </span>
                    <span className="font-mono font-extrabold text-amber-800">
                      ₹{orderbookData.poc_price.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Profile Levels (Price Bins from Highest to Lowest matching chart axis) */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-[10px]">
                  <div className="flex justify-between text-[9px] font-sans font-bold text-gray-400 uppercase px-1 pb-1 border-b border-gray-100">
                    <span>Price</span>
                    <span>Vol Profile</span>
                  </div>

                  {orderbookData.levels.map((lvl, idx) => {
                    const isPoc = lvl.is_poc;
                    const isAsk = lvl.side === 'ASK';
                    const isBid = lvl.side === 'BID';

                    return (
                      <div
                        key={idx}
                        className={`group relative p-1 rounded transition-colors flex items-center justify-between ${
                          isPoc
                            ? 'bg-amber-100/70 border border-amber-300 font-bold'
                            : 'hover:bg-gray-50'
                        }`}
                        title={`Price: ₹${lvl.price} | Volume: ${lvl.volume.toLocaleString('en-IN')} (${lvl.pct_of_max}% of max) | Side: ${lvl.side}`}
                      >
                        {/* Price Node */}
                        <div className="flex items-center space-x-1 z-10">
                          {isPoc && <span className="text-amber-600 text-xs">★</span>}
                          <span className={`${
                            isPoc ? 'text-amber-900 font-bold' :
                            isAsk ? 'text-rose-700' :
                            isBid ? 'text-emerald-700' : 'text-gray-600'
                          }`}>
                            ₹{lvl.price.toFixed(1)}
                          </span>
                        </div>

                        {/* Volume Bar & Label */}
                        <div className="flex items-center space-x-1.5 z-10">
                          <span className="text-[9px] text-gray-500 font-normal">
                            {formatCompact(lvl.volume)}
                          </span>
                          <span className={`text-[8px] font-bold px-1 rounded ${
                            isAsk ? 'bg-rose-100 text-rose-700' :
                            isBid ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {lvl.side}
                          </span>
                        </div>

                        {/* Background Horizontal Histogram Bar */}
                        <div
                          className={`absolute top-0 bottom-0 left-0 rounded opacity-25 transition-all ${
                            isPoc ? 'bg-amber-500 opacity-40' :
                            isAsk ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.max(8, lvl.pct_of_max)}%` }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Attribution Tag */}
                <div className="p-2 border-t border-gray-100 bg-[#FAFAFB] text-[9px] text-gray-400 text-center">
                  © Zeiierman • CC BY-NC-SA 4.0
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Overview, Timeline, Depth, & Related Stocks */}
        <div className="w-full lg:w-96 flex flex-col bg-[#FBFBFC] overflow-y-auto shrink-0">
          {/* Tabs Navigation */}
          <div className="border-b border-groww-border grid grid-cols-4 bg-white text-xs font-semibold shrink-0">
            <button
              onClick={() => setActiveTab('OVERVIEW')}
              className={`py-3 text-center border-b-2 transition-colors ${
                activeTab === 'OVERVIEW' ? 'border-groww-primary text-groww-primary font-bold' : 'border-transparent text-groww-textMuted hover:text-groww-textDark'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('TIMELINE')}
              className={`py-3 text-center border-b-2 transition-colors ${
                activeTab === 'TIMELINE' ? 'border-groww-primary text-groww-primary font-bold' : 'border-transparent text-groww-textMuted hover:text-groww-textDark'
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setActiveTab('DEPTH')}
              className={`py-3 text-center border-b-2 transition-colors ${
                activeTab === 'DEPTH' ? 'border-groww-primary text-groww-primary font-bold' : 'border-transparent text-groww-textMuted hover:text-groww-textDark'
              }`}
            >
              Depth
            </button>
            <button
              onClick={() => setActiveTab('RELATED')}
              className={`py-3 text-center border-b-2 transition-colors ${
                activeTab === 'RELATED' ? 'border-groww-primary text-groww-primary font-bold' : 'border-transparent text-groww-textMuted hover:text-groww-textDark'
              }`}
            >
              Peers
            </button>
          </div>

          {/* TAB 1: OVERVIEW (Fundamental Stats, 52W Range, Zeiierman Summary) */}
          {activeTab === 'OVERVIEW' && (
            <div className="p-4 space-y-4">
              {/* Performance Ranges */}
              <div className="bg-white rounded-xl p-4 border border-groww-border shadow-2xs space-y-3.5">
                <h4 className="text-xs font-bold text-groww-textDark uppercase tracking-wider text-gray-500">
                  Performance & Price Ranges
                </h4>

                {/* Day's Range */}
                <div>
                  <div className="flex justify-between text-xs font-mono text-groww-textDark mb-1">
                    <div>
                      <span className="text-[10px] text-gray-400 block font-sans">Today's Low</span>
                      <span className="font-bold">₹{dayLow.toFixed(2)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 block font-sans">Today's High</span>
                      <span className="font-bold">₹{dayHigh.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="relative w-full h-1.5 bg-gray-200 rounded-full">
                    <div
                      className="absolute -top-1 w-3 h-3 bg-groww-textDark border-2 border-white rounded-full shadow-xs -ml-1.5"
                      style={{ left: `${dayPercent}%` }}
                    />
                  </div>
                </div>

                {/* 52-Week Range */}
                <div>
                  <div className="flex justify-between text-xs font-mono text-groww-textDark mb-1">
                    <div>
                      <span className="text-[10px] text-gray-400 block font-sans">52W Low</span>
                      <span className="font-bold">₹{stock.low_52w.toFixed(2)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 block font-sans">52W High</span>
                      <span className="font-bold">₹{stock.high_52w.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="relative w-full h-1.5 bg-gray-200 rounded-full">
                    <div
                      className="absolute -top-1 w-3 h-3 bg-groww-primary border-2 border-white rounded-full shadow-xs -ml-1.5"
                      style={{ left: `${perfPercent52w}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Zeiierman Volume Intelligence Card */}
              {orderbookData && (
                <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/40 rounded-xl p-4 border border-emerald-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-emerald-900 flex items-center space-x-1.5">
                      <BarChart2 className="w-4 h-4 text-emerald-700" />
                      <span>Zeiierman Orderbook Metrics</span>
                    </h4>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-200/80 text-emerald-900 font-bold">
                      POC: ₹{orderbookData.poc_price.toFixed(1)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-100">
                      <span className="text-[10px] text-gray-500 block">Support (Bid) Vol</span>
                      <span className="font-mono font-bold text-emerald-700">
                        {formatCompact(orderbookData.total_bid_vol)} ({orderbookData.buy_vol_pct}%)
                      </span>
                    </div>
                    <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-100">
                      <span className="text-[10px] text-gray-500 block">Resistance (Ask) Vol</span>
                      <span className="font-mono font-bold text-rose-600">
                        {formatCompact(orderbookData.total_ask_vol)} ({orderbookData.sell_vol_pct}%)
                      </span>
                    </div>
                    <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-100">
                      <span className="text-[10px] text-gray-500 block">15m Vol Delta Velocity</span>
                      <span className={`font-mono font-bold ${
                        orderbookData.volume_delta >= 0 ? 'text-emerald-700' : 'text-rose-600'
                      }`}>
                        {orderbookData.volume_delta >= 0 ? '+' : ''}{formatCompact(orderbookData.volume_delta)}
                      </span>
                    </div>
                    <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-100">
                      <span className="text-[10px] text-gray-500 block">POC Node Concentration</span>
                      <span className="font-mono font-bold text-amber-700">
                        {formatCompact(orderbookData.poc_volume)} shares
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Technical Indicators Grid */}
              <div className="bg-white rounded-xl p-4 border border-groww-border shadow-2xs space-y-3">
                <h4 className="text-xs font-bold text-groww-textDark uppercase tracking-wider text-gray-500">
                  Key Statistics & Market Indicators
                </h4>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <span className="text-[10px] text-gray-400 block">Total 1D Volume</span>
                    <span className="font-mono font-bold text-groww-textDark">
                      {stock.volume.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <span className="text-[10px] text-gray-400 block">Volume Ratio</span>
                    <span className={`font-mono font-bold ${stock.is_volume_anomaly ? 'text-amber-600' : 'text-groww-textDark'}`}>
                      {stock.volume_ratio}× baseline
                    </span>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <span className="text-[10px] text-gray-400 block">20 EMA</span>
                    <span className="font-mono font-bold text-groww-textDark">
                      ₹{stock.ema20.toFixed(2)}
                    </span>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <span className="text-[10px] text-gray-400 block">Trend Bias</span>
                    <span className={`font-bold ${stock.price >= stock.ema20 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {stock.price >= stock.ema20 ? 'Bullish (Above EMA)' : 'Bearish (Below EMA)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Portfolio Holdings */}
              <div className="bg-white rounded-xl p-4 border border-groww-border shadow-2xs">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-bold text-groww-textDark flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Your Holdings</span>
                  </span>
                  <span className="font-mono font-bold text-groww-primary">
                    {stock.shares_held} shares
                  </span>
                </div>
                <div className="flex justify-between text-xs text-groww-textMuted font-mono pt-2 border-t border-gray-100">
                  <span>Current Invested Value</span>
                  <span className="font-bold text-groww-textDark">
                    ₹{(stock.shares_held * stock.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TIMELINE (News-to-Market Timeline) */}
          {activeTab === 'TIMELINE' && (
            <div className="p-4 space-y-4">
              <div className="bg-white rounded-xl p-3 border border-groww-border">
                <h4 className="text-xs font-bold text-groww-textDark flex items-center space-x-1.5">
                  <Newspaper className="w-4 h-4 text-groww-primary" />
                  <span>News-to-Market Reaction Timeline</span>
                </h4>
                <p className="text-[11px] text-groww-textMuted mt-1">
                  Correlates headline publication with subsequent volume anomalies, order flow shifts, and price expansion.
                </p>
              </div>

              {/* Chronological Stepper */}
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                {timeline.map((item, idx) => (
                  <div key={idx} className="relative group">
                    <div className={`absolute -left-6 top-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs ${
                      item.color === 'blue' ? 'bg-sky-500 ring-2 ring-sky-100' :
                      item.color === 'amber' ? 'bg-amber-500 ring-2 ring-amber-100' :
                      item.color === 'green' ? 'bg-groww-primary ring-2 ring-emerald-100' :
                      'bg-rose-500 ring-2 ring-rose-100'
                    }`} />

                    <div className="bg-white border border-groww-border rounded-xl p-3 shadow-2xs hover:border-groww-primary transition-colors">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-mono text-groww-textMuted">{item.time_str}</span>
                        {item.delta && (
                          <span className="font-bold px-1.5 py-0.2 rounded bg-gray-100 text-groww-textDark">
                            {item.delta}
                          </span>
                        )}
                      </div>
                      <h5 className="text-xs font-bold text-groww-textDark">{item.title}</h5>
                      <p className="text-[11px] text-groww-textMuted mt-1 leading-snug">{item.description}</p>
                      {item.source && (
                        <div className="mt-1.5 text-[10px] text-groww-primary font-medium">
                          Source: {item.source}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: MARKET DEPTH */}
          {activeTab === 'DEPTH' && (
            <div className="p-4 space-y-4">
              <div className="bg-white rounded-xl p-4 border border-groww-border text-xs shadow-2xs">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100">
                  <span className="font-bold text-groww-textDark">5-Level Market Depth</span>
                  <span className="text-[10px] text-gray-400">Live Tick Snapshot</span>
                </div>

                <div className="grid grid-cols-2 gap-4 pb-2 text-[11px] font-bold text-groww-textMuted uppercase">
                  <div>Bids (Buy Orders)</div>
                  <div className="text-right">Asks (Sell Orders)</div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-2 font-mono text-xs">
                  {/* Bids */}
                  <div className="space-y-1.5">
                    {[
                      { price: (stock.price - 0.05).toFixed(2), qty: '3,420', orders: 12, pct: 45 },
                      { price: (stock.price - 0.10).toFixed(2), qty: '5,890', orders: 18, pct: 65 },
                      { price: (stock.price - 0.15).toFixed(2), qty: '8,100', orders: 24, pct: 85 },
                      { price: (stock.price - 0.20).toFixed(2), qty: '11,450', orders: 31, pct: 100 },
                      { price: (stock.price - 0.25).toFixed(2), qty: '14,200', orders: 38, pct: 90 },
                    ].map((b, i) => (
                      <div key={i} className="relative flex justify-between items-center text-groww-primary px-1 py-0.5 rounded overflow-hidden">
                        <div className="absolute inset-0 bg-emerald-50 opacity-50" style={{ width: `${b.pct}%` }} />
                        <span className="relative z-10 font-bold">{stock.currency}{b.price}</span>
                        <span className="relative z-10 text-groww-textDark">{b.qty}</span>
                      </div>
                    ))}
                  </div>

                  {/* Asks */}
                  <div className="space-y-1.5 text-right">
                    {[
                      { price: (stock.price + 0.05).toFixed(2), qty: '2,150', orders: 9, pct: 35 },
                      { price: (stock.price + 0.10).toFixed(2), qty: '4,320', orders: 14, pct: 55 },
                      { price: (stock.price + 0.15).toFixed(2), qty: '6,900', orders: 20, pct: 75 },
                      { price: (stock.price + 0.20).toFixed(2), qty: '9,800', orders: 27, pct: 95 },
                      { price: (stock.price + 0.25).toFixed(2), qty: '12,500', orders: 33, pct: 80 },
                    ].map((a, i) => (
                      <div key={i} className="relative flex justify-between items-center text-groww-red px-1 py-0.5 rounded overflow-hidden">
                        <div className="absolute inset-0 bg-rose-50 opacity-50 ml-auto" style={{ width: `${a.pct}%` }} />
                        <span className="relative z-10 text-groww-textDark">{a.qty}</span>
                        <span className="relative z-10 font-bold">{stock.currency}{a.price}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-3 mt-2 border-t border-gray-100 font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 block font-sans">Total Bid Qty</span>
                    <span className="font-bold text-emerald-700">43,060</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 block font-sans">Total Ask Qty</span>
                    <span className="font-bold text-rose-700">35,670</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: RELATED PEERS */}
          {activeTab === 'RELATED' && (
            <div className="p-4 space-y-3">
              <div className="bg-white rounded-xl p-3 border border-groww-border">
                <h4 className="text-xs font-bold text-groww-textDark flex items-center space-x-1.5">
                  <Layers className="w-4 h-4 text-groww-primary" />
                  <span>Sector Peer Correlation</span>
                </h4>
                <p className="text-[11px] text-groww-textMuted mt-1">
                  Correlated peers computed via 0.4 × Sector + 0.6 × 30D Return Correlation.
                </p>
              </div>

              {related.map((peer) => {
                const isAdded = addedSymbols.has(peer.symbol);
                return (
                  <div
                    key={peer.symbol}
                    className="bg-white border border-groww-border rounded-xl p-3 flex items-center justify-between hover:border-groww-primary transition-colors shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-groww-textDark">{peer.symbol}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-100 text-groww-textMuted">
                          {peer.sector}
                        </span>
                      </div>
                      <p className="text-[11px] text-groww-textMuted">{peer.name}</p>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <div className="text-xs font-bold font-mono text-groww-primary">
                          {(peer.similarity * 100).toFixed(0)}% Match
                        </div>
                        <div className="text-[10px] text-groww-textMuted">
                          Corr: {peer.return_corr.toFixed(2)}
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddPeer(peer.symbol)}
                        disabled={isAdded}
                        className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                          isAdded
                            ? 'bg-gray-100 text-gray-400'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                        title={isAdded ? 'Already in Watchlist' : 'Add to Watchlist'}
                      >
                        {isAdded ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

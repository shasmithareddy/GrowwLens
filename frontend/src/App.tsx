import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { WatchlistTable } from './components/WatchlistTable';
import { WhatChangedBanner } from './components/WhatChangedBanner';
import { TriggerOrderModal } from './components/TriggerOrderModal';
import { BuySellModal } from './components/BuySellModal';
import { GrowwTerminal } from './components/GrowwTerminal';
import { MarketHeatmap } from './components/MarketHeatmap';
import { NotificationCenter } from './components/NotificationCenter';
import { RaceConditionDemo } from './components/RaceConditionDemo';
import { AddStockModal } from './components/AddStockModal';
import { NewsSideDrawer } from './components/NewsSideDrawer';
import { useMarketWebSocket } from './hooks/useMarketWebSocket';
import { Watchlist, Stock, WhatChangedReport, Alert, NotificationItem, Device, IndexData } from './types';
import { Bell, CheckCircle, Zap } from 'lucide-react';
import { API_BASE } from './api/config';

export function App() {
  const [activeDevice, setActiveDevice] = useState<string>('MacBook Pro 16"');
  const [indices, setIndices] = useState<Record<string, IndexData>>({
    NIFTY: { name: 'NIFTY 50', price: 23935.50, change: 62.05, change_pct: 0.26 },
    SENSEX: { name: 'SENSEX', price: 76647.38, change: 491.33, change_pct: 0.65 },
    BANKNIFTY: { name: 'BANKNIFTY', price: 57457.90, change: 77.30, change_pct: 0.14 },
    MIDCPNIFTY: { name: 'MIDCPNIFTY', price: 14719.30, change: -40.70, change_pct: -0.28 },
    FINNIFTY: { name: 'FINNIFTY', price: 26076.10, change: 152.40, change_pct: 0.59 },
  });

  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [activeWatchlistId, setActiveWatchlistId] = useState<string>('wl_harish');
  const [watchlistLoadError, setWatchlistLoadError] = useState<string | null>(null);
  const [whatChangedReport, setWhatChangedReport] = useState<WhatChangedReport | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [emails, setEmails] = useState<any[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  
  // Modals & Drawers state
  const [selectedStockForTerminal, setSelectedStockForTerminal] = useState<Stock | null>(null);
  const [selectedStockForTrigger, setSelectedStockForTrigger] = useState<Stock | null>(null);
  const [selectedStockForBuy, setSelectedStockForBuy] = useState<{ stock: Stock; mode: 'BUY' | 'SELL' } | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showRaceDemo, setShowRaceDemo] = useState(false);
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [showNewsDrawer, setShowNewsDrawer] = useState(false);
  const [simulationMode, setSimulationMode] = useState(false);

  // Active toast notification for live alerts
  const [activeToast, setActiveToast] = useState<{ title: string; message: string; symbol: string } | null>(null);
  const [updatedSymbols, setUpdatedSymbols] = useState<Set<string>>(new Set());

  // Available catalog for adding stocks
  const availableCatalog = [
    { symbol: "RELIANCE", name: "Reliance Industries", sector: "Energy & Retail", price: 2980.50, currency: "₹" },
    { symbol: "TCS", name: "Tata Consultancy Services", sector: "Information Technology", price: 4210.00, currency: "₹" },
    { symbol: "HDFCBANK", name: "HDFC Bank", sector: "Financials & Banking", price: 1640.20, currency: "₹" },
    { symbol: "BPCL", name: "Bharat Petroleum Corporation", sector: "Energy", price: 317.85, currency: "₹" },
    { symbol: "APOLLO", name: "Apollo Micro Systems", sector: "Defence & Aerospace", price: 387.65, currency: "₹" },
    { symbol: "RAYMOND", name: "Raymond Ltd", sector: "Textiles & Real Estate", price: 740.00, currency: "₹" },
    { symbol: "PIDILITIND", name: "Pidilite Industries", sector: "Chemicals", price: 1630.50, currency: "₹" },
    { symbol: "MCDOWELL-N", name: "United Spirits", sector: "Consumer", price: 1471.40, currency: "₹" },
    { symbol: "IRCTC", name: "Indian Railway Catering", sector: "Travel & Tourism", price: 475.75, currency: "₹" },
    { symbol: "IDEAFORGE", name: "Ideaforge Technology", sector: "Defence & Drone Tech", price: 776.20, currency: "₹" },
    { symbol: "PARAS", name: "Paras Defence And Space", sector: "Defence & Aerospace", price: 1411.80, currency: "₹" },
    { symbol: "HAL", name: "Hindustan Aeronautics Ltd", sector: "Defence & Aerospace", price: 4280.00, currency: "₹" },
    { symbol: "BEL", name: "Bharat Electronics Ltd", sector: "Defence & Aerospace", price: 312.40, currency: "₹" },
    { symbol: "BEML", name: "BEML Limited", sector: "Heavy Engineering", price: 3950.00, currency: "₹" }
  ];

  // Fetch initial data
  const fetchWatchlists = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/watchlists`);
      if (!res.ok) {
        throw new Error(`Watchlist request failed (${res.status})`);
      }

      const data: unknown = await res.json();
      if (!Array.isArray(data)) {
        throw new Error('Watchlist response was not an array');
      }

      const validWatchlists = data.filter(
        (watchlist): watchlist is Watchlist =>
          typeof watchlist === 'object' &&
          watchlist !== null &&
          typeof (watchlist as Watchlist).id === 'string' &&
          Array.isArray((watchlist as Watchlist).items)
      );
      if (validWatchlists.length !== data.length) {
        throw new Error('Watchlist response contained invalid entries');
      }

      const defaultWatchlist =
        validWatchlists.find((watchlist) => watchlist.is_default) ?? validWatchlists[0];
      setWatchlists(validWatchlists);
      setActiveWatchlistId((currentId) =>
        validWatchlists.some((watchlist) => watchlist.id === currentId)
          ? currentId
          : defaultWatchlist?.id ?? ''
      );
      setWatchlistLoadError(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load watchlists';
      setWatchlistLoadError(message);
      if (import.meta.env.DEV) {
        console.error('Error fetching watchlists:', error);
      }
    }
  }, []);

  const fetchWhatChanged = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/what-changed`);
      const data = await res.json();
      setWhatChangedReport(data);
    } catch (e) {
      console.error('Error fetching what changed:', e);
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/alerts`);
      const data = await res.json();
      setAlerts(data);
    } catch (e) {
      console.error('Error fetching alerts:', e);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/notifications`);
      const data = await res.json();
      setNotifications(data);

      const emailRes = await fetch(`${API_BASE}/api/emails`);
      const emailData = await emailRes.json();
      setEmails(emailData);

      const devRes = await fetch(`${API_BASE}/api/devices`);
      const devData = await devRes.json();
      setDevices(devData);

      const idxRes = await fetch(`${API_BASE}/api/indices`);
      const idxData = await idxRes.json();
      setIndices(idxData);
    } catch (e) {
      console.error('Error fetching supplementary data:', e);
    }
  }, []);

  useEffect(() => {
    fetchWatchlists();
    fetchWhatChanged();
    fetchAlerts();
    fetchNotifications();
  }, [fetchWatchlists, fetchWhatChanged, fetchAlerts, fetchNotifications]);

  // Handle incoming real-time ticks
  const handlePriceTick = useCallback((symbol: string, tickData: any) => {
    setWatchlists((prevWls) =>
      prevWls.map((wl) => ({
        ...wl,
        items: wl.items.map((item) => {
          if (item.symbol === symbol) {
            const newSparkline = [...item.sparkline.slice(1), tickData.price];
            return {
              ...item,
              price: tickData.price,
              volume: tickData.volume,
              volume_ratio: tickData.technical?.volume_ratio ?? item.volume_ratio,
              is_volume_anomaly: tickData.technical?.is_volume_anomaly ?? item.is_volume_anomaly,
              change_1d: tickData.change_1d,
              change_1d_pct: tickData.change_1d_pct,
              ema20: tickData.technical?.ema20 ?? item.ema20,
              buy_pressure: tickData.technical?.buy_pressure ?? item.buy_pressure,
              sell_pressure: tickData.technical?.sell_pressure ?? item.sell_pressure,
              sparkline: newSparkline,
            };
          }
          return item;
        }),
      }))
    );

    // Also update selected stock if currently open in Groww Terminal
    setSelectedStockForTerminal((prev) => {
      if (prev && prev.symbol === symbol) {
        return {
          ...prev,
          price: tickData.price,
          volume: tickData.volume,
          volume_ratio: tickData.technical?.volume_ratio ?? prev.volume_ratio,
          is_volume_anomaly: tickData.technical?.is_volume_anomaly ?? prev.is_volume_anomaly,
          change_1d: tickData.change_1d,
          change_1d_pct: tickData.change_1d_pct,
          ema20: tickData.technical?.ema20 ?? prev.ema20,
          buy_pressure: tickData.technical?.buy_pressure ?? prev.buy_pressure,
          sell_pressure: tickData.technical?.sell_pressure ?? prev.sell_pressure,
        };
      }
      return prev;
    });

    // Flash animation trigger
    setUpdatedSymbols((prev) => {
      const next = new Set(prev);
      next.add(symbol);
      return next;
    });

    setTimeout(() => {
      setUpdatedSymbols((prev) => {
        const next = new Set(prev);
        next.delete(symbol);
        return next;
      });
    }, 1200);
  }, []);

  // Handle incoming real-time alert trigger
  const handleAlertTriggered = useCallback((alertData: any) => {
    setActiveToast({
      title: `🎯 Price Alert Triggered: ${alertData.symbol}`,
      message: alertData.message,
      symbol: alertData.symbol
    });

    const liveNotification: NotificationItem = {
      id: `live_${alertData.event_id}`,
      user_id: 'user_harish',
      event_id: alertData.event_id,
      symbol: alertData.symbol,
      title: `🎯 Alert Triggered: ${alertData.symbol}`,
      body: alertData.message,
      channel: 'IN_APP',
      status: 'DELIVERED',
      read: false,
      created_at: alertData.timestamp,
    };
    setNotifications((previous) => [
      liveNotification,
      ...previous.filter((notification) => notification.event_id !== liveNotification.event_id),
    ].slice(0, 30));
    fetchAlerts();

    // Auto dismiss toast after 6s
    setTimeout(() => {
      setActiveToast(null);
    }, 6000);
  }, [fetchAlerts]);

  const handleMeaningfulChange = useCallback((changeData: any) => {
    setWhatChangedReport((previous) => {
      const items = [
        {
          symbol: changeData.symbol,
          company_name: changeData.company_name ?? changeData.symbol,
          current_price: changeData.current_price,
          currency: '₹',
          last_seen_price: changeData.last_seen_price,
          last_seen_time: changeData.last_seen_time,
          time_elapsed_min: 0,
          changes: changeData.changes.map((change: any) => ({
            type: change.change_type,
            title: change.title,
            detail: change.description,
            badge: change.delta_value ?? 'LIVE',
            color: change.badge_color,
          })),
        },
        ...(previous?.items ?? []).filter((item) => item.symbol !== changeData.symbol),
      ].slice(0, 30);
      return {
        last_checked_summary: 'Live market changes detected just now',
        total_meaningful_changes: items.length,
        items,
      };
    });
  }, []);

  // Handle cross-device mutation received from another tab/device
  const handleCrossDeviceMutation = useCallback(() => {
    fetchWatchlists();
    fetchWhatChanged();
    fetchAlerts();
  }, [fetchWatchlists, fetchWhatChanged, fetchAlerts]);

  // Connect to WebSocket gateway
  const { dataQuality, sendCrossDeviceMutation } = useMarketWebSocket({
    activeDevice,
    onAlertTriggered: handleAlertTriggered,
    onCrossDeviceMutation: handleCrossDeviceMutation,
    onPriceTick: handlePriceTick,
    onMeaningfulChange: handleMeaningfulChange,
  });

  // Watchlist Actions
  const handleCreateWatchlist = async (name: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/watchlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      await fetchWatchlists();
      setActiveWatchlistId(data.id);
      sendCrossDeviceMutation('CREATE_WATCHLIST', { id: data.id, name });
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddStock = async (symbol: string) => {
    try {
      await fetch(`${API_BASE}/api/watchlists/${activeWatchlistId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol })
      });
      await fetchWatchlists();
      await fetchWhatChanged();
      setShowAddStockModal(false);
      sendCrossDeviceMutation('ADD_STOCK', { watchlistId: activeWatchlistId, symbol });
    } catch (e) {
      console.error(e);
    }
  };

  const handleTogglePinStock = async (symbol: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/watchlists/${activeWatchlistId}/items/${symbol}/pin`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setWatchlists((prev) =>
          prev.map((wl) => {
            if (wl.id === activeWatchlistId) {
              const updated = wl.items.map((itm) =>
                itm.symbol === symbol ? { ...itm, is_pinned: data.is_pinned } : itm
              );
              updated.sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0));
              return { ...wl, items: updated };
            }
            return wl;
          })
        );
        sendCrossDeviceMutation('PIN_STOCK', { watchlistId: activeWatchlistId, symbol, is_pinned: data.is_pinned });
      }
    } catch (e) {
      console.error('Failed to toggle pin:', e);
    }
  };

  const handleToggleSimulationMode = async () => {
    try {
      const newMode = !simulationMode;
      const res = await fetch(`${API_BASE}/api/settings/simulation-mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: newMode }),
      });
      if (!res.ok) throw new Error(`Simulation mode request failed (${res.status})`);
      const data = await res.json();
      setSimulationMode(data.simulation_mode);
      setActiveToast({
        title: data.error && !data.simulation_mode ? 'Live data not available yet' : data.simulation_mode ? '⚡ Simulation Mode Active' : '🔒 Live Mode Active',
        message: data.error || (data.simulation_mode
          ? 'Prices, volume, and alerts are now simulated for testing.'
          : `Live quotes restored for ${data.synced_stocks} stocks.`),
        symbol: 'SYS',
      });
      setTimeout(() => setActiveToast(null), 5000);
      if (!data.simulation_mode && !data.error) await fetchWatchlists();
    } catch (e) {
      console.error('Failed to toggle simulation mode:', e);
    }
  };

  const handleMarkAllSeen = async () => {
    try {
      await fetch(`${API_BASE}/api/mark-seen`, { method: 'POST' });
      await fetchWhatChanged();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmitAlert = async (symbol: string, threshold: number, condition: 'GREATER_THAN' | 'LESS_THAN', note?: string) => {
    try {
      await fetch(`${API_BASE}/api/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, threshold, condition, note })
      });
      await fetchAlerts();
      sendCrossDeviceMutation('CREATE_ALERT', { symbol, threshold, condition });
    } catch (e) {
      console.error(e);
    }
  };

  const handleExecuteOrder = async (symbol: string, mode: 'BUY' | 'SELL', qty: number, price: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, action: mode, quantity: qty, price, order_type: 'Market', product_type: 'Delivery' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Order failed (${res.status})`);
      await fetchWatchlists();
      setActiveToast({
        title: `Order Executed: ${mode} ${qty} shares of ${symbol}`,
        message: `Executed at ${price.toFixed(2)} (Delivery) • ${data.shares_held} shares held`,
        symbol
      });
      setTimeout(() => setActiveToast(null), 4000);
    } catch (e) {
      setActiveToast({ title: 'Order rejected', message: e instanceof Error ? e.message : 'The order could not be executed.', symbol });
      setTimeout(() => setActiveToast(null), 5000);
    }
  };

  const handleTriggerAnomaly = async () => {
    try {
      const activeWl = watchlists.find(w => w.id === activeWatchlistId);
      const targetSymbol = activeWl && activeWl.items.length > 0 ? activeWl.items[0].symbol : 'APOLLO';
      await fetch(`${API_BASE}/api/simulator/anomaly`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: targetSymbol, anomaly_type: 'VOLUME_SPIKE' })
      });
      fetchWhatChanged();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkNotificationsRead = async () => {
    try {
      await fetch(`${API_BASE}/api/notifications/mark-read`, { method: 'POST' });
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const activeWl = watchlists.find(w => w.id === activeWatchlistId) || watchlists[0];
  const existingSymbols = new Set((activeWl?.items || []).map(i => i.symbol));

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-groww-textDark">
      {/* Groww App Header */}
      <Header
        indices={indices}
        activeDevice={activeDevice}
        onSelectDevice={setActiveDevice}
        devices={devices}
        unreadCount={notifications.filter(n => !n.read).length}
        onOpenNotifications={() => setShowNotifications(true)}
        onOpenHeatmap={() => setShowHeatmap(!showHeatmap)}
        showHeatmap={showHeatmap}
        onOpenNewsDrawer={() => setShowNewsDrawer(true)}
        simulationMode={simulationMode}
        onToggleSimulationMode={handleToggleSimulationMode}
        dataQuality={dataQuality}
        onTriggerAnomaly={handleTriggerAnomaly}
        onOpenRaceDemo={() => setShowRaceDemo(true)}
      />

      {/* Floating Real-Time Toast Alert */}
      {activeToast && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] max-w-md bg-white border border-emerald-300 rounded-2xl p-4 shadow-2xl animate-slideLeft flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-groww-primary flex items-center justify-center text-white shrink-0 mt-0.5 shadow-xs">
            <Zap className="w-5 h-5 fill-white" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-extrabold text-groww-textDark">{activeToast.title}</h4>
            <p className="text-xs text-groww-textMuted mt-0.5">{activeToast.message}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-groww-primary font-bold">
              <span>● Synced to all devices</span>
              <span className="text-groww-textMuted">• Notification & Email enqueued</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Toggle between Watchlist & Market Heatmap */}
        {showHeatmap ? (
          <MarketHeatmap
            watchlistName={activeWl?.name}
            watchlistStocks={activeWl?.items || []}
            onSelectStock={(sym) => {
              const matched = activeWl?.items.find(i => i.symbol === sym);
              if (matched) {
                setSelectedStockForTerminal(matched as any);
              }
            }}
          />
        ) : (
          <>
            <WhatChangedBanner
              report={whatChangedReport}
              onMarkAllSeen={handleMarkAllSeen}
              onSelectStock={(sym) => {
                const stock = activeWl?.items.find(i => i.symbol === sym);
                if (stock) setSelectedStockForTerminal(stock);
              }}
            />
            {watchlistLoadError && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Watchlists could not be loaded. Check the backend connection and refresh.
              </div>
            )}
            <div className="grid min-w-0 grid-cols-1 gap-6">
              <WatchlistTable
                watchlists={watchlists}
                activeWatchlistId={activeWatchlistId}
                onSelectWatchlist={setActiveWatchlistId}
                onCreateWatchlist={handleCreateWatchlist}
                onOpenAddStock={() => setShowAddStockModal(true)}
                onSelectStock={(stock) => setSelectedStockForTerminal(stock)}
                onOpenTriggerModal={(stock) => setSelectedStockForTrigger(stock)}
                onOpenBuyModal={(stock, mode) => setSelectedStockForBuy({ stock, mode })}
                onTogglePinStock={handleTogglePinStock}
                onAddStockToWatchlist={handleAddStock}
                updatedSymbols={updatedSymbols}
              />

            </div>
          </>
        )}
      </main>

      {/* Modals & Drawers */}
      {selectedStockForTerminal && (
        <GrowwTerminal
          stock={selectedStockForTerminal}
          isOpen={Boolean(selectedStockForTerminal)}
          onClose={() => setSelectedStockForTerminal(null)}
          onOpenTriggerModal={(stock) => setSelectedStockForTrigger(stock)}
          onOpenBuyModal={(stock, mode) => setSelectedStockForBuy({ stock, mode })}
        />
      )}

      {selectedStockForTrigger && (
        <TriggerOrderModal
          stock={selectedStockForTrigger}
          isOpen={Boolean(selectedStockForTrigger)}
          onClose={() => setSelectedStockForTrigger(null)}
          onSubmitAlert={handleSubmitAlert}
        />
      )}

      {selectedStockForBuy && (
        <BuySellModal
          stock={selectedStockForBuy.stock}
          mode={selectedStockForBuy.mode}
          isOpen={Boolean(selectedStockForBuy)}
          onClose={() => setSelectedStockForBuy(null)}
          onExecuteOrder={handleExecuteOrder}
        />
      )}

      {showNotifications && (
        <NotificationCenter
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
          notifications={notifications}
          emails={emails}
          devices={devices}
          onMarkRead={handleMarkNotificationsRead}
        />
      )}

      {showRaceDemo && (
        <RaceConditionDemo
          isOpen={showRaceDemo}
          onClose={() => setShowRaceDemo(false)}
          alerts={alerts}
        />
      )}

      {showAddStockModal && (
        <AddStockModal
          isOpen={showAddStockModal}
          onClose={() => setShowAddStockModal(false)}
          availableStocks={availableCatalog}
          existingSymbols={existingSymbols}
          onAddStock={handleAddStock}
        />
      )}

      {/* Live Market News & Updates Side Drawer */}
      <NewsSideDrawer
        isOpen={showNewsDrawer}
        onClose={() => setShowNewsDrawer(false)}
        onSelectStock={(sym) => {
          const matched = activeWl?.items.find(i => i.symbol === sym) || availableCatalog.find(s => s.symbol === sym);
          if (matched) {
            setSelectedStockForTerminal(matched as any);
            setShowNewsDrawer(false);
          }
        }}
      />
    </div>
  );
}

export default App;

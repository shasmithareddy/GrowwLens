import React from 'react';
import { Bell, Search, Laptop, Smartphone, Tablet, Activity, Zap, RefreshCw, Layers, Newspaper, ToggleLeft, ToggleRight } from 'lucide-react';
import { Device, IndexData } from '../types';

interface HeaderProps {
  indices: Record<string, IndexData>;
  activeDevice: string;
  onSelectDevice: (deviceName: string) => void;
  devices: Device[];
  unreadCount: number;
  onOpenNotifications: () => void;
  onOpenHeatmap: () => void;
  showHeatmap: boolean;
  onOpenNewsDrawer: () => void;
  simulationMode: boolean;
  onToggleSimulationMode: () => void;
  dataQuality: { status: string; badge: string; color: string; latency_ms: number };
  onTriggerAnomaly: () => void;
  onOpenRaceDemo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  indices,
  activeDevice,
  onSelectDevice,
  devices,
  unreadCount,
  onOpenNotifications,
  onOpenHeatmap,
  showHeatmap,
  onOpenNewsDrawer,
  simulationMode,
  onToggleSimulationMode,
  dataQuality,
  onTriggerAnomaly,
  onOpenRaceDemo,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-groww-border">
      {/* Top Indices Ticker Bar matching Groww UI */}
      <div className="bg-[#FBFBFC] border-b border-groww-border px-4 py-1.5 text-xs text-groww-textMuted flex items-center justify-between overflow-x-auto select-none">
        <div className="flex items-center space-x-6 min-w-max">
          {Object.entries(indices).map(([key, idx]) => {
            const isUp = idx.change >= 0;
            return (
              <div key={key} className="flex items-center space-x-1.5 cursor-pointer hover:text-groww-textDark transition-colors">
                <span className="font-semibold text-groww-textDark tracking-tight">{idx.name}</span>
                <span className="font-medium">{idx.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className={`font-semibold flex items-center ${isUp ? 'text-groww-primary' : 'text-groww-red'}`}>
                  {isUp ? '+' : ''}{idx.change.toFixed(2)} ({isUp ? '+' : ''}{idx.change_pct.toFixed(2)}%)
                </span>
              </div>
            );
          })}
        </div>

        {/* Data Quality & System Health Indicator */}
        <div className="flex items-center space-x-3 text-xs pl-4 shrink-0">
          <div className={`px-2.5 py-0.5 rounded-full font-medium flex items-center space-x-1.5 text-[11px] ${
            dataQuality.color === 'green' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
            dataQuality.color === 'amber' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
            dataQuality.color === 'blue' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
            'bg-red-50 text-red-700 border border-red-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              dataQuality.color === 'green' ? 'bg-emerald-500 animate-pulse' :
              dataQuality.color === 'amber' ? 'bg-amber-500 animate-pulse' :
              dataQuality.color === 'blue' ? 'bg-blue-500' : 'bg-red-500'
            }`} />
            <span>{dataQuality.badge}</span>
            <span className="text-[10px] opacity-75">({dataQuality.latency_ms}ms)</span>
          </div>
        </div>
      </div>

      {/* Main Groww App Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          {/* GrowwLens Brand Logo */}
          <div className="flex items-center space-x-2.5 cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-groww-primary flex items-center justify-center shadow-sm shadow-emerald-200">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xl font-extrabold tracking-tight text-groww-textDark">Groww<span className="text-groww-primary">Lens</span></span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">Live API</span>
              </div>
              <p className="text-[11px] text-groww-textMuted -mt-0.5">Intelligent Market Watchlist</p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="hidden md:flex items-center space-x-4 text-sm font-medium">
            <span className="text-groww-primary border-b-2 border-groww-primary pb-5 pt-5 cursor-pointer font-semibold">Stocks</span>
            <button
              onClick={onOpenHeatmap}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                showHeatmap
                  ? 'bg-groww-light text-groww-primary border border-groww-primary/30'
                  : 'text-groww-textMuted hover:bg-gray-100 hover:text-groww-textDark'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{showHeatmap ? 'Watchlist Table' : 'Stock Heatmap'}</span>
            </button>
            <button
              onClick={onOpenNewsDrawer}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-groww-textMuted hover:bg-gray-100 hover:text-groww-textDark transition-all"
              title="Real-time financial disclosures & news"
            >
              <Newspaper className="w-3.5 h-3.5 text-emerald-600" />
              <span>News & Updates</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </button>
          </nav>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center space-x-2.5">
          {/* Simulation Mode Toggle (For off-hours testing without faking default data) */}
          <button
            onClick={onToggleSimulationMode}
            className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
              simulationMode
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
            title={simulationMode ? "Simulation active (testing alert conditions)" : "Turn on simulated ticks for weekend testing"}
          >
            {simulationMode ? (
              <ToggleRight className="w-4 h-4 text-amber-600" />
            ) : (
              <ToggleLeft className="w-4 h-4 text-gray-400" />
            )}
            <span>Sim: {simulationMode ? 'ON' : 'OFF'}</span>
          </button>

          {/* Quick Demo Simulator Actions */}
          <div className="hidden lg:flex items-center space-x-2">
            <button
              onClick={onTriggerAnomaly}
              className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors shadow-xs"
              title="Inject a volume anomaly & price breakout to test the event engine"
            >
              <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
              <span>Inject Anomaly</span>
            </button>
            <button
              onClick={onOpenRaceDemo}
              className="flex items-center space-x-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100 transition-colors shadow-xs"
              title="Test concurrency & row-level locking with two simultaneous workers"
            >
              <Activity className="w-3.5 h-3.5 text-indigo-600" />
              <span>Test Concurrency</span>
            </button>
          </div>

          {/* Cross-Device Switcher Dropdown */}
          <div className="relative group">
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer text-xs font-medium text-groww-textDark">
              {activeDevice.includes('Mac') ? <Laptop className="w-3.5 h-3.5 text-groww-primary" /> :
               activeDevice.includes('iPhone') ? <Smartphone className="w-3.5 h-3.5 text-groww-primary" /> :
               <Tablet className="w-3.5 h-3.5 text-groww-primary" />}
              <span className="max-w-[100px] truncate">{activeDevice}</span>
              <span className="w-2 h-2 rounded-full bg-groww-primary animate-ping" />
            </div>
            {/* Dropdown Menu */}
            <div className="absolute right-0 mt-1 w-56 bg-white border border-groww-border rounded-xl shadow-lg p-2 hidden group-hover:block z-50">
              <div className="text-[11px] font-semibold text-groww-textMuted px-2 py-1 uppercase tracking-wider">
                Cross-Device Sync Targets
              </div>
              {devices.map((dev) => (
                <div
                  key={dev.device_id}
                  onClick={() => onSelectDevice(dev.device_name)}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                    activeDevice === dev.device_name ? 'bg-groww-light text-groww-primary font-semibold' : 'hover:bg-gray-50 text-groww-textDark'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {dev.device_type === 'desktop' ? <Laptop className="w-4 h-4" /> :
                     dev.device_type === 'mobile' ? <Smartphone className="w-4 h-4" /> :
                     <Tablet className="w-4 h-4" />}
                    <span>{dev.device_name}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-mono">
                    {dev.status}
                  </span>
                </div>
              ))}
              <div className="border-t border-groww-border mt-1 pt-1.5 px-2 text-[10px] text-groww-textMuted">
                Syncs state bidirectionally across all logged-in devices via backend WebSocket.
              </div>
            </div>
          </div>

          {/* Notification Bell with Badge */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-full hover:bg-gray-100 text-groww-textDark transition-colors"
            title="Notification Center & Alert Audit Logs"
          >
            <Bell className="w-5 h-5 text-groww-textDark" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-groww-red text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* User Profile Avatar */}
          <div className="flex items-center space-x-2 pl-2 cursor-pointer">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Shasmitha"
              alt="Shasmitha"
              className="w-8 h-8 rounded-full border border-groww-border bg-emerald-50"
            />
            <span className="hidden sm:inline text-xs font-semibold text-groww-textDark">Shasmitha</span>
          </div>
        </div>
      </div>
    </header>
  );
};

import React, { useState } from 'react';
import { X, Bell, Mail, Check, Laptop, Smartphone, Tablet, Clock, ShieldCheck } from 'lucide-react';
import { NotificationItem, Device } from '../types';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  emails: any[];
  devices: Device[];
  onMarkRead: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications,
  emails,
  devices,
  onMarkRead
}) => {
  const [activeTab, setActiveTab] = useState<'NOTIFS' | 'EMAILS' | 'DEVICES'>('NOTIFS');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-2xs animate-fadeIn">
      <div className="w-full max-w-md bg-white h-full shadow-2xl border-l border-groww-border flex flex-col transform transition-all animate-slideLeft">
        {/* Top Header */}
        <div className="p-5 border-b border-groww-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-groww-primary" />
            <h3 className="text-base font-extrabold text-groww-textDark">Notification Center</h3>
          </div>
          <div className="flex items-center space-x-2">
            {activeTab === 'NOTIFS' && notifications.some(n => !n.read) && (
              <button
                onClick={onMarkRead}
                className="text-xs text-groww-primary font-semibold hover:underline flex items-center space-x-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark read</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 border-b border-gray-100 text-xs font-semibold bg-[#FAFAFB]">
          <button
            onClick={() => setActiveTab('NOTIFS')}
            className={`py-3 text-center border-b-2 transition-colors ${
              activeTab === 'NOTIFS' ? 'border-groww-primary text-groww-primary bg-white' : 'border-transparent text-groww-textMuted'
            }`}
          >
            In-App ({notifications.length})
          </button>
          <button
            onClick={() => setActiveTab('EMAILS')}
            className={`py-3 text-center border-b-2 transition-colors ${
              activeTab === 'EMAILS' ? 'border-groww-primary text-groww-primary bg-white' : 'border-transparent text-groww-textMuted'
            }`}
          >
            Email Log ({emails.length})
          </button>
          <button
            onClick={() => setActiveTab('DEVICES')}
            className={`py-3 text-center border-b-2 transition-colors ${
              activeTab === 'DEVICES' ? 'border-groww-primary text-groww-primary bg-white' : 'border-transparent text-groww-textMuted'
            }`}
          >
            Sync ({devices.length})
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Tab 1: In-App Notifications */}
          {activeTab === 'NOTIFS' && (
            <>
              {notifications.length === 0 ? (
                <div className="text-center py-12 text-groww-textMuted text-xs">
                  No notifications yet. Trigger a price target or inject an anomaly!
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      n.read
                        ? 'bg-white border-groww-border'
                        : 'bg-emerald-50/40 border-emerald-200 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-groww-textDark">{n.title}</span>
                      <span className="text-[10px] text-groww-textMuted font-mono">
                        {new Date(n.created_at * 1000).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-groww-textMuted">{n.body}</p>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-groww-textMuted">
                      <span className="px-1.5 py-0.2 rounded bg-gray-100 font-mono">Channel: {n.channel}</span>
                      <span className="font-semibold text-groww-primary">✓ Delivered</span>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {/* Tab 2: Email Logs */}
          {activeTab === 'EMAILS' && (
            <>
              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl text-[11px] text-blue-900 mb-2">
                <div className="flex items-center space-x-1.5 font-bold mb-0.5">
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  <span>Asynchronous Dispatch Queue</span>
                </div>
                Emails are dispatched out-of-band by asynchronous Python workers via Resend, preventing latency on the market ingestion thread.
              </div>

              {emails.length === 0 ? (
                <div className="text-center py-12 text-groww-textMuted text-xs">
                  No emails dispatched yet.
                </div>
              ) : (
                emails.map((m) => (
                  <div key={m.id} className="p-3.5 bg-white border border-groww-border rounded-xl shadow-2xs">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-groww-textDark">{m.subject}</span>
                      <span className="text-[10px] text-groww-textMuted font-mono">
                        {new Date(m.sent_at * 1000).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-groww-textMuted">To: {m.to}</p>
                    <div className="mt-2 flex items-center justify-between text-[10px]">
                      <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold font-mono">
                        {m.status}
                      </span>
                      <span className="text-groww-textMuted">{m.provider}</span>
                    </div>
                  </div>
                ))
              )}
            </>
          )}

          {/* Tab 3: Cross-Device Sync */}
          {activeTab === 'DEVICES' && (
            <div className="space-y-3">
              <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900">
                <div className="flex items-center space-x-1.5 font-bold mb-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-groww-primary" />
                  <span>Centralized Device Synchronization</span>
                </div>
                All 3 devices share the same underlying account. Changes to watchlists and triggered alerts synchronize simultaneously over WebSocket.
              </div>

              {devices.map((d) => (
                <div key={d.device_id} className="p-3.5 bg-white border border-groww-border rounded-xl flex items-center justify-between shadow-2xs">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-groww-textDark">
                      {d.device_type === 'desktop' ? <Laptop className="w-4 h-4" /> :
                       d.device_type === 'mobile' ? <Smartphone className="w-4 h-4" /> :
                       <Tablet className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-groww-textDark">{d.device_name}</h4>
                      <p className="text-[10px] text-groww-textMuted">Device ID: {d.device_id}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    d.status === 'ONLINE' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {d.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

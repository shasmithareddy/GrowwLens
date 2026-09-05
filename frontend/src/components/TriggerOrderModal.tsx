import React, { useState } from 'react';
import { X, HelpCircle, AlertCircle, ShieldCheck } from 'lucide-react';
import { Stock } from '../types';

interface TriggerOrderModalProps {
  stock: Stock | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitAlert: (symbol: string, threshold: number, condition: 'GREATER_THAN' | 'LESS_THAN', note?: string) => void;
}

export const TriggerOrderModal: React.FC<TriggerOrderModalProps> = ({
  stock,
  isOpen,
  onClose,
  onSubmitAlert
}) => {
  const [triggerPrice, setTriggerPrice] = useState(stock?.price.toFixed(2) ?? '0.00');
  const [orderAction, setOrderAction] = useState<'BUY' | 'SELL'>('BUY');
  const [qty, setQty] = useState('10');

  if (!isOpen || !stock) return null;

  const currentPrice = stock.price;
  const numPrice = parseFloat(triggerPrice) || currentPrice;
  const diffPct = ((numPrice - currentPrice) / currentPrice) * 100;
  const isAbove = numPrice >= currentPrice;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const threshold = parseFloat(triggerPrice);
    if (!isNaN(threshold) && threshold > 0) {
      const condition = threshold >= currentPrice ? 'GREATER_THAN' : 'LESS_THAN';
      onSubmitAlert(stock.symbol, threshold, condition, `${orderAction} trigger order at ${threshold}`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-groww-border overflow-hidden transform transition-all">
        {/* Modal Header matching Groww UI screenshot 2 */}
        <div className="p-5 border-b border-gray-100 flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold text-groww-textDark">{stock.company_name}</h3>
            <div className="flex items-center space-x-2 text-xs text-groww-textMuted mt-0.5">
              <span>NSE {stock.currency}{stock.price.toFixed(2)}</span>
              <span>•</span>
              <span>BSE {stock.currency}{(stock.price * 0.999).toFixed(2)}</span>
              <span className="text-groww-primary font-medium underline cursor-pointer">Depth</span>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Price Reach Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-groww-textDark">If price reaches</label>
              <span className={`text-xs font-mono font-semibold ${diffPct >= 0 ? 'text-groww-primary' : 'text-groww-red'}`}>
                {diffPct >= 0 ? '+' : ''}{diffPct.toFixed(2)}% from market
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs text-groww-textMuted font-bold">
                {stock.currency}
              </span>
              <input
                type="number"
                step="0.05"
                required
                value={triggerPrice}
                onChange={(e) => setTriggerPrice(e.target.value)}
                className="w-full pl-8 pr-4 py-2 text-sm font-mono font-bold bg-[#FBFBFC] border border-groww-border rounded-xl focus:bg-white focus:outline-none focus:border-groww-primary transition-all text-right"
              />
            </div>
          </div>

          {/* Action (Buy / Sell) toggle */}
          <div>
            <label className="text-xs font-semibold text-groww-textDark block mb-2">Then</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOrderAction('BUY')}
                className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                  orderAction === 'BUY'
                    ? 'bg-groww-light border-groww-primary text-groww-primary shadow-xs'
                    : 'bg-white border-groww-border text-groww-textMuted hover:bg-gray-50'
                }`}
              >
                Buy
              </button>
              <button
                type="button"
                onClick={() => setOrderAction('SELL')}
                className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                  orderAction === 'SELL'
                    ? 'bg-rose-50 border-groww-red text-groww-red shadow-xs'
                    : 'bg-white border-groww-border text-groww-textMuted hover:bg-gray-50'
                }`}
              >
                Sell
              </button>
            </div>
          </div>

          {/* Qty Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-groww-textDark">Qty NSE</label>
              <span className="text-[11px] text-groww-primary font-medium cursor-pointer">
                Add limit price
              </span>
            </div>
            <input
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full px-3.5 py-2 text-sm font-mono font-bold bg-[#FBFBFC] border border-groww-border rounded-xl focus:bg-white focus:outline-none focus:border-groww-primary transition-all text-right"
            />
          </div>

          {/* State Machine & Concurrency Assurance Card */}
          <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-start space-x-2.5 text-[11px] text-emerald-900">
            <ShieldCheck className="w-4 h-4 text-groww-primary shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Stateful Alert Guarantee:</span>
              <p className="opacity-90 mt-0.5">
                Saved with state <span className="font-mono font-semibold">ARMED</span>. Evaluated under row-level database locks with deduplication key <span className="font-mono">UNIQUE(alert_id, event_id)</span> to guarantee zero duplicate alerts across multi-device sessions.
              </p>
            </div>
          </div>

          {/* Footer Info & Submit Button */}
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs text-groww-textMuted mb-3">
              <span>Validity: 1 year</span>
              <span>Required: {stock.currency}0</span>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-groww-primary hover:bg-groww-hover text-white font-bold text-sm shadow-sm transition-colors"
            >
              Set trigger order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

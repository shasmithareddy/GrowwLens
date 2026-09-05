import React, { useState } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { Stock } from '../types';

interface BuySellModalProps {
  stock: Stock | null;
  mode: 'BUY' | 'SELL';
  isOpen: boolean;
  onClose: () => void;
  onExecuteOrder: (symbol: string, mode: 'BUY' | 'SELL', qty: number, price: number) => void;
}

export const BuySellModal: React.FC<BuySellModalProps> = ({
  stock,
  mode: initialMode,
  isOpen,
  onClose,
  onExecuteOrder
}) => {
  const [mode, setMode] = useState<'BUY' | 'SELL'>(initialMode);
  const [productType, setProductType] = useState<'Delivery' | 'Intraday' | 'MTF'>('Delivery');
  const [qty, setQty] = useState('20');
  const [orderType, setOrderType] = useState<'Market' | 'Limit'>('Market');
  const [limitPrice, setLimitPrice] = useState(stock?.price.toFixed(2) ?? '0.00');

  if (!isOpen || !stock) return null;

  const parsedQty = parseInt(qty) || 0;
  const executionPrice = orderType === 'Market' ? stock.price : (parseFloat(limitPrice) || stock.price);
  const approxTotal = parsedQty * executionPrice;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedQty > 0) {
      onExecuteOrder(stock.symbol, mode, parsedQty, executionPrice);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-groww-border overflow-hidden">
        {/* Header matching Groww UI Screenshot 3 */}
        <div className="p-5 border-b border-gray-100 flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold text-groww-textDark">{stock.company_name}</h3>
            <div className="flex items-center space-x-2 text-xs text-groww-textMuted mt-0.5">
              <span>NSE {stock.currency}{stock.price.toFixed(2)} ({stock.change_1d_pct >= 0 ? '+' : ''}{stock.change_1d_pct}%)</span>
              <span>•</span>
              <span>BSE {stock.currency}{(stock.price * 0.999).toFixed(2)}</span>
              <span className="text-groww-primary font-medium underline cursor-pointer">Depth</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Buy / Sell Tabs */}
        <div className="grid grid-cols-2 border-b border-gray-100">
          <button
            type="button"
            onClick={() => setMode('BUY')}
            className={`py-3 text-xs font-bold text-center border-b-2 transition-all ${
              mode === 'BUY'
                ? 'border-groww-primary text-groww-primary bg-emerald-50/30'
                : 'border-transparent text-groww-textMuted hover:text-groww-textDark'
            }`}
          >
            BUY
          </button>
          <button
            type="button"
            onClick={() => setMode('SELL')}
            className={`py-3 text-xs font-bold text-center border-b-2 transition-all ${
              mode === 'SELL'
                ? 'border-groww-red text-groww-red bg-rose-50/30'
                : 'border-transparent text-groww-textMuted hover:text-groww-textDark'
            }`}
          >
            SELL
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Order Types */}
          <div className="flex items-center space-x-2">
            {(['Delivery', 'Intraday', 'MTF'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setProductType(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  productType === type
                    ? 'bg-gray-100 border-gray-300 text-groww-textDark'
                    : 'bg-white border-groww-border text-groww-textMuted hover:bg-gray-50'
                }`}
              >
                {type} {type === 'MTF' && <span className="text-[10px] text-groww-primary font-bold">4.36x</span>}
              </button>
            ))}
          </div>

          {/* Quick preset chips */}
          <div className="flex items-center justify-end space-x-1.5 pt-1">
            {[20, 30, 40].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setQty(preset.toString())}
                className={`px-2 py-0.5 text-xs font-mono rounded border transition-colors ${
                  qty === preset.toString()
                    ? 'bg-gray-800 text-white border-gray-800'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Quantity Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-groww-textDark">Qty NSE</label>
            </div>
            <input
              type="number"
              min="1"
              required
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full px-3.5 py-2 text-sm font-mono font-bold bg-[#FBFBFC] border border-groww-border rounded-xl focus:bg-white focus:outline-none focus:border-groww-primary transition-all text-right"
            />
          </div>

          {/* Price Input & Market/Limit Toggle */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-groww-textDark">Price ({orderType})</label>
              <button
                type="button"
                onClick={() => setOrderType(orderType === 'Market' ? 'Limit' : 'Market')}
                className="text-xs text-groww-primary font-semibold hover:underline"
              >
                Switch to {orderType === 'Market' ? 'Limit' : 'Market'}
              </button>
            </div>
            <input
              type="text"
              disabled={orderType === 'Market'}
              value={orderType === 'Market' ? 'At market' : limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              className="w-full px-3.5 py-2 text-sm font-mono font-bold bg-[#FBFBFC] border border-groww-border rounded-xl focus:bg-white focus:outline-none focus:border-groww-primary transition-all text-right disabled:bg-gray-100 disabled:text-groww-textMuted"
            />
          </div>

          {/* Balance & Approx Req */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-groww-textMuted">
            <span>Balance: {stock.currency}44,520.00</span>
            <span>Approx req: <strong className="text-groww-textDark">{stock.currency}{approxTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={`w-full py-3 rounded-xl text-white font-bold text-sm shadow-sm transition-colors ${
              mode === 'BUY'
                ? 'bg-groww-primary hover:bg-groww-hover'
                : 'bg-groww-red hover:bg-rose-600'
            }`}
          >
            {mode === 'BUY' ? 'Buy' : 'Sell'} {stock.symbol}
          </button>
        </form>
      </div>
    </div>
  );
};

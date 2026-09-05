import React, { useState } from 'react';
import { X, Search, Plus, Check } from 'lucide-react';
import { Stock } from '../types';

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableStocks: Array<{ symbol: string; name: string; sector: string; price: number; currency: string }>;
  existingSymbols: Set<string>;
  onAddStock: (symbol: string) => void;
}

export const AddStockModal: React.FC<AddStockModalProps> = ({
  isOpen,
  onClose,
  availableStocks,
  existingSymbols,
  onAddStock
}) => {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const filtered = availableStocks.filter(s =>
    s.symbol.toLowerCase().includes(query.toLowerCase()) ||
    s.name.toLowerCase().includes(query.toLowerCase()) ||
    s.sector.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-groww-border overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-groww-textDark">Add Stocks to Watchlist</h3>
            <p className="text-xs text-groww-textMuted">Search and select stocks to track in real-time.</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="w-4 h-4 text-groww-textMuted absolute left-3 top-2.5" />
            <input
              type="text"
              autoFocus
              placeholder="Search by company name, symbol or sector..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-[#FBFBFC] border border-groww-border rounded-xl focus:bg-white focus:outline-none focus:border-groww-primary transition-all"
            />
          </div>
        </div>

        {/* Stock List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filtered.map((stock) => {
            const isAlreadyAdded = existingSymbols.has(stock.symbol);
            return (
              <div
                key={stock.symbol}
                className="p-3 rounded-xl border border-groww-border hover:border-groww-primary/50 flex items-center justify-between transition-colors bg-white"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-xs text-groww-textDark">
                    {stock.symbol.substring(0, 2)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-groww-textDark">{stock.symbol}</h4>
                    <p className="text-[11px] text-groww-textMuted truncate max-w-[200px]">{stock.name}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <span className="text-xs font-mono font-bold text-groww-textDark">
                    {stock.currency}{stock.price.toFixed(2)}
                  </span>
                  {isAlreadyAdded ? (
                    <span className="flex items-center space-x-1 text-xs text-groww-primary font-bold px-2.5 py-1 bg-emerald-50 rounded-lg">
                      <Check className="w-3.5 h-3.5" />
                      <span>Added</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => onAddStock(stock.symbol)}
                      className="flex items-center space-x-1 text-xs font-bold px-3 py-1 bg-groww-primary hover:bg-groww-hover text-white rounded-lg transition-colors shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

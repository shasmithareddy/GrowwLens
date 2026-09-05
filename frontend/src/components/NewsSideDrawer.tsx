import React, { useState, useEffect } from 'react';
import { X, ExternalLink, RefreshCw, Newspaper, TrendingUp, Sparkles, Filter } from 'lucide-react';
import { LiveNewsItem } from '../types';
import { API_BASE } from '../api/config';

interface NewsSideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStock?: (symbol: string) => void;
}

export function NewsSideDrawer({ isOpen, onClose, onSelectStock }: NewsSideDrawerProps) {
  const [news, setNews] = useState<LiveNewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'RESULTS' | 'DEALS' | 'REGULATORY'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchNews = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/news/feed`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setNews(data);
      }
    } catch (e) {
      console.error('Failed to fetch live news:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNews();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredNews = news.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.source.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeFilter === 'RESULTS') {
      return (
        item.title.toLowerCase().includes('profit') ||
        item.title.toLowerCase().includes('result') ||
        item.title.toLowerCase().includes('quarter')
      );
    }
    if (activeFilter === 'DEALS') {
      return (
        item.title.toLowerCase().includes('order') ||
        item.title.toLowerCase().includes('deal') ||
        item.title.toLowerCase().includes('bags') ||
        item.title.toLowerCase().includes('launches')
      );
    }
    if (activeFilter === 'REGULATORY') {
      return (
        item.title.toLowerCase().includes('rbi') ||
        item.title.toLowerCase().includes('govt') ||
        item.title.toLowerCase().includes('tax') ||
        item.title.toLowerCase().includes('msci')
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-gray-200">
          {/* Header */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <Newspaper className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base font-bold text-gray-900">Market News & Updates</h2>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                    Live Feed
                  </span>
                </div>
                <p className="text-xs text-gray-500">Real-time financial disclosures & verified news</p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={fetchNews}
                disabled={loading}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                title="Refresh news"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="p-3 border-b border-gray-100 space-y-2 bg-white">
            <input
              type="text"
              placeholder="Search news, companies, or events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50/50"
            />
            <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-xs">
              {(['ALL', 'RESULTS', 'DEALS', 'REGULATORY'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveFilter(tab)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap ${
                    activeFilter === tab
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab === 'ALL'
                    ? 'All News'
                    : tab === 'RESULTS'
                    ? 'Earnings & Results'
                    : tab === 'DEALS'
                    ? 'Orders & Deals'
                    : 'Macro & Policy'}
                </button>
              ))}
            </div>
          </div>

          {/* News List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-gray-100">
            {loading && news.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-gray-400 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
                <p className="text-xs">Fetching real-time market updates...</p>
              </div>
            ) : filteredNews.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <Newspaper className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-xs">No updates found matching your search.</p>
              </div>
            ) : (
              filteredNews.map((item, idx) => {
                const pubDate = new Date(item.pub_date);
                const timeStr = !isNaN(pubDate.getTime())
                  ? pubDate.toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Recent';

                return (
                  <div key={idx} className="pt-3 first:pt-0 group">
                    <div className="flex space-x-3 items-start">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt=""
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-gray-100 border border-gray-100"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-400">
                          <TrendingUp className="w-5 h-5 text-gray-400" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            {item.source || 'News'}
                          </span>
                          <span className="text-[10px] text-gray-400">{timeStr}</span>
                        </div>

                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-gray-900 hover:text-emerald-600 line-clamp-2 leading-snug group-hover:underline flex items-start justify-between"
                        >
                          <span>{item.title}</span>
                          <ExternalLink className="w-3 h-3 ml-1 flex-shrink-0 opacity-0 group-hover:opacity-100 text-gray-400 transition-opacity mt-0.5" />
                        </a>

                        {item.summary && (
                          <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                            {item.summary.replace(/Powered by.*$/, '')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer note */}
          <div className="p-3 border-t border-gray-100 bg-gray-50 text-[11px] text-gray-400 text-center">
            Data aggregated from LiveMint, Business Standard & Exchange feeds
          </div>
        </div>
      </div>
    </div>
  );
}

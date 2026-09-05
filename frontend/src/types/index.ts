export interface Stock {
  id: string;
  symbol: string;
  company_name: string;
  sector: string;
  price: number;
  currency: string;
  prev_close: number;
  change_1d: number;
  change_1d_pct: number;
  volume: number;
  volume_ratio: number;
  is_volume_anomaly: boolean;
  buy_pressure: number;
  sell_pressure: number;
  ema20: number;
  sparkline: number[];
  low_52w: number;
  high_52w: number;
  shares_held: number;
  is_pinned?: boolean;
  poc_price?: number;
  volume_delta_15m?: number;
  volume_delta_pct?: number | null;
  last_seen_price: number;
  last_seen_at: number;
  added_at: number;
  added_price: number;
  change_since_added: number;
  change_since_added_pct: number;
  news_impact?: {
    headline: string;
    summary: string;
    impact: string;
  } | null;
}

export interface Watchlist {
  id: string;
  name: string;
  is_default: boolean;
  items_count: number;
  items: Stock[];
}

export interface Alert {
  id: string;
  user_id: string;
  symbol: string;
  alert_type: string;
  condition: "GREATER_THAN" | "LESS_THAN";
  threshold: number;
  status: "ARMED" | "TRIGGERED" | "COOLDOWN" | "DISABLED";
  cooldown_until?: number | null;
  note?: string | null;
  created_at: number;
}

export interface WhatChangedItem {
  symbol: string;
  company_name: string;
  current_price: number;
  currency: string;
  last_seen_price: number;
  last_seen_time: number;
  time_elapsed_min: number;
  changes: Array<{
    type: string;
    title: string;
    detail: string;
    badge: string;
    color: "green" | "red" | "amber" | "blue";
  }>;
}

export interface WhatChangedReport {
  last_checked_summary: string;
  total_meaningful_changes: number;
  items: WhatChangedItem[];
}

export interface NewsTimelineItem {
  time_str: string;
  timestamp: number;
  event_type: "NEWS" | "VOLUME" | "PRESSURE" | "PRICE" | "TECHNICAL";
  title: string;
  description: string;
  source?: string;
  impact?: string;
  delta?: string;
  color: "green" | "red" | "amber" | "blue";
}

export interface RelatedStock {
  symbol: string;
  name: string;
  similarity: number;
  sector: string;
  return_corr: number;
}

export interface Device {
  device_id: string;
  user_id: string;
  device_name: string;
  device_type: "desktop" | "mobile" | "tablet";
  status: "ONLINE" | "STANDBY" | "OFFLINE";
  last_heartbeat: number;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  event_id: string;
  symbol: string;
  title: string;
  body: string;
  channel: string;
  status: string;
  read: boolean;
  created_at: number;
}

export interface HeatmapTile {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  currency: string;
  change_pct: number;
  market_cap_tier: string;
  volume: number;
}

export interface IndexData {
  name: string;
  price: number;
  change: number;
  change_pct: number;
}

export interface LiveNewsItem {
  title: string;
  summary: string;
  url: string;
  image_url?: string;
  pub_date: string;
  source: string;
  topics?: string[];
}

export interface SectorPeer {
  symbol: string;
  name: string;
  sector: string;
  price: number;
  currency: string;
  change_pct: number;
  volume: number;
}

export interface HeatmapStock {
  symbol: string;
  name: string;
  price: number;
  currency: string;
  change_pct: number;
  volume: number;
  weight: number;
  sector: string;
}

export interface HeatmapSector {
  name: string;
  total_weight: number;
  avg_change: number;
  stocks: HeatmapStock[];
}

export interface VolumeOrderbookLevel {
  price: number;
  volume: number;
  pct_of_max: number;
  side: "ASK" | "BID" | "LTP";
  color: "red" | "lime" | "gray";
  is_poc: boolean;
  volume_change_15m: number;
}

export interface VolumeOrderbookData {
  symbol: string;
  current_price: number;
  step: number;
  rows: number;
  poc_price: number;
  poc_volume: number;
  total_bid_vol: number;
  total_ask_vol: number;
  buy_vol_pct: number;
  sell_vol_pct: number;
  volume_delta: number;
  levels: VolumeOrderbookLevel[];
  author_credit?: string;
}


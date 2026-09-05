/**
 * Dynamic API and WebSocket configuration.
 * Avoids hardcoded localhost URLs so GrowwLens works seamlessly in dev,
 * staging, production, Docker, and reverse-proxy setups.
 */

export const getApiBase = (): string => {
  if (typeof window === 'undefined') return 'http://localhost:8000';
  
  // If Vite dev server (usually :5173 or :3000), target backend at :8000 on current hostname
  if (window.location.port === '5173' || window.location.port === '3000') {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  
  // In production/preview/container, origin matches the backend host
  return window.location.origin;
};

export const getWsBase = (): string => {
  if (typeof window === 'undefined') return 'ws://localhost:8000';
  
  const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  
  if (window.location.port === '5173' || window.location.port === '3000') {
    return `${wsProto}//${window.location.hostname}:8000`;
  }
  
  return `${wsProto}//${window.location.host}`;
};

export const API_BASE = getApiBase();
export const WS_BASE = getWsBase();

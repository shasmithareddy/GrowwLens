/**
 * GrowwLens API + WebSocket configuration.
 *
 * Frontend: Vercel
 * Backend: Render
 */

export const getApiBase = (): string => {
  const configuredApi = import.meta.env.VITE_API_URL?.trim();

  if (configuredApi) {
    return configuredApi.replace(/\/$/, '');
  }

  if (typeof window === 'undefined') {
    return 'http://localhost:8000';
  }

  // Local Vite development
  if (
    window.location.port === '5173' ||
    window.location.port === '3000'
  ) {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }

  // Production fallback
  return 'https://growwlens.onrender.com';
};

export const getWsBase = (): string => {
  const configuredWs = import.meta.env.VITE_WS_URL?.trim();

  if (configuredWs) {
    return configuredWs.replace(/\/$/, '');
  }

  // If API URL is configured, derive WebSocket URL from it
  const configuredApi = import.meta.env.VITE_API_URL?.trim();

  if (configuredApi) {
    return configuredApi
      .replace(/\/$/, '')
      .replace(/^https:/, 'wss:')
      .replace(/^http:/, 'ws:');
  }

  if (typeof window === 'undefined') {
    return 'ws://localhost:8000';
  }

  // Local Vite development
  if (
    window.location.port === '5173' ||
    window.location.port === '3000'
  ) {
    const wsProto =
      window.location.protocol === 'https:' ? 'wss:' : 'ws:';

    return `${wsProto}//${window.location.hostname}:8000`;
  }

  // Production fallback
  return 'wss://growwlens.onrender.com';
};

export const API_BASE = getApiBase();
export const WS_BASE = getWsBase();
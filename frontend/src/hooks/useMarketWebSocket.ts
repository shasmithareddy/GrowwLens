import { useEffect, useRef, useState, useCallback } from 'react';
import { Stock, IndexData, NotificationItem } from '../types';
import { API_BASE, WS_BASE } from '../api/config';

interface UseMarketWebSocketProps {
  activeDevice: string;
  onAlertTriggered: (alertData: any) => void;
  onCrossDeviceMutation: () => void;
  onPriceTick: (symbol: string, tickData: any) => void;
  onMeaningfulChange: (changeData: any) => void;
}

export const useMarketWebSocket = ({
  activeDevice,
  onAlertTriggered,
  onCrossDeviceMutation,
  onPriceTick,
  onMeaningfulChange
}: UseMarketWebSocketProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [dataQuality, setDataQuality] = useState({
    status: 'STALE', badge: 'Connecting', color: 'red', latency_ms: 0
  });
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  const connect = useCallback(() => {
    const deviceId = `dev_${activeDevice.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    const deviceType = activeDevice.includes('iPhone') ? 'mobile' : (activeDevice.includes('iPad') ? 'tablet' : 'desktop');

    const wsUrl = `${WS_BASE}/ws?user_id=user_harish&device_id=${deviceId}&device_name=${encodeURIComponent(activeDevice)}&device_type=${deviceType}`;

    const refreshHealth = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/system/health`);
        if (!response.ok) throw new Error(`Health request failed (${response.status})`);
        const health = await response.json();
        setDataQuality(health.data_quality);
      } catch {
        setDataQuality({ status: 'STALE', badge: 'Health unavailable', color: 'red', latency_ms: 5000 });
      }
    };

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        refreshHealth();
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const { action, data } = payload;

          if (action === 'TICK') {
            onPriceTick(data.symbol, data);
          } else if (action === 'WHAT_CHANGED') {
            onMeaningfulChange(data);
          } else if (action === 'ALERT_TRIGGERED') {
            onAlertTriggered(data);
          } else if (action === 'CROSS_DEVICE_MUTATION') {
            onCrossDeviceMutation();
          }
        } catch (e) {
          console.error('WebSocket parse error:', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setDataQuality({ status: 'STALE', badge: 'Stale • Reconnecting', color: 'red', latency_ms: 5000 });
        reconnectTimeoutRef.current = setTimeout(connect, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      console.error('WebSocket connection error:', e);
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    }
  }, [activeDevice, onAlertTriggered, onCrossDeviceMutation, onPriceTick]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  const sendCrossDeviceMutation = (mutationType: string, payload: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: 'SYNC_MUTATION',
        data: { mutationType, payload }
      }));
    }
  };

  return {
    isConnected,
    dataQuality,
    sendCrossDeviceMutation
  };
};

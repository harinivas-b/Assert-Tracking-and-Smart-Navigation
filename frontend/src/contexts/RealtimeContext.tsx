import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useDemo } from './DemoContext';
import { API_URL } from '../api/client';

type ConnectionStatus = 'CONNECTING' | 'LIVE' | 'STALE' | 'OFFLINE';

interface RealtimeContextType {
  status: ConnectionStatus;
  lastEventTime: Date | null;
  subscribe: (eventType: string, callback: (data: any) => void) => () => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isDemoMode } = useDemo();
  const [status, setStatus] = useState<ConnectionStatus>('CONNECTING');
  const [lastEventTime, setLastEventTime] = useState<Date | null>(null);
  
  const subscribers = useRef<Map<string, Set<(data: any) => void>>>(new Map());
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<number | ReturnType<typeof setTimeout> | undefined>(undefined);
  const staleCheckIntervalRef = useRef<number | ReturnType<typeof setTimeout> | undefined>(undefined);

  const subscribe = useCallback((eventType: string, callback: (data: any) => void) => {
    if (!subscribers.current.has(eventType)) {
      subscribers.current.set(eventType, new Set());
    }
    subscribers.current.get(eventType)!.add(callback);
    
    return () => {
      const set = subscribers.current.get(eventType);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          subscribers.current.delete(eventType);
        }
      }
    };
  }, []);

  useEffect(() => {
    if (isDemoMode) {
      setStatus('OFFLINE');
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    const apiBase = API_URL;

    // Check initial freshness of BLE tracking data from the backend
    const checkInitialFreshness = async () => {
      try {
        const res = await fetch(`${apiBase}/observations/recent`);
        if (res.ok) {
          const obs = await res.json();
          if (Array.isArray(obs) && obs.length > 0) {
            const latestTime = new Date(obs[0].timestamp);
            if (!isNaN(latestTime.getTime())) {
              setLastEventTime(latestTime);
              const ageSec = (Date.now() - latestTime.getTime()) / 1000;
              if (ageSec <= 90) {
                setStatus('LIVE');
              } else if (ageSec <= 180) {
                setStatus('STALE');
              } else {
                setStatus('OFFLINE');
              }
              return;
            }
          }
        }
        setStatus('OFFLINE');
      } catch {
        setStatus('OFFLINE');
      }
    };

    checkInitialFreshness();

    const connectSSE = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const eventSource = new EventSource(`${apiBase}/observations/stream`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        // SSE transport connected, but LIVE status is determined strictly by data freshness
      };

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          // Only real tracking observations prove BLE data is LIVE
          if (payload.type === 'hardware.observation' || payload.type === 'asset.location.updated') {
            const eventTime = payload.data?.timestamp ? new Date(payload.data.timestamp) : new Date();
            const validTime = isNaN(eventTime.getTime()) ? new Date() : eventTime;
            setLastEventTime(validTime);
            
            const ageSec = (Date.now() - validTime.getTime()) / 1000;
            if (ageSec <= 90) {
              setStatus('LIVE');
            } else if (ageSec <= 180) {
              setStatus('STALE');
            } else {
              setStatus('OFFLINE');
            }
          }

          const callbacks = subscribers.current.get(payload.type);
          if (callbacks) {
            callbacks.forEach(cb => cb(payload.data));
          }
        } catch (e) {
          console.error("Error parsing SSE event", e);
        }
      };

      eventSource.onerror = () => {
        setStatus('OFFLINE');
        eventSource.close();
        eventSourceRef.current = null;
        reconnectTimeoutRef.current = setTimeout(connectSSE, 5000);
      };
    };

    connectSSE();

    staleCheckIntervalRef.current = setInterval(() => {
      setLastEventTime(prev => {
        if (!prev) {
          setStatus('OFFLINE');
          return null;
        }
        const ageSec = (Date.now() - prev.getTime()) / 1000;
        if (ageSec > 180) {
          setStatus('OFFLINE');
        } else if (ageSec > 90) {
          setStatus('STALE');
        } else {
          setStatus('LIVE');
        }
        return prev;
      });
    }, 5000);

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (staleCheckIntervalRef.current) clearInterval(staleCheckIntervalRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [isDemoMode]);

  return (
    <RealtimeContext.Provider value={{ status, lastEventTime, subscribe }}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};

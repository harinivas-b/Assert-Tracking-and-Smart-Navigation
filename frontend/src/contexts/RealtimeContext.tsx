import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useDemo } from './DemoContext';

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

    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

    const connectSSE = () => {
      setStatus('CONNECTING');
      
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const eventSource = new EventSource(`${apiBase}/observations/stream`);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        // We only become LIVE when we receive actual data, but opening is a good step.
        // Let's set it to CONNECTING or leave it until first message.
        // The requirements state: LIVE = Recent valid SSE telemetry/event received.
        // So we keep it CONNECTING until onmessage fires, or if we want, we can show a connected state.
        // Let's just wait for a message to set LIVE.
      };

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          setLastEventTime(new Date());
          setStatus('LIVE');
          
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
        if (prev && Date.now() - prev.getTime() > 30000 && eventSourceRef.current?.readyState === EventSource.OPEN) {
          setStatus('STALE');
        }
        return prev;
      });
    }, 10000);

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

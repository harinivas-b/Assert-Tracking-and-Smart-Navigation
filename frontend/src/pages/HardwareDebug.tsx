import React, { useEffect, useState } from 'react';
import { Terminal, Play } from 'lucide-react';
import { apiClient } from '../api/client';
import type { HardwareObservation } from '../types';

const HardwareDebug: React.FC = () => {
  const [observations, setObservations] = useState<HardwareObservation[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTING' | 'CONNECTED' | 'DISCONNECTED'>('CONNECTING');
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    const apiBase = (apiClient.defaults.baseURL || 'http://localhost:3000/api/v1').replace(/\/+$/, '');
    const eventSource = new EventSource(`${apiBase}/observations/stream`);

    eventSource.onopen = () => {
      setConnectionStatus('CONNECTED');
    };

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (payload.type === 'hardware.observation') {
          setObservations((prev) => [payload.data, ...prev].slice(0, 100));
        } else if (payload.type === 'unknown.tag') {
          setObservations((prev) => [{
            gatewayId: payload.data.gatewayId,
            gatewayName: payload.data.gatewayId,
            roomName: payload.data.locationName || 'Unknown Room',
            trackerIdentifier: `${payload.data.tagIdentifier} (Unknown Tag)`,
            rssi: payload.data.rssi,
            timestamp: payload.data.timestamp,
            metadata: payload.data.metadata
          }, ...prev].slice(0, 100));
        }
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    };

    eventSource.onerror = () => {
      setConnectionStatus('DISCONNECTED');
    };

    apiClient.get('/observations/recent').then((res) => {
      const formatted = res.data.map((item: any) => ({
        gatewayId: item.gatewayId,
        gatewayName: item.gateway?.name,
        roomName: item.gateway?.room?.name || 'Unassigned',
        trackerIdentifier: item.trackerId,
        rssi: item.rssi,
        timestamp: item.timestamp,
        metadata: item.metadata
      }));
      setObservations(formatted);
    }).catch(console.error);

    return () => {
      eventSource.close();
    };
  }, []);

  const runHardwareMovementTest = async () => {
    try {
      setSimulating(true);

      await apiClient.post('/observations/ingest', {
        observations: [
          { gatewayId: 'GATEWAY1', trackerId: 'SMARTTAG1', rssi: -45, timestamp: new Date().toISOString() }
        ]
      });

      await new Promise(r => setTimeout(r, 1500));

      await apiClient.post('/observations/ingest', {
        observations: [
          { gatewayId: 'GATEWAY1', trackerId: 'SMARTTAG1', rssi: -78, timestamp: new Date().toISOString() },
          { gatewayId: 'GATEWAY2', trackerId: 'SMARTTAG1', rssi: -40, timestamp: new Date().toISOString() }
        ]
      });

      await new Promise(r => setTimeout(r, 1500));

      await apiClient.post('/observations/ingest', {
        observations: [
          { gatewayId: 'GATEWAY2', trackerId: 'SMARTTAG1', rssi: -38, timestamp: new Date().toISOString() }
        ]
      });

    } catch (err: any) {
      alert('Simulation error: ' + (err.response?.data?.error || err.message));
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: 'var(--gray-900)' }}>
            Hardware Diagnostics & Live Observation Stream
          </h1>
          <p style={{ color: 'var(--gray-500)', marginTop: '0.25rem', fontSize: '0.875rem' }}>
            Real-time hardware debug console displaying raw observations sent by physical BLE Gateways.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'white', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--gray-200)', fontSize: '0.875rem' }}>
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: connectionStatus === 'CONNECTED' ? '#16a34a' : (connectionStatus === 'CONNECTING' ? '#eab308' : '#dc2626')
            }} />
            <span style={{ fontWeight: 600 }}>Stream: {connectionStatus}</span>
          </div>

          <button
            onClick={runHardwareMovementTest}
            disabled={simulating}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: 'var(--primary)',
              color: 'white',
              border: 'none',
              padding: '0.625rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              fontWeight: 600,
              cursor: simulating ? 'not-allowed' : 'pointer',
              opacity: simulating ? 0.7 : 1
            }}
          >
            <Play size={18} /> {simulating ? 'Simulating Hardware Packet...' : 'Test Room Movement (Idea Lab → Maker Space)'}
          </button>
        </div>
      </div>

      <div style={{ backgroundColor: 'var(--gray-900)', color: 'white', borderRadius: 'var(--radius-lg)', padding: '1.5rem', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid var(--gray-800)', paddingBottom: '0.75rem' }}>
          <Terminal size={20} color="var(--primary)" />
          <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 600, color: 'white' }}>
            Live Telemetry Console ({observations.length} observations received)
          </h2>
        </div>

        {observations.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--gray-500)', fontStyle: 'italic' }}>
            No live observations received yet. Send telemetry to POST /api/v1/observations/ingest or click the Test button above.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', maxHeight: '600px', overflowY: 'auto' }}>
            {observations.map((obs, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: 'var(--gray-800)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontFamily: 'monospace',
                  fontSize: '0.875rem',
                  borderLeft: '4px solid var(--primary)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                  <div>
                    <span style={{ color: 'var(--gray-400)' }}>Gateway: </span>
                    <span style={{ color: '#60a5fa', fontWeight: 600 }}>{obs.gatewayId}</span>
                    <span style={{ color: 'var(--gray-400)', fontSize: '0.75rem', marginLeft: '0.5rem' }}>({obs.roomName || 'Unassigned'})</span>
                  </div>

                  <div>
                    <span style={{ color: 'var(--gray-400)' }}>Tag: </span>
                    <span style={{ color: '#4ade80', fontWeight: 600 }}>{obs.trackerIdentifier}</span>
                  </div>

                  <div>
                    <span style={{ color: 'var(--gray-400)' }}>RSSI: </span>
                    <span style={{ color: obs.rssi > -60 ? '#4ade80' : (obs.rssi > -75 ? '#facc15' : '#f87171'), fontWeight: 700 }}>
                      {obs.rssi} dBm
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                  {new Date(obs.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HardwareDebug;

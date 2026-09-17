import React, { useEffect, useState } from 'react';
import { ShieldAlert, CheckCircle2, RefreshCw } from 'lucide-react';
import { apiClient } from '../api/client';
import type { Alert } from '../types';

const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/alerts');
      setAlerts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleResolveAlert = async (id: string) => {
    try {
      await apiClient.put(`/alerts/${id}`, { status: 'RESOLVED' });
      fetchAlerts();
    } catch (err) {
      alert('Failed to resolve alert');
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: 'var(--gray-900)' }}>
            System Alerts & Security Feed
          </h1>
          <p style={{ color: 'var(--gray-500)', marginTop: '0.25rem', fontSize: '0.875rem' }}>
            Real-time security notifications for unknown BLE devices, unauthorized movements, and offline hardware.
          </p>
        </div>
        <button
          onClick={fetchAlerts}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: 'white',
            border: '1px solid var(--gray-300)',
            color: 'var(--gray-700)',
            padding: '0.625rem 1rem',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-500)' }}>Loading alerts feed...</div>
      ) : alerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'white', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
          <CheckCircle2 size={48} color="#16a34a" style={{ marginBottom: '1rem' }} />
          <h3>All Systems Normal</h3>
          <p style={{ color: 'var(--gray-500)' }}>No unresolved security alerts or unknown BLE tag detections.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {alerts.map((alert) => {
            const isResolved = alert.status === 'RESOLVED';

            return (
              <div
                key={alert.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  boxShadow: 'var(--shadow-sm)',
                  border: '1px solid var(--gray-200)',
                  borderLeft: `5px solid ${alert.severity === 'CRITICAL' ? '#dc2626' : (alert.severity === 'HIGH' ? '#ea580c' : '#eab308')}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <ShieldAlert size={24} color={alert.severity === 'CRITICAL' ? '#dc2626' : '#ea580c'} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--gray-900)' }}>{alert.type}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.125rem 0.5rem', borderRadius: '1rem', backgroundColor: alert.severity === 'CRITICAL' ? '#fee2e2' : '#ffedd5', color: alert.severity === 'CRITICAL' ? '#991b1b' : '#9a3412' }}>
                        {alert.severity}
                      </span>
                    </div>
                    <p style={{ margin: '0.25rem 0 0 0', color: 'var(--gray-700)', fontSize: '0.875rem' }}>{alert.description}</p>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: '0.375rem' }}>
                      Location: {alert.location || 'Campus Wide'} • {new Date(alert.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div>
                  {!isResolved ? (
                    <button
                      onClick={() => handleResolveAlert(alert.id)}
                      style={{
                        backgroundColor: '#dcfce7',
                        color: '#15803d',
                        border: '1px solid #86efac',
                        padding: '0.5rem 1rem',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '0.8125rem'
                      }}
                    >
                      Mark Resolved
                    </button>
                  ) : (
                    <span style={{ color: 'var(--gray-400)', fontSize: '0.8125rem', fontWeight: 600 }}>Resolved</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Alerts;

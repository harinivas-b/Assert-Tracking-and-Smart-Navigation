import React, { useEffect, useState } from 'react';
import { Activity, Box, ArrowRight } from 'lucide-react';
import { apiClient } from '../api/client';

interface Movement {
  id: string;
  assetId: string;
  asset?: { name: string; serialNumber?: string };
  fromRoomId?: string;
  toRoomId?: string;
  confidence: number;
  timestamp: string;
}

const Movements: React.FC = () => {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [roomsMap, setRoomsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [mRes, bRes] = await Promise.all([
        apiClient.get('/locations/movements'),
        apiClient.get('/hierarchy/buildings')
      ]);

      setMovements(mRes.data || []);

      const rMap: Record<string, string> = {};
      bRes.data.forEach((b: any) => {
        (b.floors || []).forEach((f: any) => {
          (f.rooms || []).forEach((r: any) => {
            rMap[r.id] = r.name;
          });
        });
      });
      setRoomsMap(rMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: 'var(--gray-900)' }}>
          Asset Movement History
        </h1>
        <p style={{ color: 'var(--gray-500)', marginTop: '0.25rem', fontSize: '0.875rem' }}>
          Audit trail of physical asset movements detected between rooms across the campus.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-500)' }}>Loading movement audit trail...</div>
      ) : movements.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'white', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
          <Activity size={48} color="var(--gray-400)" style={{ marginBottom: '1rem' }} />
          <h3>No Movement Events Recorded Yet</h3>
          <p style={{ color: 'var(--gray-500)' }}>Move an asset between rooms (e.g. Idea Lab → Maker Space) to record movement history.</p>
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden', border: '1px solid var(--gray-200)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--gray-500)' }}>
                <th style={{ padding: '1rem' }}>Asset</th>
                <th style={{ padding: '1rem' }}>Previous Location</th>
                <th style={{ padding: '1rem' }}>New Location</th>
                <th style={{ padding: '1rem' }}>Confidence</th>
                <th style={{ padding: '1rem' }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--gray-100)', fontSize: '0.875rem' }}>
                  <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--gray-900)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Box size={16} color="var(--primary)" />
                      {m.asset?.name || 'Asset ' + m.assetId}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--gray-600)' }}>
                    {m.fromRoomId ? (roomsMap[m.fromRoomId] || m.fromRoomId) : 'Unassigned'}
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 600, color: '#16a34a' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <ArrowRight size={14} />
                      {m.toRoomId ? (roomsMap[m.toRoomId] || m.toRoomId) : 'Unassigned'}
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.5rem', borderRadius: '1rem', backgroundColor: '#e0e7ff', color: '#3730a3' }}>
                      {m.confidence}%
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--gray-500)', fontSize: '0.8125rem' }}>
                    {new Date(m.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Movements;

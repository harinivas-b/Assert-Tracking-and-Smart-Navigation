import React, { useEffect, useState } from 'react';
import { RadioTower, Plus, Wifi, WifiOff, MapPin, Tag, RefreshCw, Trash2 } from 'lucide-react';
import { apiClient } from '../api/client';
import type { Gateway, Building } from '../types';

const Gateways: React.FC = () => {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [gatewayIdInput, setGatewayIdInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [gRes, bRes] = await Promise.all([
        apiClient.get('/gateways'),
        apiClient.get('/hierarchy/buildings')
      ]);
      setGateways(gRes.data);
      setBuildings(bRes.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load BLE gateways');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gatewayIdInput.trim() || !nameInput.trim()) return;

    try {
      await apiClient.post('/gateways', {
        gatewayId: gatewayIdInput.trim().toUpperCase(),
        name: nameInput.trim(),
        roomId: selectedRoomId || undefined
      });
      setGatewayIdInput('');
      setNameInput('');
      setSelectedRoomId('');
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to register gateway');
    }
  };

  const handleDeleteGateway = async (id: string, name: string) => {
    if (!window.confirm(`Delete gateway "${name}"?`)) return;
    try {
      await apiClient.delete(`/gateways/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete gateway');
    }
  };

  const allRooms = buildings.flatMap(b => (b.floors || []).flatMap(f => f.rooms || []));

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: 'var(--gray-900)' }}>
            BLE Gateways Management
          </h1>
          <p style={{ color: 'var(--gray-500)', marginTop: '0.25rem', fontSize: '0.875rem' }}>
            Monitor gateway hardware status, room assignments, online heartbeats, and detected BLE Smart Tags.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={fetchData}
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
          <button
            onClick={() => setShowModal(true)}
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
              cursor: 'pointer'
            }}
          >
            <Plus size={18} /> Register Gateway
          </button>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-500)' }}>Loading gateway hardware status...</div>
      ) : gateways.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'white', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
          <RadioTower size={48} color="var(--gray-400)" style={{ marginBottom: '1rem' }} />
          <h3>No BLE Gateways Registered</h3>
          <p style={{ color: 'var(--gray-500)' }}>Click "Register Gateway" to add your physical gateways (e.g. GATEWAY1 for Idea Lab, GATEWAY2 for Maker Space).</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {gateways.map((gw) => {
            const isOnline = gw.status === 'ONLINE';

            return (
              <div
                key={gw.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-sm)',
                  border: '1px solid var(--gray-200)',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      backgroundColor: isOnline ? '#dcfce7' : '#fee2e2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {isOnline ? <Wifi size={22} color="#16a34a" /> : <WifiOff size={22} color="#dc2626" />}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--gray-900)' }}>{gw.name}</h3>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--gray-500)', fontFamily: 'monospace', marginTop: '0.125rem' }}>
                        ID: {gw.gatewayId}
                      </div>
                    </div>
                  </div>

                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.25rem 0.625rem',
                    borderRadius: '1rem',
                    backgroundColor: isOnline ? '#dcfce7' : '#fee2e2',
                    color: isOnline ? '#15803d' : '#b91c1c',
                    textTransform: 'uppercase'
                  }}>
                    {gw.status}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--gray-700)', backgroundColor: 'var(--gray-50)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MapPin size={16} color="var(--primary)" />
                    <span style={{ fontWeight: 500 }}>Assigned Room:</span>
                    <span style={{ fontWeight: 600, marginLeft: 'auto', color: 'var(--gray-900)' }}>
                      {gw.room?.name || 'Unassigned'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Tag size={16} color="var(--gray-600)" />
                    <span style={{ fontWeight: 500 }}>Detected Tags (5m):</span>
                    <span style={{ fontWeight: 700, marginLeft: 'auto', color: 'var(--primary)' }}>
                      {gw.detectedTagsCount || 0}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--gray-500)', paddingTop: '0.25rem', borderTop: '1px solid var(--gray-200)' }}>
                    <span>Last Seen:</span>
                    <span style={{ marginLeft: 'auto', fontFamily: 'monospace' }}>
                      {gw.lastSeen ? new Date(gw.lastSeen).toLocaleTimeString() : 'Never'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
                  <button
                    onClick={() => handleDeleteGateway(gw.id, gw.name)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8125rem' }}
                  >
                    <Trash2 size={14} /> Remove Gateway
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={handleCreateGateway} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: 'var(--radius-lg)', width: '420px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ margin: 0 }}>Register New BLE Gateway</h3>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Gateway Hardware ID / MAC</label>
              <input
                type="text"
                value={gatewayIdInput}
                onChange={(e) => setGatewayIdInput(e.target.value)}
                placeholder="e.g. GATEWAY1 or AA:BB:CC:11:22:33"
                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--gray-300)', fontFamily: 'monospace' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Gateway Name</label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="e.g. Gateway 1 (Idea Lab)"
                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--gray-300)' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Assign to Room</label>
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--gray-300)' }}
              >
                <option value="">-- Select Room (Optional) --</option>
                {allRooms.map((r: any) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setShowModal(false)} style={{ padding: '0.5rem 1rem', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Save Gateway</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Gateways;

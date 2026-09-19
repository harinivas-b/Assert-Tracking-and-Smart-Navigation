import React, { useEffect, useState } from 'react';
import { Tag, Plus, Battery, Box, Trash2 } from 'lucide-react';
import { apiClient } from '../api/client';
import type { Tracker, Asset } from '../types';

const Tags: React.FC = () => {
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showTagModal, setShowTagModal] = useState(false);
  const [identifierInput, setIdentifierInput] = useState('');
  const [tagTypeInput, setTagTypeInput] = useState<'SMART' | 'NON_SMART'>('SMART');
  const [selectedAssetId, setSelectedAssetId] = useState('');

  const fetchData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const [tRes, aRes] = await Promise.all([
        apiClient.get('/trackers'),
        apiClient.get('/assets')
      ]);
      setTrackers(tRes.data);
      setAssets(aRes.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load trackers');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 8000);
    return () => clearInterval(interval);
  }, []);

  const handleRegisterTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifierInput.trim()) return;

    try {
      const cleanId = identifierInput.trim().toUpperCase();
      const res = await apiClient.post('/trackers', {
        identifier: cleanId,
        identifierType: 'MAC',
        type: tagTypeInput
      });

      const newTracker = res.data;

      if (selectedAssetId) {
        await apiClient.post('/assets/assign', {
          assetId: selectedAssetId,
          trackerId: newTracker.id
        });
      }

      setIdentifierInput('');
      setSelectedAssetId('');
      setShowTagModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to register tag');
    }
  };

  const handleDeleteTracker = async (id: string, identifier: string) => {
    if (!window.confirm(`Delete BLE Tag "${identifier}"?`)) return;
    try {
      await apiClient.delete(`/trackers/${id}`);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete tracker');
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: 'var(--gray-900)' }}>
            BLE Smart Tags Management
          </h1>
          <p style={{ color: 'var(--gray-500)', marginTop: '0.25rem', fontSize: '0.875rem' }}>
            Register BLE active smart tags, monitor battery health, and map BLE identities to physical assets.
          </p>
        </div>
        <button
          onClick={() => setShowTagModal(true)}
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
          <Plus size={18} /> Register Smart Tag
        </button>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-500)' }}>Loading BLE tags...</div>
      ) : trackers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'white', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
          <Tag size={48} color="var(--gray-400)" style={{ marginBottom: '1rem' }} />
          <h3>No BLE Tags Registered</h3>
          <p style={{ color: 'var(--gray-500)' }}>Click "Register Smart Tag" to map SMARTTAG1, SMARTTAG2, etc., to 3D Printers.</p>
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden', border: '1px solid var(--gray-200)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--gray-500)' }}>
                <th style={{ padding: '1rem' }}>Tag Identifier / MAC</th>
                <th style={{ padding: '1rem' }}>Type</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem' }}>Battery Level</th>
                <th style={{ padding: '1rem' }}>Assigned Asset</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {trackers.map((tracker) => {
                const assignedAsset = tracker.assignment?.asset;
                const assetDetail = assets.find(a => a.id === assignedAsset?.id);
                const currentRoom = assetDetail?.roomName || assetDetail?.locationName;

                return (
                  <tr key={tracker.id} style={{ borderBottom: '1px solid var(--gray-100)', fontSize: '0.875rem' }}>
                    <td style={{ padding: '1rem', fontWeight: 600, fontFamily: 'monospace', color: 'var(--gray-900)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Tag size={16} color="var(--primary)" />
                        {tracker.identifier}
                      </div>
                      {(tracker as any).macName && (tracker as any).macName !== tracker.identifier && (
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#4f46e5', marginLeft: '1.5rem', marginTop: '0.125rem' }}>
                          Name: {(tracker as any).macName}
                        </div>
                      )}
                      {(tracker as any).rssi !== undefined && (tracker as any).rssi !== null && (
                        <div style={{ fontSize: '0.75rem', fontWeight: 500, color: (tracker as any).rssi > -65 ? '#15803d' : ((tracker as any).rssi > -80 ? '#b45309' : '#b91c1c'), marginLeft: '1.5rem' }}>
                          RSSI: {(tracker as any).rssi} dBm
                        </div>
                      )}
                      {tracker.lastSeen && (
                        <div style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--gray-400)', marginLeft: '1.5rem', marginTop: '0.125rem' }}>
                          Last seen: {new Date(tracker.lastSeen).toLocaleTimeString()}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '0.25rem 0.5rem',
                        borderRadius: '0.25rem',
                        backgroundColor: tracker.type === 'SMART' ? '#e0e7ff' : '#f3f4f6',
                        color: tracker.type === 'SMART' ? '#3730a3' : '#4b5563'
                      }}>
                        {tracker.type}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '0.25rem 0.625rem',
                        borderRadius: '1rem',
                        backgroundColor: tracker.status === 'ACTIVE' ? '#dcfce7' : (tracker.status === 'STALE' ? '#fef3c7' : '#fee2e2'),
                        color: tracker.status === 'ACTIVE' ? '#15803d' : (tracker.status === 'STALE' ? '#b45309' : '#b91c1c')
                      }}>
                        {tracker.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--gray-700)' }}>
                        <Battery size={16} color={(tracker.batteryLevel !== undefined && tracker.batteryLevel !== null && tracker.batteryLevel < 20) ? '#ef4444' : '#16a34a'} />
                        <span>{(tracker.batteryLevel !== undefined && tracker.batteryLevel !== null) ? `${tracker.batteryLevel}%` : 'N/A'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {assignedAsset ? (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 600, color: 'var(--gray-800)' }}>
                            <Box size={16} color="var(--primary)" />
                            {assignedAsset.name}
                          </div>
                          {(currentRoom || (tracker as any).room) && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginLeft: '1.375rem', marginTop: '0.125rem' }}>
                              Room: {currentRoom || (tracker as any).room}
                            </div>
                          )}
                        </div>
                      ) : (tracker as any).room ? (
                        <div>
                          <span style={{ color: 'var(--gray-400)', fontStyle: 'italic' }}>Unassigned</span>
                          <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '0.125rem' }}>
                            Room: {(tracker as any).room}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--gray-400)', fontStyle: 'italic' }}>Unassigned</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <button
                        onClick={() => handleDeleteTracker(tracker.id, tracker.identifier)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showTagModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={handleRegisterTag} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: 'var(--radius-lg)', width: '420px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ margin: 0 }}>Register Smart Tag</h3>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Tag MAC / Identity</label>
              <input
                type="text"
                value={identifierInput}
                onChange={(e) => setIdentifierInput(e.target.value)}
                placeholder="e.g. SMARTTAG1 or AA:BB:CC:DD:EE:FF"
                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--gray-300)', fontFamily: 'monospace' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Tag Hardware Type</label>
              <select
                value={tagTypeInput}
                onChange={(e: any) => setTagTypeInput(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--gray-300)' }}
              >
                <option value="SMART">Smart Tag (Active/Configurable)</option>
                <option value="NON_SMART">Non-Smart Tag (Beacon/Broadcast)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Assign to Physical Asset</label>
              <select
                value={selectedAssetId}
                onChange={(e) => setSelectedAssetId(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--gray-300)' }}
              >
                <option value="">-- Select Asset (Optional) --</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.serialNumber || 'No Serial'})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={() => setShowTagModal(false)} style={{ padding: '0.5rem 1rem', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Save Tag</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Tags;

import React, { useEffect, useState } from 'react';
import { Building2, DoorOpen, Layers, Plus, Trash2, Box } from 'lucide-react';
import { apiClient } from '../api/client';
import type { Building } from '../types';

const Locations: React.FC = () => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showBuildingModal, setShowBuildingModal] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState('');
  
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [selectedFloorId, setSelectedFloorId] = useState<string>('');
  const [newRoomName, setNewRoomName] = useState('');

  const fetchHierarchy = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/hierarchy/buildings');
      setBuildings(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to load locations hierarchy');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHierarchy();
    const interval = setInterval(() => {
      fetchHierarchy();
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBuildingName.trim()) return;

    try {
      await apiClient.post('/hierarchy/buildings', { name: newBuildingName });
      setNewBuildingName('');
      setShowBuildingModal(false);
      fetchHierarchy();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create building');
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim() || !selectedFloorId) return;

    try {
      await apiClient.post('/hierarchy/rooms', { name: newRoomName, floorId: selectedFloorId });
      setNewRoomName('');
      setShowRoomModal(false);
      fetchHierarchy();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create room');
    }
  };

  const handleDeleteBuilding = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete building "${name}"?`)) return;
    try {
      await apiClient.delete(`/hierarchy/buildings/${id}`);
      fetchHierarchy();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete building');
    }
  };

  const handleDeleteRoom = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete room "${name}"?`)) return;
    try {
      await apiClient.delete(`/hierarchy/rooms/${id}`);
      fetchHierarchy();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete room');
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: 'var(--gray-900)' }}>
            Buildings & Rooms Hierarchy
          </h1>
          <p style={{ color: 'var(--gray-500)', marginTop: '0.25rem', fontSize: '0.875rem' }}>
            Manage campus buildings, floors, rooms, and view physical assets detected in each location.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => setShowBuildingModal(true)}
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
            <Plus size={18} /> Add Building
          </button>
        </div>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-500)' }}>Loading building hierarchy...</div>
      ) : buildings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'white', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-sm)' }}>
          <Building2 size={48} color="var(--gray-400)" style={{ marginBottom: '1rem' }} />
          <h3>No Buildings Registered</h3>
          <p style={{ color: 'var(--gray-500)' }}>Click "Add Building" to create your first campus building.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {buildings.map((building) => (
            <div
              key={building.id}
              style={{
                backgroundColor: 'white',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-md)',
                overflow: 'hidden',
                border: '1px solid var(--gray-200)'
              }}
            >
              <div style={{
                backgroundColor: 'var(--gray-900)',
                color: 'white',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Building2 size={24} color="var(--primary)" />
                  <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 600 }}>{building.name}</h2>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleDeleteBuilding(building.id, building.name)}
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: 'none', padding: '0.375rem 0.75rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.875rem' }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>

              <div style={{ padding: '1.5rem' }}>
                {(!building.floors || building.floors.length === 0) ? (
                  <p style={{ color: 'var(--gray-500)', fontStyle: 'italic' }}>No floors defined.</p>
                ) : (
                  building.floors.map((floor) => (
                    <div key={floor.id} style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--gray-100)', paddingBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Layers size={18} color="var(--gray-600)" />
                          <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: 'var(--gray-800)' }}>
                            {floor.name} (Level {floor.level})
                          </h3>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedFloorId(floor.id);
                            setShowRoomModal(true);
                          }}
                          style={{
                            backgroundColor: 'var(--gray-100)',
                            color: 'var(--gray-700)',
                            border: '1px solid var(--gray-300)',
                            padding: '0.375rem 0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.375rem'
                          }}
                        >
                          <Plus size={14} /> Add Room
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                        {(!floor.rooms || floor.rooms.length === 0) ? (
                          <div style={{ color: 'var(--gray-400)', fontSize: '0.875rem', padding: '0.5rem' }}>No rooms added to this floor yet.</div>
                        ) : (
                          floor.rooms.map((room) => (
                            <div
                              key={room.id}
                              style={{
                                backgroundColor: 'var(--gray-50)',
                                border: '1px solid var(--gray-200)',
                                borderRadius: 'var(--radius-md)',
                                padding: '1rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.75rem'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <DoorOpen size={18} color="var(--primary)" />
                                  <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--gray-900)' }}>{room.name}</span>
                                </div>
                                <button
                                  onClick={() => handleDeleteRoom(room.id, room.name)}
                                  style={{ background: 'none', border: 'none', color: 'var(--gray-400)', cursor: 'pointer' }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>

                              <div style={{ backgroundColor: 'white', borderRadius: 'var(--radius-sm)', padding: '0.75rem', border: '1px solid var(--gray-200)' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                  <Box size={14} /> Currently Present Assets ({room.presentAssets?.length || 0})
                                </div>

                                {(!room.presentAssets || room.presentAssets.length === 0) ? (
                                  <div style={{ fontSize: '0.8125rem', color: 'var(--gray-400)', fontStyle: 'italic' }}>
                                    No assets currently detected in this room.
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                    {room.presentAssets.map((asset) => (
                                      <div
                                        key={asset.id}
                                        style={{
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                          padding: '0.375rem 0.625rem',
                                          backgroundColor: 'var(--gray-50)',
                                          borderRadius: 'var(--radius-sm)',
                                          fontSize: '0.8125rem'
                                        }}
                                      >
                                        <div style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{asset.name}</div>
                                        <div style={{
                                          fontSize: '0.75rem',
                                          backgroundColor: asset.status === 'ACTIVE' ? '#dcfce7' : (asset.status === 'STALE' ? '#fef3c7' : '#fee2e2'),
                                          color: asset.status === 'ACTIVE' ? '#15803d' : (asset.status === 'STALE' ? '#b45309' : '#b91c1c'),
                                          padding: '0.125rem 0.5rem',
                                          borderRadius: '1rem',
                                          fontWeight: 600
                                        }}>
                                          {asset.status}: {asset.assignment?.tracker?.identifier || 'Tagged'}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showBuildingModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={handleCreateBuilding} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: 'var(--radius-lg)', width: '400px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ margin: 0 }}>Add New Building</h3>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Building Name</label>
              <input
                type="text"
                value={newBuildingName}
                onChange={(e) => setNewBuildingName(e.target.value)}
                placeholder="e.g. Engineering Building"
                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--gray-300)' }}
                required
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" onClick={() => setShowBuildingModal(false)} style={{ padding: '0.5rem 1rem', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Save Building</button>
            </div>
          </form>
        </div>
      )}

      {showRoomModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={handleCreateRoom} style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: 'var(--radius-lg)', width: '400px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ margin: 0 }}>Add Room</h3>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Room Name</label>
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="e.g. Idea Lab or Maker Space"
                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--gray-300)' }}
                required
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" onClick={() => setShowRoomModal(false)} style={{ padding: '0.5rem 1rem', border: '1px solid var(--gray-300)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}>Save Room</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Locations;

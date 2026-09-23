import { useState, useEffect } from 'react';
import { useDemo } from '../contexts/DemoContext';
import { useRealtime } from '../contexts/RealtimeContext';
import { apiClient } from '../api/client';
import { assetsApi } from '../api/assets';
import type { Asset, Building } from '../types';
import { Map as MapIcon, Crosshair, AlertCircle, Box, Tag, Activity, WifiOff, Clock } from 'lucide-react';

const Tracking = () => {
  const { isDemoMode } = useDemo();
  const [viewMode, setViewMode] = useState<'list' | 'map'>('map');
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('all');
  const [selectedFloorId, setSelectedFloorId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const { status: sseStatus, subscribe } = useRealtime();
  const [hardwareObs, setHardwareObs] = useState<Record<string, any>>({});

  const fetchData = async () => {
    try {
      if (isDemoMode) {
        setIsLoading(false);
        return;
      }
      const [bRes, assetsData] = await Promise.all([
        apiClient.get('/hierarchy/buildings'),
        assetsApi.getAssets()
      ]);
      setBuildings(bRes.data || []);
      setAssets(assetsData || []);
    } catch (err) {
      console.error('Error fetching live tracking data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (isDemoMode) return;

    const unsubLocation = subscribe('asset.location.updated', (data) => {
      setAssets(prev => {
        const updated = [...prev];
        const idx = updated.findIndex(a => a.id === data.assetId);
        if (idx !== -1) {
          updated[idx] = {
            ...updated[idx],
            estimatedRoomId: data.newRoomId,
            locationConfidence: data.confidence,
            lastLocationUpdate: data.timestamp
          };
        }
        return updated;
      });
    });

    const unsubHardware = subscribe('hardware.observation', (data) => {
      setHardwareObs(prev => ({
        ...prev,
        [data.trackerIdentifier]: data
      }));
    });

    return () => {
      unsubLocation();
      unsubHardware();
    };
  }, [isDemoMode, subscribe]);

  // Derive active floors and rooms based on selection
  const activeBuildings = selectedBuildingId === 'all'
    ? buildings
    : buildings.filter(b => b.id === selectedBuildingId);

  const activeFloors = activeBuildings.flatMap(b => b.floors || []);
  const displayedFloors = selectedFloorId === 'all'
    ? activeFloors
    : activeFloors.filter(f => f.id === selectedFloorId);

  const displayedRooms = displayedFloors.flatMap(f => f.rooms || []);

  // Quick lookup map: roomId -> room name
  const roomNameMap: Record<string, string> = {};
  buildings.forEach(b => {
    (b.floors || []).forEach(f => {
      (f.rooms || []).forEach(r => {
        roomNameMap[r.id] = r.name;
      });
    });
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1>Live Tracking</h1>
          <p className="text-muted">Real-time asset locations</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'var(--gray-100)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
          <button 
            className={`btn ${viewMode === 'map' ? 'btn-primary' : ''}`}
            onClick={() => setViewMode('map')}
            style={{ padding: '0.25rem 0.75rem', border: 'none', background: viewMode === 'map' ? 'var(--bg-surface)' : 'transparent', color: viewMode === 'map' ? 'var(--text-main)' : 'var(--text-muted)', boxShadow: viewMode === 'map' ? 'var(--shadow-sm)' : 'none' }}
          >
            <MapIcon size={16} /> Map View
          </button>
          <button 
            className={`btn ${viewMode === 'list' ? 'btn-primary' : ''}`}
            onClick={() => setViewMode('list')}
            style={{ padding: '0.25rem 0.75rem', border: 'none', background: viewMode === 'list' ? 'var(--bg-surface)' : 'transparent', color: viewMode === 'list' ? 'var(--text-main)' : 'var(--text-muted)', boxShadow: viewMode === 'list' ? 'var(--shadow-sm)' : 'none' }}
          >
            <Crosshair size={16} /> List View
          </button>
        </div>
      </div>

      {isDemoMode && (
         <div style={{ backgroundColor: 'var(--warning-bg)', color: 'var(--warning)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
           <AlertCircle size={16} />
           <strong>Simulation Mode:</strong> Locations shown are simulated based on mock telemetry.
         </div>
      )}

      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        {/* Filters Top Bar */}
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '1rem' }}>
          {isDemoMode ? (
            <>
              <select className="form-control" style={{ width: '200px' }}>
                <option>All Buildings</option>
                <option>Main Hospital</option>
              </select>
              <select className="form-control" style={{ width: '200px' }}>
                <option>All Floors</option>
                <option>Floor 1</option>
              </select>
            </>
          ) : (
            <>
              <select 
                className="form-control" 
                style={{ width: '220px' }}
                value={selectedBuildingId}
                onChange={(e) => {
                  setSelectedBuildingId(e.target.value);
                  setSelectedFloorId('all');
                }}
              >
                <option value="all">All Buildings ({buildings.length})</option>
                {buildings.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>

              <select 
                className="form-control" 
                style={{ width: '220px' }}
                value={selectedFloorId}
                onChange={(e) => setSelectedFloorId(e.target.value)}
              >
                <option value="all">All Floors ({activeFloors.length})</option>
                {activeFloors.map(f => (
                  <option key={f.id} value={f.id}>{f.name} (Level {f.level})</option>
                ))}
              </select>
            </>
          )}
        </div>

        {/* View Mode: Map */}
        {viewMode === 'map' ? (
          <div style={{ flex: 1, backgroundColor: 'var(--gray-50)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '500px', padding: '1.5rem' }}>
            {isDemoMode ? (
              /* Mock Schematic Map */
              <div style={{ 
                width: '85%', 
                height: '85%', 
                border: '2px dashed var(--gray-300)',
                borderRadius: 'var(--radius-md)',
                position: 'relative',
                backgroundColor: 'white'
              }}>
                <div style={{ position: 'absolute', top: '1rem', left: '1rem', color: 'var(--gray-400)', fontWeight: 600 }}>Schematic Map (Floor 1)</div>
                
                {/* Mock Room */}
                <div style={{ position: 'absolute', top: '20%', left: '10%', width: '30%', height: '30%', border: '1px solid var(--border-color)', backgroundColor: 'var(--gray-50)' }}>
                  <div className="text-xs text-muted" style={{ padding: '0.25rem' }}>ER - Zone A</div>
                  
                  {/* Mock Asset Pin */}
                  <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--primary)', boxShadow: '0 0 0 4px var(--primary-light)' }}></div>
                    <div style={{ marginTop: '0.25rem', backgroundColor: 'var(--gray-800)', color: 'white', padding: '0.125rem 0.375rem', borderRadius: 'var(--radius-sm)', fontSize: '0.625rem', whiteSpace: 'nowrap' }}>
                      Portable Ultrasound
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Real Live Schematic Map */
              <div style={{ 
                width: '90%', 
                height: '90%', 
                border: '2px dashed var(--gray-300)',
                borderRadius: 'var(--radius-md)',
                position: 'relative',
                backgroundColor: 'white',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div style={{ color: 'var(--gray-500)', fontWeight: 700, fontSize: '0.95rem' }}>
                    Schematic Campus Map — Live BLE Positions
                  </div>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.375rem', color: sseStatus === 'LIVE' ? '#16a34a' : (sseStatus === 'STALE' ? '#ca8a04' : '#dc2626') }}>
                    {sseStatus === 'LIVE' ? <Activity size={14} /> : (sseStatus === 'STALE' ? <Clock size={14} /> : <WifiOff size={14} />)}
                    {sseStatus === 'LIVE' ? 'LIVE DATA' : (sseStatus === 'STALE' ? 'DATA STALE' : 'OFFLINE')}
                  </div>
                </div>

                {isLoading ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>Loading map rooms...</div>
                ) : displayedRooms.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>No rooms found for the selected building/floor.</div>
                ) : (
                  <div style={{
                    flex: 1,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '1.25rem',
                    alignContent: 'start'
                  }}>
                    {displayedRooms.map((room) => {
                      const presentAssets = assets.filter(a => a.estimatedRoomId === room.id);

                      return (
                        <div
                          key={room.id}
                          style={{
                            border: '1px solid var(--border-color)',
                            backgroundColor: presentAssets.length > 0 ? '#f0fdf4' : 'var(--gray-50)',
                            borderRadius: 'var(--radius-md)',
                            padding: '1rem',
                            minHeight: '140px',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.375rem' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--gray-800)' }}>
                              {room.name}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>
                              {presentAssets.length} asset{presentAssets.length === 1 ? '' : 's'}
                            </span>
                          </div>

                          {presentAssets.length === 0 ? (
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--gray-400)', fontStyle: 'italic' }}>
                              Empty
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, justifyContent: 'center' }}>
                              {presentAssets.map(asset => (
                                <div
                                  key={asset.id}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    backgroundColor: 'white',
                                    padding: '0.375rem 0.625rem',
                                    borderRadius: 'var(--radius-sm)',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                                    border: '1px solid #bbf7d0'
                                  }}
                                >
                                  {/* Asset Pin Dot */}
                                  <div style={{
                                    width: '10px',
                                    height: '10px',
                                    borderRadius: '50%',
                                    backgroundColor: 'var(--primary)',
                                    boxShadow: '0 0 0 3px var(--primary-light)',
                                    flexShrink: 0
                                  }} />
                                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--gray-800)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {asset.name}
                                  </div>
                                  <div style={{ fontSize: '0.7rem', color: 'var(--gray-400)', marginLeft: 'auto', fontFamily: 'monospace' }}>
                                    {asset.locationConfidence ? `${asset.locationConfidence}%` : ''}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* View Mode: List */
          <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
            {assets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--gray-400)' }}>No assets found.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--gray-500)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.75rem' }}>Asset</th>
                    <th style={{ padding: '0.75rem' }}>Hardware SmartTag / MAC</th>
                    <th style={{ padding: '0.75rem' }}>Current Room</th>
                    <th style={{ padding: '0.75rem' }}>Gateway / RSSI</th>
                    <th style={{ padding: '0.75rem' }}>Last Seen</th>
                    <th style={{ padding: '0.75rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map(asset => {
                    const roomName = asset.estimatedRoomId ? (roomNameMap[asset.estimatedRoomId] || 'Assigned Room') : 'Unassigned';

                    return (
                      <tr key={asset.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--gray-900)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Box size={16} color="var(--primary)" />
                            {asset.name}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--gray-700)' }}>
                          {asset.assignment?.tracker ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                              <Tag size={14} color="var(--primary)" />
                              {asset.assignment.tracker.identifier}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--gray-400)', fontStyle: 'italic' }}>Unassigned</span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem', fontWeight: 600, color: asset.estimatedRoomId ? '#15803d' : 'var(--gray-500)' }}>
                          {roomName}
                        </td>
                        <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--gray-700)' }}>
                          {asset.assignment?.tracker && hardwareObs[asset.assignment.tracker.identifier] ? (
                            <div>
                              <div>{hardwareObs[asset.assignment.tracker.identifier].gatewayName || hardwareObs[asset.assignment.tracker.identifier].gatewayId}</div>
                              <div style={{ color: hardwareObs[asset.assignment.tracker.identifier].rssi > -70 ? '#15803d' : (hardwareObs[asset.assignment.tracker.identifier].rssi > -85 ? '#ca8a04' : '#dc2626') }}>
                                {hardwareObs[asset.assignment.tracker.identifier].rssi} dBm
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--gray-400)' }}>N/A</span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                          {asset.assignment?.tracker && hardwareObs[asset.assignment.tracker.identifier] 
                            ? new Date(hardwareObs[asset.assignment.tracker.identifier].timestamp).toLocaleTimeString() 
                            : (asset.lastLocationUpdate ? new Date(asset.lastLocationUpdate).toLocaleTimeString() : 'N/A')}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            backgroundColor: asset.status === 'ACTIVE' ? 'var(--success-bg)' : 'var(--gray-100)',
                            color: asset.status === 'ACTIVE' ? 'var(--success)' : 'var(--gray-700)',
                          }}>
                            {asset.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Tracking;


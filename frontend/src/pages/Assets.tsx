import { useEffect, useState, type FormEvent } from 'react';
import { useDemo } from '../contexts/DemoContext';
import { assetsApi } from '../api/assets';
import type { Asset } from '../types';
import { Box, Search, Filter, Plus, Eye, Edit2, Link as LinkIcon, Unlink, Tag } from 'lucide-react';

const Assets = () => {
  const { isDemoMode } = useDemo();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [createError, setCreateError] = useState('');
  const [newAsset, setNewAsset] = useState({ name: '', category: '', serialNumber: '', department: '', owner: '' });

  useEffect(() => {
    let isInitial = true;
    const fetchAssets = async () => {
      if (isInitial) setIsLoading(true);
      try {
        if (isDemoMode) {
          setAssets([
            {
              id: '1',
              name: 'Portable Ultrasound',
              category: 'Medical',
              department: 'ER',
              status: 'ACTIVE',
              estimatedZoneId: 'Zone A',
              locationConfidence: 95,
              lastLocationUpdate: new Date().toISOString(),
              assignment: { id: 'a1', assetId: '1', trackerId: 't1', assignedAt: new Date().toISOString(), tracker: { id: 't1', identifier: 'MAC:11:22:33', identifierType: 'MAC', type: 'SMART', status: 'ACTIVE' } }
            },
            {
              id: '2',
              name: 'IV Pump #402',
              category: 'Medical',
              department: 'ICU',
              status: 'MISSING',
              estimatedZoneId: 'Storage',
              locationConfidence: 12,
              lastLocationUpdate: new Date(Date.now() - 1000000).toISOString(),
            }
          ]);
        } else {
          const data = await assetsApi.getAssets();
          setAssets(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isInitial) {
          setIsLoading(false);
          isInitial = false;
        }
      }
    };
    fetchAssets();
    const interval = setInterval(fetchAssets, 8000);
    return () => clearInterval(interval);
  }, [isDemoMode]);

  const filteredAssets = assets.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) || 
    (a.category && a.category.toLowerCase().includes(search.toLowerCase())) ||
    (a.department && a.department.toLowerCase().includes(search.toLowerCase()))
  );

  const createAsset = async (event: FormEvent) => {
    event.preventDefault();
    setCreateError('');
    setIsSaving(true);
    try {
      if (isDemoMode) {
        setAssets(current => [{ ...newAsset, id: `demo-${Date.now()}`, status: 'ACTIVE' }, ...current] as Asset[]);
      } else {
        const created = await assetsApi.createAsset({
          ...newAsset,
          serialNumber: newAsset.serialNumber || undefined,
          category: newAsset.category || undefined,
          department: newAsset.department || undefined,
          owner: newAsset.owner || undefined,
        });
        setAssets(current => [created, ...current]);
      }
      setNewAsset({ name: '', category: '', serialNumber: '', department: '', owner: '' });
      setIsCreateOpen(false);
    } catch (error: any) {
      setCreateError(error?.message || 'Unable to create asset');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Assets</h1>
          <p className="text-muted">Manage tracked assets and assignments</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setCreateError(''); setIsCreateOpen(true); }}>
          <Plus size={16} /> Add Asset
        </button>
      </div>

      {isCreateOpen && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', display: 'grid', placeItems: 'center', zIndex: 20, padding: '1rem' }}>
          <form onSubmit={createAsset} className="card" style={{ width: 'min(100%, 30rem)', maxWidth: '30rem', padding: '1.5rem' }}>
            <h2 style={{ marginTop: 0 }}>Add Asset</h2>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {([
                ['name', 'Name', true],
                ['category', 'Category', false],
                ['serialNumber', 'Serial number', false],
                ['department', 'Department', false],
                ['owner', 'Owner', false],
              ] as const).map(([field, label, required]) => (
                <label key={field} style={{ display: 'grid', gap: '0.3rem' }}>
                  <span>{label}</span>
                  <input className="form-control" required={required} value={newAsset[field]} onChange={event => setNewAsset(current => ({ ...current, [field]: event.target.value }))} />
                </label>
              ))}
            </div>
            {createError && <p style={{ color: 'var(--danger)', marginBottom: 0 }}>{createError}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button type="button" className="btn btn-outline" onClick={() => setIsCreateOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>{isSaving ? 'Saving...' : 'Create Asset'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--gray-400)' }} />
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search assets by name, category, or department..." 
              style={{ paddingLeft: '2.5rem' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-outline">
            <Filter size={16} /> Filter
          </button>
        </div>

        {isLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Loading assets...</div>
        ) : filteredAssets.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--gray-500)' }}>
            <Box size={48} style={{ opacity: 0.2, margin: '0 auto 1rem auto' }} />
            <h3>No assets found</h3>
            <p>Try adjusting your search or add a new asset.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--gray-500)' }}>
                  <th style={{ padding: '1rem' }}>Name</th>
                  <th style={{ padding: '1rem' }}>Category/Dept</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                  <th style={{ padding: '1rem' }}>Tracker</th>
                  <th style={{ padding: '1rem' }}>Last Location</th>
                  <th style={{ padding: '1rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map(asset => (
                  <tr key={asset.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem', fontWeight: 500 }}>{asset.name}</td>
                    <td style={{ padding: '1rem' }}>
                      {asset.category}<br/>
                      <span className="text-xs text-muted">{asset.department}</span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: 'var(--radius-full)', 
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        backgroundColor: asset.status === 'ACTIVE' ? 'var(--success-bg)' : 
                                       asset.status === 'MISSING' ? 'var(--danger-bg)' : 'var(--gray-100)',
                        color: asset.status === 'ACTIVE' ? 'var(--success)' : 
                               asset.status === 'MISSING' ? 'var(--danger)' : 'var(--gray-700)',
                      }}>
                        {asset.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {asset.assignment?.tracker ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Tag size={14} color="var(--primary)" />
                          {asset.assignment.tracker.identifier}
                        </div>
                      ) : (
                        <span className="text-muted">Unassigned</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {(asset.roomName || asset.locationName || asset.estimatedZoneId) ? (
                        <>
                          <div style={{ fontWeight: 500 }}>{asset.roomName || asset.locationName || asset.estimatedZoneId}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.125rem' }}>
                            {asset.locationConfidence !== undefined && asset.locationConfidence !== null && (
                              <span className="text-xs" style={{ 
                                color: asset.locationConfidence > 80 ? 'var(--success)' : 
                                       asset.locationConfidence > 40 ? 'var(--warning)' : 'var(--danger)',
                                fontWeight: 600
                              }}>
                                {asset.locationConfidence}% Confidence
                              </span>
                            )}
                            {asset.lastLocationUpdate && (
                              <span className="text-xs text-muted">
                                • {new Date(asset.lastLocationUpdate).toLocaleTimeString()}
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <span className="text-muted">Unknown</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem' }} title="View Details">
                          <Eye size={14} />
                        </button>
                        <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem' }} title="Edit">
                          <Edit2 size={14} />
                        </button>
                        {asset.assignment ? (
                          <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', color: 'var(--danger)' }} title="Unassign Tracker">
                            <Unlink size={14} />
                          </button>
                        ) : (
                          <button className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', color: 'var(--primary)' }} title="Assign Tracker">
                            <LinkIcon size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Assets;

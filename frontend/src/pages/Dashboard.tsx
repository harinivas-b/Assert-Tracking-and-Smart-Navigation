import { useEffect, useState } from 'react';
import { useDemo } from '../contexts/DemoContext';
import { useRealtime } from '../contexts/RealtimeContext';
import { assetsApi } from '../api/assets';
import { hardwareApi } from '../api/hardware';
import { alertsApi } from '../api/alerts';
import { 
  Box, 
  RadioTower, 
  Tag, 
  Bell, 
  AlertTriangle,
  PlusCircle,
  Map,
  Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { isDemoMode } = useDemo();
  const { subscribe } = useRealtime();
  const [stats, setStats] = useState({
    totalAssets: 0,
    activeAlerts: 0,
    gateways: 0,
    tags: 0,
    offlineTags: 0,
    missingAssets: 0
  });
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isInitial = true;
    const fetchDashboardData = async () => {
      if (isInitial) setIsLoading(true);
      setError(null);
      
      try {
        if (isDemoMode) {
          // Load demo data
          setStats({
            totalAssets: 124,
            activeAlerts: 3,
            gateways: 8,
            tags: 150,
            offlineTags: 5,
            missingAssets: 1
          });
          setRecentAlerts([
            { id: '1', type: 'OUT_OF_ZONE', severity: 'HIGH', description: 'Asset #1204 left Surgery wing', timestamp: new Date().toISOString() },
            { id: '2', type: 'TAG_OFFLINE', severity: 'MEDIUM', description: 'Tag MAC:A1:B2 offline for 24h', timestamp: new Date(Date.now() - 86400000).toISOString() },
          ]);
        } else {
          // Real data fetching
          const results = await Promise.allSettled([
            assetsApi.getAssets(),
            hardwareApi.getGateways(),
            hardwareApi.getTrackers(),
            alertsApi.getAlerts()
          ]);

          const [assetsResult, gatewaysResult, tagsResult, alertsResult] = results;
          const assets = assetsResult.status === 'fulfilled' ? assetsResult.value : [];
          const gateways = gatewaysResult.status === 'fulfilled' ? gatewaysResult.value : [];
          const tags = tagsResult.status === 'fulfilled' ? tagsResult.value : [];
          const alerts = alertsResult.status === 'fulfilled' ? alertsResult.value : [];
          const failedSources = results
            .map((result, index) => result.status === 'rejected' ? ['assets', 'gateways', 'trackers', 'alerts'][index] : null)
            .filter(Boolean);

          const activeAlerts = (alerts || []).filter((al: any) => al.status !== 'RESOLVED');

          setStats({
            totalAssets: assets.length,
            missingAssets: assets.filter(a => a.status === 'MISSING').length,
            gateways: gateways.length,
            tags: tags.length,
            offlineTags: tags.filter(t => t.status === 'INACTIVE' || t.status === 'LOST').length,
            activeAlerts: activeAlerts.length
          });
          setRecentAlerts((alerts || []).slice(0, 5));
          if (failedSources.length > 0) {
            setError(`Unable to load: ${failedSources.join(', ')}. Other dashboard data is still available.`);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Unable to load dashboard data. Please try again.');
      } finally {
        if (isInitial) {
          setIsLoading(false);
          isInitial = false;
        }
      }
    };

    fetchDashboardData();

    if (isDemoMode) return;

    const unsubAlert = subscribe('alert.created', (newAlert) => {
      setRecentAlerts(prev => [newAlert, ...prev].slice(0, 5));
      if (newAlert.status !== 'RESOLVED') {
        setStats(s => ({ ...s, activeAlerts: s.activeAlerts + 1 }));
      }
    });

    const unsubGateway = subscribe('gateway.status', (_statusData) => {
      // The current UI doesn't track offline gateways specifically,
      // but if we were to add an offlineGateways stat, we would update it here.
    });

    const unsubAsset = subscribe('asset.location.updated', (_assetData) => {
      // If an asset is found, it is no longer missing. A robust implementation
      // would check if it was previously missing and decrement the count.
      // Since we don't have the full asset list in state, we do a naive approach
      // or rely on targeted HTTP fetch if accuracy drops, but for this minimum 
      // requirement, we can assume receiving a location means it's not missing.
    });

    const unsubHardware = subscribe('hardware.observation', (_obsData) => {
      // Dashboard UI currently does not display live hardware telemetry.
      // If a "Live Tags" metric is added, this would update it.
    });

    return () => {
      unsubAlert();
      unsubGateway();
      unsubAsset();
      unsubHardware();
    };
  }, [isDemoMode, subscribe]);

  if (isLoading) return <div style={{ padding: '2rem' }}>Loading dashboard...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>Dashboard</h1>
          <p className="text-muted">Overview of your asset tracking system</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link to="/assets" className="btn btn-primary">
            <PlusCircle size={16} /> Add Asset
          </Link>
        </div>
      </div>

      {error && (
        <div className="card" style={{ backgroundColor: 'var(--danger-bg)', borderColor: 'var(--danger)', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--danger)' }}>
            <AlertTriangle size={24} />
            <div>
              <h3 style={{ margin: 0, color: 'var(--danger)' }}>Some dashboard data is unavailable</h3>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>{error}</p>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>Check your connection or refresh the page to retry.</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <StatCard title="Total Assets" value={stats.totalAssets} icon={Box} color="var(--primary)" />
        <StatCard title="Active Alerts" value={stats.activeAlerts} icon={Bell} color="var(--danger)" />
        <StatCard title="BLE Gateways" value={stats.gateways} icon={RadioTower} color="var(--info)" />
        <StatCard title="Smart Tags" value={stats.tags} icon={Tag} color="var(--success)" />
        <StatCard title="Missing Assets" value={stats.missingAssets} icon={AlertTriangle} color="var(--warning)" />
        <StatCard title="Offline Tags" value={stats.offlineTags} icon={Activity} color="var(--gray-500)" />
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        
        {/* Left Column */}
        <div>
          <div className="card" style={{ height: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Recent Alerts</h2>
              <Link to="/alerts" style={{ fontSize: '0.875rem' }}>View All</Link>
            </div>
            
            {recentAlerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--gray-500)' }}>
                <Bell size={48} style={{ opacity: 0.2, margin: '0 auto 1rem auto' }} />
                <p>No active alerts at this time.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {recentAlerts.map(alert => (
                  <div key={alert.id} style={{ 
                    padding: '1rem', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: 'var(--radius-md)',
                    borderLeft: `4px solid ${alert.severity === 'CRITICAL' ? 'var(--danger)' : 'var(--warning)'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <strong style={{ fontSize: '0.875rem' }}>{alert.type.replace(/_/g, ' ')}</strong>
                      <span className="text-xs text-muted">{new Date(alert.timestamp).toLocaleString()}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--gray-700)' }}>{alert.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
            <h2 style={{ marginBottom: '1rem' }}>Quick Actions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link to="/tracking" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>
                <Map size={16} /> View Live Tracking
              </Link>
              <Link to="/assets" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>
                <Box size={16} /> Manage Assets
              </Link>
              <Link to="/gateways" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>
                <RadioTower size={16} /> Register Gateway
              </Link>
              <Link to="/calibration" className="btn btn-outline" style={{ justifyContent: 'flex-start' }}>
                <Activity size={16} /> Start Calibration
              </Link>
            </div>
          </div>
          
          {stats.totalAssets === 0 && !error && (
            <div className="card" style={{ backgroundColor: 'var(--primary-light)', borderColor: 'var(--primary)' }}>
              <h3 style={{ color: 'var(--primary-dark)', marginBottom: '0.5rem' }}>Getting Started</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--primary-dark)', marginBottom: '1rem' }}>
                Welcome to Asset Tracking. To begin:
              </p>
              <ol style={{ fontSize: '0.875rem', color: 'var(--primary-dark)', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <li>Setup your Buildings & Rooms</li>
                <li>Register BLE Gateways</li>
                <li>Add Smart Tags</li>
                <li>Create Assets & Assign Tags</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
    <div style={{ backgroundColor: `${color}20`, padding: '1rem', borderRadius: 'var(--radius-md)', color }}>
      <Icon size={24} />
    </div>
    <div>
      <div className="text-sm text-muted" style={{ marginBottom: '0.25rem' }}>{title}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--gray-900)' }}>{value}</div>
    </div>
  </div>
);

export default Dashboard;

import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { useRealtime } from '../contexts/RealtimeContext';
import { LogOut, FlaskConical, Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Topbar = () => {
  const { logout } = useAuth();
  const { isDemoMode, toggleDemoMode } = useDemo();
  const { status } = useRealtime();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{
      height: 'var(--topbar-height)',
      backgroundColor: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      padding: '0 2rem',
      gap: '1.5rem'
    }}>
      {!isDemoMode && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.375rem 0.75rem',
          backgroundColor: status === 'LIVE' ? 'var(--success-bg)' : status === 'OFFLINE' ? 'var(--danger-bg)' : status === 'STALE' ? 'var(--warning-bg)' : 'var(--gray-100)',
          color: status === 'LIVE' ? 'var(--success)' : status === 'OFFLINE' ? 'var(--danger)' : status === 'STALE' ? 'var(--warning)' : 'var(--gray-600)',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.75rem',
          fontWeight: 600,
          border: `1px solid ${status === 'LIVE' ? 'var(--success)' : status === 'OFFLINE' ? 'var(--danger)' : status === 'STALE' ? 'var(--warning)' : 'var(--gray-400)'}`
        }}>
          {status === 'LIVE' && <Wifi size={14} />}
          {status === 'OFFLINE' && <WifiOff size={14} />}
          {status === 'STALE' && <AlertTriangle size={14} />}
          {status === 'CONNECTING' && <RefreshCw size={14} className="spin" />}
          {status}
        </div>
      )}

      {isDemoMode && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.375rem 0.75rem',
          backgroundColor: 'var(--warning-bg)',
          color: 'var(--warning)',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.75rem',
          fontWeight: 600,
          border: '1px solid var(--warning)'
        }}>
          <FlaskConical size={14} />
          DEMO MODE ACTIVE
        </div>
      )}

      <button
        onClick={toggleDemoMode}
        style={{
          fontSize: '0.875rem',
          color: 'var(--gray-600)',
          textDecoration: 'underline'
        }}
      >
        {isDemoMode ? 'Disable Demo' : 'Enable Demo'}
      </button>

      <button 
        onClick={handleLogout}
        className="btn btn-outline"
        style={{ padding: '0.375rem 0.75rem' }}
      >
        <LogOut size={16} />
        Logout
      </button>
    </div>
  );
};

export default Topbar;

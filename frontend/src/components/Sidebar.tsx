import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Map, 
  Box, 
  Building2, 
  RadioTower, 
  Tag, 
  Activity, 
  Bell, 
  Terminal,
  Compass,
  Volume2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Sidebar = () => {
  const { user } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Assets', path: '/assets', icon: Box },
    { name: 'Live Tracking', path: '/tracking', icon: Map },
    { name: 'Buildings & Rooms', path: '/locations', icon: Building2 },
    { name: 'BLE Gateways', path: '/gateways', icon: RadioTower },
    { name: 'Smart Tags', path: '/tags', icon: Tag },
    { name: 'Hardware Telemetry Stream', path: '/debug', icon: Terminal },
    { name: 'Movement History', path: '/movements', icon: Activity },
    { name: 'Alerts', path: '/alerts', icon: Bell },
    { name: 'Indoor Navigation', path: '/navigation', icon: Compass },
    { name: 'Voice Proximity Guidance', path: '/voice-navigation', icon: Volume2 },
  ];

  return (
    <div style={{
      width: 'var(--sidebar-width)',
      backgroundColor: 'var(--gray-900)',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0
    }}>
      <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--gray-800)' }}>
        <RadioTower size={28} color="var(--primary)" style={{ flexShrink: 0 }} />
        <h1 style={{ fontSize: '0.95rem', margin: 0, color: 'white', lineHeight: 1.25, fontWeight: 700 }}>Smart Indoor Navigation & Asset Tracking</h1>
      </div>

      <div style={{ padding: '1rem', overflowY: 'auto' }}>
        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--gray-500)', fontWeight: 600, marginBottom: '0.5rem', paddingLeft: '0.75rem' }}>
          Menu
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-md)',
                  color: isActive ? 'white' : 'var(--gray-400)',
                  backgroundColor: isActive ? 'var(--gray-800)' : 'transparent',
                  textDecoration: 'none',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  transition: 'background-color 0.2s, color 0.2s'
                })}
              >
                <Icon size={18} />
                {item.name}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div style={{ marginTop: 'auto', padding: '1.5rem', borderTop: '1px solid var(--gray-800)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            {user?.firstName?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{user?.firstName || 'User'}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{user?.role}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;

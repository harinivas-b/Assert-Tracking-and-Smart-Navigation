import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { RadioTower, ShieldCheck, MapPin } from 'lucide-react';

const AuthLayout = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a',
        color: '#94a3b8'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: '2px solid rgba(255,255,255,0.1)',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          <span>Loading session...</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0f172a',
      backgroundImage: `radial-gradient(circle at 50% 0%, rgba(37, 99, 235, 0.15), transparent 50%), radial-gradient(circle at 80% 80%, rgba(16, 185, 129, 0.08), transparent 40%)`,
      padding: '2rem 1rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Decorative Elements */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
        pointerEvents: 'none'
      }} />

      <main style={{
        width: '100%',
        maxWidth: '440px',
        position: 'relative',
        zIndex: 10
      }}>
        {/* Platform Branding Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            backgroundColor: 'rgba(37, 99, 235, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            boxShadow: '0 8px 16px -4px rgba(37, 99, 235, 0.25)',
            marginBottom: '1rem'
          }}>
            <RadioTower size={30} color="#60a5fa" />
          </div>

          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#f8fafc',
            letterSpacing: '-0.02em',
            marginBottom: '0.35rem',
            lineHeight: 1.25
          }}>
            Smart Indoor Navigation & Asset Tracking
          </h1>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.8125rem',
            color: '#94a3b8',
            fontWeight: '500'
          }}>
            <MapPin size={14} color="#10b981" />
            <span>Enterprise BLE IoT Platform</span>
          </div>
        </div>

        {/* Card Container for Auth Forms */}
        <div style={{
          backgroundColor: '#1e293b',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
          padding: '2.25rem 2rem',
          backdropFilter: 'blur(8px)'
        }}>
          <Outlet />
        </div>

        {/* Security & System Status Footer */}
        <div style={{
          marginTop: '1.75rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.75rem',
            color: '#64748b'
          }}>
            <ShieldCheck size={14} color="#10b981" />
            <span>256-Bit Encrypted Session Security</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#475569' }}>
            © {new Date().getFullYear()} Smart Asset Tracking System. All rights reserved.
          </p>
        </div>
      </main>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AuthLayout;


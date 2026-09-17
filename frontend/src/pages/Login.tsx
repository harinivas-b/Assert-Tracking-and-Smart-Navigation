import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../api/auth';
import { AlertCircle, Eye, EyeOff, Lock, Mail, ArrowRight } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const savedEmail = localStorage.getItem('remember_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);

    if (rememberMe) {
      localStorage.setItem('remember_email', trimmedEmail);
    } else {
      localStorage.removeItem('remember_email');
    }

    try {
      const response = await authApi.login(trimmedEmail, password);
      login(response.token, response.user);
      navigate('/', { replace: true });
    } catch (err: any) {
      console.error('Login error:', err);
      const rawMsg = err?.message || '';
      
      if (rawMsg.includes('Network Error') || rawMsg.includes('fetch') || rawMsg.includes('ECONNREFUSED')) {
        setError('Unable to connect to the authentication server. Please verify your connection.');
      } else if (rawMsg.includes('401') || rawMsg.toLowerCase().includes('invalid')) {
        setError('Email or password is incorrect.');
      } else if (rawMsg.includes('disabled') || rawMsg.includes('inactive')) {
        setError('Your account is currently unavailable. Please contact an administrator.');
      } else {
        setError(rawMsg || 'Email or password is incorrect.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setInfoMessage('');

    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const isRealGoogleClientId = googleClientId && 
      !googleClientId.includes('your-google-client-id') && 
      !googleClientId.includes('849201938472-smart') &&
      googleClientId.endsWith('.apps.googleusercontent.com');

    if (!isRealGoogleClientId) {
      setError('Google Single Sign-On is not configured with a verified Google Client ID. Please sign in with your email and password, or create a new account.');
      return;
    }

    setIsLoading(true);

    try {
      if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
        (window as any).google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: any) => {
            try {
              if (response.credential) {
                const authRes = await authApi.googleLogin(response.credential);
                login(authRes.token, authRes.user);
                navigate('/', { replace: true });
              } else {
                setError('Google authentication failed. Please try signing in with your email and password.');
              }
            } catch (err) {
              setError('Google account not recognized or not authorized. Please log in with your registered email and password.');
            }
          }
        });

        (window as any).google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            setError('Google sign-in prompt was closed or unavailable. Please sign in with your email and password.');
          }
        });
      } else {
        setError('Google authentication service is currently unavailable. Please sign in with your email and password.');
      }
    } catch (err: any) {
      setError('Google authentication failed. Please sign in with your registered email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#f8fafc', marginBottom: '0.25rem' }}>
          Welcome back
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
          Sign in to your account to continue
        </p>
      </div>

      {error && (
        <div 
          role="alert"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#fca5a5',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginBottom: '1.25rem',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.625rem',
            lineHeight: 1.4
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{error}</span>
        </div>
      )}

      {infoMessage && (
        <div 
          role="status"
          style={{
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            color: '#93c5fd',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            lineHeight: 1.4
          }}
        >
          {infoMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* Email Field */}
        <div style={{ marginBottom: '1.125rem' }}>
          <label 
            htmlFor="login-email" 
            style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#cbd5e1', marginBottom: '0.375rem' }}
          >
            Email Address
          </label>
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '0.75rem',
              transform: 'translateY(-50%)',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none'
            }}>
              <Mail size={18} />
            </div>
            <input 
              id="login-email"
              type="email" 
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              disabled={isLoading}
              required
              aria-required="true"
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem 0.625rem 2.5rem',
                backgroundColor: '#0f172a',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '0.875rem',
                outline: 'none',
                transition: 'all 0.2s ease-in-out'
              }}
            />
          </div>
        </div>

        {/* Password Field */}
        <div style={{ marginBottom: '1.125rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
            <label 
              htmlFor="login-password" 
              style={{ fontSize: '0.875rem', fontWeight: '500', color: '#cbd5e1' }}
            >
              Password
            </label>
            <Link 
              to="/forgot-password" 
              style={{ fontSize: '0.8125rem', color: '#60a5fa', textDecoration: 'none', fontWeight: '500' }}
            >
              Forgot password?
            </Link>
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '0.75rem',
              transform: 'translateY(-50%)',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none'
            }}>
              <Lock size={18} />
            </div>
            <input 
              id="login-password"
              type={showPassword ? 'text' : 'password'} 
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={isLoading}
              required
              aria-required="true"
              style={{
                width: '100%',
                padding: '0.625rem 2.5rem 0.625rem 2.5rem',
                backgroundColor: '#0f172a',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                color: '#f8fafc',
                fontSize: '0.875rem',
                outline: 'none',
                transition: 'all 0.2s ease-in-out'
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              style={{
                position: 'absolute',
                top: '50%',
                right: '0.75rem',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#64748b',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                borderRadius: '4px'
              }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Remember Me Checkbox */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
          <input 
            id="remember-me"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            style={{
              width: '16px',
              height: '16px',
              accentColor: '#2563eb',
              cursor: 'pointer',
              borderRadius: '4px'
            }}
          />
          <label 
            htmlFor="remember-me"
            style={{ marginLeft: '0.5rem', fontSize: '0.85rem', color: '#94a3b8', cursor: 'pointer', userSelect: 'none' }}
          >
            Remember me on this device
          </label>
        </div>

        {/* Submit Button */}
        <button 
          type="submit" 
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: '600',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'background-color 0.2s',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
          }}
        >
          {isLoading ? (
            <>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTopColor: '#ffffff',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        margin: '1.5rem 0',
        color: '#64748b',
        fontSize: '0.75rem',
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
      }}>
        <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
        <span style={{ padding: '0 0.75rem' }}>OR</span>
        <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />
      </div>

      {/* Google OAuth Login Button */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isLoading}
        style={{
          width: '100%',
          padding: '0.625rem 1rem',
          backgroundColor: '#0f172a',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '8px',
          color: '#f8fafc',
          fontSize: '0.875rem',
          fontWeight: '500',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
          transition: 'all 0.2s ease-in-out'
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>Continue with Google</span>
      </button>

      {/* Footer Navigation */}
      <div style={{ marginTop: '1.75rem', textAlign: 'center', fontSize: '0.875rem', color: '#94a3b8' }}>
        Don't have an account?{' '}
        <Link to="/signup" style={{ color: '#60a5fa', fontWeight: '600', textDecoration: 'none' }}>
          Create account
        </Link>
      </div>
    </div>
  );
};

export default Login;


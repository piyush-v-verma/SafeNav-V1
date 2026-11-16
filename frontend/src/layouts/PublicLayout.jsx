import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function PublicLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const isAuthPage = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'].includes(pathname);
  const isTermsPage = pathname === '/terms';
  const returnPath = isTermsPage ? '/register' : user ? '/' : '/login';
  const returnLabel = isTermsPage ? 'Back to Registration' : user ? 'Return to Navigation' : 'Back to Sign In';
  const brand = <>
    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#1a6cff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', boxShadow: '0 4px 10px rgba(26, 108, 255, 0.3)' }}>
      <Shield size={20} strokeWidth={2.4} />
    </div>
    <div>
      <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', display: 'block', lineHeight: 1.1 }}>SafeNav</span>
      <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>Nagpur Road Safety</span>
    </div>
  </>;
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(180deg, #edf5ff 0%, #f4f8fe 40%, #ffffff 100%)',
      color: '#0f172a',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      overflowY: 'auto'
    }}>
      {/* Public Header */}
      <header style={{
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(8px)',
        position: 'sticky',
        top: 0,
        zIndex: 20
      }}>
        {isAuthPage || isTermsPage ? <div aria-label="SafeNav" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>{brand}</div> : <Link to={returnPath} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>{brand}</Link>}
        {!isAuthPage && <Link
          to={returnPath}
          style={{
            fontSize: '0.85rem',
            color: '#1a6cff',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: 600,
            padding: '8px 14px',
            borderRadius: '8px',
            background: 'rgba(26, 108, 255, 0.08)',
            transition: 'background 0.15s ease'
          }}
        >
          <ArrowLeft size={16} />
          <span>{returnLabel}</span>
        </Link>}
      </header>

      {/* Centered Body with responsive padding */}
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        boxSizing: 'border-box'
      }}>
        <Outlet />
      </main>

      {/* Public Footer */}
      <footer style={{
        padding: '20px 24px',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: '#64748b',
        borderTop: '1px solid rgba(226, 232, 240, 0.8)',
        background: '#ffffff',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '20px',
        flexWrap: 'wrap'
      }}>
        <span>© 2026 SafeNav Nagpur</span>
        <Link to="/terms" style={{ color: '#64748b', textDecoration: 'none', transition: 'color 0.15s' }}>Terms of Service</Link>
        <Link to="/privacy" style={{ color: '#64748b', textDecoration: 'none', transition: 'color 0.15s' }}>Privacy Policy</Link>
        <Link to="/about" style={{ color: '#64748b', textDecoration: 'none', transition: 'color 0.15s' }}>About</Link>
      </footer>
    </div>
  );
}

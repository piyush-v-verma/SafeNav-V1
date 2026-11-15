import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ children }) {
  const { user, profile, loading, isConfigured } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: '#f8fafc', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #334155', borderTop: '3px solid #38bdf8', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ margin: 0, fontSize: '0.95rem', color: '#94a3b8' }}>Verifying session...</p>
        </div>
      </div>
    );
  }

  // If Supabase is not configured yet in local development, allow guest access with a banner
  if (!isConfigured) {
    return children;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (profile && profile.account_status === 'suspended') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: '#f8fafc', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: '480px', background: '#1e293b', border: '1px solid #ef4444', borderRadius: '12px', padding: '28px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
          <div style={{ width: '56px', height: '56px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '28px' }}>
            ⚠️
          </div>
          <h2 style={{ margin: '0 0 10px', fontSize: '1.25rem', color: '#f8fafc' }}>Account Suspended</h2>
          <p style={{ margin: '0 0 20px', fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.5 }}>
            Your SafeNav citizen account has been suspended by administration. If you believe this is in error, please contact SafeNav support.
          </p>
          <a
            href="/login"
            style={{ display: 'inline-block', padding: '10px 20px', background: '#334155', color: '#f8fafc', textDecoration: 'none', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 500 }}
          >
            Back to Sign In
          </a>
        </div>
      </div>
    );
  }

  return children;
}

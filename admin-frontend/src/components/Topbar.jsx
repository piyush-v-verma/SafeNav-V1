import React from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';

export default function Topbar() {
  const { profile, user, signOut } = useAdminAuth();

  return (
    <header style={{
      height: '64px',
      background: '#0f172a',
      borderBottom: '1px solid #1e293b',
      padding: '0 28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexShrink: 0
    }}>
      {/* Title / Breadcrumb context */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Municipal Region:</span>
        <span style={{
          fontSize: '0.8rem',
          fontWeight: 600,
          background: 'rgba(56, 189, 248, 0.1)',
          color: '#38bdf8',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          padding: '2px 8px',
          borderRadius: '4px'
        }}>
          Nagpur (Maharashtra)
        </span>
      </div>

      {/* Admin User Info & Sign Out */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#f8fafc' }}>
            {profile?.full_name || 'System Administrator'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            {user?.email || 'admin@safenav.in'}
          </div>
        </div>

        <span style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          padding: '4px 8px',
          borderRadius: '4px',
          background: 'rgba(239, 68, 68, 0.15)',
          color: '#f87171',
          border: '1px solid rgba(239, 68, 68, 0.3)'
        }}>
          Admin
        </span>

        <button
          onClick={signOut}
          style={{
            padding: '6px 14px',
            background: '#1e293b',
            border: '1px solid #334155',
            color: '#f8fafc',
            borderRadius: '6px',
            fontSize: '0.8rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 0.15s ease'
          }}
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}

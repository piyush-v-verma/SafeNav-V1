import React from 'react';
import { useAdminAuth } from '../context/AdminAuthContext';

export default function AdminProfilePage() {
  const { profile, user } = useAdminAuth();

  return (
    <div style={{ maxWidth: '720px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ margin: '0 0 6px', fontSize: '1.6rem', fontWeight: 700, color: '#f8fafc' }}>
          Administrator Profile
        </h1>
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8' }}>
          Credentials and authority details for this session
        </p>
      </div>

      <div style={{
        background: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '12px',
        padding: '32px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', borderBottom: '1px solid #1e293b', paddingBottom: '24px', marginBottom: '24px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
            color: '#ffffff',
            fontSize: '26px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
          }}>
            {(profile?.full_name || 'A')[0].toUpperCase()}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#f8fafc' }}>
                {profile?.full_name || 'System Administrator'}
              </h2>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '2px 8px',
                borderRadius: '4px',
                background: 'rgba(239, 68, 68, 0.2)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.4)'
              }}>
                Role: Admin
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#94a3b8' }}>
              {user?.email || 'admin@safenav.in'}
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
          <div style={{ background: '#0b1120', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Jurisdiction</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#f8fafc' }}>Nagpur Municipal Corporation (NMC)</div>
          </div>

          <div style={{ background: '#0b1120', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Authority Level</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#38bdf8' }}>Full Administrative Review & Moderation</div>
          </div>

          <div style={{ background: '#0b1120', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Identity UUID</div>
            <div style={{ fontSize: '0.8rem', color: '#cbd5e1', fontFamily: 'monospace' }}>{user?.id || '—'}</div>
          </div>

          <div style={{ background: '#0b1120', padding: '16px', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Account Status</div>
            <div style={{ fontSize: '0.9rem', color: '#22c55e', fontWeight: 600 }}>Active (Verified)</div>
          </div>
        </div>
      </div>
    </div>
  );
}

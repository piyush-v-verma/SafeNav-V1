import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../../../shared/toast/ToastProvider';

export default function ProfilePage() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch {
      toast.error('Could not sign out. Please try again.');
    }
  };

  return (
    <div style={{
      maxWidth: '680px',
      margin: '40px auto',
      padding: '0 20px',
      color: '#f8fafc'
    }}>
      <div style={{
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '12px',
        padding: '32px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
      }}>
        {/* Header with avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', borderBottom: '1px solid #334155', paddingBottom: '24px', marginBottom: '24px' }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)',
            color: '#ffffff',
            fontSize: '32px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(56, 189, 248, 0.3)'
          }}>
            {(profile?.full_name || user?.email || 'C')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>
                {profile?.full_name || 'Citizen'}
              </h1>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                padding: '2px 8px',
                borderRadius: '4px',
                background: profile?.role === 'admin' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                color: profile?.role === 'admin' ? '#f87171' : '#38bdf8',
                border: `1px solid ${profile?.role === 'admin' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(56, 189, 248, 0.4)'}`
              }}>
                {profile?.role || 'user'}
              </span>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '4px',
                background: profile?.account_status === 'active' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: profile?.account_status === 'active' ? '#4ade80' : '#f87171',
              }}>
                {profile?.account_status || 'active'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#94a3b8' }}>
              {user?.email}
            </p>
          </div>
          <Link
            to="/profile/edit"
            style={{
              padding: '8px 16px',
              background: '#334155',
              color: '#f8fafc',
              border: '1px solid #475569',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'background 0.15s ease'
            }}
          >
            ✏️ Edit Profile
          </Link>
        </div>

        {/* Profile Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
          <div style={{ background: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
            <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
              Contact Number
            </span>
            <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#f8fafc' }}>
              {profile?.mobile_number || 'Not provided'}
            </span>
          </div>

          <div style={{ background: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
            <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
              Location Coverage
            </span>
            <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#f8fafc' }}>
              Nagpur, Maharashtra
            </span>
          </div>

          <div style={{ background: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
            <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
              Account Created
            </span>
            <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>
              {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Active session'}
            </span>
          </div>

          <div style={{ background: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
            <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
              Identity Source
            </span>
            <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>
              Supabase Auth (PostgreSQL)
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link
            to="/my-reports"
            style={{
              padding: '10px 18px',
              background: '#2563eb',
              color: '#ffffff',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: 500
            }}
          >
            📋 View My Road Hazard Reports
          </Link>
          <Link
            to="/"
            style={{
              padding: '10px 18px',
              background: '#334155',
              color: '#f8fafc',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: 500
            }}
          >
            🗺️ Back to Map
          </Link>
          <button type="button" onClick={handleSignOut} style={{ padding: '10px 18px', background: '#334155', color: '#f8fafc', border: '1px solid #475569', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer' }}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

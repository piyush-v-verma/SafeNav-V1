import React, { useEffect, useState } from 'react';
import { fetchDashboardMetrics } from '../services/adminApi';
import { useToast } from '../../../shared/toast/ToastProvider';

export default function DashboardPage() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const toast = useToast();

  useEffect(() => {
    fetchDashboardMetrics()
      .then((res) => {
        setMetrics(res.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        const unauthorized = /401|403|unauthorized|access denied/i.test(err.message || '');
        toast.error(unauthorized ? 'Your administrator access has expired. Sign in again.' : 'Could not load dashboard data. Please try again.', { dedupeKey: 'admin-dashboard-load-error' });
        setLoading(false);
      });
  }, [toast]);

  const statCards = [
    { title: 'Total Registered Citizens', value: metrics?.total_users ?? '—', icon: '👥', color: '#38bdf8' },
    { title: 'Active Accounts', value: metrics?.active_users ?? '—', icon: '✅', color: '#22c55e' },
    { title: 'Suspended Accounts', value: metrics?.suspended_users ?? '—', icon: '⛔', color: '#ef4444' },
    { title: 'Total Road Hazard Reports', value: metrics?.total_reports ?? '0', icon: '🚧', color: '#f59e0b' },
  ];

  return (
    <div>
      {/* Title */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ margin: '0 0 6px', fontSize: '1.6rem', fontWeight: 700, color: '#f8fafc' }}>
          Operations Overview
        </h1>
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8' }}>
          Live identity and telemetry status across the Nagpur road network
        </p>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          padding: '14px 18px',
          marginBottom: '24px',
          color: '#f87171',
          fontSize: '0.875rem'
        }}>
          Notice: {error} (Displaying offline/mock metrics)
        </div>
      )}

      {/* Metric Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
        {statCards.map((card, i) => (
          <div
            key={i}
            style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '12px',
              padding: '22px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>{card.title}</span>
              <span style={{ fontSize: '1.25rem' }}>{card.icon}</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: card.color }}>
              {loading ? '...' : card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Operational Modules Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px' }}>
        {/* System Architecture Status */}
        <div style={{
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 600, color: '#f8fafc' }}>
            Nagpur Road Network Spatial Health
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#0b1120', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <span style={{ color: '#94a3b8' }}>Graph Topology</span>
              <span style={{ color: '#f8fafc', fontWeight: 500 }}>MultiDiGraph (Directed)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#0b1120', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <span style={{ color: '#94a3b8' }}>Metric Projection</span>
              <span style={{ color: '#f8fafc', fontWeight: 500 }}>UTM Zone 44N (EPSG:32644)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#0b1120', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <span style={{ color: '#94a3b8' }}>Spatial Indexing</span>
              <span style={{ color: '#22c55e', fontWeight: 600 }}>STRtree Active (Largest SCC)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#0b1120', borderRadius: '8px', border: '1px solid #1e293b' }}>
              <span style={{ color: '#94a3b8' }}>Access Snapping</span>
              <span style={{ color: '#22c55e', fontWeight: 600 }}>Dotted Perpendicular Connectors</span>
            </div>
          </div>
        </div>

        {/* Security & Access Guard */}
        <div style={{
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
        }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 600, color: '#f8fafc' }}>
            Identity Security Status
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5 }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <span>🔐</span>
              <div>
                <strong style={{ color: '#f8fafc' }}>Supabase Auth RBAC</strong>
                <p style={{ margin: '2px 0 0', color: '#94a3b8' }}>Passwords salted & hashed on Supabase Auth. Tokens verified with HMAC-SHA256.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <span>🛡️</span>
              <div>
                <strong style={{ color: '#f8fafc' }}>Row Level Security (RLS)</strong>
                <p style={{ margin: '2px 0 0', color: '#94a3b8' }}>Enforced on PostgreSQL. Citizens cannot escalate roles or override account status.</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <span>💻</span>
              <div>
                <strong style={{ color: '#f8fafc' }}>Desktop Guard Active</strong>
                <p style={{ margin: '2px 0 0', color: '#94a3b8' }}>Viewports &lt; 1024px restricted from executing administrative operations.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

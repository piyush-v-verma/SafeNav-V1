import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Sidebar() {
  const navItems = [
    { label: 'Overview Dashboard', path: '/', icon: '📊' },
    { label: 'Road Reports Queue', path: '/reports', icon: '🚧' },
    { label: 'Citizen Management', path: '/users', icon: '👥' },
    { label: 'Admin Profile', path: '/profile', icon: '🛡️' },
  ];

  return (
    <aside style={{
      width: '260px',
      background: '#0f172a',
      borderRight: '1px solid #1e293b',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0
    }}>
      {/* Brand Header */}
      <div style={{
        height: '64px',
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        borderBottom: '1px solid #1e293b'
      }}>
        <span style={{ fontSize: '24px' }}>🛡️</span>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.02em' }}>SafeNav Admin</div>
          <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nagpur Control Portal</div>
        </div>
      </div>

      {/* Nav Menu */}
      <nav style={{ padding: '20px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 12px 8px' }}>
          Operations
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 500,
              textDecoration: 'none',
              color: isActive ? '#38bdf8' : '#cbd5e1',
              background: isActive ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
              border: isActive ? '1px solid rgba(56, 189, 248, 0.25)' : '1px solid transparent',
              transition: 'all 0.15s ease'
            })}
          >
            <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* System Status Footer */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid #1e293b',
        background: '#090d16',
        fontSize: '0.75rem',
        color: '#64748b'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
          <span style={{ color: '#cbd5e1', fontWeight: 500 }}>Nagpur Road Graph: Live</span>
        </div>
        <div>UTM 44N Metric Projection</div>
      </div>
    </aside>
  );
}

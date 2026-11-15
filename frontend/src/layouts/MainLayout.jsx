import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function MainLayout() {
  const { user, profile, signOut, isConfigured } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', background: '#0f172a', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Top Navigation Bar */}
      <header style={{
        height: '56px',
        background: '#1e293b',
        borderBottom: '1px solid #334155',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 1000,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        flexShrink: 0
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '22px' }}>🛡️</span>
            <span style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.02em' }}>SafeNav</span>
          </Link>
          <span style={{
            fontSize: '0.65rem',
            fontWeight: 600,
            background: 'rgba(56, 189, 248, 0.15)',
            color: '#38bdf8',
            padding: '2px 6px',
            borderRadius: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Nagpur
          </span>
        </div>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <NavLink
            to="/"
            end
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 500,
              textDecoration: 'none',
              color: isActive ? '#38bdf8' : '#94a3b8',
              background: isActive ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
              transition: 'all 0.15s ease'
            })}
          >
            🗺️ Map
          </NavLink>

          <NavLink
            to="/my-reports"
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '0.85rem',
              fontWeight: 500,
              textDecoration: 'none',
              color: isActive ? '#38bdf8' : '#94a3b8',
              background: isActive ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
              transition: 'all 0.15s ease'
            })}
          >
            📋 Reports
          </NavLink>

          {/* User Account / Profile */}
          {user ? (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#334155',
                  border: '1px solid #475569',
                  borderRadius: '20px',
                  padding: '4px 12px 4px 6px',
                  color: '#f8fafc',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#38bdf8', color: '#0f172a', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>
                  {(profile?.full_name || user.email || 'C')[0].toUpperCase()}
                </div>
                <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile?.full_name || 'Citizen'}
                </span>
                <span style={{ fontSize: '0.7rem' }}>▼</span>
              </button>

              {menuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '38px',
                    width: '180px',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    padding: '6px',
                    zIndex: 2000
                  }}
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  <div style={{ padding: '8px 10px', borderBottom: '1px solid #334155', marginBottom: '4px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc' }}>{profile?.full_name || 'Citizen'}</div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    style={{ display: 'block', padding: '8px 10px', fontSize: '0.85rem', color: '#cbd5e1', textDecoration: 'none', borderRadius: '4px' }}
                  >
                    👤 My Profile
                  </Link>
                  <Link
                    to="/about"
                    onClick={() => setMenuOpen(false)}
                    style={{ display: 'block', padding: '8px 10px', fontSize: '0.85rem', color: '#cbd5e1', textDecoration: 'none', borderRadius: '4px' }}
                  >
                    ℹ️ About SafeNav
                  </Link>
                  <button
                    onClick={() => { setMenuOpen(false); handleSignOut(); }}
                    style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '8px 10px', fontSize: '0.85rem', color: '#ef4444', cursor: 'pointer', borderRadius: '4px' }}
                  >
                    🚪 Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link
                to="/login"
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  textDecoration: 'none',
                  color: '#f8fafc',
                  background: '#2563eb'
                }}
              >
                Sign In
              </Link>
            </div>
          )}
        </nav>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <Outlet />
      </main>
    </div>
  );
}

import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { House, Mic, AlertCircle, UserRound } from 'lucide-react';
import './Navigation.css';

/**
 * Navigation Items Configuration
 * Strictly limited to the 4 required SafeNav items:
 * 1. Home (House)
 * 2. Assistant (Mic)
 * 3. Report (AlertCircle)
 * 4. Profile (UserRound)
 */
const NAV_ITEMS = [
  {
    id: 'home',
    label: 'Home',
    path: '/',
    Icon: House,
  },
  {
    id: 'assistant',
    label: 'Assistant',
    path: '/assistant',
    Icon: Mic,
  },
  {
    id: 'report',
    label: 'Report',
    path: '/report',
    Icon: AlertCircle,
  },
  {
    id: 'profile',
    label: 'Profile',
    path: '/profile',
    Icon: UserRound,
  },
];

export default function Navigation() {
  return (
    <>
      {/* -------------------------------------------------------------
          1. Desktop & Tablet Left Sidebar (~80px wide)
          Automatically visible on desktop, tablet, and mobile landscape
          ------------------------------------------------------------- */}
      <aside className="safenav-sidebar" aria-label="Main Navigation Sidebar">
        {/* SafeNav Brand Shield / Logo */}
        <Link to="/" className="safenav-sidebar-brand" title="SafeNav Home">
          <div className="safenav-brand-shield">
            <span>🛡️</span>
          </div>
          <span className="safenav-brand-text">SafeNav</span>
        </Link>

        {/* Vertical Navigation Links */}
        <nav className="safenav-sidebar-nav">
          {NAV_ITEMS.map(({ id, label, path, Icon }) => (
            <NavLink
              key={id}
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                `safenav-nav-link ${isActive ? 'active' : ''}`
              }
              title={label}
            >
              <div className="safenav-nav-icon">
                <Icon size={24} strokeWidth={2} />
              </div>
              <span className="safenav-nav-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer Indicator */}
        <div className="safenav-sidebar-footer">
          <span className="safenav-nagpur-badge" title="Nagpur Operational Coverage">
            Nagpur
          </span>
        </div>
      </aside>

      {/* -------------------------------------------------------------
          2. Mobile Bottom Navigation Bar (4 Horizontal Items)
          Automatically visible on mobile portrait screens (< 768px)
          ------------------------------------------------------------- */}
      <nav className="safenav-bottom-nav" aria-label="Mobile Navigation Bar">
        {NAV_ITEMS.map(({ id, label, path, Icon }) => (
          <NavLink
            key={id}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `safenav-nav-link ${isActive ? 'active' : ''}`
            }
          >
            <div className="safenav-nav-icon">
              <Icon size={24} strokeWidth={2} />
            </div>
            <span className="safenav-nav-label">{label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}

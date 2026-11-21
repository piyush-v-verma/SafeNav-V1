import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Shield } from 'lucide-react';
import './PublicLayout.css';

export default function PublicLayout() {
  return (
    <div className="public-layout-container">
      {/* Fixed Top Header - Standardized across all public & auth pages */}
      <header className="public-header-fixed" role="banner">
        <Link to="/" className="public-brand-link" title="SafeNav Home">
          <div className="public-brand-icon">
            <Shield size={20} strokeWidth={2.4} />
          </div>
          <div className="public-brand-text">
            <span className="public-brand-title">SafeNav</span>
            <span className="public-brand-subtitle">Nagpur Road Safety</span>
          </div>
        </Link>
      </header>

      {/* Centered Main Area with Clearance for Fixed Header */}
      <main className="public-main-content">
        <Outlet />
      </main>

      {/* Public Footer */}
      <footer className="public-footer">
        <span>© 2026 SafeNav Nagpur</span>
        <Link to="/terms">Terms of Service</Link>
        <Link to="/privacy">Privacy Policy</Link>
        <Link to="/about">About</Link>
      </footer>
    </div>
  );
}

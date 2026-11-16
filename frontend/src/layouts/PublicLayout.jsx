import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import './PublicLayout.css';

export default function PublicLayout() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  const getHeaderAction = () => {
    if (pathname === '/login') {
      return (
        <Link to="/register" className="public-header-action" id="header-action-btn">
          Create Account
        </Link>
      );
    }
    if (pathname === '/register') {
      return (
        <Link to="/login" className="public-header-action" id="header-action-btn">
          Sign In
        </Link>
      );
    }
    if (pathname === '/forgot-password' || pathname === '/reset-password') {
      return (
        <Link to="/login" className="public-header-action" id="header-action-btn">
          <ArrowLeft size={16} />
          <span>Back to Sign In</span>
        </Link>
      );
    }
    if (pathname === '/verify-email') {
      return (
        <Link to="/login" className="public-header-action" id="header-action-btn">
          <ArrowLeft size={16} />
          <span>Back to Sign In</span>
        </Link>
      );
    }
    if (pathname === '/terms') {
      return (
        <Link to="/register" className="public-header-action" id="header-action-btn">
          <ArrowLeft size={16} />
          <span>Back to Register</span>
        </Link>
      );
    }
    // Legal & info pages fallback
    return (
      <Link to={user ? '/' : '/login'} className="public-header-action" id="header-action-btn">
        <ArrowLeft size={16} />
        <span>{user ? 'Return to Navigation' : 'Back to Sign In'}</span>
      </Link>
    );
  };

  return (
    <div className="public-layout-container">
      {/* Fixed Top Header */}
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

        {getHeaderAction()}
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

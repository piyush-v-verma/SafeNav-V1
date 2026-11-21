import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function GuestOnlyRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div role="status" style={{ padding: '24px', color: '#475569', fontSize: '0.9rem' }}>Checking your session…</div>;
  }
  if (user) {
    const intendedPath = location.state?.from?.pathname;
    return <Navigate to={intendedPath && !['/login', '/register'].includes(intendedPath) ? intendedPath : '/'} replace />;
  }
  return children;
}

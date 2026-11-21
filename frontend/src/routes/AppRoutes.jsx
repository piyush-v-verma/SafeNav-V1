import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import PublicLayout from '../layouts/PublicLayout';
import MapPage from '../pages/MapPage';
import AssistantPage from '../pages/assistant/AssistantPage';
import ReportHazardPage from '../pages/report/ReportHazardPage';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage';
import VerifyEmailPage from '../pages/auth/VerifyEmailPage';
import ProfilePage from '../pages/profile/ProfilePage';
import EditProfilePage from '../pages/profile/EditProfilePage';
import MyReportsPage from '../pages/reports/MyReportsPage';
import TermsPage from '../pages/legal/TermsPage';
import PrivacyPage from '../pages/legal/PrivacyPage';
import AboutPage from '../pages/legal/AboutPage';
import ProtectedRoute from './ProtectedRoute';
import GuestOnlyRoute from './GuestOnlyRoute';

function AuthCallbackRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // If already on the dedicated callback handler pages, do not re-route
    if (location.pathname === '/verify-email' || location.pathname === '/reset-password') return;

    const params = new URLSearchParams(`${location.search}&${location.hash.replace(/^#/, '')}`);
    const type = params.get('type') || '';
    const errorCode = params.get('error_code') || params.get('error') || '';
    const errorDescription = params.get('error_description') || '';
    const isExpiredLink =
      errorCode === 'otp_expired' ||
      /email link.*invalid|email link.*expired|token.*expired/i.test(errorDescription);

    // 1. Handle expired or invalid links with flow-specific destinations
    if (isExpiredLink) {
      if (type === 'recovery') {
        navigate(`/reset-password${location.search}${location.hash}`, { replace: true });
      } else {
        navigate(`/verify-email${location.search}${location.hash}`, { replace: true });
      }
      return;
    }

    // 2. Route password recovery tokens explicitly to /reset-password
    if (type === 'recovery') {
      navigate(`/reset-password${location.search}${location.hash}`, { replace: true });
      return;
    }

    // 3. Route signup email verification callbacks to /verify-email
    if (type === 'signup' && location.pathname !== '/verify-email') {
      navigate(`/verify-email${location.search}${location.hash}`, { replace: true });
    }
  }, [location.hash, location.pathname, location.search, navigate]);

  return null;
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <AuthCallbackRedirect />
      <Routes>
        {/* Main Application Shell with Responsive Navigation */}
        <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
          <Route path="/" element={<MapPage />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/report" element={<ReportHazardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/edit" element={<EditProfilePage />} />
          <Route path="/my-reports" element={<MyReportsPage />} />
        </Route>

        {/* Public Auth & Legal Shell */}
        <Route element={<PublicLayout />}>
          <Route path="/login" element={<GuestOnlyRoute><LoginPage /></GuestOnlyRoute>} />
          <Route path="/register" element={<GuestOnlyRoute><RegisterPage /></GuestOnlyRoute>} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

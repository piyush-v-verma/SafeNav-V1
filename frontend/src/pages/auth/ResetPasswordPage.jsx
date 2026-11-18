import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft, KeyRound } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../../../shared/toast/ToastProvider';
import { getAuthErrorMessage } from '../../services/authErrors';
import './AuthPages.css';

export default function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const { session, isRecoveryMode, loading: authLoading, updatePassword, signOut, clearRecoveryMode } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Check URL parameters for explicit error codes (e.g. otp_expired)
  const params = new URLSearchParams(`${location.search}&${location.hash.replace(/^#/, '')}`);
  const urlErrorCode = params.get('error_code') || params.get('error') || '';
  const urlErrorDesc = params.get('error_description') || '';
  const hasUrlError = Boolean(urlErrorCode);

  // Recovery link is valid if:
  // 1) No URL error code exists, AND
  // 2) An active session exists, AND
  // 3) Either isRecoveryMode is true OR the URL hash contains type=recovery
  const hasRecoveryHash = location.hash.includes('type=recovery');
  const isValidRecoverySession = !hasUrlError && Boolean(session) && (isRecoveryMode || hasRecoveryHash);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || success) return;
    setError('');

    if (!isValidRecoverySession) {
      setError('No valid recovery session found. Please request a new recovery link.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      await updatePassword(password);
      const msg = 'Password changed successfully. You can now log in.';
      setSuccessMessage(msg);
      setSuccess(true);
      toast.success(msg);

      // Security requirement: Ensure user is signed out so they are not automatically
      // logged into the dashboard, and must explicitly log in with the new password.
      await signOut();
      if (clearRecoveryMode) clearRecoveryMode();

      // Automatically redirect to /login after ~2 seconds
      setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: { passwordResetSuccess: true },
        });
      }, 2000);
    } catch (err) {
      const formatted = getAuthErrorMessage(err, 'resetPassword');
      setError(formatted || err.message || 'Failed to update password. Please try again.');
      toast.error('Could not update the password. Please try again.');
      setSubmitting(false);
    }
  };

  // 1. Initial Auth Loading State
  if (authLoading) {
    return (
      <div className="auth-page-wrapper">
        <div className="auth-card" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              border: '3px solid #e2e8f0',
              borderTop: '3px solid #1a6cff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <h2 style={{ fontSize: '1.15rem', color: '#0f172a', margin: '0 0 6px', fontWeight: 600 }}>
            Verifying Recovery Link
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>
            Please wait while we validate your session...
          </p>
        </div>
      </div>
    );
  }

  // 2. Invalid or Expired Recovery Link State
  if (hasUrlError || !isValidRecoverySession) {
    const isExpired =
      urlErrorCode === 'otp_expired' ||
      /expired|invalid/i.test(urlErrorDesc) ||
      urlErrorCode === 'access_denied';

    return (
      <div className="auth-page-wrapper">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-badge" style={{ background: '#dc2626' }}>
              <AlertCircle size={28} strokeWidth={2.4} />
            </div>
            <h1 className="auth-title">
              {isExpired ? 'Link Expired' : 'Invalid Recovery Link'}
            </h1>
            <p className="auth-subtitle">
              {isExpired
                ? 'This password recovery link has expired or has already been used.'
                : 'No active recovery session was detected. For security, password changes require a valid recovery link.'}
            </p>
          </div>

          <div className="auth-alert-error" role="alert">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>
              {isExpired
                ? 'Password recovery links are time-sensitive and single-use.'
                : 'Please request a new password recovery email to reset your account password.'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
            <Link
              to="/forgot-password"
              className="auth-btn-primary"
              style={{
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
              }}
            >
              Request New Recovery Link
            </Link>

            <div style={{ textAlign: 'center', marginTop: '8px' }}>
              <Link to="/login" className="auth-back-link">
                <ArrowLeft size={16} />
                <span>Return to Sign In</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. Valid Recovery Session Form
  return (
    <div className="auth-page-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-badge" style={{ background: success ? '#16a34a' : '#1a6cff' }}>
            {success ? <CheckCircle size={28} strokeWidth={2.4} /> : <KeyRound size={28} strokeWidth={2.4} />}
          </div>
          <h1 className="auth-title">
            {success ? 'Password Updated!' : 'Set New Password'}
          </h1>
          <p className="auth-subtitle">
            {success
              ? 'Your password has been changed. Redirecting to login...'
              : 'Enter and confirm your new account password below.'}
          </p>
        </div>

        {error && (
          <div className="auth-alert-error" role="alert">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="auth-alert-success" role="status">
            <CheckCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>{successMessage}</span>
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field-group">
              <label htmlFor="new-password" className="auth-label">
                New Password (minimum 8 characters)
              </label>
              <div className="auth-input-container">
                <span className="auth-input-icon">
                  <Lock size={18} />
                </span>
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="auth-input"
                  autoComplete="new-password"
                  disabled={submitting}
                  style={{ paddingRight: '40px' }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="auth-password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="auth-field-group">
              <label htmlFor="confirm-password" className="auth-label">
                Confirm New Password
              </label>
              <div className="auth-input-container">
                <span className="auth-input-icon">
                  <Lock size={18} />
                </span>
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="auth-input"
                  autoComplete="new-password"
                  disabled={submitting}
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="auth-password-toggle"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !password || !confirmPassword}
              className="auth-btn-primary"
              style={{ marginTop: '6px' }}
            >
              {submitting ? 'Updating Password...' : 'Save New Password'}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: '18px' }}>
          <Link to="/login" className="auth-back-link">
            <ArrowLeft size={16} />
            <span>Return to Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

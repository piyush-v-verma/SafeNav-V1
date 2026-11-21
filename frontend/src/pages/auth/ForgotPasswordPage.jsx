import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Mail, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../../../shared/toast/ToastProvider';
import { getAuthErrorMessage } from '../../services/authErrors';
import './AuthPages.css';

const isValidEmail = (value) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [error, setError] = useState('');

  const { resetPassword, isConfigured } = useAuth();
  const toast = useToast();

  const handleSendRecoveryEmail = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      const msg = 'Please enter your registered email address.';
      setError(msg);
      toast.error(msg);
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      const msg = 'Please enter a valid email address (e.g. name@example.com).';
      setError(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);
    try {
      if (isConfigured) {
        await resetPassword(trimmedEmail);
      }
      setSubmittedEmail(trimmedEmail);
      setSubmitted(true);
      toast.success("If an account exists with this email address, we'll send you a password recovery link.");
    } catch (err) {
      const message = getAuthErrorMessage(err, 'resetPassword');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card">
        {/* Top Circular Shield Badge */}
        <div className="auth-header">
          <div className="auth-badge">
            <Shield strokeWidth={2.4} />
          </div>
          <h1 className="auth-title">Forgot Password</h1>
          <p className="auth-subtitle">
            {submitted
              ? 'Check your inbox for password recovery instructions.'
              : 'Enter your registered email to receive a password recovery link.'}
          </p>
        </div>

        {!isConfigured && (
          <div className="auth-alert-notice">
            💡 <strong>Notice:</strong> Supabase credentials are not configured in <code>frontend/.env</code> yet.
          </div>
        )}

        {error && (
          <div className="auth-alert-error" role="alert">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>{error}</span>
          </div>
        )}

        {submitted ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
            <div className="auth-alert-success" role="status">
              <CheckCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>
                If an account exists with this email address (<strong>{submittedEmail}</strong>), we'll send you a password recovery link.
              </span>
            </div>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '14px 16px',
                fontSize: '0.85rem',
                color: '#475569',
                lineHeight: 1.5,
                textAlign: 'left',
              }}
            >
              <p style={{ margin: '0 0 6px', fontWeight: 600, color: '#0f172a' }}>Next steps:</p>
              <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>Check your inbox and click the recovery link to set a new password.</li>
                <li>Be sure to check your spam or junk folder if the email does not arrive within a few minutes.</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setError('');
              }}
              className="auth-btn-social"
              style={{ justifyContent: 'center' }}
            >
              Try another email
            </button>

            <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '0.85rem', color: '#64748b' }}>
              Don't have an account?{' '}
              <Link to="/register" className="auth-link">
                Create Account
              </Link>
            </div>

            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <Link to="/login" className="auth-back-link">
                <ArrowLeft size={16} />
                <span>Return to Sign In</span>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendRecoveryEmail} className="auth-form" noValidate>
            <div className="auth-field-group">
              <label htmlFor="recovery-email" className="auth-label">
                Registered Email Address
              </label>
              <div className="auth-input-container">
                <span className="auth-input-icon">
                  <Mail size={18} />
                </span>
                <input
                  id="recovery-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Enter your registered email"
                  className="auth-input"
                  autoComplete="email"
                  disabled={loading}
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isConfigured}
              className="auth-btn-primary"
            >
              {loading ? 'Sending Recovery Email...' : 'Send Recovery Email'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '0.85rem', color: '#64748b' }}>
              Don't have an account?{' '}
              <Link to="/register" className="auth-link">
                Create Account
              </Link>
            </div>

            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <Link to="/login" className="auth-back-link">
                <ArrowLeft size={16} />
                <span>Return to Sign In</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

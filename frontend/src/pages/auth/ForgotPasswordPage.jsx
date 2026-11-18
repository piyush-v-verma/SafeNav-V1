import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Mail, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../../../shared/toast/ToastProvider';
import { getAuthErrorMessage } from '../../services/authErrors';
import './AuthPages.css';

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
      setError('Please enter your registered email address.');
      return;
    }

    setLoading(true);
    try {
      if (isConfigured) {
        await resetPassword(trimmedEmail);
      }
      setSubmittedEmail(trimmedEmail);
      setSubmitted(true);
      toast.success('Password recovery email sent.');
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
              <CheckCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
              <span>
                If an account exists for <strong>{submittedEmail}</strong>, a recovery email has been sent. Please click the link inside to set a new password.
              </span>
            </div>

            <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b', textAlign: 'center', lineHeight: 1.4 }}>
              Didn't receive the email? Check your spam folder or try requesting again.
            </p>

            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setError('');
              }}
              className="auth-btn-social"
              style={{ justifyContent: 'center' }}
            >
              Send to another email
            </button>

            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <Link to="/login" className="auth-back-link">
                <ArrowLeft size={16} />
                <span>Return to Sign In</span>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendRecoveryEmail} className="auth-form">
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
                  onChange={(e) => setEmail(e.target.value)}
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
              disabled={loading || !email.trim() || !isConfigured}
              className="auth-btn-primary"
            >
              {loading ? 'Sending Recovery Email...' : 'Send Recovery Email'}
            </button>

            <div style={{ textAlign: 'center', marginTop: '18px' }}>
              <Link to="/login" className="auth-back-link">
                <ArrowLeft size={16} />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mail, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { getAuthErrorMessage } from '../../services/authErrors';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../../../shared/toast/ToastProvider';
import './AuthPages.css';

export default function VerifyEmailPage() {
  const location = useLocation();
  const { session, loading, resendSignUpVerification, isConfigured } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);
  const params = new URLSearchParams(`${location.search}&${location.hash.replace(/^#/, '')}`);
  const callbackError = params.get('error') || params.get('error_code') || params.get('error_description');
  const verified = !loading && Boolean(session?.user) && !callbackError;

  const handleResend = async (event) => {
    event.preventDefault();
    if (!email.trim() || resending) return;
    setResending(true);
    try {
      await resendSignUpVerification(email.trim());
      toast.success('Verification email sent. Please check your inbox.');
    } catch (error) {
      const message = getAuthErrorMessage(error);
      toast.error(message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card">
        {/* Header Badge */}
        <div className="auth-header">
          <div
            className="auth-badge"
            style={{
              background: verified
                ? '#16a34a'
                : callbackError
                ? '#dc2626'
                : '#1a6cff',
            }}
          >
            {verified ? (
              <CheckCircle size={28} strokeWidth={2.4} />
            ) : callbackError ? (
              <AlertCircle size={28} strokeWidth={2.4} />
            ) : (
              <Mail size={28} strokeWidth={2.4} />
            )}
          </div>
          <h1 className="auth-title">
            {callbackError ? 'Verification Issue' : verified ? 'Email Verified!' : 'Check Your Email'}
          </h1>
          <p className="auth-subtitle">
            {callbackError
              ? getAuthErrorMessage({
                  code: params.get('error_code'),
                  message: params.get('error_description') || params.get('error'),
                })
              : verified
              ? 'Your email is verified and your SafeNav profile is active.'
              : 'We sent a verification link to your email address. Please click it to activate your account.'}
          </p>
        </div>

        {verified ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>
            <Link
              to="/"
              className="auth-btn-primary"
              style={{
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
              }}
            >
              Continue to SafeNav
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
            {isConfigured && (
              <form onSubmit={handleResend} className="auth-form">
                <div className="auth-field-group">
                  <label htmlFor="verification-email" className="auth-label">
                    Didn't receive the email? Resend link:
                  </label>
                  <div className="auth-input-container">
                    <span className="auth-input-icon">
                      <Mail size={18} />
                    </span>
                    <input
                      id="verification-email"
                      type="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="Enter your email address"
                      autoComplete="email"
                      className="auth-input"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={resending || !email.trim()}
                  className="auth-btn-primary"
                >
                  {resending ? 'Sending Email...' : 'Resend Verification Email'}
                </button>
              </form>
            )}

            <div style={{ textAlign: 'center', marginTop: '8px' }}>
              <Link to="/login" className="auth-back-link">
                <ArrowLeft size={16} />
                <span>Return to Sign In</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

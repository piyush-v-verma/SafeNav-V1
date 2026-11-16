import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getAuthErrorMessage, isEmailConfirmationError } from '../../services/authErrors';
import { useToast } from '../../../../shared/toast/ToastProvider';
import './AuthPages.css';

// SVG Google Icon matching official Google branding
function GoogleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [notice, setNotice] = useState(
    location.state?.registrationPending
      ? 'If your account was created, check your email for a verification link before signing in.'
      : ''
  );
  const [canResendVerification, setCanResendVerification] = useState(
    Boolean(location.state?.registrationPending)
  );

  const { signIn, signInWithGoogle, resendSignUpVerification, isConfigured } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    if (location.state?.from && !location.state?.registrationPending) {
      toast.info('Sign in to access that SafeNav page.', { dedupeKey: 'citizen-login-required' });
    }
  }, [location.state, toast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    setCanResendVerification(false);
    setLoading(true);

    try {
      const data = await signIn(email, password);
      if (!data?.session) {
        const message = 'Sign-in did not establish an active session. Try again.';
        setError(message);
        toast.error(message);
        return;
      }
      toast.success('You are signed in.');
      navigate(from, { replace: true });
    } catch (err) {
      const message = getAuthErrorMessage(err);
      setError(message);
      toast.error(message);
      if (isEmailConfirmationError(err)) setCanResendVerification(true);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim()) {
      setError('Enter your email address first.');
      return;
    }
    setError('');
    setNotice('');
    setResendLoading(true);
    try {
      await resendSignUpVerification(email);
      const message = 'If this account still needs verification, a new email has been sent. Check your inbox and spam folder.';
      setNotice(message);
      toast.success('Verification email sent.');
      setCanResendVerification(false);
    } catch (err) {
      const message = getAuthErrorMessage(err, 'signup');
      setError(message);
      toast.error(message);
    } finally {
      setResendLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      const message = getAuthErrorMessage(err);
      setError(message);
      toast.error(message);
      setGoogleLoading(false);
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
          <h1 className="auth-title">Welcome Back!</h1>
          <p className="auth-subtitle">Sign in to continue your safe journey.</p>
        </div>

        {!isConfigured && (
          <div className="auth-alert-notice">
            💡 <strong>Notice:</strong> Supabase credentials are not configured in <code>frontend/.env</code> yet.
          </div>
        )}

        {error && (
          <div className="auth-alert-error">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>{error}</span>
          </div>
        )}

        {notice && (
          <div className="auth-alert-success" role="status">
            <CheckCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>{notice}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Email Input */}
          <div className="auth-field-group">
            <label className="auth-label">Email</label>
            <div className="auth-input-container">
              <span className="auth-input-icon">
                <Mail />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setCanResendVerification(false);
                }}
                placeholder="Enter your email address"
                className="auth-input"
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="auth-field-group">
            <label className="auth-label">Password</label>
            <div className="auth-input-container">
              <span className="auth-input-icon">
                <Lock />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="auth-input"
                autoComplete="current-password"
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="auth-password-toggle"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Row: New here? Create Account & Forgot Password? */}
          <div className="auth-links-row">
            <span>
              New here?{' '}
              <Link to="/register" className="auth-link">
                Create Account
              </Link>
            </span>
            <Link to="/forgot-password" className="auth-link">
              Forgot Password?
            </Link>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="auth-btn-primary"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {canResendVerification && (
          <button
            type="button"
            onClick={handleResendVerification}
            disabled={resendLoading || !isConfigured}
            className="auth-btn-social"
            style={{ marginTop: '12px' }}
          >
            {resendLoading ? 'Sending...' : 'Resend verification email'}
          </button>
        )}

        {/* Divider */}
        <div className="auth-divider">
          <span>or continue with</span>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
          className="auth-btn-social"
        >
          <GoogleIcon size={18} />
          <span>{googleLoading ? 'Connecting...' : 'Continue with Google'}</span>
        </button>
      </div>
    </div>
  );
}

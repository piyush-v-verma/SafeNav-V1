import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import './AuthPages.css';

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const { sendPasswordResetOtp, verifyOtp, updatePassword, resetPassword, isConfigured } = useAuth();
  const navigate = useNavigate();

  // Step 1: Send OTP to Email or Phone
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!identifier.trim()) {
      setError('Please enter your email or phone number.');
      return;
    }

    setSendingOtp(true);
    try {
      if (isConfigured) {
        if (identifier.includes('@')) {
          await resetPassword(identifier.trim());
        } else if (sendPasswordResetOtp) {
          await sendPasswordResetOtp(identifier.trim());
        }
      }
      setOtpSent(true);
      setSuccessMsg('OTP code sent successfully! Check your inbox or SMS.');
    } catch (err) {
      // In dev mode with mock credentials or notice
      setError(err.message || 'Failed to send OTP. Please check your credentials.');
    } finally {
      setSendingOtp(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async () => {
    setError('');
    setSuccessMsg('');

    if (!otp.trim()) {
      setError('Please enter the OTP received.');
      return;
    }

    setVerifyingOtp(true);
    try {
      if (isConfigured && verifyOtp) {
        await verifyOtp(identifier.trim(), otp.trim());
      }
      setOtpVerified(true);
      setSuccessMsg('OTP verified successfully! Now choose your new password.');
    } catch (err) {
      // If mock/testing or Supabase verification error
      setError(err.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Step 3: Update Password
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!otpVerified && isConfigured) {
      setError('Please verify the OTP first before updating password.');
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setUpdatingPassword(true);
    try {
      if (isConfigured) {
        await updatePassword(newPassword);
      }
      setSuccessMsg('Password updated successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 1800);
    } catch (err) {
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setUpdatingPassword(false);
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
          <h1 className="auth-title">Change Password</h1>
          <p className="auth-subtitle">Verify your credentials to set a new password.</p>
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

        {successMsg && (
          <div className="auth-alert-success">
            <CheckCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="auth-form">
          {/* Field 1: Email or Phone Number */}
          <div className="auth-field-group">
            <div className="auth-input-container">
              <span className="auth-input-icon">
                <Mail />
              </span>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Email or Phone Number"
                className="auth-input"
                disabled={otpVerified}
              />
            </div>
          </div>

          {/* Send OTP Button */}
          <button
            type="button"
            onClick={handleSendOtp}
            disabled={sendingOtp || otpVerified || !identifier.trim()}
            className="auth-btn-primary"
            style={{ marginBottom: '6px' }}
          >
            {sendingOtp ? 'Sending OTP...' : otpSent ? 'Resend OTP' : 'Send OTP'}
          </button>

          {/* Field 2: Enter OTP with inline Verify button */}
          <div className="auth-field-group">
            <div className="auth-input-container">
              <span className="auth-input-icon">
                <Lock />
              </span>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter OTP"
                className="auth-input"
                disabled={otpVerified}
                style={{ letterSpacing: otp ? '0.15em' : 'normal' }}
              />
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={verifyingOtp || otpVerified || !otp.trim()}
                className={`auth-input-inline-btn ${otpVerified ? 'verified' : ''}`}
              >
                {verifyingOtp ? 'Verifying...' : otpVerified ? 'Verified ✓' : 'Verify'}
              </button>
            </div>
          </div>

          {/* Field 3: New Password */}
          <div className="auth-field-group">
            <div className="auth-input-container">
              <span className="auth-input-icon">
                <Lock />
              </span>
              <input
                type={showNewPassword ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New Password"
                className="auth-input"
                autoComplete="new-password"
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="auth-password-toggle"
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Field 4: Confirm New Password */}
          <div className="auth-field-group">
            <div className="auth-input-container">
              <span className="auth-input-icon">
                <Lock />
              </span>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm New Password"
                className="auth-input"
                autoComplete="new-password"
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="auth-password-toggle"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Field 5: Update Password Button */}
          <button
            type="submit"
            disabled={updatingPassword || (!otpVerified && isConfigured)}
            className="auth-btn-primary"
            style={{ marginTop: '4px' }}
          >
            {updatingPassword ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>

        {/* Footer: ← Back to Login */}
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <Link to="/login" className="auth-back-link">
            <ArrowLeft size={16} />
            <span>Back to Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft, KeyRound } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../../../shared/toast/ToastProvider';
import './AuthPages.css';

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Progressive steps: 1 = send code, 2 = verify code, 3 = set new password
  const [step, setStep] = useState(1);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const { sendPasswordResetOtp, verifyOtp, updatePassword, resetPassword, isConfigured } = useAuth();
  const toast = useToast();
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
      setStep(2);
      setSuccessMsg('Verification code sent! Please check your inbox or phone.');
      toast.success('Verification code sent.');
    } catch (err) {
      setError(err.message || 'Failed to send verification code. Please check your details.');
      toast.error('Could not send a verification code. Please try again.');
    } finally {
      setSendingOtp(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!otp.trim()) {
      setError('Please enter the verification code.');
      return;
    }

    setVerifyingOtp(true);
    try {
      if (isConfigured && verifyOtp) {
        await verifyOtp(identifier.trim(), otp.trim());
      }
      setStep(3);
      setSuccessMsg('Code verified! Enter your new password below.');
      toast.success('Verification code accepted.');
    } catch (err) {
      setError(err.message || 'Invalid or expired code. Please try again.');
      toast.error('That verification code is invalid or expired.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Step 3: Update Password
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

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
      setSuccessMsg('Password updated successfully! Redirecting to sign in...');
      toast.success('Password updated successfully.');
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to update password. Please try again.');
      toast.error('Could not update the password. Please try again.');
    } finally {
      setUpdatingPassword(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card">
        {/* Header Badge */}
        <div className="auth-header">
          <div className="auth-badge">
            {step === 3 ? <KeyRound size={28} strokeWidth={2.4} /> : <Shield size={28} strokeWidth={2.4} />}
          </div>
          <h1 className="auth-title">
            {step === 1 && 'Reset Password'}
            {step === 2 && 'Enter Code'}
            {step === 3 && 'New Password'}
          </h1>
          <p className="auth-subtitle">
            {step === 1 && 'Enter your email or phone to receive a reset code.'}
            {step === 2 && `Enter the code sent to ${identifier}`}
            {step === 3 && 'Choose a strong new password for your account.'}
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

        {successMsg && (
          <div className="auth-alert-success" role="status">
            <CheckCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* STEP 1: Request Code */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className="auth-form">
            <div className="auth-field-group">
              <label className="auth-label">Email or Phone Number</label>
              <div className="auth-input-container">
                <span className="auth-input-icon">
                  <Mail size={18} />
                </span>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="name@example.com or mobile"
                  className="auth-input"
                  autoComplete="username"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={sendingOtp || !identifier.trim()}
              className="auth-btn-primary"
            >
              {sendingOtp ? 'Sending Code...' : 'Send Verification Code'}
            </button>
          </form>
        )}

        {/* STEP 2: Verify Code */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="auth-form">
            <div className="auth-field-group">
              <label className="auth-label">6-Digit Verification Code</label>
              <div className="auth-input-container">
                <span className="auth-input-icon">
                  <Lock size={18} />
                </span>
                <input
                  type="text"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit code"
                  className="auth-input"
                  style={{ letterSpacing: '0.15em', fontWeight: 600 }}
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={verifyingOtp || !otp.trim()}
              className="auth-btn-primary"
            >
              {verifyingOtp ? 'Verifying Code...' : 'Verify Code'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '0.85rem' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="auth-link"
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              >
                Change identifier
              </button>
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={sendingOtp}
                className="auth-link"
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              >
                Resend code
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Set New Password */}
        {step === 3 && (
          <form onSubmit={handleUpdatePassword} className="auth-form">
            <div className="auth-field-group">
              <label className="auth-label">New Password</label>
              <div className="auth-input-container">
                <span className="auth-input-icon">
                  <Lock size={18} />
                </span>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
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

            <div className="auth-field-group">
              <label className="auth-label">Confirm New Password</label>
              <div className="auth-input-container">
                <span className="auth-input-icon">
                  <Lock size={18} />
                </span>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
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

            <button
              type="submit"
              disabled={updatingPassword}
              className="auth-btn-primary"
            >
              {updatingPassword ? 'Updating Password...' : 'Save New Password'}
            </button>
          </form>
        )}

        {/* Back Link */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <Link to="/login" className="auth-back-link">
            <ArrowLeft size={16} />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

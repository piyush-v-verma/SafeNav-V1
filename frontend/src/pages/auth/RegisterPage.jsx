import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, User, Mail, Phone, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getAuthErrorMessage } from '../../services/authErrors';
import { useToast } from '../../../../shared/toast/ToastProvider';
import './AuthPages.css';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signUp, isConfigured } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!fullName.trim() || !email.trim()) {
      setError('Enter your full name and email address.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (!agreeTerms) {
      setError('Please agree to the Terms and Conditions.');
      return;
    }

    setLoading(true);

    try {
      const data = await signUp(email, password, {
        fullName: fullName.trim(),
        mobileNumber: phoneNumber.trim(),
      });

      if (data?.session) {
        toast.success('Your SafeNav account is ready.');
        navigate('/', { replace: true });
      } else {
        toast.info('Check your email for a verification link before signing in.');
        navigate('/login', {
          replace: true,
          state: { registrationPending: true, email: email.trim() },
        });
      }
    } catch (err) {
      const message = getAuthErrorMessage(err, 'signup');
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
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Join us for safer journeys</p>
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

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Full Name */}
          <div className="auth-field-group">
            <label className="auth-label">Full Name</label>
            <div className="auth-input-container">
              <span className="auth-input-icon">
                <User />
              </span>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="auth-input"
                autoComplete="name"
              />
            </div>
          </div>

          {/* Email Address */}
          <div className="auth-field-group">
            <label className="auth-label">Email Address</label>
            <div className="auth-input-container">
              <span className="auth-input-icon">
                <Mail />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="auth-input"
                autoComplete="email"
              />
            </div>
          </div>

          {/* Phone Number */}
          <div className="auth-field-group">
            <label className="auth-label">Phone Number</label>
            <div className="auth-input-container">
              <span className="auth-input-icon">
                <Phone />
              </span>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter your phone number"
                className="auth-input"
                autoComplete="tel"
              />
            </div>
          </div>

          {/* Password */}
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
                placeholder="Create a strong password"
                className="auth-input"
                autoComplete="new-password"
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

          {/* Confirm Password */}
          <div className="auth-field-group">
            <label className="auth-label">Confirm Password</label>
            <div className="auth-input-container">
              <span className="auth-input-icon">
                <Lock />
              </span>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
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

          {/* Terms and Conditions Checkbox */}
          <label className="auth-checkbox-row">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className="auth-checkbox"
            />
            <span>
              I agree to the{' '}
              <Link to="/terms" className="auth-link">
                Terms and Conditions
              </Link>
            </span>
          </label>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="auth-btn-primary"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        {/* Footer Link */}
        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">
            Log in here
          </Link>
        </div>
      </div>
    </div>
  );
}

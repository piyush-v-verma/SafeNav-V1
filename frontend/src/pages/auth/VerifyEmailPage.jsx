import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
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
      await resendSignUpVerification(email);
      toast.success('Verification email sent. Check your inbox.');
    } catch (error) {
      const message = getAuthErrorMessage(error);
      toast.error(message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: '440px',
      background: '#1e293b',
      border: '1px solid #334155',
      borderRadius: '12px',
      padding: '36px 28px',
      textAlign: 'center',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)'
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        background: 'rgba(56, 189, 248, 0.1)',
        color: '#38bdf8',
        fontSize: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 20px'
      }}>
        ✉️
      </div>

      <h1 style={{ margin: '0 0 10px', fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc' }}>
        {callbackError ? 'Verification Link Issue' : verified ? 'Email Verified' : 'Check Your Email'}
      </h1>
      <p style={{ margin: '0 0 24px', fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.5 }}>
        {callbackError
          ? getAuthErrorMessage({ code: params.get('error_code'), message: params.get('error_description') || params.get('error') })
          : verified
            ? 'Your email is verified and you are signed in. Continue to SafeNav navigation.'
            : 'We have sent an account verification link to your email address. Please click the link inside to activate your SafeNav citizen profile.'}
      </p>

      {verified ? (
        <Link to="/" className="auth-link">Continue to SafeNav</Link>
      ) : (
        <>
          {isConfigured && <form onSubmit={handleResend} style={{ display: 'grid', gap: 10, marginBottom: 18, textAlign: 'left' }}>
            <label htmlFor="verification-email" style={{ color: '#cbd5e1', fontSize: '0.85rem' }}>Resend verification email</label>
            <input id="verification-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" autoComplete="email" style={{ minHeight: 44, boxSizing: 'border-box', padding: '10px 12px', borderRadius: 6, border: '1px solid #475569', background: '#0f172a', color: '#f8fafc' }} />
            <button type="submit" disabled={resending} style={{ minHeight: 44, border: '1px solid #475569', borderRadius: 6, background: '#334155', color: '#f8fafc', fontWeight: 600, cursor: resending ? 'wait' : 'pointer' }}>{resending ? 'Sending…' : 'Resend Verification Email'}</button>
          </form>}
          <Link to="/login" className="auth-link">Continue to Login</Link>
        </>
      )}
    </div>
  );
}

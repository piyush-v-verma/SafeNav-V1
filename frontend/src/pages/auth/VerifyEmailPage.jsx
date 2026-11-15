import React from 'react';
import { Link } from 'react-router-dom';

export default function VerifyEmailPage() {
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
        Check Your Email
      </h1>
      <p style={{ margin: '0 0 24px', fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.5 }}>
        We have sent an account verification link to your email address. Please click the link inside to activate your SafeNav citizen profile.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <Link
          to="/login"
          style={{
            padding: '12px',
            background: '#2563eb',
            color: '#ffffff',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '0.9rem',
            fontWeight: 600
          }}
        >
          Proceed to Sign In
        </Link>
        <Link
          to="/"
          style={{
            padding: '10px',
            color: '#94a3b8',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '0.85rem'
          }}
        >
          Return to Navigation Map
        </Link>
      </div>
    </div>
  );
}

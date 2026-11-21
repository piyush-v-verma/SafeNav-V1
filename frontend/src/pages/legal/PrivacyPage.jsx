import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Lock, ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div
      style={{
        maxWidth: '740px',
        width: '100%',
        background: '#ffffff',
        border: '1px solid rgba(226, 232, 240, 0.9)',
        borderRadius: '24px',
        padding: '36px 32px',
        color: '#0f172a',
        boxShadow: '0 20px 45px -10px rgba(27, 85, 226, 0.08), 0 2px 10px rgba(0, 0, 0, 0.02)',
        boxSizing: 'border-box',
        lineHeight: 1.6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
        <div
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #1a6cff 0%, #0052cc 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(26, 108, 255, 0.3)',
            flexShrink: 0,
          }}
        >
          <Lock size={22} strokeWidth={2.2} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#0f172a' }}>
            Privacy Policy
          </h1>
          <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
            SafeNav Nagpur Data Protection • Last updated November 2026
          </p>
        </div>
      </div>

      <div style={{ fontSize: '0.92rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <p>
          SafeNav respects and protects your personal privacy. This policy outlines how your account identity and real-time location data are collected, processed, and safeguarded.
        </p>

        <div>
          <h3 style={{ color: '#0f172a', margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 600 }}>
            1. Information We Collect
          </h3>
          <p style={{ margin: 0 }}>
            We collect your account email, display name, optional mobile number for account recovery, and citizen hazard reports you voluntarily contribute to the community road network.
          </p>
        </div>

        <div>
          <h3 style={{ color: '#0f172a', margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 600 }}>
            2. GPS Location & Snapping
          </h3>
          <p style={{ margin: 0 }}>
            GPS location coordinates are processed strictly in real-time on your device and via secure APIs to compute turn-by-turn navigation paths and metric road snapping. We never monetize, sell, or advertise against your movement history.
          </p>
        </div>

        <div>
          <h3 style={{ color: '#0f172a', margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 600 }}>
            3. Account & Authentication Security
          </h3>
          <p style={{ margin: 0 }}>
            Citizen authentication sessions are secured via Supabase Auth with Row Level Security (RLS) enforcement. Passwords are cryptographically hashed and never stored in plaintext.
          </p>
        </div>
      </div>

      <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: '#1a6cff',
            textDecoration: 'none',
            fontSize: '0.88rem',
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={16} />
          <span>Return to SafeNav Map</span>
        </Link>

        <Link
          to="/terms"
          style={{
            color: '#64748b',
            textDecoration: 'none',
            fontSize: '0.88rem',
          }}
        >
          View Terms of Service →
        </Link>
      </div>
    </div>
  );
}

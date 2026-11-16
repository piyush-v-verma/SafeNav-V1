import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, FileText, ArrowLeft, AlertTriangle } from 'lucide-react';

export default function TermsPage() {
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
          <FileText size={22} strokeWidth={2.2} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#0f172a' }}>
            Terms of Service
          </h1>
          <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
            SafeNav Nagpur Community Standards • Last updated November 2026
          </p>
        </div>
      </div>

      <div style={{ fontSize: '0.92rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <p>
          Welcome to <strong>SafeNav Nagpur</strong>. By accessing our platform, registering an account, or submitting hazard reports, you agree to comply with and be bound by the following Terms of Service.
        </p>

        <div>
          <h3 style={{ color: '#0f172a', margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 600 }}>
            1. Platform Purpose & Scope
          </h3>
          <p style={{ margin: 0 }}>
            SafeNav provides community-driven road hazard reporting, safety-aware navigation, and urban infrastructure monitoring for Nagpur, Maharashtra. Navigation guidance and hazard data are aggregated to assist drivers, riders, and pedestrians.
          </p>
        </div>

        <div>
          <h3 style={{ color: '#0f172a', margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 600 }}>
            2. Citizen Responsibilities
          </h3>
          <p style={{ margin: 0 }}>
            You agree to submit truthful, accurate road observations and not submit malicious, abusive, duplicate, or fraudulent hazard reports. SafeNav administrators review community reports to safeguard road safety data integrity. Violations may result in account suspension.
          </p>
        </div>

        {/* Road Safety Callout */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #1a6cff',
            borderRadius: '12px',
            padding: '16px 18px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
          }}
        >
          <AlertTriangle size={20} color="#1a6cff" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ margin: '0 0 4px', fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>
              3. Road Safety Disclaimer
            </h4>
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569', lineHeight: 1.5 }}>
              Always prioritize actual physical driving conditions, road signs, traffic signals, and personal safety above digital navigation suggestions. SafeNav does not substitute for alert, attentive driving.
            </p>
          </div>
        </div>

        <div>
          <h3 style={{ color: '#0f172a', margin: '0 0 6px', fontSize: '1.05rem', fontWeight: 600 }}>
            4. Privacy & Data Handling
          </h3>
          <p style={{ margin: 0 }}>
            Your account credentials, authentication tokens, and user profile are safeguarded using industry-standard encryption. GPS location tracking operates solely on-demand during active navigation and hazard verification.
          </p>
        </div>
      </div>

      <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <Link
          to="/register"
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
          <span>Back to Registration</span>
        </Link>

        <Link
          to="/privacy"
          style={{
            color: '#64748b',
            textDecoration: 'none',
            fontSize: '0.88rem',
          }}
        >
          View Privacy Policy →
        </Link>
      </div>
    </div>
  );
}

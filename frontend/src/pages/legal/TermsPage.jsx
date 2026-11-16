import React from 'react';

export default function TermsPage() {
  return (
    <div style={{ maxWidth: '720px', width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '32px', color: '#f8fafc', lineHeight: 1.6 }}>
      <h1 style={{ margin: '0 0 16px', fontSize: '1.5rem', fontWeight: 700 }}>Terms of Service</h1>
      <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Last updated: November 2026</p>
      <div style={{ fontSize: '0.9rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
        <p>Welcome to SafeNav Nagpur. By registering or using our platform, you agree to these Terms of Service.</p>
        <h3 style={{ color: '#f8fafc', margin: '8px 0 0' }}>1. Platform Purpose</h3>
        <p>SafeNav provides community-driven road hazard reporting, safety-aware navigation, and urban infrastructure monitoring for Nagpur, Maharashtra.</p>
        <h3 style={{ color: '#f8fafc', margin: '8px 0 0' }}>2. User Responsibilities</h3>
        <p>You agree to submit truthful, accurate road observations and not submit malicious, abusive, or fake hazard reports. Accounts violating community guidelines may be suspended.</p>
        <h3 style={{ color: '#f8fafc', margin: '8px 0 0' }}>3. Road Safety Disclaimer</h3>
        <p>Always prioritize actual driving conditions, traffic laws, and personal safety over digital navigation recommendations.</p>
      </div>
    </div>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: '720px', width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '32px', color: '#f8fafc', lineHeight: 1.6 }}>
      <h1 style={{ margin: '0 0 16px', fontSize: '1.5rem', fontWeight: 700 }}>Privacy Policy</h1>
      <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Last updated: November 2026</p>
      <div style={{ fontSize: '0.9rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
        <p>SafeNav respects your personal privacy. This policy outlines how your identity and location data are handled.</p>
        <h3 style={{ color: '#f8fafc', margin: '8px 0 0' }}>1. Information We Collect</h3>
        <p>We collect your account email, display name, optional contact number, and hazard reports you choose to share with the community.</p>
        <h3 style={{ color: '#f8fafc', margin: '8px 0 0' }}>2. GPS Location Data</h3>
        <p>GPS locations are used strictly in real-time to compute navigation routes and display road snapping on your device. We do not sell or monetize personal movement logs.</p>
        <h3 style={{ color: '#f8fafc', margin: '8px 0 0' }}>3. Data Protection</h3>
        <p>Authentication credentials and passwords are encrypted and managed securely via Supabase Auth with Row Level Security (RLS) enforcement.</p>
      </div>
      <div style={{ marginTop: '28px' }}>
        <Link to="/" style={{ color: '#38bdf8', textDecoration: 'none', fontSize: '0.9rem' }}>← Return to Map</Link>
      </div>
    </div>
  );
}

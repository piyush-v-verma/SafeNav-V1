import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, MapPin, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function AboutPage() {
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
          <Shield size={24} strokeWidth={2.4} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#0f172a' }}>
            About SafeNav Nagpur
          </h1>
          <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
            Community-Driven, AI-Assisted Navigation System
          </p>
        </div>
      </div>

      <div style={{ fontSize: '0.92rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <p>
          <strong>SafeNav</strong> is an intelligent urban mobility and community road safety platform purpose-built for the road infrastructure of Nagpur, Maharashtra.
        </p>

        <p>
          By combining high-fidelity OpenStreetMap network modeling, metric spatial projection, real-time citizen hazard reporting, and administrative verification, SafeNav empowers commuters to navigate with confidence.
        </p>

        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '20px',
          }}
        >
          <h4 style={{ margin: '0 0 12px', color: '#0f172a', fontSize: '0.95rem', fontWeight: 600 }}>
            Core Platform Capabilities:
          </h4>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', color: '#334155' }}>
              <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0 }} />
              <span><strong>Metric GPS-to-Road Snapping:</strong> Accurate projection with dotted access lines to road centerlines.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', color: '#334155' }}>
              <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0 }} />
              <span><strong>Multi-Modal Routing:</strong> Tailored paths for Cars, Two-Wheelers, and Pedestrians with fastest and shortest profiles.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', color: '#334155' }}>
              <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0 }} />
              <span><strong>AI Hazard Reporting:</strong> Instant photographic evidence reporting for potholes, accidents, and road obstacles.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', color: '#334155' }}>
              <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0 }} />
              <span><strong>Administrative Verification Pipeline:</strong> Real-time review and resolution tracking for city engineers.</span>
            </li>
          </ul>
        </div>
      </div>

      <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
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
      </div>
    </div>
  );
}

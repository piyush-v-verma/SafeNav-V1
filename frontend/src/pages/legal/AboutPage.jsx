import React from 'react';
import { Link } from 'react-router-dom';

export default function AboutPage() {
  return (
    <div style={{ maxWidth: '720px', width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '32px', color: '#f8fafc', lineHeight: 1.6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <span style={{ fontSize: '32px' }}>🛡️</span>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>About SafeNav Nagpur</h1>
          <p style={{ margin: 0, color: '#38bdf8', fontSize: '0.85rem' }}>AI-Assisted, Community-Driven Road Navigation</p>
        </div>
      </div>
      <div style={{ fontSize: '0.9rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '20px' }}>
        <p>
          SafeNav is an intelligent urban mobility and safety platform designed specifically for the road network of Nagpur, Maharashtra.
        </p>
        <p>
          By combining high-fidelity OpenStreetMap road graph modeling, metric spatial projection, community hazard reporting, and administrative verification, SafeNav empowers commuters to navigate with confidence.
        </p>
        <div style={{ background: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #334155', marginTop: '10px' }}>
          <h4 style={{ margin: '0 0 8px', color: '#f8fafc' }}>Key Capabilities:</h4>
          <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <li>Metric GPS-to-Road snapping with dotted access lines</li>
            <li>Tilted 2.5D immersive navigation perspective with flat 2D building footprints</li>
            <li>Dynamic OSM road and landmark annotations along active routes</li>
            <li>Citizen hazard reporting and administrative verification pipeline</li>
          </ul>
        </div>
      </div>
      <div style={{ marginTop: '28px' }}>
        <Link to="/" style={{ color: '#38bdf8', textDecoration: 'none', fontSize: '0.9rem' }}>← Return to Map</Link>
      </div>
    </div>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function MyReportsPage() {
  const { user } = useAuth();

  return (
    <div style={{
      maxWidth: '800px',
      margin: '40px auto',
      padding: '0 20px',
      color: '#f8fafc'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: '0 0 6px', fontSize: '1.4rem', fontWeight: 700 }}>
            My Road Hazard Reports
          </h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8' }}>
            Reports submitted from your citizen account in Nagpur
          </p>
        </div>
        <Link
          to="/"
          style={{
            padding: '8px 16px',
            background: '#2563eb',
            color: '#ffffff',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '0.85rem',
            fontWeight: 500
          }}
        >
          📍 Open Navigation Map
        </Link>
      </div>

      <div style={{
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '12px',
        padding: '48px 24px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'rgba(56, 189, 248, 0.1)',
          color: '#38bdf8',
          fontSize: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          🚧
        </div>
        <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 600 }}>
          No Road Reports Yet
        </h3>
        <p style={{ margin: '0 auto 24px', maxWidth: '420px', fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.5 }}>
          When you encounter potholes, waterlogging, or hazardous road conditions during your journey, reports submitted will appear here for tracking and administrative verification.
        </p>
        <Link
          to="/"
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            background: '#334155',
            color: '#f8fafc',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '0.9rem'
          }}
        >
          Explore Nagpur Map
        </Link>
      </div>
    </div>
  );
}

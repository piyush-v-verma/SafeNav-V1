import React, { useState, useEffect } from 'react';

const MIN_DESKTOP_WIDTH = 1024;

export default function DesktopGuard({ children }) {
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= MIN_DESKTOP_WIDTH : true
  );

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= MIN_DESKTOP_WIDTH);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isDesktop) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0b1120',
        padding: '24px',
        color: '#f8fafc',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{
          maxWidth: '520px',
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '16px',
          padding: '36px 28px',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(56, 189, 248, 0.12)',
            color: '#38bdf8',
            fontSize: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            🖥️
          </div>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#38bdf8',
            background: 'rgba(56, 189, 248, 0.1)',
            padding: '4px 10px',
            borderRadius: '20px',
            display: 'inline-block',
            marginBottom: '12px'
          }}>
            Desktop Only Environment
          </span>
          <h2 style={{ margin: '0 0 12px', fontSize: '1.35rem', fontWeight: 700, color: '#f8fafc' }}>
            SafeNav Administration Console
          </h2>
          <p style={{ margin: '0 0 20px', fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.6 }}>
            The administrative interface requires a desktop display with a minimum width of <strong>1024 pixels</strong>.
            This restriction ensures secure, high-density verification of spatial road networks, citizen hazard reports, and telemetry.
          </p>
          <div style={{
            padding: '12px',
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '8px',
            fontSize: '0.8rem',
            color: '#64748b'
          }}>
            Current screen width: <span style={{ color: '#ef4444', fontWeight: 600 }}>{window.innerWidth}px</span> / Required: 1024px+
          </div>
        </div>
      </div>
    );
  }

  return children;
}

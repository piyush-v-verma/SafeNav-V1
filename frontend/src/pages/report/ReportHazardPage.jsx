import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, MapPin, CheckCircle2, ArrowLeft, Send } from 'lucide-react';

const HAZARD_TYPES = [
  { id: 'pothole', label: 'Pothole / Damage', emoji: '🕳️' },
  { id: 'waterlogging', label: 'Waterlogging', emoji: '🌊' },
  { id: 'construction', label: 'Road Work', emoji: '🚧' },
  { id: 'accident', label: 'Accident / Debris', emoji: '⚠️' },
  { id: 'streetlight', label: 'Dark / No Lights', emoji: '💡' },
];

const SEVERITIES = [
  { id: 'minor', label: 'Minor', color: '#22c55e' },
  { id: 'moderate', label: 'Moderate', color: '#f59e0b' },
  { id: 'critical', label: 'Critical / Dangerous', color: '#ef4444' },
];

export default function ReportHazardPage() {
  const [selectedType, setSelectedType] = useState('pothole');
  const [severity, setSeverity] = useState('moderate');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('Current GPS Location (Nagpur)');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  return (
    <div style={{
      flex: 1,
      height: '100%',
      overflowY: 'auto',
      background: 'radial-gradient(ellipse at top, #1e293b 0%, #0b1120 100%)',
      color: '#f8fafc',
      padding: '32px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      boxSizing: 'border-box'
    }}>
      <div style={{ width: '100%', maxWidth: '580px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🚧</span>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc' }}>
                Report Road Hazard
              </h1>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Community Safety Watch — Nagpur
              </span>
            </div>
          </div>
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#38bdf8',
              fontSize: '0.85rem',
              fontWeight: 500,
              textDecoration: 'none'
            }}
          >
            <ArrowLeft size={16} /> Map
          </Link>
        </div>

        {submitted ? (
          <div style={{
            background: '#0f172a',
            border: '1px solid #22c55e',
            borderRadius: '16px',
            padding: '36px 24px',
            textAlign: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(34, 197, 94, 0.15)',
              color: '#4ade80',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <CheckCircle2 size={36} />
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: '1.3rem', fontWeight: 700, color: '#f8fafc' }}>
              Report Submitted!
            </h2>
            <p style={{ margin: '0 0 24px', fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.5 }}>
              Thank you for keeping Nagpur's roads safe. Your hazard report has been logged and sent to administration for verification and route warning inclusion.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => { setSubmitted(false); setDescription(''); }}
                style={{
                  padding: '10px 18px',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  color: '#f8fafc',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Report Another
              </button>
              <Link
                to="/"
                style={{
                  padding: '10px 18px',
                  background: '#2563eb',
                  color: '#ffffff',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  textDecoration: 'none'
                }}
              >
                Return to Live Map
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '16px',
            padding: '28px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            {/* Category Grid */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '10px' }}>
                Select Hazard Type
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                {HAZARD_TYPES.map((type) => {
                  const isSelected = selectedType === type.id;
                  return (
                    <button
                      type="button"
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      style={{
                        minHeight: '48px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: isSelected ? '1px solid #38bdf8' : '1px solid #1e293b',
                        background: isSelected ? 'rgba(56, 189, 248, 0.12)' : '#0b1120',
                        color: isSelected ? '#38bdf8' : '#cbd5e1',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: isSelected ? 600 : 500,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span style={{ fontSize: '18px' }}>{type.emoji}</span>
                      <span>{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Severity Level */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px' }}>
                Severity
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {SEVERITIES.map((sev) => {
                  const isSelected = severity === sev.id;
                  return (
                    <button
                      type="button"
                      key={sev.id}
                      onClick={() => setSeverity(sev.id)}
                      style={{
                        flex: 1,
                        minHeight: '44px',
                        padding: '8px',
                        borderRadius: '8px',
                        border: isSelected ? `1px solid ${sev.color}` : '1px solid #1e293b',
                        background: isSelected ? `${sev.color}18` : '#0b1120',
                        color: isSelected ? sev.color : '#94a3b8',
                        fontSize: '0.85rem',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer'
                      }}
                    >
                      {sev.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Location Display */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                Incident Location
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                background: '#0b1120',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                fontSize: '0.85rem',
                color: '#f8fafc'
              }}>
                <MapPin size={18} color="#38bdf8" />
                <span>{locationName}</span>
              </div>
            </div>

            {/* Optional Description */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                Additional Details (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Deep pothole in left lane after flyover..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: '#0b1120',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '0.85rem',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px',
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                minHeight: '48px'
              }}
            >
              <Send size={18} />
              {loading ? 'Submitting...' : 'Submit Road Report'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

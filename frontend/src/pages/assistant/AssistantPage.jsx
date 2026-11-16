import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mic, MicOff, Volume2, ShieldCheck, MapPin, AlertTriangle, ArrowLeft } from 'lucide-react';

export default function AssistantPage() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceGuidance, setVoiceGuidance] = useState(true);
  const [hazardAlerts, setHazardAlerts] = useState(true);

  const handleToggleListening = () => {
    if (!isListening) {
      setIsListening(true);
      setTranscript('Listening for command in Nagpur...');
      setTimeout(() => {
        setTranscript('Voice Assistant active. Say "Navigate to..." or "Check road conditions".');
      }, 1500);
    } else {
      setIsListening(false);
      setTranscript('');
    }
  };

  const handleCommandClick = (cmd) => {
    setIsListening(true);
    setTranscript(`"${cmd}"`);
    setTimeout(() => {
      setTranscript(`Processing: "${cmd}" — Route analysis active.`);
    }, 800);
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
            <span style={{ fontSize: '24px' }}>🎙️</span>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc' }}>
                SafeNav Assistant
              </h1>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Hands-Free Nagpur Voice Guidance
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

        {/* Central Voice Action Card */}
        <div style={{
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '16px',
          padding: '36px 24px',
          textAlign: 'center',
          boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          marginBottom: '24px',
          position: 'relative'
        }}>
          {/* Pulsing Mic Circle */}
          <button
            onClick={handleToggleListening}
            style={{
              width: '88px',
              height: '88px',
              borderRadius: '50%',
              background: isListening
                ? 'linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)'
                : '#1e293b',
              border: `3px solid ${isListening ? '#38bdf8' : '#334155'}`,
              color: isListening ? '#ffffff' : '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: isListening
                ? '0 0 24px rgba(56, 189, 248, 0.6), 0 0 48px rgba(56, 189, 248, 0.25)'
                : '0 4px 12px rgba(0,0,0,0.3)',
              transform: isListening ? 'scale(1.05)' : 'scale(1)'
            }}
            title={isListening ? 'Stop listening' : 'Start voice assistance'}
          >
            {isListening ? <Mic size={36} strokeWidth={2.5} /> : <Mic size={36} strokeWidth={2} />}
          </button>

          <h2 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 600, color: isListening ? '#38bdf8' : '#f8fafc' }}>
            {isListening ? 'Listening...' : 'Tap Microphone to Speak'}
          </h2>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8', minHeight: '22px' }}>
            {transcript || 'Say a destination, ask about potholes, or report an incident.'}
          </p>
        </div>

        {/* Quick Driver Voice Commands */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '0.9rem', fontWeight: 600, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Suggested Voice Commands
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
            {[
              { text: 'Navigate to Nagpur Railway Station', icon: <MapPin size={16} /> },
              { text: 'Are there potholes on Wardha Road?', icon: <AlertTriangle size={16} /> },
              { text: 'Find nearest petrol pump in Sitabuldi', icon: <MapPin size={16} /> },
              { text: 'Report road work ahead on Central Avenue', icon: <AlertTriangle size={16} /> },
            ].map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleCommandClick(item.text)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  background: '#0f172a',
                  border: '1px solid #1e293b',
                  borderRadius: '10px',
                  color: '#cbd5e1',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{ color: '#38bdf8' }}>{item.icon}</span>
                <span>"{item.text}"</span>
              </button>
            ))}
          </div>
        </div>

        {/* Audio Guidance Preferences */}
        <div style={{
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Volume2 size={18} color="#38bdf8" />
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Turn-by-Turn Voice Navigation</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Spoken road announcements during active route</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={voiceGuidance}
              onChange={(e) => setVoiceGuidance(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#38bdf8' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #1e293b', paddingTop: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={18} color="#22c55e" />
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Hazard Proximity Alerts</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Audio chimes when approaching verified road hazards</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={hazardAlerts}
              onChange={(e) => setHazardAlerts(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#38bdf8' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

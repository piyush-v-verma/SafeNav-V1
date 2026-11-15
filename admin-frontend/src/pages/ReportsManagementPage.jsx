import React from 'react';

export default function ReportsManagementPage() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ margin: '0 0 6px', fontSize: '1.6rem', fontWeight: 700, color: '#f8fafc' }}>
            Road Hazard Reports Queue
          </h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8' }}>
            Citizen-submitted potholes, waterlogging, and safety hazards across Nagpur
          </p>
        </div>
      </div>

      <div style={{
        background: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
      }}>
        {/* Table Filters Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          gap: '12px',
          alignItems: 'center'
        }}>
          <input
            type="text"
            placeholder="Search reports by location, road name or report ID..."
            disabled
            style={{
              flex: 1,
              padding: '8px 12px',
              background: '#0b1120',
              border: '1px solid #334155',
              borderRadius: '6px',
              color: '#f8fafc',
              fontSize: '0.85rem'
            }}
          />
          <select disabled style={{ padding: '8px 12px', background: '#0b1120', border: '1px solid #334155', borderRadius: '6px', color: '#94a3b8', fontSize: '0.85rem' }}>
            <option>All Hazards (Potholes, Waterlogging)</option>
          </select>
          <select disabled style={{ padding: '8px 12px', background: '#0b1120', border: '1px solid #334155', borderRadius: '6px', color: '#94a3b8', fontSize: '0.85rem' }}>
            <option>Status: All</option>
          </select>
        </div>

        {/* Empty State / Table */}
        <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🚧</div>
          <h3 style={{ margin: '0 0 6px', fontSize: '1.1rem', color: '#f8fafc' }}>
            Hazard Reporting Pipeline Ready
          </h3>
          <p style={{ margin: '0 auto', maxWidth: '440px', fontSize: '0.875rem', lineHeight: 1.5 }}>
            Citizen road hazard submissions will populate this queue for administrative verification and edge matching in the upcoming hazard intake phase.
          </p>
        </div>
      </div>
    </div>
  );
}

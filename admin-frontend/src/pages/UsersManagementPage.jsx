import React, { useEffect, useState } from 'react';
import { fetchUsersList, updateUserAccountStatus } from '../services/adminApi';

export default function UsersManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const loadUsers = () => {
    setLoading(true);
    fetchUsersList(100, 0)
      .then((res) => {
        setUsers(res.data || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleStatus = async (user) => {
    const nextStatus = user.account_status === 'active' ? 'suspended' : 'active';
    const confirmMsg = `Are you sure you want to change ${user.full_name || 'this user'}'s status to '${nextStatus}'?`;
    if (!window.confirm(confirmMsg)) return;

    setActionLoading(user.id);
    try {
      await updateUserAccountStatus(user.id, nextStatus);
      // Update local state
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, account_status: nextStatus } : u))
      );
    } catch (err) {
      alert(`Error updating user status: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ margin: '0 0 6px', fontSize: '1.6rem', fontWeight: 700, color: '#f8fafc' }}>
            Citizen User Accounts
          </h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8' }}>
            Manage registered citizen access, verification, and active account status
          </p>
        </div>
        <button
          onClick={loadUsers}
          style={{
            padding: '8px 16px',
            background: '#1e293b',
            border: '1px solid #334155',
            color: '#f8fafc',
            borderRadius: '6px',
            fontSize: '0.85rem',
            cursor: 'pointer'
          }}
        >
          🔄 Refresh Accounts
        </button>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          color: '#f87171',
          fontSize: '0.875rem'
        }}>
          {error}
        </div>
      )}

      <div style={{
        background: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
      }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            Loading citizen accounts...
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            No citizen accounts registered yet in Supabase.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#090d16', borderBottom: '1px solid #1e293b', color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '14px 20px' }}>Citizen Name</th>
                <th style={{ padding: '14px 20px' }}>Contact</th>
                <th style={{ padding: '14px 20px' }}>Role</th>
                <th style={{ padding: '14px 20px' }}>Account Status</th>
                <th style={{ padding: '14px 20px' }}>Joined Date</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #1e293b', transition: 'background 0.15s ease' }}>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: 600, color: '#f8fafc' }}>{u.full_name || 'Citizen'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{u.email || u.id}</div>
                  </td>
                  <td style={{ padding: '16px 20px', color: '#cbd5e1' }}>
                    {u.mobile_number || '—'}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: u.role === 'admin' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 189, 248, 0.15)',
                      color: u.role === 'admin' ? '#f87171' : '#38bdf8'
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: '12px',
                      background: u.account_status === 'active' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: u.account_status === 'active' ? '#4ade80' : '#f87171',
                      border: `1px solid ${u.account_status === 'active' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                    }}>
                      ● {u.account_status}
                    </span>
                  </td>
                  <td style={{ padding: '16px 20px', color: '#94a3b8' }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    {u.role !== 'admin' && (
                      <button
                        disabled={actionLoading === u.id}
                        onClick={() => handleToggleStatus(u)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 500,
                          cursor: actionLoading === u.id ? 'not-allowed' : 'pointer',
                          background: u.account_status === 'active' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                          color: u.account_status === 'active' ? '#f87171' : '#4ade80',
                          border: `1px solid ${u.account_status === 'active' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`
                        }}
                      >
                        {actionLoading === u.id
                          ? 'Updating...'
                          : u.account_status === 'active'
                          ? 'Suspend Account'
                          : 'Reactivate Account'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

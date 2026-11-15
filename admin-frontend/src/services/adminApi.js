import { supabase } from './supabaseClient';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchDashboardMetrics() {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/dashboard`, {
    headers: {
      Accept: 'application/json',
      ...headers,
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function fetchUsersList(limit = 50, offset = 0, role = null) {
  const headers = await getAuthHeaders();
  let url = `${API_BASE_URL}/api/v1/admin/users?limit=${limit}&offset=${offset}`;
  if (role) url += `&role=${role}`;

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      ...headers,
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function updateUserAccountStatus(userId, status) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/users/${userId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    },
    body: JSON.stringify({ account_status: status }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

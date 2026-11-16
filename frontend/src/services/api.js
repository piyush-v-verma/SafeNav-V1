/**
 * SafeNav Centralized API Service Module
 * Handles HTTP communication with the SafeNav FastAPI backend.
 */
import { supabase } from "./supabaseClient";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

/**
 * Get authorization header containing the current Supabase session JWT.
 */
export async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Check backend operational and road network graph health.
 * GET /api/health
 */
export async function checkBackendHealth(timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache",
      },
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      return {
        status: "disconnected",
        graphLoaded: false,
        data: null,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    const isGraphLoaded = Boolean(data.graph_loaded);

    return {
      status: isGraphLoaded ? "connected" : "degraded",
      graphLoaded: isGraphLoaded,
      data,
      error: data.error || null,
    };
  } catch (err) {
    clearTimeout(timer);
    const errorMessage =
      err.name === "AbortError"
        ? "Connection request timed out"
        : err.message || "Failed to reach backend";

    return {
      status: "disconnected",
      graphLoaded: false,
      data: null,
      error: errorMessage,
    };
  }
}

/**
 * Fetch road network graph statistics.
 * GET /api/graph/info
 */
export async function fetchGraphInfo() {
  const response = await fetch(`${API_BASE_URL}/api/graph/info`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Check if GPS coordinates fall within the supported road network coverage area.
 * GET /api/location/coverage?latitude={latitude}&longitude={longitude}
 */
export async function checkLocationCoverage(latitude, longitude) {
  const url = `${API_BASE_URL}/api/location/coverage?latitude=${encodeURIComponent(
    latitude
  )}&longitude=${encodeURIComponent(longitude)}`;

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache",
    },
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Calculate mode-aware road-following route.
 * Supports travel modes: 'car', 'motorcycle' (or 'two_wheeler'), 'walking'
 * Supports route preferences: 'fastest', 'shortest'
 * POST /api/navigation/route
 */
export async function calculateRoute({
  origin,
  destination,
  mode = "car",
  preference = "fastest",
  transport_mode,
  route_preference,
}) {
  const authHeaders = await getAuthHeaders();
  const effectiveMode = transport_mode || mode;
  const effectivePref = route_preference || preference;

  const response = await fetch(`${API_BASE_URL}/api/navigation/route`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({
      origin,
      destination,
      mode: effectiveMode,
      transport_mode: effectiveMode,
      preference: effectivePref,
      route_preference: effectivePref,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch current authenticated user's profile from FastAPI backend.
 * GET /api/v1/auth/me
 */
export async function fetchMyProfileBackend() {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
    headers: {
      Accept: "application/json",
      ...authHeaders,
    },
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Submit a citizen road hazard report.
 * SafeNav M07: Simplified AI-Assisted Citizen Reporting
 * POST /api/v1/reports
 */
export async function submitHazardReport({
  image,
  imageFilename = "road_issue.jpg",
  description = null,
  latitude,
  longitude,
  accuracy = null,
}) {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/reports`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({
      image,
      image_filename: imageFilename,
      description: description?.trim() || null,
      latitude,
      longitude,
      accuracy: accuracy !== null && accuracy !== undefined ? Number(accuracy) : null,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || `HTTP ${response.status}: Failed to submit report`);
  }

  return response.json();
}

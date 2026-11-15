/**
 * SafeNav Centralized API Service Module
 * Handles HTTP communication with the SafeNav FastAPI backend.
 */

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

/**
 * Check backend operational and road network graph health.
 * GET /api/health
 *
 * @param {number} timeoutMs - Request timeout in milliseconds (default: 5000)
 * @returns {Promise<{
 *   status: 'connected' | 'degraded' | 'disconnected',
 *   graphLoaded: boolean,
 *   data: object | null,
 *   error: string | null
 * }>}
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
 *
 * @returns {Promise<object>}
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
 *
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<{
 *   latitude: number,
 *   longitude: number,
 *   supported: boolean,
 *   city: string | null,
 *   message: string
 * }>}
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
 * POST /api/navigation/route
 *
 * @param {object} params
 * @param {{ latitude: number, longitude: number }} params.origin
 * @param {{ latitude: number, longitude: number }} params.destination
 * @param {'car' | 'two_wheeler' | 'walking'} [params.mode='car']
 * @returns {Promise<object>}
 */
export async function calculateRoute({ origin, destination, mode = "car" }) {
  const response = await fetch(`${API_BASE_URL}/api/navigation/route`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ origin, destination, mode }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.detail || `HTTP ${response.status}`);
  }

  return response.json();
}


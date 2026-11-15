import React from "react";
import "./RoutePanel.css";

export default function RoutePanel({
  destination,
  origin,
  route,
  isLoading,
  error,
  travelMode,
  onModeChange,
  onStartNavigation,
  onExitNavigation,
  isNavigating,
  onClose,
}) {
  if (!destination) return null;

  return (
    <div className="route-panel">
      {/* Header */}
      <div className="route-panel-header">
        <div className="route-panel-title-wrap">
          <div className="route-panel-title">{destination.name || "Destination"}</div>
          {destination.description && (
            <div className="route-panel-subtitle" title={destination.description}>
              {destination.description}
            </div>
          )}
        </div>
        <button
          className="route-panel-close-btn"
          onClick={onClose}
          aria-label="Close route panel"
          title="Close directions"
        >
          &times;
        </button>
      </div>

      {/* Active Navigation Badge */}
      {isNavigating && (
        <div className="navigating-badge">
          <span className="nav-pulse-dot"></span>
          Navigation in Progress
        </div>
      )}

      {/* Mode Selector Tabs */}
      <div className="route-mode-selector">
        <button
          className={`route-mode-tab ${travelMode === "car" ? "active" : ""}`}
          onClick={() => onModeChange("car")}
          disabled={isLoading || isNavigating}
        >
          <span>🚗</span>
          <span>Car</span>
        </button>
        <button
          className={`route-mode-tab ${travelMode === "two_wheeler" ? "active" : ""}`}
          onClick={() => onModeChange("two_wheeler")}
          disabled={isLoading || isNavigating}
        >
          <span>🛵</span>
          <span>Two-Wheeler</span>
        </button>
        <button
          className={`route-mode-tab ${travelMode === "walking" ? "active" : ""}`}
          onClick={() => onModeChange("walking")}
          disabled={isLoading || isNavigating}
        >
          <span>🚶</span>
          <span>Walking</span>
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="route-loading">
          <span className="route-loading-spinner"></span>
          Calculating road route...
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <div className="route-error-banner">
          {error}
        </div>
      )}

      {/* Route Metrics Preview */}
      {!isLoading && route && route.summary && (
        <div className="route-metrics-card">
          <div className="route-metrics-primary">
            <span className="route-metric-time">
              {route.summary.total_duration_minutes || route.summary.duration_minutes} min
            </span>
            <span className="route-metric-dist">
              ({route.summary.total_distance_km || route.summary.distance_km} km)
            </span>
          </div>

          {/* Access Connection Details */}
          {route.summary?.breakdown && (
            <div className="route-access-breakdown">
              {route.summary.breakdown.origin_access_distance_m > 3 && (
                <div className="access-item">
                  <span className="access-dot blue-dot"></span>
                  <span>{route.summary.breakdown.origin_access_distance_m}m walk to road</span>
                </div>
              )}
              <div className="access-item">
                <span className="access-road-bar"></span>
                <span>{Math.round(route.summary.breakdown.road_route_distance_m)}m on road network</span>
              </div>
              {route.summary.breakdown.destination_access_distance_m > 3 && (
                <div className="access-item">
                  <span className="access-dot red-dot"></span>
                  <span>{route.summary.breakdown.destination_access_distance_m}m walk to destination</span>
                </div>
              )}
            </div>
          )}

          {route.advisory && (
            <div className="route-advisory">
              ⚠️ {route.advisory}
            </div>
          )}
        </div>
      )}

      {/* Action Button */}
      {!isNavigating ? (
        <button
          className="route-start-btn"
          disabled={isLoading || !route}
          onClick={onStartNavigation}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          Start Navigation
        </button>
      ) : (
        <button className="route-exit-btn" onClick={onExitNavigation}>
          Exit Navigation
        </button>
      )}
    </div>
  );
}

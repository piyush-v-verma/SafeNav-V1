import React from "react";
import { Car, Bike, Footprints, Play, X, Loader2, AlertTriangle } from "lucide-react";
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
    <div className="route-panel" role="region" aria-label="Route Planning Panel">
      {/* Header */}
      <div className="route-panel-header">
        <div className="route-panel-title-wrap">
          <h2 className="route-panel-title">{destination.name || "Destination"}</h2>
          {destination.description && (
            <p className="route-panel-subtitle" title={destination.description}>
              {destination.description}
            </p>
          )}
        </div>
        <button
          type="button"
          className="route-panel-close-btn"
          onClick={onClose}
          aria-label="Back to location details"
          title="Back to location details"
        >
          <X size={18} strokeWidth={2.4} />
        </button>
      </div>

      {/* Active Navigation Badge */}
      {isNavigating && (
        <div className="navigating-badge">
          <span className="nav-pulse-dot" />
          <span>Navigation in Progress</span>
        </div>
      )}

      {/* Mode Selector Tabs */}
      <div className="route-mode-selector" role="tablist" aria-label="Travel Mode">
        <button
          type="button"
          role="tab"
          aria-selected={travelMode === "car"}
          className={`route-mode-tab ${travelMode === "car" ? "active" : ""}`}
          onClick={() => onModeChange("car")}
          disabled={isLoading || isNavigating}
          title="Car Route"
        >
          <Car size={16} strokeWidth={2.2} />
          <span>Car</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={travelMode === "two_wheeler"}
          className={`route-mode-tab ${travelMode === "two_wheeler" ? "active" : ""}`}
          onClick={() => onModeChange("two_wheeler")}
          disabled={isLoading || isNavigating}
          title="Two-Wheeler Route"
        >
          <Bike size={16} strokeWidth={2.2} />
          <span>Two-Wheeler</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={travelMode === "walking"}
          className={`route-mode-tab ${travelMode === "walking" ? "active" : ""}`}
          onClick={() => onModeChange("walking")}
          disabled={isLoading || isNavigating}
          title="Walking Route"
        >
          <Footprints size={16} strokeWidth={2.2} />
          <span>Walking</span>
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="route-loading">
          <Loader2 size={18} className="route-loading-spinner animate-spin" />
          <span>Calculating safest road route...</span>
        </div>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <div className="route-error-banner">
          <AlertTriangle size={16} strokeWidth={2.2} />
          <span>{error}</span>
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
                  <span className="access-dot blue-dot" />
                  <span>{route.summary.breakdown.origin_access_distance_m}m walk to road</span>
                </div>
              )}
              <div className="access-item">
                <span className="access-road-bar" />
                <span>{Math.round(route.summary.breakdown.road_route_distance_m)}m on road network</span>
              </div>
              {route.summary.breakdown.destination_access_distance_m > 3 && (
                <div className="access-item">
                  <span className="access-dot red-dot" />
                  <span>{route.summary.breakdown.destination_access_distance_m}m walk to destination</span>
                </div>
              )}
            </div>
          )}

          {route.advisory && (
            <div className="route-advisory">
              <span className="route-advisory-icon">⚠️</span>
              <span>{route.advisory}</span>
            </div>
          )}
        </div>
      )}

      {/* Action Button */}
      {!isNavigating ? (
        <button
          type="button"
          className="route-start-btn"
          disabled={isLoading || !route}
          onClick={onStartNavigation}
        >
          <Play size={16} fill="currentColor" strokeWidth={0} />
          <span>Start Navigation</span>
        </button>
      ) : (
        <button
          type="button"
          className="route-exit-btn"
          onClick={onExitNavigation}
        >
          Exit Navigation
        </button>
      )}
    </div>
  );
}

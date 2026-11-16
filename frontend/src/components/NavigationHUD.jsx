import React from "react";
import { X } from "lucide-react";
import "./NavigationHUD.css";

export default function NavigationHUD({
  route,
  destination,
  travelMode,
  onExitNavigation,
  onRecenter,
}) {
  if (!route) return null;

  const roadName =
    route.snapping?.origin?.snapped_edge?.name &&
    route.snapping?.origin?.snapped_edge?.name !== "Unnamed Road"
      ? route.snapping.origin.snapped_edge.name
      : destination?.name || "Road Network";

  const accessDist = route.summary?.breakdown?.origin_access_distance_m || 0;
  const isStartingOnAccess = accessDist > 5;

  const maneuverTitle = isStartingOnAccess
    ? `Head straight to road (${Math.round(accessDist)}m)`
    : `Head toward ${roadName}`;

  const maneuverSubtitle = isStartingOnAccess
    ? `Follow dotted line straight to ${roadName}`
    : `Follow route to ${destination?.name || "destination"}`;

  const modeIcon =
    travelMode === "two_wheeler" ? "🛵 Bike" : travelMode === "walking" ? "🚶 Walk" : "🚗 Car";

  const totalMin =
    route.summary?.total_duration_minutes || route.summary?.duration_minutes || 1;
  const totalKm =
    route.summary?.total_distance_km || route.summary?.distance_km || "0.0";

  return (
    <>
      {/* Top Turn Guidance Banner */}
      <div className="nav-hud-top">
        <div className="nav-hud-arrow-box">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="19" x2="12" y2="5"></line>
            <polyline points="5 12 12 5 19 12"></polyline>
          </svg>
        </div>
        <div className="nav-hud-text">
          <div className="nav-hud-maneuver">
            {maneuverTitle}
          </div>
          <div className="nav-hud-subtext">
            {maneuverSubtitle}
          </div>
        </div>
      </div>

      {/* Re-center & Re-align Camera Button */}
      <button
        className="nav-hud-recenter-btn"
        onClick={onRecenter}
        title="Re-center & align with heading"
        aria-label="Re-center navigation camera"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
        </svg>
      </button>

      {/* Bottom Metrics and Exit Bar */}
      <div className="nav-hud-bottom">
        <div className="nav-hud-metrics">
          <div className="nav-hud-time-row">
            <span className="nav-hud-duration">{totalMin} min</span>
            <span className="nav-hud-mode-pill">{modeIcon}</span>
          </div>
          <div className="nav-hud-distance-row">
            <span>{totalKm} km remaining</span>
          </div>
        </div>

        <button
          className="nav-hud-exit-btn"
          onClick={onExitNavigation}
          aria-label="Exit navigation"
        >
          <X size={15} strokeWidth={2.4} />
          <span>Exit</span>
        </button>
      </div>
    </>
  );
}

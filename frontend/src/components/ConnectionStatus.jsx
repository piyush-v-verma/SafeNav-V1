import { useState, useEffect, useCallback, useRef } from "react";
import { checkBackendHealth } from "../services/api";
import "./ConnectionStatus.css";

// Health check interval: 20 seconds
const HEALTH_POLL_INTERVAL_MS = 20000;

export default function ConnectionStatus({
  gpsStatus = "not_requested",
  gpsAccuracy = null,
  coverageStatus = "unknown",
  onBackendStatusChange,
  isNavigating = false,
}) {
  const [backendStatus, setBackendStatus] = useState("checking");
  const [isChecking, setIsChecking] = useState(true);
  const [backendDetails, setBackendDetails] = useState(null);
  const isMountedRef = useRef(true);
  const prevStatusRef = useRef(null);

  // Perform backend health check
  const performHealthCheck = useCallback(async () => {
    setIsChecking(true);
    const result = await checkBackendHealth();

    if (!isMountedRef.current) return;

    const previous = prevStatusRef.current;
    const current = result.status;
    prevStatusRef.current = current;

    setBackendStatus(current);
    setBackendDetails(result);
    setIsChecking(false);

    // Notify parent when status changes or on initial resolution
    if (onBackendStatusChange && previous !== current) {
      onBackendStatusChange(current, previous);
    }
  }, [onBackendStatusChange]);

  useEffect(() => {
    isMountedRef.current = true;
    performHealthCheck();

    const interval = setInterval(() => {
      performHealthCheck();
    }, HEALTH_POLL_INTERVAL_MS);

    // Re-check immediately when user switches back to this browser tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        performHealthCheck();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [performHealthCheck]);

  // 1. Backend Pill Props
  let backendLabel = "Backend: Checking...";
  let backendTooltip = "Connecting to SafeNav backend...";
  let backendDotClass = "neutral";

  if (!isChecking) {
    if (backendStatus === "connected") {
      backendLabel = "Backend: Connected";
      backendTooltip = "SafeNav backend connected and road network graph loaded. Click to re-check.";
      backendDotClass = "green";
    } else if (backendStatus === "degraded") {
      backendLabel = "Backend: Degraded";
      backendTooltip = `Backend reachable, but road network graph is unavailable (${backendDetails?.error || "Graph not loaded"}). Click to retry.`;
      backendDotClass = "amber";
    } else {
      backendLabel = "Backend: Disconnected";
      backendTooltip = `Backend unreachable (${backendDetails?.error || "Failed to connect"}). Click to retry.`;
      backendDotClass = "red";
    }
  }

  // 2. GPS Location Pill Props
  let gpsLabel = "GPS: Not Requested";
  let gpsTooltip = "Click the crosshair button to detect your current location.";
  let gpsDotClass = "neutral";

  if (gpsStatus === "detecting") {
    gpsLabel = "GPS: Detecting...";
    gpsTooltip = "Acquiring GPS position from browser...";
    gpsDotClass = "neutral";
  } else if (gpsStatus === "detected") {
    gpsLabel = gpsAccuracy ? `GPS: Detected (±${gpsAccuracy}m)` : "GPS: Detected";
    gpsTooltip = `Current location detected (accuracy: ±${gpsAccuracy || "N/A"} metres).`;
    gpsDotClass = "blue";
  } else if (gpsStatus === "denied") {
    gpsLabel = "GPS: Denied";
    gpsTooltip = "Location permission was denied in your browser settings.";
    gpsDotClass = "red";
  } else if (gpsStatus === "timeout") {
    gpsLabel = "GPS: Timeout";
    gpsTooltip = "Location detection took too long. Click crosshair to retry.";
    gpsDotClass = "amber";
  } else if (gpsStatus === "unavailable") {
    gpsLabel = "GPS: Unavailable";
    gpsTooltip = "Unable to determine device location.";
    gpsDotClass = "amber";
  }

  // 3. Road Coverage Pill Props
  let coverageLabel = "Coverage: Unknown";
  let coverageTooltip = "Road coverage status will be evaluated once GPS location is detected.";
  let coverageDotClass = "neutral";

  if (coverageStatus === "checking") {
    coverageLabel = "Coverage: Checking...";
    coverageTooltip = "Evaluating coordinates against Nagpur municipal road boundary...";
    coverageDotClass = "neutral";
  } else if (coverageStatus === "supported") {
    coverageLabel = "Coverage: Supported";
    coverageTooltip = "Current coordinates are inside Nagpur municipal boundary. Road navigation available.";
    coverageDotClass = "green";
  } else if (coverageStatus === "outside") {
    coverageLabel = "Outside Coverage";
    coverageTooltip = "Current coordinates are outside Nagpur coverage area. Road navigation unavailable outside Nagpur.";
    coverageDotClass = "amber";
  }

  return (
    <div
      className={`status-indicators-deck ${isNavigating ? "is-navigating" : ""}`}
      role="region"
      aria-label="System Status Indicators"
    >
      {/* Indicator 1: Backend Connection (Interactive) */}
      <div
        className={`status-pill ${backendStatus}`}
        onClick={performHealthCheck}
        title={backendTooltip}
        role="button"
        tabIndex={0}
      >
        {isChecking ? (
          <div className="status-spinner" />
        ) : (
          <span className={`status-dot ${backendDotClass}`} />
        )}
        <span className="status-text">{backendLabel}</span>
        {!isChecking && backendStatus !== "connected" && (
          <span className="status-refresh-icon">↻</span>
        )}
      </div>

      {/* Indicator 2: GPS Location */}
      <div
        className={`status-pill gps-${gpsStatus}`}
        title={gpsTooltip}
      >
        {gpsStatus === "detecting" ? (
          <div className="status-spinner" />
        ) : (
          <span className={`status-dot ${gpsDotClass}`} />
        )}
        <span className="status-text">{gpsLabel}</span>
      </div>

      {/* Indicator 3: Road Network Coverage */}
      <div
        className={`status-pill coverage-${coverageStatus}`}
        title={coverageTooltip}
      >
        {coverageStatus === "checking" ? (
          <div className="status-spinner" />
        ) : (
          <span className={`status-dot ${coverageDotClass}`} />
        )}
        <span className="status-text">{coverageLabel}</span>
      </div>
    </div>
  );
}

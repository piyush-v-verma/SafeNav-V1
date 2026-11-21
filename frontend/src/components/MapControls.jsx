import React, { useState, useEffect } from "react";
import { Plus, Minus } from "lucide-react";
import { useToast } from "../../../shared/toast/ToastProvider";
import "./MapControls.css";

/**
 * MapControls Component
 * Unified, high-visibility floating map controls positioned at bottom-right (30px from sides).
 *
 * Sequence (from top to bottom):
 * 1. Your Location (Locate Me)
 * 2. Reset North (Compass)
 * 3. Zoom In (+)
 * 4. Zoom Out (−)
 */
export default function MapControls({
  map,
  onLocationFound,
  onGpsStatusChange,
}) {
  const [isLocating, setIsLocating] = useState(false);
  const [bearing, setBearing] = useState(0);
  const toast = useToast();

  // Synchronize bearing with MapLibre camera rotation
  useEffect(() => {
    if (!map) return;

    const handleRotate = () => {
      setBearing(Math.round(map.getBearing()));
    };

    setBearing(Math.round(map.getBearing()));
    map.on("rotate", handleRotate);

    return () => {
      map.off("rotate", handleRotate);
    };
  }, [map]);

  const showError = (msg, isPermissionError = false) => {
    if (isPermissionError) toast.warning(msg);
    else toast.error(msg);
  };

  // 1. Handle "Your Location" GPS detection
  const handleLocateMe = () => {
    if (isLocating) return;

    if (!navigator.geolocation) {
      showError("Geolocation is not supported by your browser.");
      if (onGpsStatusChange) {
        onGpsStatusChange({ status: "unavailable", accuracy: null });
      }
      return;
    }

    setIsLocating(true);

    if (onGpsStatusChange) {
      onGpsStatusChange({ status: "detecting", accuracy: null });
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 10000,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const accuracy = Math.round(position.coords.accuracy);

        if (onGpsStatusChange) {
          onGpsStatusChange({ status: "detected", accuracy });
        }

        if (onLocationFound) {
          onLocationFound({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy,
          });
        }
      },
      (error) => {
        setIsLocating(false);
        let userMessage =
          "Unable to determine your current location. Check your device location services.";
        let gpsStatus = "unavailable";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            userMessage =
              "Location permission was denied. Allow location access in your browser settings to detect your location.";
            gpsStatus = "denied";
            break;
          case error.POSITION_UNAVAILABLE:
            userMessage =
              "Location is unavailable. Check your device GPS and try again.";
            gpsStatus = "unavailable";
            break;
          case error.TIMEOUT:
            userMessage =
              "Location detection timed out. Please try again.";
            gpsStatus = "timeout";
            break;
          default:
            userMessage = error.message || userMessage;
            break;
        }

        if (onGpsStatusChange) {
          onGpsStatusChange({ status: gpsStatus, accuracy: null });
        }

        showError(userMessage, gpsStatus === "denied");
      },
      options
    );
  };

  // 2. Handle "Reset North" (Compass)
  const handleResetNorth = () => {
    if (!map) return;
    map.easeTo({
      bearing: 0,
      duration: 450,
    });
  };

  // 3. Handle Zoom In
  const handleZoomIn = () => {
    if (!map) return;
    map.zoomIn({ duration: 250 });
  };

  // 4. Handle Zoom Out
  const handleZoomOut = () => {
    if (!map) return;
    map.zoomOut({ duration: 250 });
  };

  return (
    <>
      <div className="safenav-map-controls" aria-label="Map Navigation Controls">
        {/* 1. Your Location Button */}
        <button
          className={`safenav-ctrl-btn locate-btn ${isLocating ? "is-active" : ""}`}
          onClick={handleLocateMe}
          disabled={isLocating}
          title="Your Location (GPS)"
          aria-label="Your Location"
        >
          {isLocating ? (
            <div className="safenav-locate-spinner" />
          ) : (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="2" x2="12" y2="6"></line>
              <line x1="12" y1="18" x2="12" y2="22"></line>
              <line x1="2" y1="12" x2="6" y2="12"></line>
              <line x1="18" y1="12" x2="22" y2="12"></line>
              <circle cx="12" cy="12" r="7"></circle>
              <circle cx="12" cy="12" r="2.5" fill="currentColor"></circle>
            </svg>
          )}
        </button>

        {/* 2. Reset North (Compass) Button - In between Your Location and Zoom In/Out */}
        <button
          className="safenav-ctrl-btn compass-btn"
          onClick={handleResetNorth}
          title={bearing === 0 ? "Facing North" : `Reset North (Bearing: ${bearing}°)`}
          aria-label="Reset North"
        >
          <div
            className="safenav-compass-needle-wrap"
            style={{ transform: `rotate(${-bearing}deg)` }}
          >
            {/* Dual-color magnetic compass needle (Red North tip, Slate South tip) */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              {/* North Pointer (Red) */}
              <polygon
                points="12,2 16,12 12,10 8,12"
                fill="#ef4444"
                stroke="#dc2626"
                strokeWidth="0.8"
                strokeLinejoin="round"
              />
              {/* South Pointer (Slate) */}
              <polygon
                points="12,22 16,12 12,10 8,12"
                fill="#64748b"
                stroke="#475569"
                strokeWidth="0.8"
                strokeLinejoin="round"
              />
              {/* Center Pivot Dot */}
              <circle cx="12" cy="11" r="1.5" fill="#ffffff" />
            </svg>
          </div>
        </button>

        {/* 3 & 4. Zoom Controls (Zoom In and Zoom Out) */}
        <div className="safenav-zoom-group">
          {/* Zoom In (+) */}
          <button
            className="safenav-zoom-btn"
            onClick={handleZoomIn}
            title="Zoom In"
            aria-label="Zoom In"
          >
            <Plus size={22} strokeWidth={2.4} />
          </button>

          <div className="safenav-zoom-divider" />

          {/* Zoom Out (−) */}
          <button
            className="safenav-zoom-btn"
            onClick={handleZoomOut}
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <Minus size={22} strokeWidth={2.4} />
          </button>
        </div>
      </div>

    </>
  );
}

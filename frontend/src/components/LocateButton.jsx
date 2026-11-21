import { useState } from "react";
import { useToast } from "../../../shared/toast/ToastProvider";
import "./LocateButton.css";

export default function LocateButton({ onLocationFound, onGpsStatusChange }) {
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();

  const showError = (msg, isPermissionError = false) => {
    if (isPermissionError) toast.warning(msg);
    else toast.error(msg);
  };

  const handleLocateMe = () => {
    if (isLoading) return;

    // Check if Geolocation is supported
    if (!navigator.geolocation) {
      showError("Geolocation is not supported by your browser.");
      if (onGpsStatusChange) {
        onGpsStatusChange({ status: "unavailable", accuracy: null });
      }
      return;
    }

    setIsLoading(true);

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
        setIsLoading(false);
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
        toast.success("Current location retrieved.");
      },
      (error) => {
        setIsLoading(false);
        let userMessage = "Unable to determine your current location. Check your device location services and try again.";
        let gpsStatus = "unavailable";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            userMessage =
              "Location permission was denied. Allow location access in your browser settings to detect your current location.";
            gpsStatus = "denied";
            break;
          case error.POSITION_UNAVAILABLE:
            userMessage =
              "Unable to determine your current location. Check your device location services and try again.";
            gpsStatus = "unavailable";
            break;
          case error.TIMEOUT:
            userMessage =
              "Location detection is taking too long. Please try again.";
            gpsStatus = "timeout";
            break;
          default:
            userMessage =
              error.message || "Unable to determine your current location. Check your device location services and try again.";
            gpsStatus = "unavailable";
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

  return (
    <>
      <div className="locate-control-wrapper">
        <button
          className="locate-btn"
          onClick={handleLocateMe}
          disabled={isLoading}
          title="Locate Me (Current GPS Location)"
          aria-label="Locate Me"
        >
          {isLoading ? (
            <div className="locate-spinner" />
          ) : (
            <svg
              className="locate-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="2" x2="12" y2="6"></line>
              <line x1="12" y1="18" x2="12" y2="22"></line>
              <line x1="2" y1="12" x2="6" y2="12"></line>
              <line x1="18" y1="12" x2="22" y2="12"></line>
              <circle cx="12" cy="12" r="7"></circle>
              <circle cx="12" cy="12" r="2" fill="currentColor"></circle>
            </svg>
          )}
        </button>
      </div>

    </>
  );
}

import { useState, useRef, useEffect } from "react";
import "./LocateButton.css";

export default function LocateButton({ onLocationFound }) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const toastTimeoutRef = useRef(null);

  // Clear toast timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const showError = (msg) => {
    setErrorMessage(msg);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setErrorMessage(null);
    }, 6000);
  };

  const handleLocateMe = () => {
    if (isLoading) return;

    // Check if Geolocation is supported
    if (!navigator.geolocation) {
      showError("Geolocation is not supported by your browser.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 10000,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLoading(false);
        if (onLocationFound) {
          onLocationFound({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: Math.round(position.coords.accuracy),
          });
        }
      },
      (error) => {
        setIsLoading(false);
        let userMessage = "Unable to retrieve your location.";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            userMessage =
              "Location permission denied. Please allow location access in your browser settings to use this feature.";
            break;
          case error.POSITION_UNAVAILABLE:
            userMessage =
              "Location information is currently unavailable. Please verify your GPS or network connection.";
            break;
          case error.TIMEOUT:
            userMessage =
              "Location request timed out. Please try again.";
            break;
          default:
            userMessage =
              error.message || "An error occurred while finding your location.";
            break;
        }

        showError(userMessage);
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

      {errorMessage && (
        <div className="locate-toast" role="alert">
          <span className="locate-toast-msg">{errorMessage}</span>
          <button
            className="locate-toast-close"
            onClick={() => setErrorMessage(null)}
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}

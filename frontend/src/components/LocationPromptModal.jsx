import React from "react";
import { MapPin, Navigation, Compass, AlertCircle, Loader2 } from "lucide-react";
import "./LocationPromptModal.css";

export default function LocationPromptModal({
  isOpen,
  onTurnOn,
  onCancel,
  isDetecting,
  error,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="loc-prompt-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="loc-prompt-title"
    >
      <div className="loc-prompt-card">
        {/* Header Icon */}
        <div className="loc-prompt-icon-wrap">
          <MapPin size={24} className="loc-prompt-pin-icon" />
        </div>

        {/* Content */}
        <div className="loc-prompt-body">
          <h2 id="loc-prompt-title" className="loc-prompt-title">
            Please turn on your location
          </h2>
          <p className="loc-prompt-desc">
            To calculate directions and recommend safer routes, SafeNav needs access to your device location.
          </p>

          <div className="loc-prompt-features">
            <div className="loc-prompt-feature-item">
              <div className="loc-feature-icon-circle">
                <Navigation size={14} />
              </div>
              <div className="loc-feature-text">
                <span className="loc-feature-name">Device location</span>
                <span className="loc-feature-sub">Find your current position and compute route paths</span>
              </div>
            </div>

            <div className="loc-prompt-feature-item">
              <div className="loc-feature-icon-circle">
                <Compass size={14} />
              </div>
              <div className="loc-feature-text">
                <span className="loc-feature-name">Location accuracy</span>
                <span className="loc-feature-sub">Identify road hazards and navigate safely</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="loc-prompt-error" role="alert">
              <AlertCircle size={15} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="loc-prompt-actions">
          <button
            type="button"
            className="loc-prompt-btn loc-prompt-btn-secondary"
            onClick={onCancel}
            disabled={isDetecting}
          >
            No, thanks
          </button>

          <button
            type="button"
            className="loc-prompt-btn loc-prompt-btn-primary"
            onClick={onTurnOn}
            disabled={isDetecting}
          >
            {isDetecting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Detecting location...</span>
              </>
            ) : (
              <span>Turn on</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

import React from "react";
import "./PlaceDetailCard.css";

/**
 * PlaceDetailCard Component
 * Displays selected destination details on the left side below the search bar (Google Maps style),
 * replacing the previous on-map marker popup.
 *
 * Props:
 * - place: { name, description, coordinates }
 * - coverage: { supported: boolean } | null
 * - isCheckingCoverage: boolean
 * - onDirections: () => void
 * - onClose: () => void
 */
export default function PlaceDetailCard({
  place,
  coverage,
  isCheckingCoverage,
  onDirections,
  onClose,
}) {
  if (!place) return null;

  const isSupported = coverage?.supported;
  const isOutside = coverage && !coverage.supported;

  return (
    <div className="place-detail-card" role="region" aria-label="Location Details">
      {/* Header: Title & Close Button */}
      <div className="place-detail-header">
        <div className="place-detail-title-wrap">
          <h2 className="place-detail-title">{place.name}</h2>
          {place.description && (
            <p className="place-detail-desc">{place.description}</p>
          )}
        </div>
        <button
          type="button"
          className="place-detail-close-btn"
          onClick={onClose}
          aria-label="Close details"
          title="Close details"
        >
          ✕
        </button>
      </div>

      {/* Road Coverage Indicator */}
      <div className="place-detail-coverage-wrap">
        {isCheckingCoverage && (
          <div className="place-detail-coverage checking">
            <span className="place-detail-coverage-dot" />
            <span>Checking road coverage...</span>
          </div>
        )}

        {!isCheckingCoverage && isSupported && (
          <div className="place-detail-coverage supported">
            <span className="place-detail-check-badge">&#10003;</span>
            <span>Inside Nagpur Coverage</span>
          </div>
        )}

        {!isCheckingCoverage && isOutside && (
          <div className="place-detail-coverage outside">
            <div className="place-detail-outside-row">
              <span className="place-detail-warn-badge">!</span>
              <span>Outside Nagpur Coverage Area</span>
            </div>
            <span className="place-detail-outside-hint">
              Road navigation is only available within Nagpur limits.
            </span>
          </div>
        )}
      </div>

      {/* Directions Action Button */}
      <button
        type="button"
        className="place-detail-directions-btn"
        onClick={onDirections}
        disabled={isCheckingCoverage || isOutside}
        title={
          isOutside
            ? "Navigation is unavailable outside Nagpur"
            : "Get Directions"
        }
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="3 11 22 2 13 21 11 13 3 11" />
        </svg>
        <span>Directions</span>
      </button>
    </div>
  );
}

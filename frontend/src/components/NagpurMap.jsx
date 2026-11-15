import { useEffect, useRef, useState, useCallback } from "react";

import {
  Map,
  NavigationControl,
  Marker,
  Popup,
  setWorkerUrl,
} from "maplibre-gl";

import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

import "maplibre-gl/dist/maplibre-gl.css";
import SearchBar from "./SearchBar";
import LocateButton from "./LocateButton";
import ConnectionStatus from "./ConnectionStatus";
import { checkLocationCoverage } from "../services/api";

// Configure worker once before creating the map
setWorkerUrl(workerUrl);

export default function NagpurMap() {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const selectedMarkerRef = useRef(null);
  const currentLocationMarkerRef = useRef(null);

  // Preserve latest successful GPS reading for automated recovery
  const latestGpsCoordsRef = useRef(null);
  const isCoverageCheckingRef = useRef(false);

  // Independent system states for UI status deck
  const [gpsState, setGpsState] = useState({
    status: "not_requested", // 'not_requested' | 'detecting' | 'detected' | 'denied' | 'unavailable' | 'timeout'
    accuracy: null,
  });
  const [coverageStatus, setCoverageStatus] = useState("unknown"); // 'unknown' | 'checking' | 'supported' | 'outside'

  // Handle GPS status updates from LocateButton
  const handleGpsStatusChange = ({ status, accuracy }) => {
    setGpsState({ status, accuracy });
    if (status !== "detected" && status !== "detecting") {
      setCoverageStatus("unknown");
    }
  };

  // Recalculate road coverage against Nagpur boundary
  const recalculateCoverage = useCallback((coords) => {
    if (!coords || isCoverageCheckingRef.current) return;
    isCoverageCheckingRef.current = true;
    setCoverageStatus("checking");

    checkLocationCoverage(coords.latitude, coords.longitude)
      .then((coverage) => {
        setCoverageStatus(coverage.supported ? "supported" : "outside");
        if (currentLocationMarkerRef.current) {
          const updatedPopup = new Popup({ offset: 25 }).setHTML(
            createLocationPopupHTML(coords.accuracy, coverage, false)
          );
          currentLocationMarkerRef.current.setPopup(updatedPopup);
        }
      })
      .catch((err) => {
        console.warn("Coverage recalculation failed:", err.message);
        setCoverageStatus("unknown");
        if (currentLocationMarkerRef.current) {
          const fallbackPopup = new Popup({ offset: 25 }).setHTML(
            createLocationPopupHTML(coords.accuracy, null, false)
          );
          currentLocationMarkerRef.current.setPopup(fallbackPopup);
        }
      })
      .finally(() => {
        isCoverageCheckingRef.current = false;
      });
  }, []);

  // Handle backend connection lifecycle transitions
  const handleBackendStatusChange = useCallback(
    (newStatus, prevStatus) => {
      if (newStatus === "connected" && prevStatus !== "connected") {
        // Backend successfully recovered! Recalculate coverage using last known GPS reading
        if (latestGpsCoordsRef.current) {
          recalculateCoverage(latestGpsCoordsRef.current);
        }
      } else if (newStatus === "disconnected" || newStatus === "degraded") {
        // Backend unavailable; road coverage is unknown
        setCoverageStatus("unknown");
        if (currentLocationMarkerRef.current && latestGpsCoordsRef.current) {
          const offlinePopup = new Popup({ offset: 25 }).setHTML(
            createLocationPopupHTML(latestGpsCoordsRef.current.accuracy, null, false)
          );
          currentLocationMarkerRef.current.setPopup(offlinePopup);
        }
      }
    },
    [recalculateCoverage]
  );

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new Map({
      container: mapContainer.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [79.0882, 21.1458],
      zoom: 12,
    });

    map.addControl(
      new NavigationControl(),
      "top-right"
    );

    map.on("load", () => {
      console.log("Nagpur map loaded successfully!");
    });

    map.on("error", (event) => {
      console.error("Map error:", event.error);
    });

    mapRef.current = map;

    return () => {
      if (selectedMarkerRef.current) {
        selectedMarkerRef.current.remove();
        selectedMarkerRef.current = null;
      }
      if (currentLocationMarkerRef.current) {
        currentLocationMarkerRef.current.remove();
        currentLocationMarkerRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Handle location selection from Photon search
  const handleSelectLocation = (coordinates, feature) => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Move map to selected search result
    map.flyTo({
      center: coordinates,
      zoom: 15,
      essential: true,
      duration: 1500,
    });

    // Place or update red search marker
    const props = feature.properties || {};
    const name = props.name || "Selected Location";
    const description = [props.street, props.district, props.city]
      .filter(Boolean)
      .join(", ");

    const popupContent = `
      <div style="font-family: system-ui, sans-serif; padding: 4px;">
        <div style="font-weight: 600; font-size: 14px; color: #0f172a;">${name}</div>
        ${description ? `<div style="font-size: 12px; color: #64748b; margin-top: 2px;">${description}</div>` : ""}
      </div>
    `;

    const popup = new Popup({ offset: 25 }).setHTML(popupContent);

    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.setLngLat(coordinates).setPopup(popup);
      if (!selectedMarkerRef.current.getPopup().isOpen()) {
        selectedMarkerRef.current.togglePopup();
      }
    } else {
      const marker = new Marker({ color: "#ef4444" })
        .setLngLat(coordinates)
        .setPopup(popup)
        .addTo(map);

      marker.togglePopup();
      selectedMarkerRef.current = marker;
    }
  };

  // Helper to construct GPS location popup with coverage indicator
  const createLocationPopupHTML = (accuracy, coverage = null, isChecking = false) => {
    let coverageSection = "";

    if (isChecking) {
      coverageSection = `
        <div style="margin-top: 8px; font-size: 12px; color: #64748b; display: flex; align-items: center; gap: 6px; padding: 4px 0;">
          <span style="display:inline-block; width:8px; height:8px; background:#94a3b8; border-radius:50%;"></span>
          Checking road network coverage...
        </div>
      `;
    } else if (coverage) {
      if (coverage.supported) {
        coverageSection = `
          <div style="margin-top: 8px; padding: 6px 10px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; font-size: 12px; font-weight: 600; color: #065f46; display: flex; align-items: center; gap: 6px;">
            <span style="display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; background:#10b981; color:#ffffff; border-radius:50%; font-size:10px;">&#10003;</span>
            Navigation Available
          </div>
        `;
      } else {
        coverageSection = `
          <div style="margin-top: 8px; padding: 6px 10px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; font-size: 12px; font-weight: 600; color: #92400e; display: flex; align-items: center; gap: 6px;">
            <span style="display:inline-flex; align-items:center; justify-content:center; width:16px; height:16px; background:#f59e0b; color:#ffffff; border-radius:50%; font-size:10px;">!</span>
            Outside Nagpur Coverage Area
          </div>
          <div style="font-size: 11px; color: #475569; margin-top: 6px; line-height: 1.4; background: #f8fafc; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0;">
            Your location is detected successfully, but road navigation is currently unavailable outside Nagpur coverage. You can still explore the map and search for locations.
          </div>
        `;
      }
    }

    return `
      <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 4px; min-width: 220px; max-width: 280px;">
        <div style="font-weight: 600; font-size: 14px; color: #1d4ed8;">Your Current Location</div>
        <div style="font-size: 12px; color: #475569; margin-top: 2px;">Estimated accuracy: &plusmn;${accuracy} metres</div>
        ${coverageSection}
      </div>
    `;
  };

  // Handle current location detection from Geolocation API
  const handleCurrentLocationFound = ({ latitude, longitude, accuracy }) => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const coordinates = [longitude, latitude];

    // Preserve latest valid GPS reading for automated recovery
    latestGpsCoordsRef.current = { latitude, longitude, accuracy };

    setGpsState({ status: "detected", accuracy });

    // Center map on detected location
    map.flyTo({
      center: coordinates,
      zoom: 15,
      essential: true,
      duration: 1500,
    });

    // Display blue current-location marker with initial loading state for coverage
    const initialPopup = new Popup({ offset: 25 }).setHTML(
      createLocationPopupHTML(accuracy, null, true)
    );

    if (currentLocationMarkerRef.current) {
      currentLocationMarkerRef.current.setLngLat(coordinates).setPopup(initialPopup);
      if (!currentLocationMarkerRef.current.getPopup().isOpen()) {
        currentLocationMarkerRef.current.togglePopup();
      }
    } else {
      const marker = new Marker({ color: "#2563eb" })
        .setLngLat(coordinates)
        .setPopup(initialPopup)
        .addTo(map);

      marker.togglePopup();
      currentLocationMarkerRef.current = marker;
    }

    // Check location coverage
    recalculateCoverage({ latitude, longitude, accuracy });
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh" }}>
      <SearchBar onSelectLocation={handleSelectLocation} />
      <LocateButton
        onLocationFound={handleCurrentLocationFound}
        onGpsStatusChange={handleGpsStatusChange}
      />
      <ConnectionStatus
        gpsStatus={gpsState.status}
        gpsAccuracy={gpsState.accuracy}
        coverageStatus={coverageStatus}
        onBackendStatusChange={handleBackendStatusChange}
      />
      <div
        ref={mapContainer}
        style={{
          width: "100%",
          height: "100vh",
        }}
      />
    </div>
  );
}

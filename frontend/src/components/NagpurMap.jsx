import { useEffect, useRef } from "react";

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

// Configure worker once before creating the map
setWorkerUrl(workerUrl);

export default function NagpurMap() {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const selectedMarkerRef = useRef(null);
  const currentLocationMarkerRef = useRef(null);

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

  // Handle current location detection from Geolocation API
  const handleCurrentLocationFound = ({ latitude, longitude, accuracy }) => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const coordinates = [longitude, latitude];

    // Center map on detected location
    map.flyTo({
      center: coordinates,
      zoom: 15,
      essential: true,
      duration: 1500,
    });

    // Display blue current-location marker with accuracy popup
    const popupContent = `
      <div style="font-family: system-ui, sans-serif; padding: 4px;">
        <div style="font-weight: 600; font-size: 14px; color: #1d4ed8;">Your Current Location</div>
        <div style="font-size: 12px; color: #475569; margin-top: 2px;">Reported accuracy: &plusmn;${accuracy} meters</div>
      </div>
    `;

    const popup = new Popup({ offset: 25 }).setHTML(popupContent);

    if (currentLocationMarkerRef.current) {
      currentLocationMarkerRef.current.setLngLat(coordinates).setPopup(popup);
      if (!currentLocationMarkerRef.current.getPopup().isOpen()) {
        currentLocationMarkerRef.current.togglePopup();
      }
    } else {
      const marker = new Marker({ color: "#2563eb" })
        .setLngLat(coordinates)
        .setPopup(popup)
        .addTo(map);

      marker.togglePopup();
      currentLocationMarkerRef.current = marker;
    }
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh" }}>
      <SearchBar onSelectLocation={handleSelectLocation} />
      <LocateButton onLocationFound={handleCurrentLocationFound} />
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

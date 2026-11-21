import { useEffect, useRef, useState, useCallback } from "react";

import {
  Map,
  NavigationControl,
  Marker,
  Popup,
  LngLatBounds,
  setWorkerUrl,
} from "maplibre-gl";

import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

import "maplibre-gl/dist/maplibre-gl.css";
import SearchBar from "./SearchBar";
import MapControls from "./MapControls";
import ConnectionStatus from "./ConnectionStatus";
import RoutePanel from "./RoutePanel";
import NavigationHUD from "./NavigationHUD";
import PlaceDetailCard from "./PlaceDetailCard";
import LocationPromptModal from "./LocationPromptModal";
import { checkLocationCoverage, calculateRoute } from "../services/api";
import { useToast } from "../../../shared/toast/ToastProvider";

// Configure worker once before creating the map
setWorkerUrl(workerUrl);

// Calculate forward azimuth bearing (degrees 0-360) between two coordinates [lon, lat]
function calculateBearing([lon1, lat1], [lon2, lat2]) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;

  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaLambda = toRad(lon2 - lon1);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  return (toDeg(theta) + 360) % 360;
}

// Extract initial forward heading:
// If the user is off-road (e.g. inside a house/building with a dotted access line > 5m),
// orient the camera straight along the dotted line towards the road!
function getRouteInitialBearing(route) {
  const accessCoords = route?.geometries?.origin_access?.coordinates;
  const accessDist = route?.summary?.breakdown?.origin_access_distance_m || 0;

  if (accessCoords && accessCoords.length >= 2 && accessDist > 5) {
    return calculateBearing(accessCoords[0], accessCoords[1]);
  }

  const roadCoords = route?.geometries?.road_route?.coordinates;
  if (roadCoords && roadCoords.length >= 2) {
    return calculateBearing(roadCoords[0], roadCoords[1]);
  }

  return 0;
}

export default function NagpurMap() {
  const toast = useToast();
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const selectedMarkerRef = useRef(null);
  const currentLocationMarkerRef = useRef(null);
  const currentBearingRef = useRef(0);

  // Preserve latest successful GPS reading for automated recovery and routing
  const latestGpsCoordsRef = useRef(null);
  const isCoverageCheckingRef = useRef(false);

  // Independent system states for UI status deck
  const [gpsState, setGpsState] = useState({
    status: "not_requested", // 'not_requested' | 'detecting' | 'detected' | 'denied' | 'unavailable' | 'timeout'
    accuracy: null,
  });
  const [coverageStatus, setCoverageStatus] = useState("unknown"); // 'unknown' | 'checking' | 'supported' | 'outside'

  // Navigation & Route planning state
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [isRoutePanelOpen, setIsRoutePanelOpen] = useState(false);
  const [travelMode, setTravelMode] = useState("car"); // 'car' | 'two_wheeler' | 'walking'
  const [routePreference, setRoutePreference] = useState("fastest"); // 'fastest' | 'shortest'
  const [routeData, setRouteData] = useState(null);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [mapInstance, setMapInstance] = useState(null);

  // Selected Place Details Card (Floating on left side below search field)
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [selectedPlaceCoverage, setSelectedPlaceCoverage] = useState(null);
  const [isCheckingPlaceCoverage, setIsCheckingPlaceCoverage] = useState(false);

  // Location prompt modal state (when user clicks Directions without detected location)
  const [isLocationPromptOpen, setIsLocationPromptOpen] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationPromptError, setLocationPromptError] = useState(null);
  const pendingDestinationRef = useRef(null);

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
        toast.error("Unable to verify road coverage right now.", { dedupeKey: "coverage-check-error" });
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
  }, [toast]);

  // Handle backend connection lifecycle transitions
  const handleBackendStatusChange = useCallback(
    (newStatus, prevStatus) => {
      if (newStatus === "connected" && prevStatus !== "connected") {
        if (prevStatus !== null) toast.success("Connection to SafeNav services restored.", { dedupeKey: "backend-restored" });
        if (latestGpsCoordsRef.current) {
          recalculateCoverage(latestGpsCoordsRef.current);
        }
      } else if (newStatus === "disconnected" || newStatus === "degraded") {
        if (prevStatus !== newStatus) {
          toast.error(newStatus === "degraded" ? "Navigation services are available without road-network data." : "Cannot reach SafeNav navigation services.", { dedupeKey: `backend-${newStatus}` });
        }
        setCoverageStatus("unknown");
        if (currentLocationMarkerRef.current && latestGpsCoordsRef.current) {
          const offlinePopup = new Popup({ offset: 25 }).setHTML(
            createLocationPopupHTML(latestGpsCoordsRef.current.accuracy, null, false)
          );
          currentLocationMarkerRef.current.setPopup(offlinePopup);
        }
      }
    },
    [recalculateCoverage, toast]
  );

  // Initialize MapLibre Map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new Map({
      container: mapContainer.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [79.0882, 21.1458],
      zoom: 12,
      attributionControl: false,
    });

    map.on("load", () => {
      console.log("Nagpur map loaded successfully!");

      // Enforce flat 2D building footprints and eradicate 3D building extrusion
      const enforceFlat2DBuildings = () => {
        try {
          const style = map.getStyle();
          if (style && style.layers) {
            style.layers.forEach((layer) => {
              if (layer.type === "fill-extrusion" || layer.id === "building-3d") {
                if (map.getLayer(layer.id)) {
                  map.removeLayer(layer.id);
                  console.log(`[SafeNav] Removed 3D extrusion layer: ${layer.id}`);
                }
              }
            });
          }

          // Expand flat 'building' fill layer across all zoom levels up to 24
          if (map.getLayer("building")) {
            map.setLayerZoomRange("building", 13, 24);
            map.setPaintProperty("building", "fill-color", "#e2e8f0");
            map.setPaintProperty("building", "fill-opacity", 0.85);
            map.setPaintProperty("building", "fill-outline-color", "#94a3b8");
            console.log("[SafeNav] Flat 2D building footprints active (zooms 13-24).");
          }
        } catch (err) {
          console.warn("[SafeNav] Building layer update notice:", err);
        }
      };

      enforceFlat2DBuildings();
      map.on("style.load", enforceFlat2DBuildings);

      // Expose verification function on window for runtime auditing
      if (typeof window !== "undefined") {
        window.__safenav_verify_building_layers = () => {
          const layers = map.getStyle()?.layers || [];
          const extrusions = layers.filter((l) => l.type === "fill-extrusion");
          const buildings = layers.filter(
            (l) => l.id.includes("building") || l["source-layer"] === "building"
          );
          const report = {
            fillExtrusionsActive: extrusions.map((l) => l.id),
            flatBuildingsActive: buildings.map((l) => ({
              id: l.id,
              type: l.type,
              minzoom: l.minzoom,
              maxzoom: l.maxzoom,
            })),
            isExtrusionCompletelyRemoved: extrusions.length === 0,
          };
          console.log("[SafeNav Runtime Verification Report]:", report);
          return report;
        };
      }

      // 1. Add road route GeoJSON source and layers
      if (!map.getSource("safenav-route-source")) {
        map.addSource("safenav-route-source", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });

        // Route casing / underlay for high contrast
        map.addLayer({
          id: "safenav-route-casing",
          type: "line",
          source: "safenav-route-source",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#0f172a",
            "line-width": 8,
            "line-opacity": 0.35,
          },
        });

        // Main road-following route line (solid prominent blue)
        map.addLayer({
          id: "safenav-route-line",
          type: "line",
          source: "safenav-route-source",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": "#2563eb",
            "line-width": 6,
          },
        });
      }

      // 2. Add access connection GeoJSON source and dotted line layer
      if (!map.getSource("safenav-access-source")) {
        map.addSource("safenav-access-source", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });

        // Dotted access connection lines (dasharray: [2, 2])
        map.addLayer({
          id: "safenav-access-line",
          type: "line",
          source: "safenav-access-source",
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": [
              "match",
              ["get", "type"],
              "origin_access", "#2563eb",        // Blue dotted line from GPS to road
              "destination_access", "#ef4444",   // Red dotted line from road to destination
              "#2563eb"
            ],
            "line-width": 4,
            "line-dasharray": [2, 2],
          },
        });
      }
    });

    map.on("error", (event) => {
      console.error("Map error:", event.error);
    });

    mapRef.current = map;
    setMapInstance(map);

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
      setMapInstance(null);
    };
  }, []);

  // Compute road route via backend API
  const triggerRouteCalculation = useCallback(
    async (originCoords, destInfo, mode, preference = "fastest") => {
      if (!originCoords || !destInfo) return;

      setIsRouteLoading(true);
      setRouteError(null);

      try {
        const res = await calculateRoute({
          origin: {
            latitude: originCoords.latitude,
            longitude: originCoords.longitude,
          },
          destination: {
            latitude: destInfo.coordinates[1],
            longitude: destInfo.coordinates[0],
          },
          mode: mode,
          preference: preference,
          route_preference: preference,
        });

        setRouteData(res);
        toast.success("Route ready.", { dedupeKey: "route-ready" });

        // Render both Access Connections and Road Route on MapLibre map
        if (mapRef.current) {
          const map = mapRef.current;
          const routeSource = map.getSource("safenav-route-source");
          const accessSource = map.getSource("safenav-access-source");

          // 1. Dotted Access Connections
          if (accessSource) {
            const accessFeatures = [];
            if (res.geometries?.origin_access) {
              accessFeatures.push({
                type: "Feature",
                properties: { type: "origin_access" },
                geometry: res.geometries.origin_access,
              });
            }
            if (res.geometries?.destination_access) {
              accessFeatures.push({
                type: "Feature",
                properties: { type: "destination_access" },
                geometry: res.geometries.destination_access,
              });
            }
            accessSource.setData({
              type: "FeatureCollection",
              features: accessFeatures,
            });
          }

          // 2. Solid Road-Following Route
          const roadGeom = res.geometries?.road_route || res.geometry;
          if (routeSource && roadGeom) {
            routeSource.setData({
              type: "FeatureCollection",
              features: [
                {
                  type: "Feature",
                  geometry: roadGeom,
                  properties: { mode: mode },
                },
              ],
            });
          }

          // 3. Auto-fit map camera to include entire journey (access connections + road route)
          const allCoords = [];
          if (res.geometries?.origin_access?.coordinates) {
            allCoords.push(...res.geometries.origin_access.coordinates);
          }
          if (roadGeom?.coordinates) {
            allCoords.push(...roadGeom.coordinates);
          }
          if (res.geometries?.destination_access?.coordinates) {
            allCoords.push(...res.geometries.destination_access.coordinates);
          }

          if (allCoords.length > 1) {
            const bounds = allCoords.reduce(
              (acc, c) => acc.extend(c),
              new LngLatBounds(allCoords[0], allCoords[0])
            );
            map.fitBounds(bounds, {
              padding: { top: 90, bottom: 90, left: 380, right: 60 },
              duration: 1200,
            });
          }
        }
      } catch (err) {
        console.error("Route calculation failed:", err);
        setRouteError(err.message || "Failed to calculate road route.");
        toast.error("Could not create this route. Check the route details and try again.", { dedupeKey: "route-calculation-error" });
        setRouteData(null);
        if (mapRef.current) {
          const routeSource = mapRef.current.getSource("safenav-route-source");
          if (routeSource) {
            routeSource.setData({ type: "FeatureCollection", features: [] });
          }
          const accessSource = mapRef.current.getSource("safenav-access-source");
          if (accessSource) {
            accessSource.setData({ type: "FeatureCollection", features: [] });
          }
        }
      } finally {
        setIsRouteLoading(false);
      }
    },
    [toast]
  );

  // Handle Directions button click from destination popup
  const handleDirectionsClick = useCallback(
    (destInfo) => {
      setSelectedDestination(destInfo);
      setIsRoutePanelOpen(true);
      setIsNavigating(false);

      if (latestGpsCoordsRef.current) {
        triggerRouteCalculation(latestGpsCoordsRef.current, destInfo, travelMode, routePreference);
      } else {
        setRouteError("Please detect your current GPS location first using the locate button.");
      }
    },
    [travelMode, routePreference, triggerRouteCalculation]
  );

  // Mode change handler (Car / Two-Wheeler / Walking)
  const handleModeChange = (newMode) => {
    setTravelMode(newMode);
    setIsNavigating(false);
    if (selectedDestination && latestGpsCoordsRef.current) {
      triggerRouteCalculation(latestGpsCoordsRef.current, selectedDestination, newMode, routePreference);
    }
  };

  // Route preference handler (Fastest vs Shortest)
  const handlePreferenceChange = (newPref) => {
    setRoutePreference(newPref);
    setIsNavigating(false);
    if (selectedDestination && latestGpsCoordsRef.current) {
      triggerRouteCalculation(latestGpsCoordsRef.current, selectedDestination, travelMode, newPref);
    }
  };

  // Start active navigation session with rotated 3D perspective camera (Google Maps style)
  const handleStartNavigation = () => {
    setIsNavigating(true);
    if (mapRef.current && routeData) {
      const heading = getRouteInitialBearing(routeData);
      currentBearingRef.current = heading;

      const centerCoords = latestGpsCoordsRef.current
        ? [latestGpsCoordsRef.current.longitude, latestGpsCoordsRef.current.latitude]
        : routeData.route_geojson?.features?.[0]?.geometry?.coordinates?.[0] || null;

      if (centerCoords) {
        mapRef.current.easeTo({
          center: centerCoords,
          zoom: 18.2,
          pitch: 55,         // 55 degree forward 3D perspective
          bearing: heading,  // Aligned straight along the dotted line towards the road!
          padding: { top: 140, bottom: 60, left: 0, right: 0 },
          duration: 1500,
        });
      }
    }
  };

  // Re-center camera and re-align bearing to forward route heading
  const handleRecenterNavigation = () => {
    if (mapRef.current && routeData) {
      const heading = getRouteInitialBearing(routeData);
      currentBearingRef.current = heading;

      const centerCoords = latestGpsCoordsRef.current
        ? [latestGpsCoordsRef.current.longitude, latestGpsCoordsRef.current.latitude]
        : routeData.route_geojson?.features?.[0]?.geometry?.coordinates?.[0] || null;

      if (centerCoords) {
        mapRef.current.easeTo({
          center: centerCoords,
          zoom: 18.2,
          pitch: 55,
          bearing: heading,
          padding: { top: 140, bottom: 60, left: 0, right: 0 },
          duration: 1000,
        });
      }
    }
  };

  // Exit active navigation session and restore top-down 2D map view
  const handleExitNavigation = () => {
    setIsNavigating(false);
    currentBearingRef.current = 0;
    if (mapRef.current) {
      mapRef.current.easeTo({
        pitch: 0,
        bearing: 0,
        zoom: 15,
        padding: { top: 0, bottom: 0, left: 0, right: 0 },
        duration: 1000,
      });
    }
  };

  // Close route panel, clear route line on map, and return back to direction popup
  const handleCloseRoutePanel = () => {
    setIsRoutePanelOpen(false);
    setIsNavigating(false);
    currentBearingRef.current = 0;
    setRouteData(null);
    setRouteError(null);

    if (mapRef.current) {
      const routeSource = mapRef.current.getSource("safenav-route-source");
      if (routeSource) {
        routeSource.setData({ type: "FeatureCollection", features: [] });
      }
      const accessSource = mapRef.current.getSource("safenav-access-source");
      if (accessSource) {
        accessSource.setData({ type: "FeatureCollection", features: [] });
      }
      mapRef.current.easeTo({ pitch: 0, bearing: 0, duration: 800 });
    }

    // Return back to direction/place details popup as requested!
    if (selectedDestination) {
      setSelectedPlace(selectedDestination);
      setIsCheckingPlaceCoverage(true);
      checkLocationCoverage(selectedDestination.coordinates[1], selectedDestination.coordinates[0])
        .then((coverage) => {
          setSelectedPlaceCoverage(coverage);
        })
        .catch(() => {
          setSelectedPlaceCoverage({ supported: true });
        })
        .finally(() => {
          setIsCheckingPlaceCoverage(false);
        });
    }
  };

  // Handle location selection from search (or Enter key)
  const handleSelectLocation = (coordinates, feature) => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Smoothly fly map to selected search result
    map.flyTo({
      center: coordinates,
      zoom: 15,
      essential: true,
      duration: 1500,
    });

    const props = feature.properties || {};
    const name = props.name || "Selected Location";
    const description = [props.street, props.district, props.city]
      .filter(Boolean)
      .join(", ");

    const placeInfo = {
      name,
      description,
      coordinates,
    };

    // Close any active route planning panel and display place details card below search
    setIsRoutePanelOpen(false);
    setSelectedPlace(placeInfo);
    setIsCheckingPlaceCoverage(true);
    setSelectedPlaceCoverage(null);

    // Drop or reposition the red marker on the map WITHOUT anchoring an on-map popup
    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.setLngLat(coordinates);
    } else {
      const marker = new Marker({ color: "#ef4444" })
        .setLngLat(coordinates)
        .addTo(map);

      // Clicking marker on map re-opens the left place detail card
      const el = marker.getElement();
      el.style.cursor = "pointer";
      el.addEventListener("click", () => {
        setSelectedPlace(placeInfo);
      });

      selectedMarkerRef.current = marker;
    }

    // Verify road network coverage for destination coordinates [lon, lat]
    checkLocationCoverage(coordinates[1], coordinates[0])
      .then((coverage) => {
        setSelectedPlaceCoverage(coverage);
      })
      .catch((err) => {
        console.warn("Place coverage check failed:", err.message);
        toast.error("Unable to verify this place's road coverage.", { dedupeKey: "place-coverage-error" });
        setSelectedPlaceCoverage({ supported: true });
      })
      .finally(() => {
        setIsCheckingPlaceCoverage(false);
      });
  };

  // Clear search bar & all floating popups, markers, and routes
  const handleClearAll = useCallback(() => {
    // 1. Close PlaceDetailCard and remove marker
    setSelectedPlace(null);
    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.remove();
      selectedMarkerRef.current = null;
    }
    // 2. Close RoutePanel and reset route
    setIsRoutePanelOpen(false);
    setSelectedDestination(null);
    setRouteData(null);
    setRouteError(null);
    // 3. Clear route lines from map
    if (mapRef.current) {
      const routeSource = mapRef.current.getSource("safenav-route-source");
      if (routeSource) {
        routeSource.setData({ type: "FeatureCollection", features: [] });
      }
      const accessSource = mapRef.current.getSource("safenav-access-source");
      if (accessSource) {
        accessSource.setData({ type: "FeatureCollection", features: [] });
      }
    }
    // 4. Close location prompt modal if open
    setIsLocationPromptOpen(false);
    setLocationPromptError(null);
    pendingDestinationRef.current = null;
  }, []);

  // When user types in search bar, dismiss stale place card so suggestions have unobstructed visibility
  const handleSearchInputChange = useCallback(() => {
    if (selectedPlace) {
      setSelectedPlace(null);
    }
    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.remove();
      selectedMarkerRef.current = null;
    }
  }, [selectedPlace]);

  // Place details card actions
  const handlePlaceDirections = useCallback(() => {
    if (!selectedPlace) return;
    const dest = selectedPlace;

    // Check if location is already detected
    if (latestGpsCoordsRef.current) {
      setSelectedPlace(null);
      handleDirectionsClick(dest);
    } else {
      // Location not detected yet! Save destination and prompt user to turn on location
      pendingDestinationRef.current = dest;
      setLocationPromptError(null);
      setIsLocationPromptOpen(true);
    }
  }, [selectedPlace, handleDirectionsClick]);

  const handlePlaceClose = useCallback(() => {
    setSelectedPlace(null);
    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.remove();
      selectedMarkerRef.current = null;
    }
  }, []);

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

    // Preserve latest valid GPS reading
    latestGpsCoordsRef.current = { latitude, longitude, accuracy };
    setGpsState({ status: "detected", accuracy });
    toast.success("Current location retrieved.", { dedupeKey: "location-retrieved" });

    // Center map or follow user during active navigation
    if (isNavigating) {
      map.easeTo({
        center: coordinates,
        bearing: currentBearingRef.current || 0,
        pitch: 55,
        zoom: 18.2,
        padding: { top: 140, bottom: 60, left: 0, right: 0 },
        duration: 800,
      });
    } else {
      map.flyTo({
        center: coordinates,
        zoom: 15,
        essential: true,
        duration: 1500,
      });
    }

    // Display blue current-location marker
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

  // Location prompt modal actions
  const handleLocationPromptCancel = useCallback(() => {
    setIsLocationPromptOpen(false);
    setLocationPromptError(null);
    pendingDestinationRef.current = null;
    // User requested: "no thanks return on homepage"
    handleClearAll();
  }, [handleClearAll]);

  const handleLocationPromptTurnOn = useCallback(() => {
    if (!navigator.geolocation) {
      const message = "Geolocation is not supported by your browser.";
      setLocationPromptError(message);
      toast.error(message, { dedupeKey: "location-unavailable" });
      return;
    }

    setIsDetectingLocation(true);
    setLocationPromptError(null);
    setGpsState({ status: "detecting", accuracy: null });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsDetectingLocation(false);
        setIsLocationPromptOpen(false);
        const accuracy = Math.round(position.coords.accuracy);
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy,
        };

        // Update GPS state and place current location marker
        handleCurrentLocationFound(coords);

        // Open direction popup for the selected destination
        const dest = pendingDestinationRef.current || selectedPlace || selectedDestination;
        if (dest) {
          setSelectedPlace(null);
          setSelectedDestination(dest);
          setIsRoutePanelOpen(true);
          triggerRouteCalculation(coords, dest, travelMode);
        }
      },
      (err) => {
        setIsDetectingLocation(false);
        setGpsState({ status: "denied", accuracy: null });
        if (err.code === 1) {
          const message = "Location permission was denied. Please allow location access in your browser settings to continue.";
          setLocationPromptError(message);
          toast.warning(message, { dedupeKey: "location-permission-denied" });
        } else if (err.code === 3) {
          const message = "Location request timed out. Please check your GPS signal and try again.";
          setLocationPromptError(message);
          toast.error(message, { dedupeKey: "location-timeout" });
        } else {
          const message = "Unable to retrieve your location. Please ensure device location is enabled.";
          setLocationPromptError(message);
          toast.error(message, { dedupeKey: "location-unavailable" });
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  }, [handleCurrentLocationFound, selectedPlace, selectedDestination, travelMode, toast, triggerRouteCalculation]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {!isNavigating && (
        <SearchBar
          onSelectLocation={handleSelectLocation}
          onClear={handleClearAll}
          onInputChange={handleSearchInputChange}
        />
      )}

      {/* Place Details Card (Floating on left side below search field) */}
      {!isNavigating && !isRoutePanelOpen && selectedPlace && (
        <PlaceDetailCard
          place={selectedPlace}
          coverage={selectedPlaceCoverage}
          isCheckingCoverage={isCheckingPlaceCoverage}
          onDirections={handlePlaceDirections}
          onClose={handlePlaceClose}
        />
      )}

      {/* Location Prompt Modal (Prompt when user clicks directions without GPS) */}
      <LocationPromptModal
        isOpen={isLocationPromptOpen}
        onTurnOn={handleLocationPromptTurnOn}
        onCancel={handleLocationPromptCancel}
        isDetecting={isDetectingLocation}
        error={locationPromptError}
      />
      <MapControls
        map={mapInstance}
        onLocationFound={handleCurrentLocationFound}
        onGpsStatusChange={handleGpsStatusChange}
      />
      <ConnectionStatus
        gpsStatus={gpsState.status}
        gpsAccuracy={gpsState.accuracy}
        coverageStatus={coverageStatus}
        onBackendStatusChange={handleBackendStatusChange}
        isNavigating={isNavigating}
      />

      {/* Route Planning Card (Visible before navigation starts) */}
      {!isNavigating && isRoutePanelOpen && (
        <RoutePanel
          destination={selectedDestination}
          origin={latestGpsCoordsRef.current}
          route={routeData}
          isLoading={isRouteLoading}
          error={routeError}
          travelMode={travelMode}
          onModeChange={handleModeChange}
          routePreference={routePreference}
          onPreferenceChange={handlePreferenceChange}
          onStartNavigation={handleStartNavigation}
          onExitNavigation={handleExitNavigation}
          isNavigating={isNavigating}
          onClose={handleCloseRoutePanel}
        />
      )}

      {/* Google Maps-style Navigation HUD (Visible during active navigation) */}
      {isNavigating && (
        <NavigationHUD
          route={routeData}
          destination={selectedDestination}
          travelMode={travelMode}
          onExitNavigation={handleExitNavigation}
          onRecenter={handleRecenterNavigation}
        />
      )}

      <div
        ref={mapContainer}
        style={{
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
}

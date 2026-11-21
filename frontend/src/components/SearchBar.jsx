import { useState, useEffect, useRef } from "react";
import { useToast } from "../../../shared/toast/ToastProvider";
import "./SearchBar.css";

// Search configuration
const DEBOUNCE_DELAY_MS = 400; // 350-500ms debounce
const MIN_CHAR_THRESHOLD = 3;   // Minimum 3 typed characters

export default function SearchBar({ onSelectLocation, onClear, onInputChange }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const toast = useToast();

  const containerRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch suggestions from Photon API
  const fetchSuggestions = (searchQuery) => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < MIN_CHAR_THRESHOLD) {
      setSuggestions([]);
      setIsLoading(false);
      setIsOpen(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);

    const params = new URLSearchParams({
      q: trimmed,
      lat: "21.1458",
      lon: "79.0882",
      limit: "5",
      lang: "en",
    });

    const url = `https://photon.komoot.io/api/?${params.toString()}`;

    fetch(url, { signal: abortControllerRef.current.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then((data) => {
        const rawFeatures = data.features || [];

        // Deduplicate features sharing the same name and nearby coordinates
        const seen = new Set();
        const features = rawFeatures
          .filter((f) => {
            const name = f.properties?.name || "";
            const coords = (f.geometry?.coordinates || []).map((c) => c.toFixed(3)).join(",");
            const key = `${name}-${coords}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .sort((a, b) => {
            const isNagpurA =
              a.properties?.city?.toLowerCase() === "nagpur" ||
              a.properties?.county?.toLowerCase()?.includes("nagpur") ||
              false;
            const isNagpurB =
              b.properties?.city?.toLowerCase() === "nagpur" ||
              b.properties?.county?.toLowerCase()?.includes("nagpur") ||
              false;
            return (isNagpurB ? 1 : 0) - (isNagpurA ? 1 : 0);
          });

        setSuggestions(features);
        setIsOpen(features.length > 0);
        setHighlightedIndex(-1);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Photon search error:", err);
          toast.error("Location search is unavailable. Please try again.", { dedupeKey: "photon-search-error" });
          setSuggestions([]);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // Handle typing with debounce & minimum character validation
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    // Notify parent to dismiss any stale place card so suggestions have clean visibility
    if (onInputChange) {
      onInputChange(value);
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (value.trim().length < MIN_CHAR_THRESHOLD) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(value);
    }, DEBOUNCE_DELAY_MS);
  };

  // Select a suggestion
  const handleSelect = (feature) => {
    const coordinates = feature.geometry.coordinates; // [lng, lat]
    const name = feature.properties.name || "Selected Location";
    setQuery(name);
    setIsOpen(false);
    setSuggestions([]);

    if (onSelectLocation) {
      onSelectLocation(coordinates, feature);
    }
  };

  // Fetch immediately and select the top matching result on Enter
  const fetchImmediateAndSelect = (searchQuery) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);

    const params = new URLSearchParams({
      q: searchQuery,
      lat: "21.1458",
      lon: "79.0882",
      limit: "5",
      lang: "en",
    });

    fetch(`https://photon.komoot.io/api/?${params.toString()}`, {
      signal: abortControllerRef.current.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error("Search failed");
        return res.json();
      })
      .then((data) => {
        const features = data.features || [];
        if (features.length > 0) {
          handleSelect(features[0]);
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Photon enter search error:", err);
          toast.error("Location search is unavailable. Please try again.", { dedupeKey: "photon-search-error" });
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      if (!isOpen || suggestions.length === 0) return;
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      if (!isOpen || suggestions.length === 0) return;
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions.length > 0) {
        const target = highlightedIndex >= 0 ? suggestions[highlightedIndex] : suggestions[0];
        handleSelect(target);
      } else if (query.trim().length >= MIN_CHAR_THRESHOLD) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        fetchImmediateAndSelect(query.trim());
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  // Clear query and notify parent to close all popups and reset markers
  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    setIsOpen(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (onClear) {
      onClear();
    }
  };

  // Format secondary location text
  const formatSecondary = (props) => {
    const parts = [props.street, props.district, props.city, props.state].filter(
      Boolean
    );
    return parts.length > 0 ? parts.join(", ") : props.country || "";
  };

  return (
    <div className="search-bar-wrapper" ref={containerRef}>
      <div className="search-input-box">
        <svg
          className="search-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>

        <input
          type="text"
          className="search-input"
          placeholder="Search location in Nagpur (e.g. Sitabuldi)..."
          value={query}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
        />

        {isLoading && <div className="search-loader"></div>}

        {query && !isLoading && (
          <button
            className="search-clear-btn"
            onClick={handleClear}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul className="search-dropdown">
          {suggestions.map((feature, idx) => {
            const props = feature.properties || {};
            const primary = props.name || "Unknown Location";
            const secondary = formatSecondary(props);
            const isHighlighted = idx === highlightedIndex;

            return (
              <li
                key={`${props.osm_id || idx}-${idx}`}
                className={`search-item ${isHighlighted ? "active" : ""}`}
                onClick={() => handleSelect(feature)}
                onMouseEnter={() => setHighlightedIndex(idx)}
              >
                <span className="search-item-primary">{primary}</span>
                {secondary && (
                  <span className="search-item-secondary">{secondary}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

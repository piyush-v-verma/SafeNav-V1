import { useState, useEffect, useRef } from "react";
import "./SearchBar.css";

// Nagpur center coordinates for Photon bias
const NAGPUR_LAT = 21.1458;
const NAGPUR_LON = 79.0882;
const DEBOUNCE_DELAY_MS = 350;

export default function SearchBar({ onSelectLocation }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

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
    if (!searchQuery.trim()) {
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

    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
      searchQuery.trim()
    )}&lat=${NAGPUR_LAT}&lon=${NAGPUR_LON}&limit=5`;

    fetch(url, { signal: abortControllerRef.current.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then((data) => {
        const features = data.features || [];
        setSuggestions(features);
        setIsOpen(features.length > 0);
        setHighlightedIndex(-1);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.error("Photon search error:", err);
          setSuggestions([]);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // Handle typing with debounce
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!value.trim()) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
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

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  // Clear query
  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    setIsOpen(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
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

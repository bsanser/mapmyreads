// components/MapChart.tsx
"use client";

import { memo, useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";

const TOPO_URL = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

// Theme definitions
const THEMES = {
  forest: {
    name: "Forest Adventure",
    default: "#f0f9ff",
    highlighted: "#059669",
    selected: "#047857", 
    border: "#065f46",
    hoverSelected: "#065f46",
    hoverHighlighted: "#10b981",
    hoverDefault: "#e0f2fe"
  },
  sunset: {
    name: "Sunset Voyage",
    default: "#fef3c7",
    highlighted: "#f59e0b",
    selected: "#d97706",
    border: "#b45309", 
    hoverSelected: "#b45309",
    hoverHighlighted: "#fbbf24",
    hoverDefault: "#fde68a"
  },
  lavender: {
    name: "Lavender Dreams",
    default: "#faf5ff",
    highlighted: "#a855f7",
    selected: "#9333ea",
    border: "#7c3aed",
    hoverSelected: "#7c3aed",
    hoverHighlighted: "#c084fc",
    hoverDefault: "#f3e8ff"
  }
};

export type MapChartProps = {
  highlighted: Set<string>;
  selectedCountry: string | null;
  onCountryClick: (iso2: string) => void;
};

export const MapChart = memo(function MapChart({
  highlighted,
  selectedCountry,
  onCountryClick,
}: MapChartProps) {
  const [currentTheme, setCurrentTheme] = useState<keyof typeof THEMES>('sunset');
  const [showThemeSwitcher, setShowThemeSwitcher] = useState(false);
  
  const theme = THEMES[currentTheme];

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ 
          scale: 140,
          center: [0, 0]
        }}
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      >
        <Geographies geography={TOPO_URL}>
          {({ geographies }) => {
            return geographies.map((geo) => {
              const countryName = (geo.properties as any).name as string;
              const isHighlighted = highlighted.has(countryName);
              const isSelected = countryName === selectedCountry;

              // Set fill color based on state
              let fill = theme.default;
              if (isHighlighted) fill = theme.hoverHighlighted; // Use lighter hover color for highlighted countries
              if (isSelected) fill = theme.selected;

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  stroke={theme.border}
                  onClick={() => onCountryClick(countryName)}
                  style={{
                    default: {
                      fill: fill,
                      outline: "none",
                    },
                    hover: {
                      fill: isSelected
                        ? theme.hoverSelected
                        : isHighlighted
                          ? theme.hoverHighlighted
                          : theme.hoverDefault,
                      outline: "none",
                    },
                    pressed: { outline: "none" },
                  }}
                />
              );
            });
          }}
        </Geographies>
      </ComposableMap>

      {/* Theme Switcher */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={() => setShowThemeSwitcher(!showThemeSwitcher)}
          className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-2 hover:bg-white transition-all"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
          </svg>
        </button>

        {/* Theme Options Dropdown */}
        {showThemeSwitcher && (
          <div className="absolute top-12 right-0 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-200 p-3 min-w-48">
            <div className="text-sm font-medium text-gray-700 mb-2">Choose Theme</div>
            {Object.entries(THEMES).map(([key, themeData]) => (
              <button
                key={key}
                onClick={() => {
                  setCurrentTheme(key as keyof typeof THEMES);
                  setShowThemeSwitcher(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all ${
                  currentTheme === key 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{themeData.name}</span>
                  {currentTheme === key && (
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Click outside to close theme switcher */}
      {showThemeSwitcher && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setShowThemeSwitcher(false)}
        />
      )}
    </div>
  );
});

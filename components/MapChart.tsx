// components/MapChart.tsx
"use client";

import { memo } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";

const TOPO_URL = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

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
  return (
    <ComposableMap
      projection="geoEqualEarth"
      projectionConfig={{ scale: 150 }}
      style={{ width: "100%", height: "100%" }}
    >
      <Geographies geography={TOPO_URL}>
        {({ geographies }) => {
          console.log(geographies[0]);

          return geographies.map((geo) => {
            const countryName = (geo.properties as any).name as string;
            const isHighlighted = highlighted.has(countryName);
            const isSelected = countryName === selectedCountry;

            // Set fill color based on state
            let fill = "#9CA3AF"; // gray-400 (default)
            if (isHighlighted) fill = "#DC2626"; // red-600
            if (isSelected) fill = "#B91C1C"; // red-700

            return (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                stroke="#CBD5E1"
                onClick={() => onCountryClick(countryName)}
                style={{
                  default: {
                    fill: fill,
                    outline: "none",
                  },
                  hover: {
                    fill: isSelected
                      ? "#B91C1C" // red-700
                      : isHighlighted
                        ? "#EF4444" // red-500 (lighter on hover)
                        : "#6B7280", // gray-500 (darker on hover)
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
  );
});
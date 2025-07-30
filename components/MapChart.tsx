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
        {({ geographies }) => 
         console.log(geographies)

          geographies.map((geo) => {
            const iso2 = (geo.properties as any).ISO_A2 as string;
            const isHighlighted = highlighted.has(iso2);
            const isSelected = iso2 === selectedCountry;
            
            // 1) default grey, 2) amber-400 if highlighted, 3) amber-600 if selected
            let fill = "#E2E8F0"; // gray-200
            if (isHighlighted) fill = "#FACC15"; // amber-400
            if (isSelected) fill = "#CA8A04"; // amber-600
        
            return (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                stroke="#CBD5E1"
                onClick={() => onCountryClick(iso2)}
                style={{
                  default: {
                    fill: isSelected
                      ? "#D97706" // amber-500
                      : isHighlighted
                        ? "#FBBF24" // amber-300
                        : "#CBD5E1", // gray-300
                    outline: "none",
                  },
                  hover: {
                    fill: isSelected
                      ? "#D97706" // amber-500
                      : isHighlighted
                        ? "#FBBF24" // amber-300
                        : "#CBD5E1", // gray-300
                    outline: "none",
                  },
                  pressed: { outline: "none" },
                }}
              />
            );
          })
        }
      </Geographies>
    </ComposableMap>
  );
});

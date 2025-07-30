
// components/MapChart.tsx
"use client";

import { memo } from "react";
import { ComposableMap, Geographies, Geography, Sphere, Graticule } from "react-simple-maps";
import { scaleLinear } from "d3-scale";

const TOPO_URL = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

// Create a gradient color scale from light amber to deep red
const colorScale = scaleLinear()
  .domain([0, 1])
  .range(["#FEF3C7", "#DC2626"]); // light amber to red

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
      <Sphere stroke="#E4E5E6" strokeWidth={0.5} />
      <Graticule stroke="#E4E5E6" strokeWidth={0.5} />
      <Geographies geography={TOPO_URL}>
        {({ geographies }) =>
          geographies.map((geo) => {
            const iso2 = (geo.properties as any).ISO_A2 as string;
            const isHighlighted = highlighted.has(iso2);
            const isSelected = iso2 === selectedCountry;

            let fill = "#F5F4F6"; // default light gray
            
            if (isHighlighted) {
              // Use gradient scale - could be enhanced to show different intensities
              // For now, all highlighted countries get the mid-range color
              fill = colorScale(0.6);
            }
            
            if (isSelected) {
              // Selected country gets the deepest red
              fill = colorScale(1);
            }

            return (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill={fill}
                stroke="#CBD5E1"
                onClick={() => onCountryClick(iso2)}
                style={{
                  default: { outline: "none" },
                  hover: {
                    fill: isSelected
                      ? colorScale(0.9) // slightly lighter red
                      : isHighlighted
                        ? colorScale(0.8) // lighter version of highlight
                        : "#E5E7EB", // light gray
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

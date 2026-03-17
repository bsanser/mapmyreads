"use client";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { THEMES, ThemeKey } from "../lib/themeManager";
import { generateHeatmapStyle } from "../lib/heatmapEngine";
import { setupMapEventHandlers, getOptimalZoom } from "../lib/mapEventHandlers";
import { createMapStyle, getMapInitialConfig } from "../lib/mapStyling";

export type MapLibreMapProps = {
  highlighted?: Set<string>;
  selectedCountry?: string | null;
  onCountryClick?: (countryName: string) => void;
  books?: any[];
  currentTheme?: keyof typeof THEMES;
  themes?: typeof THEMES;
};

/**
 * Apply all theme + book-dependent map styles in one coordinated pass.
 * Called on initial load and whenever books or theme change.
 */
function applyMapStyle(
  map: maplibregl.Map,
  theme: ThemeKey,
  books: any[],
  themes: typeof THEMES
) {
  if (!map.isStyleLoaded()) return;

  const themeColors = themes[theme];

  // Background
  map.setPaintProperty('background', 'background-color', themeColors.background);

  // Country outlines + labels
  map.setPaintProperty('countries-outline', 'line-color', themeColors.outline);
  map.setPaintProperty('country-labels', 'text-color', themeColors.outline);
  map.setPaintProperty('country-labels', 'text-halo-color', themeColors.background);

  // Heatmap fill
  const heatmapStyle = generateHeatmapStyle(books, themeColors);
  map.setPaintProperty('countries-fill', 'fill-color', heatmapStyle);

  // Wave pattern (theme-dependent image)
  const { wavePatternDataURL } = createMapStyle(theme);
  const img = new Image();
  img.onload = () => {
    if (!map) return;
    try { map.removeImage('waves'); } catch (_) { /* not yet added */ }
    map.addImage('waves', img);
  };
  img.src = wavePatternDataURL;

  map.triggerRepaint();
}

export const MapLibreMap = ({
  highlighted = new Set(),
  selectedCountry = null,
  onCountryClick,
  books = [],
  currentTheme: propCurrentTheme = 'blue',
  themes: propThemes = THEMES
}: MapLibreMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  // Init effect — runs once. Creates map, wires events, applies initial style on load.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!mapContainer.current) {
      setMapStatus('error');
      return;
    }

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: createMapStyle(propCurrentTheme).style,
      ...getMapInitialConfig(),
      zoom: getOptimalZoom()
    });

    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    const cleanupEventHandlers = setupMapEventHandlers({
      map,
      onCountryClick,
      onMapError: (error) => {
        console.error("Map error:", error);
        setMapStatus('error');
      }
    });

    map.on('load', () => {
      setMapStatus('ready');
      applyMapStyle(map, propCurrentTheme, books, propThemes);
    });

    return () => {
      map.remove();
      cleanupEventHandlers?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update effect — runs whenever books or theme change after init.
  useEffect(() => {
    if (!mapRef.current) return;
    applyMapStyle(mapRef.current, propCurrentTheme, books, propThemes);
  }, [books, propCurrentTheme, propThemes]);

  return (
    <div className="w-full h-full">
      <div
        ref={mapContainer}
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      >
        {mapStatus === 'loading' && (
          <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="text-gray-600 font-bold mb-2">Map Loading...</div>
              <div className="text-gray-500 text-sm">MapLibre + Natural Earth</div>
            </div>
          </div>
        )}

        {mapStatus === 'error' && (
          <div className="w-full h-full flex items-center justify-center bg-red-50">
            <div className="text-center">
              <div className="text-red-600 font-bold mb-2">Map Error</div>
              <div className="text-red-500 text-sm">Check console for details</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

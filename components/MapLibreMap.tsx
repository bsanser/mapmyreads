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
  const currentThemeRef = useRef<ThemeKey>(propCurrentTheme);

  // Update theme ref when prop changes
  useEffect(() => {
    currentThemeRef.current = propCurrentTheme;
  }, [propCurrentTheme]);
  
  // Force initial theme application when map is ready
  useEffect(() => {
    if (mapRef.current?.isStyleLoaded() && propThemes[propCurrentTheme]) {
      
      // Force update country outlines with initial theme
      const outlineColor = propThemes[propCurrentTheme].outline;
      mapRef.current.setPaintProperty('countries-outline', 'line-color', outlineColor);
      
      // Force update country labels
      mapRef.current.setPaintProperty('country-labels', 'text-color', outlineColor);
      mapRef.current.setPaintProperty('country-labels', 'text-halo-color', propThemes[propCurrentTheme].background);
    }
  }, [mapStatus, propCurrentTheme, propThemes]);

  useEffect(() => {
    // Only run on client side
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

    // Store map reference
    mapRef.current = map;

    // Add the wave pattern image to the map
    map.on('load', () => {
      setMapStatus('ready');
      
      // Add custom wave pattern
      const { wavePatternDataURL } = createMapStyle(propCurrentTheme);
      const img = new Image();
      img.onload = () => {
        mapRef.current?.addImage('waves', img);
      };
      img.src = wavePatternDataURL;
      
      // Update heatmap colors after map loads
      updateHeatmapColors();
    });
    
    // Function to update heatmap colors
    const updateHeatmapColors = () => {
      if (mapRef.current?.isStyleLoaded()) {
        // Generate the complete heatmap style
        const heatmapStyle = generateHeatmapStyle(books, propThemes[propCurrentTheme]);
        
        mapRef.current.setPaintProperty('countries-fill', 'fill-color', heatmapStyle);
        
        // Force a repaint
        mapRef.current.triggerRepaint();
      }
    };



    // Add basic controls
    mapRef.current?.addControl(new maplibregl.NavigationControl(), 'top-right');

         // Controls are now handled by React components in the parent components

    // Setup map event handlers using the new module
    const cleanupEventHandlers = setupMapEventHandlers({
      map: mapRef.current,
      onCountryClick,
      onMapError: (error) => {
        console.error("Map error:", error);
        setMapStatus('error');
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
      }
      // Clean up event handlers
      if (cleanupEventHandlers) {
        cleanupEventHandlers();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update heatmap colors when books change
  useEffect(() => {
    if (!mapRef.current?.isStyleLoaded()) {
      return;
    }

    const heatmapStyle = generateHeatmapStyle(books, propThemes[propCurrentTheme]);
    mapRef.current.setPaintProperty('countries-fill', 'fill-color', heatmapStyle);
    mapRef.current.triggerRepaint();
  }, [books, propCurrentTheme, propThemes]);
  
  // Dedicated effect for theme changes - ensure ALL colors update
  useEffect(() => {
    // Skip if theme hasn't actually changed
    if (currentThemeRef.current === propCurrentTheme) {
      return;
    }
    
    // Only proceed if we have valid theme data and the map is ready
    if (!propThemes[propCurrentTheme]) {
      return;
    }
    
    if (mapRef.current?.isStyleLoaded()) {
      // Update map colors
      const baseColor = propThemes[propCurrentTheme].fill;
      const outlineColor = propThemes[propCurrentTheme].outline;
      
      // Update background
      mapRef.current.setPaintProperty('background', 'background-color', propThemes[propCurrentTheme].background);
      
      // Update country outlines
      mapRef.current.setPaintProperty('countries-outline', 'line-color', outlineColor);
      
      // Update country labels text color
      mapRef.current.setPaintProperty('country-labels', 'text-color', outlineColor);
      mapRef.current.setPaintProperty('country-labels', 'text-halo-color', propThemes[propCurrentTheme].background);
      
      // Update country fills (heatmap)
      const newHeatmapStyle = generateHeatmapStyle(books, propThemes[propCurrentTheme]);
      
      mapRef.current.setPaintProperty('countries-fill', 'fill-color', newHeatmapStyle);
      mapRef.current.triggerRepaint();
      
      // Update wave pattern image
      const { wavePatternDataURL } = createMapStyle(propCurrentTheme);
      const img = new Image();
      img.onload = () => {
        if (mapRef.current) {
          // Remove old image if it exists
          try {
            mapRef.current.removeImage('waves');
          } catch (e) {
            // Image might not exist yet, ignore error
          }
          mapRef.current.addImage('waves', img);
        }
      };
      img.src = wavePatternDataURL;
      
      // Update the ref to track the current theme
      currentThemeRef.current = propCurrentTheme;
    } else {
      // Map not ready yet
    }
    
    
    
  }, [propCurrentTheme, books, propThemes]);

  return (
    <div className="w-full h-full">
      {/* Map Container */}
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

"use client";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { COUNTRIES, toISO2, toDisplayName } from "../lib/countries";
import { THEMES, ThemeKey, darkenColor } from "../lib/themeManager";
import { getCountryBookCounts, generateHeatmapStyle } from "../lib/heatmapEngine";
import { createMapControls, updateControlColors } from "./MapControls";
import { setupMapEventHandlers, getOptimalZoom } from "../lib/mapEventHandlers";
import { createMapStyle, getMapInitialConfig } from "../lib/mapStyling";
import { AVAILABLE_COUNTRIES, assignMockCountriesToBooks } from "../lib/mapUtilities";

export type MapLibreMapProps = {
  highlighted?: Set<string>;
  selectedCountry?: string | null;
  onCountryClick?: (countryName: string) => void;
  books?: any[]; // Add books prop for heatmap logic
  countryViewMode?: 'author' | 'book'; // Add view mode prop for correct counting
  onViewModeChange?: (mode: 'author' | 'book') => void; // Add callback for view mode changes
  currentTheme?: keyof typeof THEMES; // Theme from parent component
  onThemeChange?: (theme: keyof typeof THEMES) => void; // Theme change callback
  themes?: typeof THEMES; // Themes object from parent component
};

export const MapLibreMap = ({
  highlighted = new Set(),
  selectedCountry = null,
  onCountryClick,
  books = [],
  countryViewMode = 'book',
  onViewModeChange,
  currentTheme: propCurrentTheme = 'blue', // Destructure prop with default
  onThemeChange, // Destructure prop
  themes: propThemes = THEMES // Destructure prop with default
}: MapLibreMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const currentThemeRef = useRef<ThemeKey>(propCurrentTheme);

  // Debug theme props
  console.log('🗺️ MapLibreMap: Received theme props:', {
    currentTheme: propCurrentTheme,
    hasOnThemeChange: !!onThemeChange,
    themesKeys: Object.keys(propThemes),
    themes: propThemes
  });

  // Function to get current theme dynamically (avoids closure issues)
  const getCurrentTheme = () => propCurrentTheme;
  
  // Update theme ref when prop changes
  useEffect(() => {
    currentThemeRef.current = propCurrentTheme;
  }, [propCurrentTheme]);
  
  // Force initial theme application when map is ready
  useEffect(() => {
    if (mapRef.current?.isStyleLoaded() && propThemes[propCurrentTheme]) {
      console.log('🎨 Initial theme application for:', propCurrentTheme);
      
      // Force update country outlines with initial theme
      const outlineColor = propThemes[propCurrentTheme].outline;
      mapRef.current.setPaintProperty('countries-outline', 'line-color', outlineColor);
      
      // Force update country labels
      mapRef.current.setPaintProperty('country-labels', 'text-color', outlineColor);
      mapRef.current.setPaintProperty('country-labels', 'text-halo-color', propThemes[propCurrentTheme].background);
      
      console.log('🎨 Initial theme colors applied - outline:', outlineColor);
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
        const heatmapStyle = generateHeatmapStyle(books, countryViewMode, propThemes[propCurrentTheme]);
        
        mapRef.current.setPaintProperty('countries-fill', 'fill-color', heatmapStyle);
        
        // Force a repaint
        mapRef.current.triggerRepaint();
      }
    };



    // Add basic controls
    mapRef.current?.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Create map controls using the new module
    const controls = createMapControls({
      countryViewMode,
      currentTheme: propCurrentTheme,
      themes: propThemes,
      onViewModeChange,
      onThemeChange
    });

    // Add controls to the map container
    console.log('Adding Book Locations control to DOM...');
    
    // Check if control already exists to prevent duplicates
    if (!document.getElementById('book-locations-control')) {
      mapContainer.current?.appendChild(controls.bookLocationsControl);
      console.log('Book Locations control added to DOM');
    } else {
      console.log('Book Locations control already exists, skipping');
    }
    
    console.log('Adding Author Countries control to DOM...');
    if (!document.getElementById('author-countries-control')) {
      mapContainer.current?.appendChild(controls.authorCountriesControl);
      console.log('Author Countries control added to DOM');
    } else {
      console.log('Author Countries control already exists, skipping');
    }
    
    // Set initial control colors
    setTimeout(() => {
      console.log('🎨 Setting initial control colors for theme:', propCurrentTheme);
      updateControlColors(countryViewMode, propCurrentTheme, propThemes);
    }, 100);
    
    console.log('Adding Theme control to DOM...');
    if (!document.querySelector('.theme-control')) {
      mapContainer.current?.appendChild(controls.themeControl);
      console.log('Theme control added to DOM');
    } else {
      console.log('Theme control already exists, skipping');
    }

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
  }, []);

  // Update heatmap colors when books change
  useEffect(() => {
    console.log('🎨 useEffect triggered with theme:', propCurrentTheme, 'countryViewMode:', countryViewMode);
    if (mapRef.current && mapRef.current.isStyleLoaded()) {
      console.log('🎨 Map is ready, applying heatmap colors for theme:', propCurrentTheme);
      // Apply heatmap colors immediately
      applyHeatmapColors();
      
      // Update control colors to match current theme
      updateControlColors(countryViewMode, propCurrentTheme, propThemes);
      
      // Also apply after a delay to ensure they stick
      setTimeout(() => {
        if (mapRef.current?.isStyleLoaded()) {
          console.log('🎨 Delayed heatmap color application for theme:', propCurrentTheme);
          applyHeatmapColors();
          updateControlColors(countryViewMode, propCurrentTheme, propThemes);
        }
      }, 500);
    } else {
      console.log('🎨 Map not ready yet, cannot apply heatmap colors');
    }
  }, [books, propCurrentTheme, countryViewMode]);
  
  // Update control colors when view mode changes
  useEffect(() => {
    console.log('🎨 View mode changed to:', countryViewMode, 'updating control colors');
    updateControlColors(countryViewMode, propCurrentTheme, propThemes);
  }, [countryViewMode]);
  
  // Dedicated effect for theme changes - ensure ALL colors update
  useEffect(() => {
    // Skip if theme hasn't actually changed
    if (currentThemeRef.current === propCurrentTheme) {
      console.log('🎨 DEBUG: Theme unchanged, skipping update');
      return;
    }
    
    console.log('🎨 Theme changed from', currentThemeRef.current, 'to:', propCurrentTheme, 'updating ALL colors');
    console.log('🎨 DEBUG: propThemes keys:', Object.keys(propThemes));
    console.log('🎨 DEBUG: Current theme data:', propThemes[propCurrentTheme]);
    console.log('🎨 DEBUG: Map ready status:', mapRef.current?.isStyleLoaded());
    
    // Only proceed if we have valid theme data and the map is ready
    if (!propThemes[propCurrentTheme]) {
      console.log('🎨 DEBUG: Invalid theme data, skipping update');
      return;
    }
    
    if (mapRef.current?.isStyleLoaded()) {
      // Update map colors
      const baseColor = propThemes[propCurrentTheme].fill;
      const outlineColor = propThemes[propCurrentTheme].outline;
      
      console.log('🎨 DEBUG: Using colors - base:', baseColor, 'outline:', outlineColor);
      
      // Update background
      mapRef.current.setPaintProperty('background', 'background-color', propThemes[propCurrentTheme].background);
      
      // Update country outlines
      mapRef.current.setPaintProperty('countries-outline', 'line-color', outlineColor);
      
      // Update country labels text color
      mapRef.current.setPaintProperty('country-labels', 'text-color', outlineColor);
      mapRef.current.setPaintProperty('country-labels', 'text-halo-color', propThemes[propCurrentTheme].background);
      
      // Update country fills (heatmap)
      const countryCounts = getCountryBookCounts(books, countryViewMode);
      const newHeatmapStyle = generateHeatmapStyle(books, countryViewMode, propThemes[propCurrentTheme]);
      
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
      
      console.log('🎨 All map colors updated for theme:', propCurrentTheme);
      
      // Update the ref to track the current theme
      currentThemeRef.current = propCurrentTheme;
    } else {
      console.log('🎨 DEBUG: Map not ready, cannot update colors');
    }
    
    // Update control colors - but only if they exist and we're not in the middle of a theme change
    setTimeout(() => {
      console.log('🎨 DEBUG: Updating control colors in timeout');
      updateControlColors(countryViewMode, propCurrentTheme, propThemes);
    }, 50);
    
  }, [propCurrentTheme, books, countryViewMode, propThemes]);

  // Function to apply heatmap colors
  const applyHeatmapColors = () => {
    if (mapRef.current?.isStyleLoaded()) {
      console.log('🎨 DEBUG: Applying heatmap colors...');
      
      // Generate the complete heatmap style
      const heatmapStyle = generateHeatmapStyle(books, countryViewMode, propThemes[propCurrentTheme]);
      
      console.log('🎨 DEBUG: Setting paint property with:', heatmapStyle);
      mapRef.current.setPaintProperty('countries-fill', 'fill-color', heatmapStyle);
      
      // Force a repaint
      mapRef.current.triggerRepaint();
      console.log('🎨 DEBUG: Heatmap colors applied and repaint triggered');
    } else {
      console.log('🎨 DEBUG: Map not ready, cannot apply heatmap colors');
    }
  };

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

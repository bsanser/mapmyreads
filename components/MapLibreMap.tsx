"use client";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";

// Apple-inspired theme system with carefully balanced colors
const THEMES = {
  blue: {
    name: "Ocean Blue",
    fill: "#B3D9E5",      // Light blue (your current)
    outline: "#0A6A89",   // Dark blue (your current)
    hover: "#7FB3C7",     // Medium blue
    selected: "#E8F4F8",  // Very light blue with subtle glow
    background: "#eef3f5" // Light blue-gray background
  },
  yellow: {
    name: "Golden Hour",
    fill: "#F4E4BC",      // Light warm yellow
    outline: "#D4A574",   // Rich golden brown
    hover: "#E8D4A8",     // Medium warm yellow
    selected: "#FDF8E8",  // Very light cream with subtle glow
    background: "#fefbf3" // Warm off-white background
  },
  purple: {
    name: "Royal Purple",
    fill: "#E8D4F0",      // Light lavender
    outline: "#8B5A96",   // Rich purple
    hover: "#D4B8E0",     // Medium lavender
    selected: "#F8F0FC",  // Very light lavender with subtle glow
    background: "#f9f6fc" // Light purple-tinted background
  },
  pink: {
    name: "Rose Garden",
    fill: "#F4D4E0",      // Light rose pink
    outline: "#C85A7B",   // Rich rose
    hover: "#E8B8CC",     // Medium rose pink
    selected: "#FDF0F5",  // Very light rose with subtle glow
    background: "#fef8fa" // Light pink-tinted background
  }
};

export type MapLibreMapProps = {
  highlighted?: Set<string>;
  selectedCountry?: string | null;
  onCountryClick?: (countryName: string) => void;
};

export const MapLibreMap = ({
  highlighted = new Set(),
  selectedCountry = null,
  onCountryClick
}: MapLibreMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [currentTheme, setCurrentTheme] = useState<keyof typeof THEMES>('blue');

  // Calculate appropriate zoom level based on screen size
  const getOptimalZoom = () => {
    if (typeof window === 'undefined') return 1.6;
    const screenWidth = window.innerWidth;
    // Zoom to show complete populated world horizontally (Japan to America) without Antarctica
    if (screenWidth >= 1024) { // Desktop
      return 1.8; // Shows complete world width without cutting off Japan or America
    } else if (screenWidth >= 768) { // Tablet
      return 1.6; // Balanced view for tablet
    } else { // Mobile
      return 1.4; // Good mobile view of complete world width
    }
  };

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    console.log("MapLibreMap useEffect running, container:", mapContainer.current);
    
    if (!mapContainer.current) {
      console.log("Map container not found");
      setMapStatus('error');
      return;
    }

    console.log("Creating map...");
    
    // Create custom wave pattern SVG for ocean background
    const wavePatternSVG = `
      <svg width="16" height="8" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="waves" width="16" height="8" patternUnits="userSpaceOnUse">
            <path d="M0 4 Q2 0 4 4 T8 4 T12 4 T16 4"
                  fill="none"
                  stroke="${THEMES[currentTheme].outline}"
                  stroke-width="1"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  opacity="0.3"
                  vector-effect="non-scaling-stroke"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#waves)" />
      </svg>
    `;
    
    
    

    
    // Convert SVG to data URL
    const wavePatternDataURL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(wavePatternSVG)}`;
    
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sources: {
          countries: {
            type: "geojson",
            data: "https://raw.githubusercontent.com/datasets/geo-countries/master/data/countries.geojson"
          }
        },
        layers: [
          {
            id: "background",
            type: "background",
            paint: { 
              "background-color": THEMES[currentTheme].background,
              "background-pattern": "waves"
            }
          },
          {
            id: "countries-fill",
            type: "fill",
            source: "countries",
            paint: { "fill-color": THEMES[currentTheme].fill }
          },
          {
            id: "countries-outline",
            type: "line",
            source: "countries",
            paint: { "line-color": THEMES[currentTheme].outline, "line-width": 2 }
          },
          {
            id: "country-labels",
            type: "symbol",
            source: "countries",
            layout: {
              "text-field": ["get", "ADMIN"],              // change to your name field if needed
              "text-font": ["Open Sans Regular","Arial Unicode MS Regular"],
              "text-size": 12,
              "text-allow-overlap": false
            },
            paint: {
              "text-color": "#2a4450",
              "text-halo-color": "#ffffff",
              "text-halo-width": 1.2
            }
          }
        ]
      },
      center: [0, 19],
      zoom: getOptimalZoom(),
      attributionControl: { compact: false }
    });

    // Add the wave pattern image to the map
    map.on('load', () => {
      console.log("Map loaded successfully!");
      setMapStatus('ready');
      
      // Add custom wave pattern
      const img = new Image();
      img.onload = () => {
        map.addImage('waves', img);
      };
      img.src = wavePatternDataURL;
    });

    console.log("Map created, adding controls...");

    // Add basic controls
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Add custom theme selector control
    const themeControl = document.createElement('div');
    themeControl.className = 'maplibregl-ctrl maplibregl-ctrl-group';
    themeControl.style.cssText = `
      position: absolute;
      top: 10px;
      right: 70px;
      z-index: 1000;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 8px;
      border: 1px solid rgba(0, 0, 0, 0.1);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      padding: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      min-width: 40px;
      cursor: pointer;
      transition: all 0.2s ease;
    `;

    // Add hover effect
    themeControl.addEventListener('mouseenter', () => {
      themeControl.style.background = 'rgba(255, 255, 255, 0.98)';
      themeControl.style.transform = 'translateY(-1px)';
      themeControl.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    });

    themeControl.addEventListener('mouseleave', () => {
      themeControl.style.background = 'rgba(255, 255, 255, 0.95)';
      themeControl.style.transform = 'translateY(0)';
      themeControl.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
    });

    // Create theme icon (using Heroicons style - paint brush icon)
    const themeIcon = document.createElement('div');
    themeIcon.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="#666" class="size-6">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
      </svg>
    `;
    themeIcon.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
    `;

    // Create theme dropdown (initially hidden)
    const themeDropdown = document.createElement('div');
    themeDropdown.style.cssText = `
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 4px;
      background: rgba(255, 255, 255, 0.98);
      backdrop-filter: blur(10px);
      border-radius: 8px;
      border: 1px solid rgba(0, 0, 0, 0.1);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      padding: 8px 0;
      min-width: 160px;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-8px);
      transition: all 0.2s ease;
      z-index: 1001;
    `;

    // Add theme options
    Object.entries(THEMES).forEach(([key, theme]) => {
      const themeOption = document.createElement('div');
      themeOption.style.cssText = `
        padding: 8px 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 12px;
        transition: background-color 0.15s ease;
        font-size: 13px;
        color: #333;
      `;

      // Add color preview
      const colorPreview = document.createElement('div');
      colorPreview.style.cssText = `
        width: 16px;
        height: 16px;
        border-radius: 4px;
        background: ${theme.fill};
        border: 2px solid ${theme.outline};
        flex-shrink: 0;
      `;

      const themeName = document.createElement('span');
      themeName.textContent = theme.name;

      themeOption.appendChild(colorPreview);
      themeOption.appendChild(themeName);

      // Add hover effect
      themeOption.addEventListener('mouseenter', () => {
        themeOption.style.background = 'rgba(0, 0, 0, 0.05)';
      });

      themeOption.addEventListener('mouseleave', () => {
        themeOption.style.background = 'transparent';
      });

      // Add click handler
      themeOption.addEventListener('click', () => {
        setCurrentTheme(key as keyof typeof THEMES);
        
        // Update map colors immediately
        if (map.isStyleLoaded()) {
          map.setPaintProperty('background', 'background-color', THEMES[key].background);
          map.setPaintProperty('countries-fill', 'fill-color', THEMES[key].fill);
          map.setPaintProperty('countries-outline', 'line-color', THEMES[key].outline);
        }
        
        // Hide dropdown
        themeDropdown.style.opacity = '0';
        themeDropdown.style.visibility = 'hidden';
        themeDropdown.style.transform = 'translateY(-8px)';
      });

      themeDropdown.appendChild(themeOption);
    });

    // Show/hide dropdown on click
    themeControl.addEventListener('click', () => {
      const isVisible = themeDropdown.style.visibility === 'visible';
      
      if (isVisible) {
        themeDropdown.style.opacity = '0';
        themeDropdown.style.visibility = 'hidden';
        themeDropdown.style.transform = 'translateY(-8px)';
      } else {
        themeDropdown.style.opacity = '1';
        themeDropdown.style.visibility = 'visible';
        themeDropdown.style.transform = 'translateY(0)';
      }
    });

    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!themeControl.contains(e.target as Node)) {
        themeDropdown.style.opacity = '0';
        themeDropdown.style.visibility = 'hidden';
        themeDropdown.style.transform = 'translateY(-8px)';
      }
    });

    themeControl.appendChild(themeIcon);
    themeControl.appendChild(themeDropdown);
    mapContainer.current?.appendChild(themeControl);

    // Create hover tooltip for country names
    const tooltip = document.createElement('div');
    tooltip.style.cssText = `
      position: absolute;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 6px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      pointer-events: none;
      z-index: 1000;
      opacity: 0;
      visibility: hidden;
      transition: all 0.2s ease;
      white-space: nowrap;
      backdrop-filter: blur(4px);
    `;
    mapContainer.current?.appendChild(tooltip);

    // Add hover events for countries
    map.on('mousemove', 'countries-fill', (e) => {
      if (e.features && e.features[0]) {
        const properties = e.features[0].properties;
        
        // Try different possible property names for country names
        const countryName = properties?.ADMIN || 
                           properties?.NAME || 
                           properties?.name || 
                           properties?.Name ||
                           properties?.COUNTRY ||
                           properties?.country ||
                           'Unknown Country';
        
        tooltip.textContent = countryName;
        tooltip.style.opacity = '1';
        tooltip.style.visibility = 'visible';
        
        // Position tooltip above the mouse cursor
        const canvas = map.getCanvas();
        const rect = canvas.getBoundingClientRect();
        const x = e.point.x + rect.left;
        const y = e.point.y + rect.top - 40; // 40px above cursor
        
        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
      }
    });

    map.on('mouseleave', 'countries-fill', () => {
      tooltip.style.opacity = '0';
      tooltip.style.visibility = 'hidden';
    });

    // Add error event listener
    map.on('error', (e) => {
      console.error("Map error:", e);
      setMapStatus('error');
    });

    // Handle window resize to adjust zoom
    const handleResize = () => {
      const newZoom = getOptimalZoom();
      if (Math.abs(map.getZoom() - newZoom) > 0.5) {
        map.setZoom(newZoom);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (map) {
        console.log("Cleaning up map...");
        map.remove();
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

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

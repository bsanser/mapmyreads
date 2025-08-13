"use client";
import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl from "maplibre-gl";
import { useEffect, useRef, useState } from "react";

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
                  stroke="#9ac6b6"
                  stroke-width="1"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  opacity="0.4"
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
              "background-color": "#eef3f5",
              "background-pattern": "waves"
            }
          },
          {
            id: "countries-fill",
            type: "fill",
            source: "countries",
            paint: { "fill-color": "#B3D9E5" }
          },
          {
            id: "countries-outline",
            type: "line",
            source: "countries",
            paint: { "line-color": "#0A6A89", "line-width": 1 }
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

    // Add a simple popup on click with secure content
    map.on('click', (e) => {
      const coordinates = e.lngLat;
      const popup = new maplibregl.Popup({
        closeButton: true,
        closeOnClick: false
      });
      
      popup
        .setLngLat(coordinates)
        .setHTML(`<div>Coordinates: ${coordinates.lng.toFixed(4)}, ${coordinates.lat.toFixed(4)}</div>`)
        .addTo(map);
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
